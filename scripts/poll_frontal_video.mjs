import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);
const jobData = JSON.parse(fs.readFileSync("temp_frontal_job.json", "utf8"));
const jobId = jobData.jobId;

async function main() {
  console.log(`Polling frontal portrait job ${jobId}...`);
  for (let i = 0; i < 40; i++) {
    const res = await fetch(`${prov.baseUrl}/videos/${jobId}`, {
      headers: { Authorization: `Bearer ${prov.apiKey}` },
    });
    const data = await res.json();
    console.log(`[Attempt ${i + 1}] Status: ${data.status}, Progress: ${data.progress}`);
    
    if (data.status === "completed" || data.status === "succeeded" || data.status === "done") {
      console.log("Job completed! Downloading frontal video content...");
      const cRes = await fetch(`${prov.baseUrl}/videos/${jobId}/content`, {
        headers: { Authorization: `Bearer ${prov.apiKey}` },
      });
      const buffer = Buffer.from(await cRes.arrayBuffer());
      fs.writeFileSync("frontal_portrait_raw.mp4", buffer);
      console.log(`Saved frontal_portrait_raw.mp4 (${buffer.length} bytes)!`);
      return;
    }
    
    if (data.status === "failed" || data.status === "error") {
      console.error("Job failed:", data);
      return;
    }
    
    await new Promise((r) => setTimeout(r, 6000));
  }
}

main().catch(console.error);
