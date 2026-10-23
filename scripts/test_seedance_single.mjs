import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

const imgBase64 = fs.readFileSync("user_model_face.png").toString("base64");
const dataUri = `data:image/png;base64,${imgBase64}`;

async function testSeedance() {
  console.log("Testing seedance-2.5 with input_reference...");
  const res = await fetch(`${prov.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prov.apiKey}`,
    },
    body: JSON.stringify({
      model: "seedance-2.5",
      prompt: "A beautiful young East Asian female model with long black hair in a black dress smiling gently, fashion video, 4k",
      seconds: 5,
      input_reference: dataUri,
    }),
  });
  console.log("Seedance-2.5 Status:", res.status);
  console.log("Seedance-2.5 Response:", await res.text());
}

testSeedance().catch(console.error);
