const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/studio.db');
const row = db.prepare('SELECT data FROM graphs WHERE project_id = ?').get('prj_06d6f1c9496a');
const data = JSON.parse(row.data);
const node = data.nodes.find(n => n.id === 'generate-j4er7l');

const cleanPrompt = `[@Image 1]: Female lead (Linh), exact face, dress, hair.
[@Image 2]: Male lead (Thắng), exact face, hair, casual jacket.
[@Image 3]: Riverside grassy dyke, concrete stairs, night atmosphere.
10-second cinematic 16:9 live-action scene, cool moonlight.

• 0.00–4.00s: Wide shot. Linh [@Image 1] sits on grass near concrete stairs by the night river. Thắng [@Image 2] walks along upper dyke path.
• 4.00–7.00s: Medium shot. Thắng stops at stairs, notices her, speaking:
Thắng: “Linh?”
• 7.00–10.00s: Over-shoulder shot. Linh turns up, recognizes him. Thắng steps down.
Linh: “Ơ… anh Thắng.”
Thắng: “Sao em ngồi đây?”
Linh: “Em ra hóng gió tí.”

Audio: Night breeze, river ripples. Authentic northern Vietnamese voice lip-sync for Thắng and Linh. No music, no subtitles, smooth camera.`;

node.data.prompt = cleanPrompt;
node.data.modelId = 'iooai:omni_flash_10s';
node.data.aspect = '16:9';
node.data.resolution = '720p';
node.data.duration = 10;
node.data.status = 'idle';
delete node.data.error;

db.prepare('UPDATE graphs SET data = ?, updated_at = ? WHERE project_id = ?').run(
  JSON.stringify(data),
  Date.now(),
  'prj_06d6f1c9496a'
);
console.log('Graph updated successfully! New prompt length:', node.data.prompt.length);
