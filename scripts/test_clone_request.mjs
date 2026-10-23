import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

const imgBase64 = fs.readFileSync("user_model_face.png").toString("base64");
const dataUri = `data:image/png;base64,${imgBase64}`;

async function testModel(modelName, extraBody = {}) {
  console.log(`\n=== Testing model: ${modelName} ===`);
  const body = {
    model: modelName,
    prompt: "High fashion portrait of the exact young Asian female model from the reference image, gentle warm smile, looking into camera, elegant studio lighting, red velvet backdrop, 35mm film aesthetic, 4k",
    seconds: modelName.includes("seedance") ? 5 : 8,
    size: "1280x720",
    ...extraBody,
  };

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`Attempt ${attempt} for ${modelName}...`);
      const res = await fetch(`${prov.baseUrl}/videos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${prov.apiKey}`,
        },
        body: JSON.stringify(body),
      });

      console.log("Status:", res.status);
      const text = await res.text();
      console.log("Response:", text);
      if (res.ok) {
        return JSON.parse(text);
      }
    } catch (err) {
      console.error("Error:", err.message);
    }
    await new Promise(r => setTimeout(r, 4000));
  }
  return null;
}

async function main() {
  console.log("Testing veo-3.1 with input_reference...");
  const veoRes = await testModel("veo-3.1", { input_reference: dataUri });
  console.log("Veo result:", veoRes);

  if (!veoRes?.id) {
    console.log("Testing seedance-2.0-fast with input_reference...");
    const seedRes = await testModel("seedance-2.0-fast", { input_reference: dataUri });
    console.log("Seedance result:", seedRes);
  }
}

main().catch(console.error);
