import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

const imgBase64 = fs.readFileSync("user_model_face_4.png").toString("base64");
const dataUri = `data:image/png;base64,${imgBase64}`;

async function testVeo() {
  console.log("Submitting Veo-3.1 video generation for user_model_face_4.png...");
  const res = await fetch(`${prov.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prov.apiKey}`,
    },
    body: JSON.stringify({
      model: "veo-3.1",
      prompt: "A cinematic high-fashion portrait video of the exact same young Asian woman in the reference image with long black hair and bright red lips, wearing a dark blue lace dress, posing gracefully, turning her head gently, blinking with soft gaze, studio fashion lighting, 4k 60fps",
      seconds: 4,
      size: "1280x720",
      input_reference: dataUri,
    }),
  });
  console.log("Veo-3.1 Status:", res.status);
  const text = await res.text();
  console.log("Veo-3.1 Response:", text);
}

testVeo().catch(console.error);
