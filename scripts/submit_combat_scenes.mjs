import fs from "node:fs";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

const scenes = [
  {
    index: 1,
    name: "Cảnh 1: Thích khách tập kích & Chặn đòn chém tóe lửa",
    prompt: "Intense cinematic wuxia action scene. In a misty bamboo forest, three masked assassins dressed in black drop from bamboo trees with raised swords to ambush a handsome young Vietnamese swordsman in navy silk robes. In lightning-fast reflexes, the swordsman blocks a heavy descending blade with his scabbard, bright orange sparks violently exploding on metal impact! He immediately spins 360 degrees and delivers a powerful spinning martial arts kick, blasting the first assassin crashing through bamboo trunks. Dynamic low-angle tracking camera, fast kinetic motion, 35mm film aesthetic, 4k cinematic lighting.",
    seconds: 8,
    targetDur: 8.0
  },
  {
    index: 2,
    name: "Cảnh 2: Song đấu đao kiếm cự ly gần tốc độ cao",
    prompt: "Fast-paced wuxia sword duel combat in the bamboo forest. The handsome young Vietnamese swordsman draws his shining steel blade, engaging in an intense close-quarters duel against the enemy assassin chief. Rapid flurry of steel blades clashing violently with sparks showering, ducking under a horizontal blade slash by inches, parrying consecutive strikes with lightning speed, billowing navy silk robes whipping through the air, focused fierce warrior eyes, kinetic camera shaking with the blows, 35mm action film look, 4k.",
    seconds: 8,
    targetDur: 8.0
  },
  {
    index: 3,
    name: "Cảnh 3: Bộc phát kiếm khí quét sạch vòng vây",
    prompt: "Epic cinematic martial arts power moment. Surrounded by remaining masked assassins hurling chain sickles and throwing daggers, the handsome young Vietnamese swordsman gathers glowing internal energy. His ancient sword erupts with brilliant glowing cyan-blue sword qi energy. With a fierce shout, he unleashes a 360-degree horizontal sword slash wave that erupts outward in a massive shockwave, deflecting all flying daggers and blasting all assassins flying backward through splintering bamboo trees, dust and green leaves exploding, 35mm film aesthetic, 4k.",
    seconds: 8,
    targetDur: 7.0
  },
  {
    index: 4,
    name: "Cảnh 4: Phi thân trên không & Đòn kết liễu thu kiếm",
    prompt: "Dramatic cinematic climax and resolution. The handsome young Vietnamese swordsman leaps high into the air with acrobatic wire-fu agility, executing a breathtaking aerial somersault above the bamboo canopy, slicing down through the misty air in a final decisive slash. He lands silently in a low warrior crouch on the forest ground as bamboo leaves rain down in slow motion and the last enemy collapses behind him. He stands upright with effortless lethal grace, sliding his bloodless sword back into its scabbard with a crisp metallic snap, 35mm film look, 4k cinematic lighting.",
    seconds: 8,
    targetDur: 7.0
  }
];

async function submitWithRetry(sc) {
  for (let attempt = 1; attempt <= 5; attempt++) {
    console.log(`Submitting Scene ${sc.index} (attempt ${attempt}): ${sc.name}...`);
    try {
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
        return {
          ...sc,
          jobId: data.id
        };
      }
    } catch (e) {
      console.error(`Attempt ${attempt} error:`, e.message);
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  throw new Error(`Failed to submit Scene ${sc.index} after 5 attempts`);
}

async function main() {
  console.log("=== SUBMITTING 4 WUXIA HARDCORE COMBAT SCENES ===");
  const submitted = [];

  for (const sc of scenes) {
    const job = await submitWithRetry(sc);
    submitted.push(job);
    await new Promise((r) => setTimeout(r, 2000));
  }

  const outPath = "./temp_combat_jobs.json";
  fs.writeFileSync(outPath, JSON.stringify(submitted, null, 2));
  console.log(`\nSuccessfully submitted all 4 combat scenes! Saved to ${outPath}`);
}

main().catch(console.error);
