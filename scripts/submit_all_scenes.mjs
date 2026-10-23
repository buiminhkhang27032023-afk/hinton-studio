import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();
  console.log("Provider base URL:", provider.baseUrl);

  // Define 3 brand new scenes for the beach party
  const scenes = [
    {
      name: "Scene 1: Establishing beach party & cocktail bar at sunset",
      prompt: "Cinematic establishing wide tracking shot of an upscale beach party at golden hour sunset, palm trees decorated with warm fairy lights, tiki torches burning gently, friends gathering near a bamboo tiki bar with tropical cocktails, waves washing on white sand, 35mm film look, luxury summer aesthetic, 4k.",
      seconds: 8
    },
    {
      name: "Scene 2: Bonfire dancing & celebration on the beach",
      prompt: "Medium dynamic tracking shot of attractive young friends in stylish summer resort wear dancing and laughing around a glowing beach bonfire at dusk, sparks drifting in ocean breeze, golden sunset on the horizon, joyful party atmosphere, warm lighting, 35mm film aesthetic, 4k.",
      seconds: 8
    },
    {
      name: "Scene 3: Champagne toast & sparklers celebration by the sea",
      prompt: "Cinematic three-quarter medium shot of friends at the beach party toasting cocktails and sparkling champagne glasses at sunset, holding glowing sparklers, cheerful laughter, bokeh lights from the beach party behind them, ocean waves in background, warm golden hour, 4k.",
      seconds: 8
    }
  ];

  console.log("Submitting 3 new scene generation jobs to provider...");
  const jobs = [];

  for (let i = 0; i < scenes.length; i++) {
    const sc = scenes[i];
    console.log(`\nSubmitting Scene ${i + 1}: ${sc.name}...`);
    const res = await fetch(`${provider.baseUrl}/videos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${provider.apiKey}`
      },
      body: JSON.stringify({
        model: "veo-3.1",
        prompt: sc.prompt,
        seconds: sc.seconds,
        size: "1280x720"
      })
    });

    console.log(`Scene ${i + 1} Status:`, res.status);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data));
    if (data.id) {
      jobs.push({
        sceneIndex: i + 1,
        name: sc.name,
        prompt: sc.prompt,
        jobId: data.id,
        status: data.status || "in_progress"
      });
    }
    // Small pause between submissions
    await new Promise((r) => setTimeout(r, 2000));
  }

  console.log("\nAll submitted jobs:", JSON.stringify(jobs, null, 2));
}

main().catch(console.error);
