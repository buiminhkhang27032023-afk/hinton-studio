const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const p = db.prepare("SELECT value FROM settings WHERE key = 'provider'").get();
console.log("Active default provider:", p ? p.value : "none");
