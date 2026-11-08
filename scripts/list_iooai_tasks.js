const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = 'provider_iooai'").get();
const iooai = JSON.parse(row.value);
const baseUrl = iooai.baseUrl || "https://api.iooai.cn/v1";

async function listRecentTasks() {
  const endpoints = [
    `${baseUrl}/videos`,
    `${baseUrl}/tasks`,
    `${baseUrl}/videos?limit=10`
  ];
  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        headers: { "Authorization": `Bearer ${iooai.apiKey}` }
      });
      console.log(`Endpoint ${ep} status:`, res.status);
      const data = await res.json();
      console.log("Data keys/summary:", Array.isArray(data) ? `Array of ${data.length}` : (data.data ? `data.data length: ${data.data.length}` : data));
      if (Array.isArray(data.data)) {
        console.log("Latest 5 items:", JSON.stringify(data.data.slice(0, 5), null, 2));
      }
    } catch (e) {
      console.log(`Endpoint ${ep} err:`, e.message);
    }
  }
}

listRecentTasks();
