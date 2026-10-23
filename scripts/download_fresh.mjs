import fs from "node:fs";
import path from "node:path";
import { getProvider } from "../lib/provider.ts";

async function main() {
  const jobId = "svgen_7b055410-3b7c-4059-a22f-b1209696621b";
  const provider = getProvider();
  
  console.log("Downloading freshly generated clip from provider...");
  const resContent = await fetch(`${provider.baseUrl}/videos/${jobId}/content`, {
    headers: { Authorization: `Bearer ${provider.apiKey}` }
  });
  
  if (!resContent.ok) throw new Error("Failed to fetch content: " + resContent.status);
  const arrayBuffer = await resContent.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  const dest = path.join(process.cwd(), "temp_render", "fresh_generated_beach.mp4");
  fs.writeFileSync(dest, buffer);
  console.log(`Saved fresh clip (${buffer.length} bytes) to ${dest}`);
}

main().catch(console.error);
