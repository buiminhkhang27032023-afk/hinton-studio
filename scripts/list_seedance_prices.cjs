const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('d:/phim ai thời trang/data/studio.db');

const rows = db.prepare("SELECT id, label, provider, description, config FROM models WHERE id LIKE ? OR label LIKE ?").all('%seedance%', '%Seedance%');
console.log('Found', rows.length, 'Seedance models in DB:\n');
rows.forEach(r => {
  const cfg = JSON.parse(r.config);
  console.log(`[ID]: ${r.id}`);
  console.log(`[Label]: ${r.label}`);
  console.log(`[Provider]: ${r.provider}`);
  console.log(`[Description]: ${r.description}`);
  console.log(`[Model]: ${cfg.body?.model || cfg.body?.task_type || ''}`);
  console.log(`[Default Seconds]: ${cfg.body?.seconds || cfg.body?.duration || ''}`);
  console.log('---');
});
