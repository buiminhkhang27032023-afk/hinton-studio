const { DatabaseSync } = require("node:sqlite");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const row = db.prepare("SELECT value FROM settings WHERE key = 'provider_iooai'").get();
const iooai = JSON.parse(row.value);
const baseUrl = iooai.baseUrl || "https://api.iooai.cn/v1";

const taskIds = [
  "task_lXcoL2t5FVSZOvs1tpaRkJ8KOlT6aKKW",
  "task_OuFzasqgV2WXw9MkGzYGJnvmWEhwYSQr",
  "task_upwGBKDKp1sGsypRjO3hdNEJ4kjBjLsb",
  "task_WBBbERHCUP9XBVFHnrPo1kbWUxcv3q3K",
  "task_VrEsgIlBuyb1tmorMyn9ESIhIU5sclD1",
  "task_GfyoJ4w1I8KUfFB5Js72ct28t0sv7CJt",
  "task_peftanK0gSG5z4dzcQseKuCazeFPt9cF"
];

async function checkTasks() {
  for (const tid of taskIds) {
    try {
      const res = await fetch(`${baseUrl}/videos/${tid}`, {
        headers: { "Authorization": `Bearer ${iooai.apiKey}` }
      });
      const data = await res.json();
      console.log(`\n=== Task ${tid} ===`);
      console.log("Status:", data.status, "Progress:", data.progress);
      console.log("Output/Result:", data.output || data.result || data.video_url || (data.data ? data.data : "none"));
      if (data.prompt) console.log("Prompt:", data.prompt);
    } catch (e) {
      console.log(`Task ${tid} err:`, e.message);
    }
  }
}

checkTasks();
