import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

const scenes = [
  {
    index: 1,
    name: "Cảnh 1: Song kiếm đối quyết & Chặn đòn chém tóe lửa",
    jobId: "svgen_efb1fa0c-0dc1-49ef-b4fd-510efee73846",
    targetDur: 8.0
  },
  {
    index: 2,
    name: "Cảnh 2: Kiếm vũ cận chiến tốc độ cao & Tia lửa văng",
    prompt: "Fast-paced high-speed wuxia sword duel combat in the bamboo forest. The handsome young Vietnamese swordsman in his navy silk wuxia robe swiftly draws his gleaming steel blade, engaging in an intense close-quarters sword fight. Rapid flurry of steel blades clashing with dazzling sparks showering, ducking under a horizontal blade swing by inches, parrying consecutive strikes with lightning speed, billowing navy silk robes whipping through the air, focused fierce warrior eyes, kinetic camera tracking the blows, 35mm action film look, 4k.",
    seconds: 8,
    targetDur: 8.0
  },
  {
    index: 3,
    name: "Cảnh 3: Kiếm khí lam quang quét sạch trận địa",
    prompt: "Epic cinematic martial arts power technique in the bamboo grove. Surrounded by rival swordsmen, the handsome young Vietnamese swordsman channels brilliant internal martial energy. His ancient sword illuminates with a radiant glowing cyan-blue sword qi aura. With a commanding motion, he unleashes a sweeping 360-degree horizontal sword energy wave that erupts outward in a massive shockwave, deflecting incoming weapons and knocking opponents back across the forest floor, bamboo leaves and dust exploding outward, 35mm film aesthetic, 4k.",
    seconds: 8,
    targetDur: 7.0
  },
  {
    index: 4,
    name: "Cảnh 4: Khinh công phi thiên & Trảm kích thu kiếm",
    prompt: "Dramatic cinematic climax and martial arts resolution. The handsome young Vietnamese swordsman performs an acrobatic wire-fu leap high above the bamboo canopy, somersaulting through the air and executing a majestic downward sword slash through the morning mist. He lands silently in a low warrior stance as emerald bamboo leaves drift down in slow motion. He rises with effortless martial arts grace, sliding his gleaming sword smoothly back into its ornate scabbard with a crisp metallic click, 35mm film look, 4k cinematic lighting.",
    seconds: 8,
    targetDur: 7.0
  }
];

async function submitRemaining() {
  const jobs = [scenes[0]];
  for (let i = 1; i < scenes.length; i++) {
    const sc = scenes[i];
    console.log(`Submitting Scene ${sc.index}: ${sc.name}...`);
    const res = await fetch(`${prov.baseUrl}/videos`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.apiKey}` },
      body: JSON.stringify({ model: "veo-3.1", prompt: sc.prompt, seconds: sc.seconds, size: "1280x720" })
    });
    const data = await res.json();
    console.log(`Scene ${sc.index} response:`, JSON.stringify(data));
    if (data.id) {
      jobs.push({ ...sc, jobId: data.id });
    } else {
      throw new Error(`Failed to submit Scene ${sc.index}: ${JSON.stringify(data)}`);
    }
    await new Promise((r) => setTimeout(r, 2500));
  }
  fs.writeFileSync("./temp_combat_jobs.json", JSON.stringify(jobs, null, 2));
  console.log("\nSaved all 4 combat jobs to temp_combat_jobs.json!");
}

submitRemaining().catch(console.error);
