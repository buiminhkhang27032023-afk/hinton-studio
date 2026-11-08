const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = 'provider_iooai'").get();
const iooai = JSON.parse(row.value);
const baseUrl = iooai.baseUrl || "https://api.iooai.cn/v1";

async function checkBalance() {
  const origin = new URL(baseUrl).origin;
  try {
    const res = await fetch(`${origin}/dashboard/billing/subscription`, {
      headers: { "Authorization": `Bearer ${iooai.apiKey}` }
    });
    const d = await res.json();
    console.log("Subscription / Balance:", JSON.stringify(d, null, 2));
  } catch (e) {
    console.log("Err:", e.message);
  }
}

checkBalance();
