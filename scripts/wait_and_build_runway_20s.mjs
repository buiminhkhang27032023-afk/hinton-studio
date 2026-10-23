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
    name: "Cảnh 1: Bước ra sàn diễn thời trang danh giá",
    prompt: "High fashion runway catwalk, the exact same young Asian female model from the reference image walking with poise and confidence, wearing a chic haute couture Parisian evening gown, bright runway spotlights, camera flashes, audience on both sides, 35mm film aesthetic, 4k",
    jobId: "svgen_53d9a4b5-0a7e-4e92-b378-f4cd9b5a3c2b",
    targetDur: 7.0
  },
  {
    sceneIndex: 2,
    name: "Cảnh 2: Bước đi catwalk điệu nghệ & Tà áo dạ hội",
    prompt: "Medium dynamic tracking shot following the exact same young Asian female model from the reference image on the luxury fashion runway, gliding down the catwalk with elegant confident strides, tailored haute couture gown flowing gracefully with her steps, front row fashion audience watching, camera flashbulbs popping, soft cinematic lighting, 35mm film look, 4k.",
    jobId: "svgen_da284a89-7f75-4c1b-ae1d-537ebd16d3c7",
    targetDur: 7.0
  },
  {
    sceneIndex: 3,
    name: "Cảnh 3: Tạo dáng đầu sàn diễn & Xoay người chào khán giả",
    prompt: "Three-quarter close-up and medium shot of the exact same young Asian female model from the reference image reaching the tip of the fashion runway, striking a sophisticated high-fashion pose, subtle confident smile under the dramatic runway spotlights, elegant pivot turn, soft bokeh applause in background, 35mm film aesthetic, 4k.",
    jobId: "svgen_c7ec073c-c9f1-48de-83b6-e736ec122544",
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
  const tempDir = path.join(process.cwd(), "temp_render_runway");
  fs.mkdirSync(tempDir, { recursive: true });

  const provider = getProvider();
  console.log("=== THEO DÕI & TẢI 3 CẢNH SÀN DIỄN THỜI TRANG (NHÂN BẢN KHUÔN MẶT) ===");

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

    const localFile = path.join(tempDir, `runway_scene_${job.sceneIndex}.mp4`);
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

  console.log("\n=== TẤT CẢ 3 CẢNH RUNWAY ĐÃ TẠO XONG TỪ AI ===");

  const cuts = [];
  for (let i = 0; i < 3; i++) {
    const f = downloadedFiles[i];
    const trimmedPath = path.join(tempDir, `trimmed_runway_${i + 1}.mp4`);
    console.log(`Cắt Cảnh ${i + 1} thành ${f.targetDur}s...`);
    execSync(
      `ffmpeg -y -ss 00:00:00.000 -i "${f.localFile}" -t ${f.targetDur} -c:v libx264 -preset fast -crf 18 -c:a aac "${trimmedPath}"`,
      { stdio: "inherit" }
    );
    cuts.push(trimmedPath);
  }

  console.log("Ghép nối 3 cảnh runway thành video 20.0s master...");
  const listFile = path.join(tempDir, "concat_runway.txt");
  fs.writeFileSync(listFile, cuts.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n") + "\n");

  const masterFile = path.join(tempDir, "runway_fashion_20s_master.mp4");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${masterFile}"`,
    { stdio: "inherit" }
  );

  const finalDuration = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${masterFile}"`
  ).toString().trim();
  console.log(`Thời lượng video sàn diễn master: ${finalDuration}s`);

  // Tạo thumbnail
  const thumbFile = path.join(tempDir, "poster_runway_master.jpg");
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
    name: "Video Sàn Diễn Thời Trang 20s (Nhân Bản Khuôn Mặt)",
    buffer: fs.readFileSync(masterFile),
    mime: "video/mp4",
    meta: {
      title: "Sàn diễn thời trang cao cấp 20s (Nhân bản khuôn mặt nhân vật)",
      duration: Number(finalDuration),
      resolution: "1280x720",
      fps: 24,
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
    name: "Poster Sàn Diễn Thời Trang 20s",
    buffer: fs.readFileSync(thumbFile),
    mime: "image/jpeg",
  });
  setThumbnail(projectId, thumbAsset.url);

  // Lấy ảnh gốc
  const db = getDb();
  const refAsset = db
    .prepare("SELECT * FROM assets WHERE project_id = ? AND kind = 'image' LIMIT 1")
    .get(projectId);

  // Cập nhật Canvas Graph
  const graph = {
    nodes: [
      {
        id: "image-ref-face",
        type: "image",
        position: { x: 40, y: 120 },
        data: {
          status: "succeeded",
          imageUrl: refAsset?.url,
          result: refAsset,
        },
      },
      {
        id: "prompt-runway",
        type: "prompt",
        position: { x: 40, y: 360 },
        data: {
          status: "succeeded",
          text: "Chủ đề: Sàn diễn thời trang Paris Fashion Week (Catwalk Runway)\nNhân vật: Nhân bản từ ảnh chân dung gốc (gương mặt thanh tú, tóc nâu sẫm, thần thái tự tin).\nTrang phục: Đầm dạ hội cao cấp Haute Couture.\nKhông gian: Ánh đèn rọi sàn diễn, ánh chớp máy ảnh của phóng viên.",
        },
      },
      {
        id: "scene-1-catwalk",
        type: "generate",
        position: { x: 420, y: 30 },
        data: {
          modelKind: "video",
          model: "veo-3.1",
          duration: 7,
          aspect: "16:9",
          status: "succeeded",
          prompt: jobs[0].prompt,
          videoUrl: registeredScenes[0].url,
        },
      },
      {
        id: "scene-2-catwalk",
        type: "generate",
        position: { x: 420, y: 230 },
        data: {
          modelKind: "video",
          model: "veo-3.1",
          duration: 7,
          aspect: "16:9",
          status: "succeeded",
          prompt: jobs[1].prompt,
          videoUrl: registeredScenes[1].url,
        },
      },
      {
        id: "scene-3-catwalk",
        type: "generate",
        position: { x: 420, y: 430 },
        data: {
          modelKind: "video",
          model: "veo-3.1",
          duration: 6,
          aspect: "16:9",
          status: "succeeded",
          prompt: jobs[2].prompt,
          videoUrl: registeredScenes[2].url,
        },
      },
      {
        id: "result-master-20s",
        type: "result",
        position: { x: 880, y: 220 },
        data: {
          status: "succeeded",
          videoUrl: masterAsset.url,
          result: {
            id: masterAsset.id,
            projectId: projectId,
            name: masterAsset.name,
            kind: "video",
            mime: "video/mp4",
            url: masterAsset.url,
            duration: Number(finalDuration),
          },
        },
      },
    ],
    edges: [
      { id: "e-ref-s1", source: "image-ref-face", target: "scene-1-catwalk", animated: true },
      { id: "e-ref-s2", source: "image-ref-face", target: "scene-2-catwalk", animated: true },
      { id: "e-ref-s3", source: "image-ref-face", target: "scene-3-catwalk", animated: true },
      { id: "e-pr-s1", source: "prompt-runway", target: "scene-1-catwalk", animated: true },
      { id: "e-pr-s2", source: "prompt-runway", target: "scene-2-catwalk", animated: true },
      { id: "e-pr-s3", source: "prompt-runway", target: "scene-3-catwalk", animated: true },
      { id: "e-s1-res", source: "scene-1-catwalk", target: "result-master-20s", animated: true },
      { id: "e-s2-res", source: "scene-2-catwalk", target: "result-master-20s", animated: true },
      { id: "e-s3-res", source: "scene-3-catwalk", target: "result-master-20s", animated: true },
    ],
  };

  saveGraph(projectId, graph);

  console.log("\n========================================================");
  console.log("HOÀN THÀNH 100% VIDEO SÀN DIỄN THỜI TRANG 20S NHÂN BẢN KHUÔN MẶT:");
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
