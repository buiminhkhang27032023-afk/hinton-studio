const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const jobs = db.prepare("SELECT id, project_id, node_id, model, status, error, provider_job, created_at, updated_at FROM jobs WHERE created_at > ? ORDER BY created_at DESC").all(Date.now() - 3600 * 1000);
console.log("Jobs in the last hour:", JSON.stringify(jobs, null, 2));
