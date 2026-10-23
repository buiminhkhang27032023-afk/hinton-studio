import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);
const projectId = "prj_island_1a159016a17";

const scenes = [
  {
    index: 1,
    name: "Cảnh 1: Thức giấc trên bãi biển hoang đảo & Khảo sát thiên nhiên",
    prompt: "Cinematic establishing wide tracking shot of an untamed tropical island, turquoise ocean waves breaking on pure white sandy shore, lush jungle palm trees. A handsome young Vietnamese man in a weathered open-collar shirt and trousers awakens on the beach, sitting up with resilient determination, brushing sand off, morning golden sun rays illuminating the dramatic wild paradise, 35mm film aesthetic, 4k.",
    seconds: 8,
    targetDur: 7.0
  },
  {
    index: 2,
    name: "Cảnh 2: Kỹ năng sinh tồn & Nhóm lửa thành công trong rừng nhiệt đới",
    prompt: "Dynamic medium tracking shot of the handsome young Vietnamese man at a rustic tropical survival campsite near the edge of the rainforest. He uses flint and wooden sticks to ignite dry coconut husk tinder, gently blowing as golden flames burst to life, smiling with triumph and survival grit, smoke curling into the jungle canopy, warm firelight glow, 35mm film look, 4k.",
    seconds: 8,
    targetDur: 7.0
  },
  {
    index: 3,
    name: "Cảnh 3: Chinh phục đỉnh vách đá ngắm hoàng hôn đại dương",
    prompt: "Epic cinematic three-quarter hero shot of the handsome young Vietnamese man standing on the edge of a towering rocky ocean cliff at sunset. Warm golden hour lighting, tropical trade winds blowing through his hair, looking out across the vast ocean with fearless survival spirit, holding a crafted torch, dramatic waves crashing below, 35mm film color grading, 4k.",
    seconds: 8,
    targetDur: 6.0
  }
];

async function main() {
  console.log("=== SUBMITTING 3 ISLAND SURVIVAL SCENES ===");
  const submitted = [];

  for (const sc of scenes) {
    console.log(`Submitting Scene ${sc.index}: ${sc.name}...`);
    const res = await fetch(`${prov.baseUrl}/videos`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${prov.apiKey}`
      },
      body: JSON.stringify({
        model: "veo-3.1",
        prompt: sc.prompt,
        seconds: sc.seconds,
        size: "1280x720"
      })
    });

    const data = await res.json();
    console.log(`Scene ${sc.index} response:`, JSON.stringify(data));
    if (data.id) {
      submitted.push({
        ...sc,
        jobId: data.id
      });
    } else {
      throw new Error(`Failed to submit Scene ${sc.index}: ${JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, 2000));
  }

  const outPath = "./temp_island_jobs.json";
  fs.writeFileSync(outPath, JSON.stringify(submitted, null, 2));
  console.log(`Saved jobs to ${outPath}:`, JSON.stringify(submitted, null, 2));
}

main().catch(console.error);
