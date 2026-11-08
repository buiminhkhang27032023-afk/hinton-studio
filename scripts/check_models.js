const { DatabaseSync } = require('node:sqlite');
const db = new DatabaseSync('data/studio.db');
const models = db.prepare("SELECT id, label, config FROM models WHERE id LIKE '%seedance%' OR id LIKE '%iooai%'").all();
console.log(JSON.stringify(models, null, 2));
