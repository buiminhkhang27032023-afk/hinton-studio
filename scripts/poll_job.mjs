import { getProvider } from "../lib/provider.ts";

async function main() {
  const jobId = process.argv[2] || "svgen_7b055410-3b7c-4059-a22f-b1209696621b";
  const provider = getProvider();
  
  const res = await fetch(`${provider.baseUrl}/videos/${jobId}`, {
    headers: { Authorization: `Bearer ${provider.apiKey}` }
  });
  console.log(`Poll [${jobId}] Status:`, res.status);
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}

main().catch(console.error);
