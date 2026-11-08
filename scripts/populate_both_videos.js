const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/studio.db');

const projectId = 'prj_06d6f1c9496a';
const nodeId = 'generate-j4er7l';

const row = db.prepare('SELECT data FROM graphs WHERE project_id = ?').get(projectId);
const data = JSON.parse(row.data);
const node = data.nodes.find(n => n.id === nodeId);

const v1 = {
  id: 'asset_be7da93697d5',
  url: '/api/files/prj_06d6f1c9496a/asset_be7da93697d5-generate-j4er7l.mp4',
  kind: 'video',
  name: 'Seedance 2.5 Kênh Gốc (10s)',
  label: 'v1 - Seedance 2.5 (10s · 18.7MB)',
  model: 'iooai:seedance2.5 官渠',
  duration: 10,
  createdAt: 1793755541286
};

const v2 = {
  id: 'asset_afd6d3eb4e38',
  url: '/api/files/prj_06d6f1c9496a/asset_afd6d3eb4e38-generate-01-21-31.mp4',
  kind: 'video',
  name: 'Seedance 2.0 Bản Đầy Đủ (15s)',
  label: 'v2 - Seedance 2.0 (15s · 7.5MB)',
  model: 'iooai:seedance20-special',
  duration: 15,
  createdAt: 1793755826507
};

node.data.history = [v1, v2];
node.data.result = v2;
node.data.videoUrl = v2.url;
node.data.status = 'done';
node.data.error = null;

db.prepare('UPDATE graphs SET data = ?, updated_at = ? WHERE project_id = ?').run(
  JSON.stringify(data),
  Date.now(),
  projectId
);

console.log('Successfully set both versions (v1 & v2) into node.data.history!');
console.log('v1 URL:', v1.url);
console.log('v2 URL:', v2.url);
