import { getProvider } from "../lib/provider.ts";

async function main() {
  const jobId = "svgen_7b055410-3b7c-4059-a22f-b1209696621b";
  const provider = getProvider();
  
  // Check pollEndpoint
  const resPoll = await fetch(`${provider.baseUrl}/videos/${jobId}`, {
    headers: { Authorization: `Bearer ${provider.apiKey}` }
  });
  console.log("Poll body:", await resPoll.text());

  // Check contentEndpoint
  const resContent = await fetch(`${provider.baseUrl}/videos/${jobId}/content`, {
    headers: { Authorization: `Bearer ${provider.apiKey}` }
  });
  console.log("Content status:", resContent.status, resContent.headers.get("content-type"));
}

main().catch(console.error);
