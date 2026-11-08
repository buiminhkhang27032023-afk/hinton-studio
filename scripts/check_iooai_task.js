const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = 'provider_iooai'").get();
const iooai = JSON.parse(row.value);
const baseUrl = iooai.baseUrl || "https://api.iooai.cn/v1";

async function checkTask() {
  const tid = "task_olWhsZhLDiHcP0eLtL3z0V4aMKr9OPxv";
  try {
    const res = await fetch(`${baseUrl}/videos/${tid}`, {
      headers: { "Authorization": `Bearer ${iooai.apiKey}` }
    });
    const d = await res.json();
    console.log("Task olWhsZhLDiHcP0eLtL3z0V4aMKr9OPxv:");
    console.log(JSON.stringify(d, null, 2));
  } catch (e) {
    console.log("Err:", e.message);
  }
}

checkTask();
