const fs = require('node:fs');
const path = require('node:path');
const base = 'http://localhost:3210';
const output = path.join(process.cwd(), 'outputs', 'male-tapnow');
fs.mkdirSync(output, { recursive: true });
const statePath = path.join(output, 'project.json');
async function request(url, init) {
  const res = await fetch(base + url, init);
  const data = await res.json();
  if (!res.ok) throw new Error(JSON.stringify(data));
  return data;
}
async function main() {
  if (fs.existsSync(statePath)) { console.log(fs.readFileSync(statePath, 'utf8')); return; }
  const project = await request('/api/projects', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: 'Lookbook nam · Góc máy thấp · 10s' }),
  });
  // Persist project identity immediately to avoid accidentally creating duplicates.
  fs.writeFileSync(statePath, JSON.stringify({ projectId: project.id, status: 'preparing' }, null, 2));
  const imagePath = 'C:/Users/CHENQI~1/AppData/Local/Temp/codex-clipboard-5658e306-de0b-4188-ba1a-ad8eefe4dcf5.png';
  const form = new FormData();
  form.append('file', new Blob([fs.readFileSync(imagePath)], { type: 'image/png' }), 'male-character-reference.png');
  form.append('projectId', project.id);
  const asset = await request('/api/upload', { method: 'POST', body: form });
  const prompt = fs.readFileSync(path.join(output, 'prompt.txt'), 'utf8');
  const graph = {
    nodes: [
      { id: 'male_reference', type: 'image', position: { x: 60, y: 100 }, data: { label: 'Nhân vật nam · ảnh tham chiếu', imageUrl: asset.url, assetId: asset.id, result: asset, status: 'idle' } },
      { id: 'male_video', type: 'generate', position: { x: 520, y: 100 }, data: { label: 'Lookbook nam · 10 giây', modelKind: 'video', modelId: 'iooai:omni_flash_10s', duration: 10, resolution: '720p', aspect: '9:16', prompt, status: 'idle', result: null,
        continuity: 'Giữ chính xác nhân vật nam trong ảnh tham chiếu; không dùng nhân vật nữ. Góc máy cực thấp mở đầu, sau đó cắt sang lookbook toàn thân, suit tối màu và sơ mi trắng.' } },
    ],
    edges: [{ id: 'male-reference-to-video', source: 'male_reference', target: 'male_video' }],
    viewport: { x: 20, y: 20, zoom: 0.8 },
  };
  await request(`/api/projects/${project.id}/graph`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(graph) });
  const verified = await request(`/api/projects/${project.id}/graph`);
  if (verified.nodes.length !== 2 || verified.nodes[0].data.imageUrl !== asset.url) throw new Error('Graph verification failed');
  const state = { projectId: project.id, name: project.name, url: `${base}/canvas/${project.id}`, imageUrl: asset.url, status: 'ready', generationSubmitted: false };
  fs.writeFileSync(statePath, JSON.stringify(state, null, 2));
  console.log(JSON.stringify(state));
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
