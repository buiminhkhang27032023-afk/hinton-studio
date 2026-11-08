const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('d:/phim ai thời trang/data/studio.db');

const rows = db.prepare("SELECT id, config FROM models WHERE id LIKE ?").all('%seedance%');
for (const r of rows) {
  const cfg = JSON.parse(r.config);
  if (cfg.body && cfg.body.images && !cfg.body.audios) {
    cfg.body.audios = "{{audios}}";
    db.prepare("UPDATE models SET config = ? WHERE id = ?").run(JSON.stringify(cfg), r.id);
    console.log('Updated model in DB:', r.id);
  }
}
db.prepare("INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)").run('preset_version', '23');
console.log('Updated preset_version to 23!');
