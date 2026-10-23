import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

async function testOmni() {
  console.log("Testing google-omni-flash on", prov.baseUrl);
  
  // Test chat/completions endpoint
  try {
    const res = await fetch(`${prov.baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${prov.apiKey}`,
      },
      body: JSON.stringify({
        model: "google-omni-flash",
        messages: [{ role: "user", content: "Chào bạn, bạn có thể tạo ảnh hay xử lý hình ảnh thời trang không?" }],
      }),
    });
    console.log("Chat status:", res.status);
    console.log("Chat response:", await res.text());
  } catch (e) {
    console.log("Chat error:", e.message);
  }
}

testOmni();
