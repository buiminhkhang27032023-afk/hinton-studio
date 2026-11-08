const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const jobs = db.prepare("SELECT id, project_id, node_id, model, status, error, input, output, created_at, updated_at FROM jobs ORDER BY created_at DESC LIMIT 3").all();
console.log(JSON.stringify(jobs, null, 2));
