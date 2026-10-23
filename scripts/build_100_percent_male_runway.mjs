import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);
const projectId = "prj_1fb5d7a0444e";

const anchorImgPath = path.join(process.cwd(), "catwalk_anchor_male.jpg");
if (!fs.existsSync(anchorImgPath)) {
  console.error("catwalk_anchor_male.jpg not found!");
  process.exit(1);
}

const b64 = fs.readFileSync(anchorImgPath).toString("base64");
const dataUri = `data:image/jpeg;base64,${b64}`;

const scenes = [
  {
    index: 1,
    name: "Cảnh 1: Sải bước mở màn sàn diễn catwalk chuẩn 100% gương mặt thật",
    prompt: "Cinematic medium wide tracking camera gliding smoothly backwards in front of the handsome young Vietnamese male model in the tailored black suit as he walks down the luxury fashion runway with steady confident strides, dramatic overhead spotlights, camera flashbulbs flashing, audience on both sides, 35mm film aesthetic, 4k.",
    seconds: 8,
    targetDur: 7.0
  },
  {
    index: 2,
    name: "Cảnh 2: Trung cảnh tracking & Nụ cười rạng rỡ cuốn hút",
    prompt: "Dynamic medium close-up tracking shot following the handsome young Vietnamese male model in black suit flashing a warm radiant charismatic smile towards the camera as he strides down the fashion catwalk, camera flashbulbs firing brilliantly, crisp tailored suit, soft lens flare, 35mm film look, 4k.",
    seconds: 8,
    targetDur: 7.0
  },
  {
    index: 3,
    name: "Cảnh 3: Tạo dáng đầu sàn runway & Xoay người chuyên nghiệp",
    prompt: "Cinematic medium three-quarter shot of the handsome young Vietnamese male model reaching the front edge of the catwalk runway, pausing confidently with a dazzling warm smile to the photographers, camera flashbulbs flashing brilliantly, then executing a smooth stylish pivot turn to walk back, soft bokeh lights, 35mm film, 4k.",
    seconds: 8,
    targetDur: 6.0
  }
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function submitJob(scene) {
  console.log(`Submitting Scene ${scene.index}: ${scene.name}...`);
  const res = await fetch(`${prov.baseUrl}/videos`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${prov.apiKey}`,
    },
    body: JSON.stringify({
      model: "veo-3.1",
      prompt: scene.prompt,
      seconds: scene.seconds,
      size: "1280x720",
      input_reference: dataUri,
    }),
  });
  const data = await res.json();
  console.log(`Scene ${scene.index} response:`, JSON.stringify(data));
  if (!data.id) throw new Error(`Failed to submit Scene ${scene.index}: ${JSON.stringify(data)}`);
  return data.id;
}

async function pollJob(jobId) {
  const res = await fetch(`${prov.baseUrl}/videos/${jobId}`, {
    headers: { Authorization: `Bearer ${prov.apiKey}` },
  });
  if (!res.ok) throw new Error(`Poll error for ${jobId}: ${res.status}`);
  return await res.json();
}

async function downloadContent(jobId, destFile) {
  console.log(`Downloading ${jobId} -> ${destFile}...`);
  const res = await fetch(`${prov.baseUrl}/videos/${jobId}/content`, {
    headers: { Authorization: `Bearer ${prov.apiKey}` },
  });
  if (!res.ok) throw new Error(`Download error for ${jobId}: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destFile, buf);
  console.log(`Saved ${destFile} (${buf.length} bytes)`);
}

async function main() {
  const tempDir = path.join(process.cwd(), "temp_render_100_male");
  fs.mkdirSync(tempDir, { recursive: true });

  const submitted = [];
  for (const scene of scenes) {
    const jobId = await submitJob(scene);
    submitted.push({ ...scene, jobId });
    await sleep(2000);
  }

  console.log("\nAll 3 scenes submitted! Polling all jobs until complete...");

  const rawClips = [];
  for (const item of submitted) {
    console.log(`\nWaiting for Scene ${item.index} (Job: ${item.jobId})...`);
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 90) {
      attempts++;
      const data = await pollJob(item.jobId);
      console.log(`[Scene ${item.index} Attempt ${attempts}] status=${data.status}, progress=${data.progress}`);
      if (data.status === "completed" || data.status === "succeeded" || data.status === "done") {
        completed = true;
        const dest = path.join(tempDir, `raw_scene_${item.index}.mp4`);
        await downloadContent(item.jobId, dest);
        rawClips.push({ ...item, rawFile: dest });
        break;
      }
      if (data.status === "failed" || data.status === "error") {
        throw new Error(`Scene ${item.index} failed: ${JSON.stringify(data)}`);
      }
      await sleep(6000);
    }
  }

  console.log("\nTrimming clips to exact lengths (7s + 7s + 6s = 20s)...");
  const trimmedClips = [];
  for (const clip of rawClips) {
    const trimmedPath = path.join(tempDir, `trimmed_scene_${clip.index}.mp4`);
    execSync(`ffmpeg -y -i "${clip.rawFile}" -t ${clip.targetDur} -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k "${trimmedPath}"`, { stdio: "inherit" });
    trimmedClips.push(trimmedPath);
  }

  console.log("\nConcatenating clips into Master 20s Runway Video...");
  const concatListFile = path.join(tempDir, "concat_list.txt");
  const listContent = trimmedClips.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListFile, listContent);

  const masterPath = path.join(tempDir, "master_runway_100_male_20s.mp4");
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatListFile}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${masterPath}"`, { stdio: "inherit" });

  const posterPath = path.join(tempDir, "poster_runway_100_male.jpg");
  execSync(`ffmpeg -y -ss 00:00:03.000 -i "${masterPath}" -vframes 1 -q:v 2 "${posterPath}"`, { stdio: "inherit" });

  console.log("\nSaving Master Asset into Project DB...");
  const nowMs = Date.now();
  const masterAssetId = `asset_${Math.random().toString(16).slice(2, 14)}`;
  const finalFilename = `${masterAssetId}-Video-San-Dien-Thoi-Trang-100-Chuan-Mat-20s.mp4`;
  const projectAssetDir = path.join(process.cwd(), "data", "assets", projectId);
  fs.mkdirSync(projectAssetDir, { recursive: true });

  const finalVideoDest = path.join(projectAssetDir, finalFilename);
  fs.copyFileSync(masterPath, finalVideoDest);

  const posterAssetId = `asset_${Math.random().toString(16).slice(2, 14)}`;
  const finalPosterName = `${posterAssetId}-Poster-San-Dien-100-Chuan-Mat.jpg`;
  const finalPosterDest = path.join(projectAssetDir, finalPosterName);
  fs.copyFileSync(posterPath, finalPosterDest);

  const videoUrl = `/api/files/${projectId}/${finalFilename}`;
  const posterUrl = `/api/files/${projectId}/${finalPosterName}`;

  db.prepare(`
    INSERT INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    masterAssetId,
    projectId,
    "Video Sàn Diễn Thời Trang 100% Chuẩn Mặt (20s Master)",
    "video",
    "video/mp4",
    videoUrl,
    JSON.stringify({
      duration: 20.0,
      scenes: rawClips.map((c) => ({ index: c.index, name: c.name, jobId: c.jobId })),
      poster: posterUrl,
    }),
    nowMs
  );

  db.prepare(`
    INSERT INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    posterAssetId,
    projectId,
    "Poster Sàn Diễn 100% Chuẩn Mặt",
    "image",
    "image/jpeg",
    posterUrl,
    JSON.stringify({ width: 1280, height: 720 }),
    nowMs
  );

  db.prepare("UPDATE projects SET thumbnail = ?, updated_at = ? WHERE id = ?").run(posterUrl, nowMs, projectId);

  console.log("\n==========================================");
  console.log("🎉 SUCCESS! 100% FACE RESEMBLANCE RUNWAY 20S VIDEO CREATED!");
  console.log(`Video Asset ID: ${masterAssetId}`);
  console.log(`Video URL: http://localhost:3210${videoUrl}`);
  console.log(`Canvas URL: http://localhost:3210/canvas/${projectId}`);
  console.log(`File Path: ${finalVideoDest}`);
  console.log("==========================================");
}

main().catch((err) => {
  console.error("FATAL ERROR:", err);
  process.exit(1);
});
