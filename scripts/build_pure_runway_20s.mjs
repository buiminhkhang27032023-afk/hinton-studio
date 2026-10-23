import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getProvider } from "../lib/provider.ts";
import { getDb, now } from "../lib/db.ts";
import { saveAsset } from "../lib/storage.ts";
import { saveGraph, setThumbnail } from "../lib/projects.ts";

const jobs = [
  {
    sceneIndex: 1,
    name: "Cảnh 1: Sàn diễn thời trang Paris - Bước ra catwalk",
    prompt: "Cinematic Paris Fashion Week runway show, establishing wide shot. A gorgeous young East Asian female runway supermodel with a sweet heart-shaped face, porcelain skin, large expressive dark eyes, delicate facial features, and dark brown hair with soft curtain bangs. She walks down the glossy catwalk in a flowing luxury haute couture silk gown, confident model stride, bright dramatic runway spotlights, fashion photographers flashing cameras from the front row, 35mm film aesthetic, 4k.",
    jobId: "svgen_d5d70622-945c-459e-a8ad-ca7c7af36abb",
    targetDur: 7.0
  },
  {
    sceneIndex: 2,
    name: "Cảnh 2: Catwalk chuyên nghiệp & Tà váy dạ hội",
    prompt: "Medium dynamic tracking camera shot following the same gorgeous young East Asian runway model down the catwalk. She has a sweet heart-shaped face, soft expressive eyes, dark brown hair with soft strands framing her face, walking with poised elegance. Her luxury haute couture evening dress trails smoothly behind her, dramatic runway backlighting, fashion VIP audience applauding in soft blur, 35mm film color grading, 4k.",
    jobId: "svgen_ac1f6716-0b7e-46c8-b99a-3f341a69a5a7",
    targetDur: 7.0
  },
  {
    sceneIndex: 3,
    name: "Cảnh 3: Cận cảnh thần thái & Cú xoay người kết màn",
    prompt: "Cinematic medium close-up shot as the gorgeous young East Asian female model reaches the front edge of the fashion runway. Highlighting her sweet youthful face, sparkling expressive eyes, subtle confident smile under runway spotlights, followed by an iconic high-fashion pivot turn, fabric swirling gracefully, camera flashbulbs flashing, 35mm film aesthetic, 4k.",
    jobId: "svgen_13dc4421-13a4-4fa4-ac92-19976e4bd406",
    targetDur: 6.0
  }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function pollJob(provider, jobId) {
  const res = await fetch(`${provider.baseUrl}/videos/${jobId}`, {
    headers: { Authorization: `Bearer ${provider.apiKey}` },
  });
  if (!res.ok) throw new Error(`Poll failed for ${jobId}: ${res.status}`);
  return await res.json();
}

async function downloadContent(provider, jobId, destFile) {
  console.log(`Downloading video content for ${jobId} -> ${destFile}...`);
  const res = await fetch(`${provider.baseUrl}/videos/${jobId}/content`, {
    headers: { Authorization: `Bearer ${provider.apiKey}` },
  });
  if (!res.ok) throw new Error(`Content download failed for ${jobId}: ${res.status}`);
  const arrayBuffer = await res.arrayBuffer();
  fs.writeFileSync(destFile, Buffer.from(arrayBuffer));
  console.log(`Saved ${destFile} (${fs.statSync(destFile).size} bytes)`);
}

async function main() {
  const projectId = "prj_dd30b182250a";
  const tempDir = path.join(process.cwd(), "temp_render_pure_runway");
  fs.mkdirSync(tempDir, { recursive: true });

  const provider = getProvider();
  console.log("=== THEO DÕI & TẢI 3 CẢNH SÀN DIỄN CHUẨN ĐIỆN ẢNH (KHÔNG DÍNH ẢNH PHÒNG NGỦ) ===");

  const downloadedFiles = [];

  for (const job of jobs) {
    console.log(`\nĐang theo dõi Cảnh ${job.sceneIndex} [${job.jobId}]...`);
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 140) {
      attempts++;
      const data = await pollJob(provider, job.jobId);
      const status = (data.status || "").toLowerCase();
      console.log(`[${job.jobId}] Lần kiểm tra ${attempts}: trạng thái = ${status}, tiến độ = ${data.progress || 0}%`);

      if (status === "completed" || status === "succeeded" || status === "success" || status === "done") {
        completed = true;
        break;
      }
      if (status === "failed" || status === "error" || status === "cancelled") {
        throw new Error(`Cảnh ${job.sceneIndex} [${job.jobId}] bị lỗi: ${data.error || "failed"}`);
      }
      await sleep(5000);
    }

    const localFile = path.join(tempDir, `pure_runway_scene_${job.sceneIndex}.mp4`);
    await downloadContent(provider, job.jobId, localFile);

    const dur = execSync(
      `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${localFile}"`
    ).toString().trim();
    console.log(`Cảnh ${job.sceneIndex} tải về thành công, thời lượng gốc: ${dur}s`);

    downloadedFiles.push({
      ...job,
      localFile,
      rawDuration: Number(dur),
    });
  }

  console.log("\n=== TẤT CẢ 3 CẢNH RUNWAY THỰC THỤ ĐÃ TẠO XONG TỪ AI ===");

  const cuts = [];
  for (let i = 0; i < 3; i++) {
    const f = downloadedFiles[i];
    const trimmedPath = path.join(tempDir, `trimmed_pure_${i + 1}.mp4`);
    console.log(`Cắt Cảnh ${i + 1} thành ${f.targetDur}s...`);
    execSync(
      `ffmpeg -y -ss 00:00:00.000 -i "${f.localFile}" -t ${f.targetDur} -c:v libx264 -preset fast -crf 18 -c:a aac "${trimmedPath}"`,
      { stdio: "inherit" }
    );
    cuts.push(trimmedPath);
  }

  console.log("Ghép nối 3 cảnh thành video master 20.0s chuẩn catwalk...");
  const listFile = path.join(tempDir, "concat_pure.txt");
  fs.writeFileSync(listFile, cuts.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n") + "\n");

  const masterFile = path.join(tempDir, "runway_catwalk_20s_master_final.mp4");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${masterFile}"`,
    { stdio: "inherit" }
  );

  const finalDuration = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${masterFile}"`
  ).toString().trim();
  console.log(`Thời lượng video sàn diễn master: ${finalDuration}s`);

  // Tạo poster frame tại 2.0s
  const thumbFile = path.join(tempDir, "poster_runway_final.jpg");
  execSync(`ffmpeg -y -ss 00:00:02.000 -i "${masterFile}" -vframes 1 -q:v 2 "${thumbFile}"`, {
    stdio: "inherit",
  });

  // Lưu từng cảnh riêng lẻ vào assets
  const registeredScenes = [];
  for (let i = 0; i < 3; i++) {
    const f = downloadedFiles[i];
    const asset = saveAsset({
      projectId,
      name: f.name,
      buffer: fs.readFileSync(f.localFile),
      mime: "video/mp4",
      meta: {
        sceneIndex: f.sceneIndex,
        prompt: f.prompt,
        jobId: f.jobId,
        model: "veo-3.1",
        duration: f.rawDuration,
      },
    });
    registeredScenes.push(asset);
  }

  // Lưu master video
  const masterAsset = saveAsset({
    projectId,
    name: "Video Sàn Diễn Thời Trang 20s (Catwalk Runway Master - Chuẩn 100%)",
    buffer: fs.readFileSync(masterFile),
    mime: "video/mp4",
    meta: {
      title: "Sàn diễn thời trang Paris Fashion Week (Catwalk Runway 20s)",
      duration: Number(finalDuration),
      resolution: "1280x720",
      fps: 24,
      characterFaceDna: "Sweet heart-shaped face, soft expressive dark eyes, porcelain skin, dark brown hair with soft curtain bangs",
      scenes: downloadedFiles.map((d, idx) => ({
        index: idx + 1,
        title: d.name,
        prompt: d.prompt,
        jobId: d.jobId,
        durationInMaster: d.targetDur,
      })),
    },
  });

  // Lưu poster
  const thumbAsset = saveAsset({
    projectId,
    name: "Poster Sàn Diễn Runway (Master)",
    buffer: fs.readFileSync(thumbFile),
    mime: "image/jpeg",
  });
  setThumbnail(projectId, thumbAsset.url);

  console.log("\n========================================================");
  console.log("HOÀN THÀNH 100% VIDEO SÀN DIỄN CHUẨN CATWALK 20S:");
  console.log("Dự án ID:", projectId);
  console.log("Video Master Asset ID:", masterAsset.id);
  console.log("Video Master URL:", masterAsset.url);
  console.log("Poster URL:", thumbAsset.url);
  console.log("Thời lượng:", finalDuration, "giây");
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
