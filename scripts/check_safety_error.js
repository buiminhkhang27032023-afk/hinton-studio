const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const job = db.prepare("SELECT id, model, status, error, input, created_at FROM jobs ORDER BY created_at DESC LIMIT 1").get();
console.log("Latest job details:");
console.log(JSON.stringify(job, null, 2));
