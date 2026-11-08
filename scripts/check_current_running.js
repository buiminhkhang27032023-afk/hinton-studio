const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync("data/studio.db");
const jobs = db.prepare("SELECT id, project_id, node_id, model, status, error, provider_job, created_at, updated_at FROM jobs ORDER BY created_at DESC LIMIT 5").all();
console.log("Recent jobs in DB:", JSON.stringify(jobs, null, 2));

const row = db.prepare("SELECT value FROM settings WHERE key = 'provider_iooai'").get();
const iooai = JSON.parse(row.value);
const baseUrl = iooai.baseUrl || "https://api.iooai.cn/v1";

async function checkLatest() {
  if (!jobs.length) return;
  const latest = jobs[0];
  console.log("\nChecking latest job:", latest.id, "providerJob:", latest.providerJob);

  if (latest.providerJob) {
    try {
      const res = await fetch(`${baseUrl}/videos/${latest.providerJob}`, {
        headers: { "Authorization": `Bearer ${iooai.apiKey}` }
      });
      const data = await res.json();
      console.log("Upstream status:", JSON.stringify(data, null, 2));
    } catch (e) {
      console.log("Error querying upstream:", e.message);
    }
  }
}

checkLatest();
