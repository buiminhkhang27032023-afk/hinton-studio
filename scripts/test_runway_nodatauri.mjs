import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();

  console.log("Testing pure Runway Catwalk generation with detailed Face DNA prompt (NO bedroom selfie starting frame)...");
  
  const res = await fetch(`${provider.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`
    },
    body: JSON.stringify({
      model: "veo-3.1",
      prompt: "Cinematic Paris Fashion Week runway show, establishing wide shot. A gorgeous young East Asian female runway supermodel with a sweet heart-shaped face, porcelain skin, large expressive dark eyes, delicate facial features, and dark brown hair with soft curtain bangs. She walks down the glossy catwalk in a flowing luxury haute couture silk gown, confident model stride, bright dramatic runway spotlights, fashion photographers flashing cameras from the front row, 35mm film aesthetic, 4k.",
      seconds: 8,
      size: "1280x720"
    })
  });

  console.log("Status:", res.status);
  const data = await res.json();
  console.log("Response:", JSON.stringify(data));
}

main().catch(console.error);
