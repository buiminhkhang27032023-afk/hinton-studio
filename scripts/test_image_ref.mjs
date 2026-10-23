import fs from "node:fs";
import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();
  const userImgPath = "C:/Users/Chen Qianyu/.gemini/antigravity/brain/4149a5ae-666d-4654-a6f8-20a00b1b99a6/.user_uploaded/media_1792489431374_43c29072.jpg";
  const b64 = fs.readFileSync(userImgPath).toString("base64");
  const dataUri = `data:image/jpeg;base64,${b64}`;

  console.log("Testing POST /videos with input_reference (data URI length:", dataUri.length, ")...");
  
  const res = await fetch(`${provider.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: "veo-3.1",
      prompt: "High fashion runway catwalk, the exact same young Asian female model from the reference image walking with poise and confidence, wearing a chic haute couture Parisian evening gown, bright runway spotlights, camera flashes, audience on both sides, 35mm film aesthetic, 4k",
      seconds: 8,
      size: "1280x720",
      input_reference: dataUri
    })
  });

  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

main().catch(console.error);
