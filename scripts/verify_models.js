const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const rows = db.prepare("SELECT id, label, kind FROM models WHERE provider = 'iooai'").all();
console.log("Current active IOOAI models:");
rows.forEach((r, i) => console.log(`${i + 1}. [${r.kind}] ${r.id}: ${r.label}`));
