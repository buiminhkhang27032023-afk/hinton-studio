import { getProvider } from "../lib/provider.ts";

async function main() {
  const provider = getProvider();
  console.log("Using API endpoint:", provider.baseUrl);
  
  const res = await fetch(`${provider.baseUrl}/models`, {
    headers: { Authorization: `Bearer ${provider.apiKey}` }
  });
  console.log("Status /models:", res.status);
  if (res.ok) {
    const data = await res.json();
    const videoModels = data.data?.filter((m) => m.id.includes("veo") || m.id.includes("seedance") || m.id.includes("video"));
    console.log("Video models from provider:", videoModels?.map((m) => m.id));
  } else {
    console.log(await res.text());
  }
}

main().catch(console.error);
