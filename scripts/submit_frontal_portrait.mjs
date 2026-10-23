import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

async function main() {
  console.log("Submitting Veo 3.1 Close-Up Frontal Portrait...");
  const prompt = "Cinematic extreme close-up frontal portrait shot of a gorgeous young Asian woman with short wavy light-brown hair, looking directly straight into the camera lens, eye contact with the viewer, gentle subtle warm smile, soft natural blinking, head perfectly centered and facing forward, soft diffused natural daylight, shallow depth of field, 35mm master portrait photography, 4k ultra-detailed, photorealistic.";
  
  const res = await fetch(`${prov.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prov.apiKey}`,
    },
    body: JSON.stringify({
      model: "veo-3.1",
      prompt: prompt,
      seconds: 8,
      size: "1280x720",
    }),
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Result:", JSON.stringify(data));
  if (data.id) {
    fs.writeFileSync("temp_frontal_job.json", JSON.stringify({ jobId: data.id, prompt }));
    console.log(`Saved job ${data.id} to temp_frontal_job.json`);
  }
}

main().catch(console.error);
