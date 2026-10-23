import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();
  
  console.log("Testing POST /videos with veo-3.1...");
  const res = await fetch(`${provider.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: "veo-3.1",
      prompt: "cinematic beach party at sunset, bonfire on the beach, friends laughing and toasting cocktails, golden hour light, 4k",
      seconds: 4,
      size: "1280x720"
    }),
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

main().catch(console.error);
