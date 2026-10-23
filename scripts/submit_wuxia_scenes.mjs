import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

const scenes = [
  {
    index: 1,
    name: "Cảnh 1: Rừng trúc mờ sương & Kiếm khách xuất hiện",
    prompt: "Cinematic medium shot of a handsome young Vietnamese martial arts swordsman standing in a misty bamboo forest at dawn. He wears a tailored deep navy silk wuxia robe with delicate silver dragon embroidery and a silver sword hairpin in his high ponytail. Ethereal golden sunbeams illuminate the swirling mist, emerald bamboo leaves drifting down in slow motion. One hand rests calmly on the hilt of his ancient Chinese sword, deep resolute martial arts gaze, 35mm film aesthetic, photorealistic, 4k cinematic lighting.",
    seconds: 8,
    targetDur: 8.0
  },
  {
    index: 2,
    name: "Cảnh 2: Tuyệt kỹ kiếm vũ & Đường kiếm xé gió",
    prompt: "Dynamic action shot in the misty bamboo grove. The handsome young Vietnamese swordsman in his navy silk wuxia robe swiftly draws his gleaming steel sword with fluid graceful martial arts mastery. Bright silver sword blade flashes in the misty light, swirling silk robes and long ponytail flowing dynamically with his swift spin, bamboo leaves scattering in a vortex, focused intense martial arts gaze, 35mm film aesthetic, slow-motion blade flourish, 4k.",
    seconds: 8,
    targetDur: 8.0
  },
  {
    index: 3,
    name: "Cảnh 3: Khinh công lướt qua mặt hồ phẳng lặng",
    prompt: "Epic cinematic tracking shot of the handsome young Vietnamese swordsman in his navy silk wuxia robe performing qinggong light-footwork, effortlessly gliding across the glassy calm surface of a mountain lake at twilight. Gentle ripples beneath his boots, reflection of the majestic jagged karst mountains and misty moonlit water, billowing dark blue silk robes floating gracefully, serene peerless mastery, 35mm film color grading, 4k.",
    seconds: 8,
    targetDur: 7.0
  },
  {
    index: 4,
    name: "Cảnh 4: Đỉnh núi biển mây hoàng hôn & Tra kiếm vào vỏ",
    prompt: "Majestic low-angle hero shot of the handsome young Vietnamese swordsman standing atop a towering mountain cliff above a dramatic sea of rolling clouds at sunset. Brilliant golden-red twilight sky, strong wind billowing his silk cape and hair ribbon, slowly sheathing his shining sword into an ornate scabbard with a crisp click, looking out fearlessly over the vast wuxia realm, 35mm film look, 4k cinematic lighting.",
    seconds: 8,
    targetDur: 7.0
  }
];

async function main() {
  console.log("=== SUBMITTING 4 WUXIA MOVIE SCENES (TOTAL 30S) ===");
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

  const outPath = "./temp_wuxia_jobs.json";
  fs.writeFileSync(outPath, JSON.stringify(submitted, null, 2));
  console.log(`\nSuccessfully submitted all 4 scenes! Saved to ${outPath}`);
}

main().catch(console.error);
