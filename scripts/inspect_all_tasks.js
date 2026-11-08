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
  "task_GfyoJ4w1I8KUfFB5Js72ct28t0sv7CJt",
  "task_VrEsgIlBuyb1tmorMyn9ESIhIU5sclD1"
];

async function inspectAll() {
  for (const tid of taskIds) {
    try {
      const res = await fetch(`${baseUrl}/videos/${tid}`, {
        headers: { "Authorization": `Bearer ${iooai.apiKey}` }
      });
      const data = await res.json();
      console.log(`\n=== Task ${tid} (${data.model}) ===`);
      console.log("Status:", data.status, "Seconds:", data.seconds);
      console.log("Output URL:", data.output_url);
    } catch (e) {
      console.log(`Task ${tid} err:`, e.message);
    }
  }
}

inspectAll();
