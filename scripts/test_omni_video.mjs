import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

async function testVideo() {
  const res = await fetch(`${prov.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prov.apiKey}`,
    },
    body: JSON.stringify({
      model: "google-omni-flash",
      prompt: "test",
      seconds: 5,
    }),
  });
  console.log("Video status:", res.status);
  console.log("Video response:", await res.text());
}

testVideo();
