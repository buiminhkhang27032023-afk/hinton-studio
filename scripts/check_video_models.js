const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const videoModels = db.prepare("SELECT id, label, provider, config FROM models WHERE kind = 'video'").all();
console.log("Total video models:", videoModels.length);
videoModels.forEach(m => console.log(`[${m.provider}] ${m.id} -> ${m.label}`));
