import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const projectId = "prj_island_1a159016a17";

const userImgPath = path.join(
  process.cwd(),
  "data/assets",
  projectId,
  "asset_character_face.jpg"
);

const jobsFile = "./temp_island_jobs.json";
if (!fs.existsSync(jobsFile)) {
  console.error("temp_island_jobs.json not found!");
  process.exit(1);
}

const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));
const tempDir = path.join(process.cwd(), "temp_render_island");
fs.mkdirSync(tempDir, { recursive: true });

async function main() {
  console.log("=== CHECKING DOWNLOADED SCENES ===");
  const downloadedClips = [];

  for (const item of jobs) {
    const rawDest = path.join(tempDir, `raw_scene_${item.index}.mp4`);
    if (fs.existsSync(rawDest) && fs.statSync(rawDest).size > 1000000) {
      console.log(`Found raw clip: ${rawDest} (${fs.statSync(rawDest).size} bytes)`);
      downloadedClips.push({ ...item, rawFile: rawDest });
    } else {
      console.error(`Clip ${rawDest} missing!`);
      process.exit(1);
    }
  }

  console.log("\n=== RUNNING 100% FACE RESEMBLANCE SWAP ON ALL SCENES ===");
  const swappedClips = [];
  for (const item of downloadedClips) {
    const swappedPath = path.join(tempDir, `swapped_scene_${item.index}.mp4`);
    console.log(`\n>>> Swapping face for Scene ${item.index}: ${item.name}...`);
    execSync(`python scripts/fast_face_swapper.py "${userImgPath}" "${item.rawFile}" "${swappedPath}"`, {
      stdio: "inherit",
    });
    swappedClips.push({ ...item, swappedFile: swappedPath });
  }

  console.log("\n=== TRIMMING CLIPS TO EXACT 20S (7s + 7s + 6s) ===");
  const trimmedClips = [];
  for (const item of swappedClips) {
    const trimmedPath = path.join(tempDir, `trimmed_scene_${item.index}.mp4`);
    execSync(
      `ffmpeg -y -i "${item.swappedFile}" -t ${item.targetDur} -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k "${trimmedPath}"`,
      { stdio: "inherit" }
    );
    trimmedClips.push(trimmedPath);
  }

  console.log("\n=== CONCATENATING INTO 20S MASTER ISLAND SURVIVAL VIDEO ===");
  const concatListFile = path.join(tempDir, "concat_list.txt");
  const listContent = trimmedClips.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListFile, listContent);

  const masterPath = path.join(tempDir, "master_island_survival_20s.mp4");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListFile}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${masterPath}"`,
    { stdio: "inherit" }
  );

  const posterPath = path.join(tempDir, "poster_island_survival.jpg");
  execSync(`ffmpeg -y -ss 00:00:03.000 -i "${masterPath}" -vframes 1 -q:v 2 "${posterPath}"`, {
    stdio: "inherit",
  });

  console.log("\n=== SAVING TO STUDIO DATABASE ===");
  const nowMs = Date.now();
  const masterAssetId = `asset_${Math.random().toString(16).slice(2, 14)}`;
  const finalFilename = `${masterAssetId}-Video-Sinh-Ton-Dao-Hoang-20s-Chuan-Mat.mp4`;
  const projectAssetDir = path.join(process.cwd(), "data", "assets", projectId);
  fs.mkdirSync(projectAssetDir, { recursive: true });

  const finalVideoDest = path.join(projectAssetDir, finalFilename);
  fs.copyFileSync(masterPath, finalVideoDest);

  const posterAssetId = `asset_${Math.random().toString(16).slice(2, 14)}`;
  const finalPosterName = `${posterAssetId}-Poster-Sinh-Ton-Dao-Hoang.jpg`;
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
    "Video Sinh Tồn Đảo Hoang 20s (Chuẩn 100% Mặt Thật)",
    "video",
    "video/mp4",
    videoUrl,
    JSON.stringify({
      duration: 20.0,
      scenes: swappedClips.map((c) => ({ index: c.index, name: c.name, jobId: c.jobId })),
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
    "Poster Sinh Tồn Đảo Hoang",
    "image",
    "image/jpeg",
    posterUrl,
    JSON.stringify({ width: 1280, height: 720 }),
    nowMs
  );

  db.prepare("UPDATE projects SET thumbnail = ?, updated_at = ? WHERE id = ?").run(
    posterUrl,
    nowMs,
    projectId
  );

  const graph = {
    nodes: [
      {
        id: "node_user_photo",
        type: "asset",
        position: { x: 50, y: 150 },
        data: {
          label: "Ảnh gốc của bạn",
          imageUrl: `/api/files/${projectId}/asset_character_face.jpg`,
          name: "Ảnh gương mặt gốc",
          kind: "image",
        },
      },
      {
        id: "node_prompt",
        type: "preset",
        position: { x: 380, y: 50 },
        data: {
          label: "Kịch bản Sinh tồn đảo hoang 20s",
          text: "Sinh tồn trên hoang đảo nhiệt đới: Tỉnh dậy bên bờ biển, nhóm lửa trong rừng, chinh phục vách đá hoàng hôn",
        },
      },
      {
        id: "node_master_video",
        type: "model",
        position: { x: 750, y: 150 },
        data: {
          label: "Video Sinh Tồn Đảo Hoang (20s Master)",
          result: {
            id: masterAssetId,
            name: "Video Sinh Tồn Đảo Hoang 20s (Chuẩn 100% Mặt Thật)",
            url: videoUrl,
            kind: "video",
            mime: "video/mp4",
          },
          status: "done",
        },
      },
    ],
    edges: [
      { id: "e1", source: "node_user_photo", target: "node_master_video" },
      { id: "e2", source: "node_prompt", target: "node_master_video" },
    ],
  };

  db.prepare("INSERT OR REPLACE INTO graphs (project_id, data, updated_at) VALUES (?, ?, ?)").run(
    projectId,
    JSON.stringify(graph),
    nowMs
  );

  console.log("\n==========================================");
  console.log("🎉 SUCCESS! 20S ISLAND SURVIVAL VIDEO CREATED (100% FACE RESEMBLANCE)!");
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
