const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const rows = db.prepare("SELECT id, label, provider, config FROM models WHERE provider = 'iooai'").all();
console.log("Current IOOAI models count:", rows.length);
rows.forEach(r => console.log(`- [${r.id}]: ${r.label}`));
