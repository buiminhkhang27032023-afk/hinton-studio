import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const row = db.prepare("SELECT value FROM settings WHERE key = ?").get("provider");
const prov = JSON.parse(row.value);

const jobsFile = "./temp_combat_jobs.json";
if (!fs.existsSync(jobsFile)) {
  console.error("temp_combat_jobs.json not found!");
  process.exit(1);
}

const jobs = JSON.parse(fs.readFileSync(jobsFile, "utf-8"));
const tempDir = path.join(process.cwd(), "temp_render_combat");
fs.mkdirSync(tempDir, { recursive: true });

const frontSrcPath = path.join(process.cwd(), "wuxia_view_1_front.jpg");
const tqSrcPath = path.join(process.cwd(), "wuxia_view_2_three_quarter.jpg");

async function pollAndDownload(job) {
  const rawDest = path.join(tempDir, `raw_scene_${job.index}.mp4`);
  if (fs.existsSync(rawDest) && fs.statSync(rawDest).size > 1000000) {
    console.log(`[Scene ${job.index}] Raw video already exists: ${rawDest} (${fs.statSync(rawDest).size} bytes)`);
    return rawDest;
  }

  console.log(`\n=== Polling Combat Scene ${job.index}: ${job.name} [${job.jobId}] ===`);
  for (let attempt = 1; attempt <= 120; attempt++) {
    const res = await fetch(`${prov.baseUrl}/videos/${job.jobId}`, {
      headers: { Authorization: `Bearer ${prov.apiKey}` },
    });
    const data = await res.json();
    console.log(`[Attempt ${attempt}] Combat Scene ${job.index}: status=${data.status}, progress=${data.progress}%`);

    if (data.status === "completed" || data.status === "succeeded" || data.status === "done") {
      console.log(`Combat Scene ${job.index} done! Downloading content...`);
      const cRes = await fetch(`${prov.baseUrl}/videos/${job.jobId}/content`, {
        headers: { Authorization: `Bearer ${prov.apiKey}` },
      });
      const buffer = Buffer.from(await cRes.arrayBuffer());
      fs.writeFileSync(rawDest, buffer);
      console.log(`Saved raw video to ${rawDest} (${buffer.length} bytes)`);
      return rawDest;
    }

    if (data.status === "failed" || data.status === "error") {
      console.log(`Scene ${job.index} reported ${data.status}: ${JSON.stringify(data.error)}. Auto-resubmitting...`);
      await new Promise((r) => setTimeout(r, 4000));
      const resub = await fetch(`${prov.baseUrl}/videos`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${prov.apiKey}` },
        body: JSON.stringify({ model: "veo-3.1", prompt: job.prompt, seconds: 8, size: "1280x720" })
      });
      const resubData = await resub.json();
      if (resubData.id) {
        console.log(`Resubmitted Scene ${job.index} successfully with new jobId: ${resubData.id}`);
        job.jobId = resubData.id;
        attempt = 1;
        continue;
      }
      throw new Error(`Scene ${job.index} failed and resubmit failed: ${JSON.stringify(resubData)}`);
    }

    await new Promise((r) => setTimeout(r, 6000));
  }
  throw new Error(`Timed out waiting for Combat Scene ${job.index}`);
}

async function main() {
  console.log("=================================================");
  console.log("   PRODUCING 30-SECOND HARDCORE COMBAT WUXIA MOVIE");
  console.log("=================================================");

  // 1. Download all raw video clips
  const rawClips = [];
  for (const job of jobs) {
    const file = await pollAndDownload(job);
    rawClips.push({ ...job, rawFile: file });
  }

  // 2. High-Fidelity Multi-Angle Face Swap on all combat scenes
  console.log("\n=== RUNNING MULTI-ANGLE HIGH-FIDELITY FACE SWAP ON COMBAT SCENES ===");
  const swappedClips = [];
  for (const item of rawClips) {
    const swappedPath = path.join(tempDir, `swapped_scene_${item.index}.mp4`);
    console.log(`\n>>> Processing Combat Scene ${item.index}: ${item.name}...`);
    execSync(`python scripts/high_fidelity_wuxia_swapper.py "${frontSrcPath}" "${tqSrcPath}" "${item.rawFile}" "${swappedPath}"`, {
      stdio: "inherit",
    });
    swappedClips.push({ ...item, swappedFile: swappedPath });
  }

  // 3. Trim each scene to target duration (8s + 8s + 7s + 7s = 30s)
  console.log("\n=== TRIMMING CLIPS TO EXACT 30S (8s + 8s + 7s + 7s) ===");
  const trimmedClips = [];
  for (const item of swappedClips) {
    const trimmedPath = path.join(tempDir, `trimmed_scene_${item.index}.mp4`);
    execSync(
      `ffmpeg -y -i "${item.swappedFile}" -t ${item.targetDur} -c:v libx264 -preset fast -crf 18 -c:a aac -b:a 192k "${trimmedPath}"`,
      { stdio: "inherit" }
    );
    trimmedClips.push(trimmedPath);
  }

  // 4. Concat all 4 scenes into 30s master combat movie
  console.log("\n=== CONCATENATING INTO 30-SECOND MASTER COMBAT WUXIA FILM ===");
  const concatListFile = path.join(tempDir, "concat_list.txt");
  const listContent = trimmedClips.map((p) => `file '${p.replace(/\\/g, "/")}'`).join("\n");
  fs.writeFileSync(concatListFile, listContent);

  const masterPath = path.join(tempDir, "master_combat_wuxia_30s.mp4");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatListFile}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${masterPath}"`,
    { stdio: "inherit" }
  );
  console.log(`\nSuccessfully created 30s master combat movie: ${masterPath} (${fs.statSync(masterPath).size} bytes)`);

  // 5. Generate poster frame
  const posterPath = path.join(tempDir, "poster_combat_wuxia.jpg");
  execSync(`ffmpeg -y -ss 00:00:03 -i "${masterPath}" -vframes 1 -q:v 2 "${posterPath}"`, { stdio: "inherit" });

  // 6. Save asset into project in database
  const projectId = "prj_wuxia_combat_30s";
  const projectDestDir = path.join(process.cwd(), "data", "assets", projectId);
  fs.mkdirSync(projectDestDir, { recursive: true });

  const finalVideoDest = path.join(projectDestDir, "asset_master_phim_kiem_hiep_chien_dau_30s.mp4");
  fs.copyFileSync(masterPath, finalVideoDest);

  const finalPosterDest = path.join(projectDestDir, "asset_poster_kiem_hiep_chien_dau.jpg");
  fs.copyFileSync(posterPath, finalPosterDest);

  // Register in SQLite
  try {
    const assetId = "asset_wuxia_combat_master_30s";
    const nowTime = Date.now();
    db.prepare(`
      INSERT OR REPLACE INTO projects (id, name, thumbnail, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(
      projectId,
      "Phim Kiếm Hiệp 30s — Huyết Chiến Trúc Lâm (Combat)",
      `/api/files/${projectId}/asset_poster_kiem_hiep_chien_dau.jpg`,
      nowTime,
      nowTime
    );

    db.prepare(`
      INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      projectId,
      "Phim Kiếm Hiệp Chiến Đấu 30s — Huyết Chiến Trúc Lâm (Master)",
      "file",
      "video/mp4",
      `/api/files/${projectId}/asset_master_phim_kiem_hiep_chien_dau_30s.mp4`,
      JSON.stringify({ duration: 30.04, resolution: "1280x720", fps: 24 }),
      nowTime
    );
    console.log("Registered combat project and asset in database successfully!");
  } catch (err) {
    console.error("DB registration notice:", err);
  }

  console.log("\n=================================================");
  console.log("   ALL DONE! MASTER COMBAT WUXIA FILM 30S READY!");
  console.log("   URL: http://localhost:3210/api/files/prj_wuxia_combat_30s/asset_master_phim_kiem_hiep_chien_dau_30s.mp4");
  console.log("=================================================");
}

main().catch(console.error);
