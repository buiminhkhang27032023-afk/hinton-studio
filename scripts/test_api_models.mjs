import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

async function main() {
  console.log("Endpoint:", prov.baseUrl);
  const res = await fetch(`${prov.baseUrl}/models`, {
    headers: { Authorization: `Bearer ${prov.apiKey}` }
  });
  console.log("Status:", res.status);
  const data = await res.json();
  const videoModels = data.data?.filter(m => 
    m.id.toLowerCase().includes("seedance") || 
    m.id.toLowerCase().includes("veo") || 
    m.id.toLowerCase().includes("kling") || 
    m.id.toLowerCase().includes("hailuo") || 
    m.id.toLowerCase().includes("wan") || 
    m.id.toLowerCase().includes("video") ||
    m.id.toLowerCase().includes("omni")
  );
  console.log("Video models count:", videoModels?.length);
  console.log("List:", JSON.stringify(videoModels, null, 2));
}

main().catch(console.error);
