import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();
  
  // Let's test what /videos requires or does with seedance-2.0-fast
  console.log("Testing POST /videos with seedance-2.0-fast...");
  const res = await fetch(`${provider.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${provider.apiKey}`,
    },
    body: JSON.stringify({
      model: "seedance-2.0-fast",
      prompt: "cinematic beach party at sunset, people dancing with sparkles and drinks, warm golden hour, 4k",
      seconds: 5,
    }),
  });
  
  console.log("Status:", res.status);
  const text = await res.text();
  console.log("Response:", text);
}

main().catch(console.error);
