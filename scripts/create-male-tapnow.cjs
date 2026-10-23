const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const root = process.cwd();
const out = path.join(root, 'outputs', 'male-tapnow');
fs.mkdirSync(out, { recursive: true });
const selectedModel = process.argv[2] || 'seedance-2.0-fast';
if (!['seedance-2.0-fast', 'google-omni-flash'].includes(selectedModel)) throw new Error('Unsupported model');
const stateFile = path.join(out, `job-${selectedModel}.json`);
const inputFile = 'C:/Users/CHENQI~1/AppData/Local/Temp/codex-clipboard-7ba97fc2-5b7c-4cf2-ae82-063603dd9b10.png';
const prompt = `Create a 10-second vertical photorealistic men's fashion film. The supplied reference sheet shows ONE adult man in multiple views, not multiple people. Preserve this exact man's face, short styled hair, smile, body proportions and identity. Keep his dark tailored suit, white dress shirt and black leather dress shoes throughout. No female model. No face replacement on a female body. Generate one anatomically consistent adult male body.
0–2 seconds: dramatic extreme low-angle shot with camera close to the floor pointing upward. Black dress shoes nearest the lens, then trouser legs and suit torso in perspective. He looks down at the lens and subtly adjusts his jacket. Natural realistic movement. Bright clean studio.
At exactly 2 seconds HARD CUT to an eye-level locked-off full-body men's editorial lookbook. One real man on the right; a small stylized 3D chibi of the same man in the same dark suit on the left as a decorative graphic, with small flat-lay cards showing suit, white shirt, black dress shoes. Clean white magazine grid, no text or logos.
2–4 seconds: front full-body pose, confident smile, lightly straighten the lapel.
4–6 seconds: hard cut to a three-quarter full-body pose, small natural shift of weight.
6–8 seconds: hard cut to a full-body side profile, subtly turn head toward the lens.
8–10 seconds: hard cut to front full-body pose, one small step and hold a relaxed confident smile. Keep shoes and head inside frame.
After the opening all shots use fixed camera framing. Preserve identity and wardrobe across every cut. Real skin detail, soft natural studio lighting. No morphing, no blended clothes, no duplicated real man, no extra limbs, no flicker, no subtitles, no watermark. The reference sheet supplies identity; do not animate the sheet as a collage. Produce genuine camera perspective and human movement.`;
fs.writeFileSync(path.join(out, 'prompt.txt'), prompt);
const db = new DatabaseSync(path.join(root, 'data', 'studio.db'));
const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('provider');
if (!row) throw new Error('Missing configured gateway');
const provider = JSON.parse(row.value);
const base = provider.baseUrl.replace(/\/+$/, '');
const auth = { Authorization: `Bearer ${provider.apiKey}` };
const save = (state) => fs.writeFileSync(stateFile, JSON.stringify(state, null, 2));
async function main() {
  let state = fs.existsSync(stateFile) ? JSON.parse(fs.readFileSync(stateFile)) : null;
  if (!state) {
    // Persist before POST so rerunning after an ambiguous timeout never duplicates a paid request.
    state = { model: selectedModel, status: 'submitting', submittedAt: Date.now() };
    save(state);
    const response = await fetch(`${base}/videos`, {
      method: 'POST', headers: { ...auth, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: state.model, prompt, seconds: 10, size: '720x1280', input_reference: `data:image/png;base64,${fs.readFileSync(inputFile).toString('base64')}` }),
      signal: AbortSignal.timeout(180000),
    });
    const raw = await response.text();
    let data; try { data = JSON.parse(raw); } catch { data = { message: raw.slice(0, 400) }; }
    if (!response.ok) { state.status = 'rejected'; state.error = data; save(state); throw new Error(`Create HTTP ${response.status}: ${JSON.stringify(data).slice(0, 800)}`); }
    state.jobId = data.id ?? data.task_id ?? data.data?.task_id;
    state.status = data.status ?? 'queued';
    save(state);
    console.log(JSON.stringify({ jobId: state.jobId, status: state.status, model: state.model }));
  }
  if (!state.jobId) throw new Error('No job id: inspect saved state before another submission.');
  for (let attempt = 0; attempt < 180; attempt++) {
    const response = await fetch(`${base}/videos/${encodeURIComponent(state.jobId)}`, { headers: auth, signal: AbortSignal.timeout(45000) });
    if (!response.ok) throw new Error(`Poll HTTP ${response.status}; rerun to resume existing job`);
    const data = await response.json();
    state.status = String(data.status ?? data.data?.status ?? '').toLowerCase();
    state.updatedAt = Date.now();
    save(state);
    if (attempt % 6 === 0) console.log(JSON.stringify({ status: state.status, progress: data.progress }));
    if (['failed', 'error', 'cancelled'].includes(state.status)) { state.error = data.error ?? data; save(state); throw new Error(JSON.stringify(state.error)); }
    if (['completed', 'succeeded', 'success', 'done'].includes(state.status)) {
      const url = data.output_url ?? data.data?.[0]?.url;
      const video = await fetch(url || `${base}/videos/${encodeURIComponent(state.jobId)}/content`, { headers: url ? {} : auth, signal: AbortSignal.timeout(180000) });
      if (!video.ok) throw new Error(`Download HTTP ${video.status}`);
      const file = path.join(out, 'male-lookbook.mp4');
      fs.writeFileSync(file, Buffer.from(await video.arrayBuffer()));
      state.file = file; save(state); console.log(JSON.stringify({ file, bytes: fs.statSync(file).size }));
      return;
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error('Polling limit; rerun to resume existing job without resubmission.');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
