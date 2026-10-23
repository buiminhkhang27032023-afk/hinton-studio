import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);
const jobId = process.argv[2] || "svgen_05e829f5-2ac0-4ede-a816-0969e66c249f";

async function main() {
  console.log(`Polling job ${jobId}...`);
  for (let i = 0; i < 60; i++) {
    const res = await fetch(`${prov.baseUrl}/videos/${jobId}`, {
      headers: { Authorization: `Bearer ${prov.apiKey}` },
    });
    const data = await res.json();
    console.log(`[Attempt ${i + 1}] Status: ${data.status}, Progress: ${data.progress}`);
    if (data.status === "completed" || data.status === "succeeded" || data.status === "done") {
      console.log("Job completed! Downloading video...");
      const cRes = await fetch(`${prov.baseUrl}/videos/${jobId}/content`, {
        headers: { Authorization: `Bearer ${prov.apiKey}` },
      });
      const buffer = Buffer.from(await cRes.arrayBuffer());
      fs.writeFileSync("temp_test_male_i2v.mp4", buffer);
      console.log(`Downloaded temp_test_male_i2v.mp4 (${buffer.length} bytes)`);
      return;
    }
    if (data.status === "failed" || data.status === "error") {
      console.error("Job failed:", data);
      return;
    }
    await new Promise((r) => setTimeout(r, 6000));
  }
  console.log("Timed out waiting for job.");
}

main().catch(console.error);
