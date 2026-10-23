const fs = require('node:fs');
const path = require('node:path');
const base = 'http://localhost:3210';
const projectId = 'prj_8a2e12414084';
const dir = path.join(process.cwd(), 'outputs', 'male-tapnow');
async function request(url, init) {
  const response = await fetch(base + url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? JSON.stringify(data));
  return data;
}
function inline(url) {
  const parts = url.split('/');
  const file = path.join(process.cwd(), 'data', 'assets', decodeURIComponent(parts[3]), path.basename(decodeURIComponent(parts[4])));
  const ext = path.extname(file).toLowerCase();
  const mime = ext === '.webp' ? 'image/webp' : ext === '.png' ? 'image/png' : 'image/jpeg';
  return `data:${mime};base64,${fs.readFileSync(file).toString('base64')}`;
}
async function main() {
  const graph = await request(`/api/projects/${projectId}/graph`);
  const male = inline(graph.nodes.find(n => n.id === 'male_reference').data.imageUrl);
  for (const node of graph.nodes.filter(n => n.type === 'fashion_tryon')) {
    const stateFile = path.join(dir, `${node.id}.json`);
    if (fs.existsSync(stateFile)) { console.log(`${node.id}: already attempted; skipping`); continue; }
    const garmentEdge = graph.edges.find(e => e.target === node.id && e.targetHandle === 'garment');
    const garment = inline(graph.nodes.find(n => n.id === garmentEdge.source).data.imageUrl);
    const prompt = 'Image 1 is the adult man identity reference; Image 2 is the garment reference. ' + node.data.prompt;
    fs.writeFileSync(stateFile, JSON.stringify({ status: 'submitting', submittedAt: Date.now() }));
    console.log(`${node.id}: generating`);
    let result;
    try {
      result = await request('/api/run', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modelId: node.data.modelId, projectId, nodeId: node.id, name: node.data.label,
          vars: { prompt, modelImage: male, garmentImage: garment, image: male, images: [male, garment], size: '864x1536' } }),
        signal: AbortSignal.timeout(900000),
      });
      fs.writeFileSync(stateFile, JSON.stringify({ status: 'done', result }, null, 2));
    } catch (error) {
      fs.writeFileSync(stateFile, JSON.stringify({ status: 'error', error: error.message }, null, 2));
      console.log(`${node.id}: ${error.message}`);
      // Stop on a gateway failure instead of submitting the remaining paid calls blindly.
      break;
    }
    const latest = await request(`/api/projects/${projectId}/graph`);
    const target = latest.nodes.find(n => n.id === node.id);
    target.data.result = result.output; target.data.status = 'done'; target.data.error = null;
    await request(`/api/projects/${projectId}/graph`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(latest) });
    console.log(`${node.id}: done ${result.output.url}`);
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
