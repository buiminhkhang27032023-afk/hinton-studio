const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const rows = db.prepare("SELECT key, value FROM settings").all();
console.log("Settings keys:", rows.map(r => r.key));

const presets = db.prepare("SELECT * FROM presets").all();
console.log("Presets:", presets);

const memory = db.prepare("SELECT * FROM memory").all();
console.log("Memory:", memory);

const muse = db.prepare("SELECT * FROM muse_tasks").all();
console.log("Muse tasks:", muse);
