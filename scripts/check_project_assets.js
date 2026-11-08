const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const assets = db.prepare("SELECT id, name, kind, url, meta, created_at FROM assets WHERE project_id = 'prj_06d6f1c9496a' AND kind = 'video'").all();
console.log("Videos in project:", JSON.stringify(assets, null, 2));
