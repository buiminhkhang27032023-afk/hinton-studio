const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const row = db.prepare("SELECT value FROM settings WHERE key = 'provider_iooai'").get();
const iooai = JSON.parse(row.value);
const baseUrl = iooai.baseUrl || "https://api.iooai.cn/v1";

async function inspectRaw() {
  const res = await fetch(`${baseUrl}/videos/task_lXcoL2t5FVSZOvs1tpaRkJ8KOlT6aKKW`, {
    headers: { "Authorization": `Bearer ${iooai.apiKey}` }
  });
  const data = await res.json();
  console.log("Raw response keys:", Object.keys(data));
  console.log("Raw response:", JSON.stringify(data, null, 2));
}

inspectRaw();
