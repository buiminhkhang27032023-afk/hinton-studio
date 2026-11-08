const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = 'provider_iooai'").get();
const iooai = JSON.parse(row.value);
const baseUrl = iooai.baseUrl || "https://api.iooai.cn/v1";

// Let's test calling MiniMax H3 and Seedance 2.0 满血 with a dummy dry-run to see what fields they accept
async function testSchema() {
  console.log("Checking MiniMax schema on IOOAI...");
  // MiniMax H3 accepts input_reference (string URL)
}
