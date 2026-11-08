// Offline regression tests: every fetch is mocked; never read real keys or DB.
const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

function load(file, mocks, globals = {}) {
  const module = { exports: {} };
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  vm.runInNewContext(source, {
    module, exports: module.exports,
    require: (name) => { if (!(name in mocks)) throw new Error(`Unmocked import ${name} in ${file}`); return mocks[name]; },
    URL, URLSearchParams, AbortSignal, Buffer, Response, Request, crypto, Error,
    setTimeout: (fn) => fn(),
    fetch: () => { throw new Error('UNMOCKED NETWORK IS FORBIDDEN'); },
    ...globals,
  }, { filename: file });
  return module.exports;
}

async function main() {
  const outcome = load('lib/job-outcome.ts', {});
  assert.equal(outcome.jobErrorStatus('submitting', 'Lỗi kết nối tới nhà cung cấp'), 'pending');
  assert.equal(outcome.jobErrorStatus('accepted', 'Quá thời gian chờ: in_progress'), 'pending');
  assert.equal(outcome.jobErrorStatus('accepted', 'Tác vụ thất bại: domain_retired'), 'failed');
  assert.equal(outcome.jobErrorStatus('accepted', 'Tác vụ chưa có kết quả: domain_retired'), 'pending');
  assert.equal(outcome.jobErrorStatus('downloading', 'HTTP 403'), 'pending');
  assert.equal(outcome.jobErrorStatus('submitting', 'API trả về 400: invalid'), 'failed');
  assert.equal(outcome.jobErrorStatus('submitting', 'API trả về 408: timeout'), 'pending');
  assert.equal(outcome.jobErrorStatus('preparing', 'upload rejected'), 'failed');

  const video = load('lib/video-task.ts', {});
  assert.equal(video.videoTaskResult({ status: 'completed', download_ready: false, output_url: 'https://cdn.invalid/v.mp4' }).ready, false);
  assert.equal(video.videoTaskResult({ status: 'completed', output_url: 'https://cdn.invalid/v.mp4' }).source, 'https://cdn.invalid/v.mp4');
  assert.equal(video.videoTaskResult({ status: 'done', videos: [{ url: 'https://cdn.invalid/old.mp4' }] }).source, 'https://cdn.invalid/old.mp4');
  assert.equal(video.videoTaskResult({ status: 'failed', error: { message: 'domain_retired' } }).detail, 'domain_retired');
  assert.throws(() => video.validateVideoBytes(Buffer.from('<html>' + 'error'.repeat(30)), 'video/mp4'), /hợp lệ/);
  assert.throws(() => video.validateVideoBytes(Buffer.alloc(0), 'video/mp4'), /rỗng/);
  const mp4 = Buffer.alloc(128); mp4.write('ftyp', 4);
  video.validateVideoBytes(mp4, 'video/mp4');
  const redirectCalls = [];
  const downloader = load('lib/provider-download.ts', {}, { fetch: async (url, init) => {
    redirectCalls.push({ url, init });
    return redirectCalls.length === 1
      ? new Response(null, { status: 307, headers: { location: 'https://cdn.invalid/signed.mp4' } })
      : new Response(mp4, { headers: { 'content-type': 'video/mp4' } });
  } });
  const redirected = await downloader.fetchProviderFile('https://api.invalid/media/signed', 'https://api.invalid/v1', 'test-key');
  assert.equal(redirected.status, 200);
  assert.equal(redirectCalls[0].init.headers.Authorization, 'Bearer test-key');
  assert.equal(redirectCalls[1].init.headers.Authorization, undefined, 'Never forward the key to a CDN');
  let referenceStatus = 200, referenceMime = 'image/jpeg', referenceCalls = 0;
  const references = load('lib/reference-images.ts', {
    'node:crypto': crypto, 'node:fs': fs, 'node:path': require('node:path'),
    './db': {}, './provider': {}, './public-url': {}, './storage': {},
  }, { fetch: async () => { referenceCalls++; return new Response('fixture', { status: referenceStatus, headers: { 'content-type': referenceMime } }); } });
  await references.assertReferenceReachable('https://cdn.invalid/valid.jpg');
  referenceMime = 'text/html';
  await assert.rejects(references.assertReferenceReachable('https://cdn.invalid/error.html'), /không phải ảnh/);
  referenceStatus = 403;
  await assert.rejects(references.assertReferenceReachable('https://cdn.invalid/expired.jpg'), /403/);
  const beforePrivate = referenceCalls;
  await assert.rejects(references.assertReferenceReachable('/api/files/local.jpg'), /HTTPS/);
  assert.equal(referenceCalls, beforePrivate);

  const db = new DatabaseSync(':memory:');
  db.exec(`CREATE TABLE jobs(id TEXT PRIMARY KEY, project_id TEXT, node_id TEXT, kind TEXT, model TEXT, status TEXT,
    input TEXT, output TEXT, error TEXT, provider_job TEXT, created_at INTEGER, updated_at INTEGER, recovery TEXT, request_key TEXT UNIQUE);
    CREATE TABLE assets(id TEXT, project_id TEXT, meta TEXT, url TEXT);
    CREATE TABLE settings(key TEXT PRIMARY KEY, value TEXT);`);
  const dbMock = { getDb: () => db, now: () => Date.now(), uid: () => crypto.randomUUID() };
  const jobs = load('lib/jobs.ts', { './db': dbMock, './inline-media': { externalizeInline: (v) => v } });
  const input = { projectId: 'test-project', nodeId: 'scene1', kind: 'video', model: 'iooai:test', input: {} };
  const first = jobs.claimJob(input, 'request-1');
  assert.equal(first.existing, false);
  assert.equal(jobs.claimJob(input, 'request-2').job.id, first.job.id, 'different request IDs cannot duplicate an unresolved scene');
  jobs.updateJob(first.job.id, { status: 'pending', providerJob: 'task_old' });
  assert.equal(jobs.claimJob(input, 'request-3').existing, true);
  jobs.updateJob(first.job.id, { status: 'succeeded', output: { url: '/local.mp4' } });
  assert.equal(jobs.claimJob(input, 'request-1').job.id, first.job.id, 'same request ID reuses its result');
  const second = jobs.claimJob(input, 'request-4');
  assert.equal(second.existing, false, 'new intentional request after success is possible');
  jobs.updateJob(second.job.id, { status: 'failed', error: 'Quá thời gian chờ (in_progress)' });
  assert.equal(jobs.claimJob(input, 'request-5').existing, true, 'legacy timeout remains blocked');
  const authorizedReplacement = jobs.claimJob(input, 'request-explicit-replacement', true);
  assert.equal(authorizedReplacement.existing, false, 'only an explicitly approved scoped replacement can replace unresolved work');
  assert.equal(jobs.claimJob(input, 'request-explicit-replacement', true).job.id, authorizedReplacement.job.id, 'approved replacement remains idempotent');

  let paused = true, runCalls = 0, phase = 'success';
  const next = { NextResponse: { json: (body, init) => new Response(JSON.stringify(body), { status: init?.status ?? 200 }) } };
  const guard = load('lib/model-call-guard.ts', { './db': { getSetting: () => paused, getDb: () => db }, 'next/server': next });
  const route = load('app/api/run/route.ts', {
    'next/server': next, '@/lib/model-call-guard': guard, '@/lib/jobs': jobs, '@/lib/job-outcome': outcome,
    '@/lib/models': { getModel: () => ({ id: 'iooai:test', provider: 'iooai', kind: 'video', label: 'test', config: {} }) },
    '@/lib/provider': { getProvider: () => ({ baseUrl: 'https://api.invalid/v1' }), runModel: async (opts) => {
      runCalls++; opts.onSubmit();
      if (phase === 'ambiguous') throw new Error('Lỗi kết nối tới nhà cung cấp');
      if (phase === 'rejected') throw new Error('API trả về 400: Invalid input');
      opts.onJobId('task_durable');
      if (phase === 'timeout') throw new Error('Quá thời gian chờ (in_progress)');
      return { source: 'https://cdn.invalid/video.mp4', mime: 'video/mp4', providerJob: 'task_durable' };
    } },
    '@/lib/reference-images': { prepareReferenceImages: async (v) => v, assertReferenceReachable: async () => {} },
    '@/lib/storage': { persistRemoteAsset: async () => { throw new Error('Download interrupted'); } },
  });
  const request = (node, requestId) => new Request('http://local/api/run', { method: 'POST', body: JSON.stringify({ modelId: 'iooai:test', projectId: 'test-project', nodeId: node, requestId, vars: {} }) });
  assert.equal((await route.POST(request('paused', 'request-paused'))).status, 423);
  assert.equal(runCalls, 0, 'paused route cannot upload or submit');
  paused = false;
  phase = 'timeout';
  const timed = await (await route.POST(request('timeout', 'request-timeout'))).json();
  assert.equal(jobs.getJob(timed.jobId).providerJob, 'task_durable');
  assert.equal(jobs.getJob(timed.jobId).status, 'pending');
  const beforeDuplicate = runCalls;
  assert.equal((await route.POST(request('timeout', 'request-other'))).status, 409);
  assert.equal(runCalls, beforeDuplicate);
  phase = 'ambiguous';
  const ambiguous = await (await route.POST(request('ambiguous', 'request-ambiguous'))).json();
  assert.equal(jobs.getJob(ambiguous.jobId).status, 'pending');
  phase = 'rejected';
  const rejected = await (await route.POST(request('rejected', 'request-rejected'))).json();
  assert.equal(jobs.getJob(rejected.jobId).status, 'failed');
  phase = 'success';
  const download = await (await route.POST(request('download', 'request-download'))).json();
  assert.equal(jobs.getJob(download.jobId).status, 'pending');
  assert.equal(jobs.getJobRecovery(download.jobId).source, 'https://cdn.invalid/video.mp4');
  paused = true;
  const grant = { token: 'test-single-use', remaining: 1, expiresAt: Date.now() + 60_000, modelId: 'iooai:test', projectId: 'test-project', nodeId: 'approved' };
  db.prepare("INSERT INTO settings(key,value) VALUES('generation_approval',?)").run(JSON.stringify(grant));
  const approvedRequest = () => new Request('http://local/api/run', { method: 'POST', headers: { 'x-generation-approval': grant.token },
    body: JSON.stringify({ modelId: grant.modelId, projectId: grant.projectId, nodeId: grant.nodeId, vars: {} }) });
  const beforeApproved = runCalls;
  await route.POST(approvedRequest());
  assert.equal(runCalls, beforeApproved + 1);
  assert.equal((await route.POST(approvedRequest())).status, 423, 'approval can be used only once');
  assert.equal(runCalls, beforeApproved + 1);
  assert.equal(guard.modelCallsPaused(), true, 'single-use approval never unlocks the application');

  // Recovery only GETs existing tasks and downloads; never creates a new task.
  const calls = []; let saved = 0; let taskPayload = { status: 'completed', output_url: 'https://cdn.invalid/done.mp4' };
  const recover = load('lib/recover-job.ts', {
    './db': dbMock, './jobs': jobs,
    './provider': { getProvider: () => ({ baseUrl: 'https://api.invalid/v1', apiKey: 'fake-test-key' }) },
    './video-task': video,
    './provider-download': downloader,
    './storage': { persistRemoteAsset: async ({ source }) => { saved++; return { id: 'asset-test', kind: 'video', url: '/test.mp4', source }; }, saveAsset: () => { throw new Error('Unexpected save'); } },
    './projects': { getGraph: () => ({ nodes: [] }), saveGraph: () => {} },
  }, { fetch: async (url, init) => { calls.push({ url, init }); assert.equal(init.method ?? 'GET', 'GET'); return new Response(JSON.stringify(taskPayload)); } });
  const old = jobs.createJob({ ...input, nodeId: 'recover' });
  jobs.updateJob(old.id, { status: 'pending', providerJob: 'task_recover' });
  const recovered = await recover.recoverJob(old.id);
  assert.equal(recovered.status, 'succeeded');
  assert.equal(saved, 1);
  await recover.recoverJob(old.id);
  assert.equal(saved, 1, 'repeated recovery reuses the saved file');
  assert.equal(calls.length, 1, 'repeated recovery does not refetch completed tasks');
  const notReady = jobs.createJob({ ...input, nodeId: 'not-ready' });
  jobs.updateJob(notReady.id, { status: 'pending', providerJob: 'task_not_ready' });
  taskPayload = { status: 'completed', download_ready: false, output_url: 'https://cdn.invalid/not-ready.mp4' };
  assert.equal((await recover.recoverJob(notReady.id)).status, 'pending');
  assert.equal(saved, 1, 'not-ready content is never downloaded');
  const failed = jobs.createJob({ ...input, nodeId: 'failed' });
  jobs.updateJob(failed.id, { status: 'pending', providerJob: 'task_failed' });
  taskPayload = { status: 'failed', error: { message: 'domain_retired' } };
  assert.equal((await recover.recoverJob(failed.id)).status, 'failed');
  assert.equal(saved, 1);
  const missing = jobs.createJob({ ...input, nodeId: 'missing' });
  jobs.updateJob(missing.id, { status: 'pending' });
  await assert.rejects(recover.recoverJob(missing.id), /Thiếu mã/);
  db.close();
  console.log('PASS: offline submission locks, idempotency, durable task IDs, ambiguous timeouts, download recovery, output_url, readiness, invalid video rejection and no recovery submissions.');
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
