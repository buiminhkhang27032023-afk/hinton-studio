const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const rows = db.prepare("SELECT id, label, config FROM models WHERE label LIKE '%Seedance%' OR label LIKE '%2.0%'").all();
console.log(JSON.stringify(rows.map(r => ({ id: r.id, label: r.label, model: JSON.parse(r.config).body?.model })), null, 2));
