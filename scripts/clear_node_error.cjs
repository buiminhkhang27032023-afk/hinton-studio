const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('d:/phim ai thời trang/data/studio.db');

const row = db.prepare('SELECT data FROM graphs WHERE project_id = ?').get('prj_06d6f1c9496a');
if (row && row.data) {
  const g = JSON.parse(row.data);
  const node = g.nodes.find(n => n.id === 'generate-4kbc7i');
  if (node) {
    node.data.status = 'idle';
    delete node.data.error;
    db.prepare('UPDATE graphs SET data = ?, updated_at = ? WHERE project_id = ?').run(
      JSON.stringify(g),
      Date.now(),
      'prj_06d6f1c9496a'
    );
    console.log('Cleared error and reset generate-4kbc7i to idle!');
  }
}
