const ts = require('typescript');
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const calls = [];
let responses = [];
const mod = { exports: {} };
const code = ts.transpileModule(fs.readFileSync('lib/provider.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText;
vm.runInNewContext(code, {
  exports: mod.exports, module: mod,
  require: () => ({ getSetting: () => ({ apiKey: 'test-only' }) }),
  URL, URLSearchParams, AbortSignal, Buffer,
  setTimeout: (fn) => { fn(); },
  fetch: async (url, init) => {
    calls.push({ url, init });
    const next = responses.shift();
    if (!next) throw new Error('Unexpected request');
    return new Response(JSON.stringify(next.body), { status: next.status ?? 200 });
  },
});
const input = {
  model: 'iooai:omni_flash_10s', providerId: 'iooai', kind: 'video',
  vars: { images: ['https://example.com/portrait.jpg'], aspect: '9:16', resolution: '480p', prompt: 'Walk' },
  config: { endpoint: '/videos', body: { model: 'omni_flash_10s', images: '{{images}}', resolution: '{{resolution}}', ratio: '{{aspect}}', seconds: '10' },
    jobPath: 'id', pollEndpoint: '/videos/{{job}}', resultPath: 'output_url', timeout: 10 },
};
(async () => {
  responses = [{ body: { id: 'job1' } }, { body: { status: 'completed', download_ready: false } },
    { body: { status: 'completed', download_ready: true, output_url: 'https://example.com/video.mp4' } }];
  const result = await mod.exports.runModel(input);
  assert.equal(result.source, 'https://example.com/video.mp4');
  assert.equal(calls[0].url, 'https://api.iooai.cn/v1/videos');
  const body = JSON.parse(calls[0].init.body);
  assert.equal(body.model, 'omni_flash_10s');
  assert.equal(body.seconds, '10');
  assert.equal(body.resolution, '720p');
  assert.deepEqual(body.images, input.vars.images);
  assert.equal(calls.length, 3);
  const count = calls.length;
  await assert.rejects(mod.exports.runModel({ ...input, vars: { ...input.vars, images: ['/api/files/local.png'] } }), /HTTPS/);
  await assert.rejects(mod.exports.runModel({ ...input, vars: { ...input.vars, images: [] } }), /HTTPS/);
  assert.equal(calls.length, count);
  responses = [{ status: 502, body: { error: { message: 'upstream' } } }];
  await assert.rejects(mod.exports.runModel(input), /502/);
  assert.equal(calls.length, count + 1, 'Never resubmit paid IOOAI jobs automatically');
  console.log('IOOAI checks passed: payload, polling readiness, local-image rejection, no paid retry.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
