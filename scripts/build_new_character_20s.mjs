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
    name: "Cảnh 1: Bước ra sàn diễn thời trang Paris trong đầm dạ hội đen",
    prompt: "Cinematic establishing wide tracking shot of Paris Fashion Week runway show. A breathtaking young East Asian runway supermodel with long voluminous wavy black hair swept over one shoulder, porcelain skin, sharp elegant jawline, alluring dark almond eyes, wearing an exquisite black lace halter haute couture evening gown. She strides onto the glossy mirrored runway with immense poise and confidence, surrounded by glowing runway spotlights, camera flashes popping from VIP photographers, 35mm film aesthetic, 4k.",
    jobId: "svgen_9ee3a254-d724-40ca-94e8-ae931b2b7aad",
    targetDur: 7.0
  },
  {
    sceneIndex: 2,
    name: "Cảnh 2: Sải bước catwalk tracking shot & Thần thái kiêu sa",
    prompt: "Medium dynamic tracking camera shot gliding backwards in front of the stunning East Asian supermodel as she walks down the fashion catwalk. Her long wavy black hair flows with each step, intense captivating gaze looking toward the camera, black couture dress moving with liquid grace, front row fashion audience watching, dramatic cinematic side-lighting, lens flare, 35mm film color grading, 4k.",
    jobId: "svgen_7ab4e184-3fa4-4368-97a8-809e7a3cb8a2",
    targetDur: 7.0
  },
  {
    sceneIndex: 3,
    name: "Cảnh 3: Tạo dáng thần thái đầu sàn catwalk & Cú xoay người kết màn",
    prompt: "Cinematic three-quarter close-up and medium shot as the stunning East Asian supermodel reaches the tip of the fashion runway. Showing her sharp cheekbones, fair glowing skin, captivating dark eyes, and subtle confident smirk under dramatic stage lights. She strikes an iconic high-fashion pose, then performs a flawless pivot turn, black gown sweeping across the mirrored floor, soft bokeh applause in background, 35mm film aesthetic, 4k.",
    jobId: "svgen_c35d2eb9-2469-473f-a386-3f963535e8ff",
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
  const projectId = "prj_6db5b4ce6484";
  const tempDir = path.join(process.cwd(), "temp_render_new_char");
  fs.mkdirSync(tempDir, { recursive: true });

  const provider = getProvider();
  console.log("=== BẮT ĐẦU THEO DÕI & TẢI 3 CẢNH SÀN DIỄN CHO NHÂN VẬT MỚI ===");

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

    const localFile = path.join(tempDir, `new_char_scene_${job.sceneIndex}.mp4`);
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

  console.log("\n=== TẤT CẢ 3 CẢNH ĐÃ RENDER XONG ===");

  const cuts = [];
  for (let i = 0; i < 3; i++) {
    const f = downloadedFiles[i];
    const trimmedPath = path.join(tempDir, `trimmed_new_${i + 1}.mp4`);
    console.log(`Cắt Cảnh ${i + 1} thành ${f.targetDur}s...`);
    execSync(
      `ffmpeg -y -ss 00:00:00.000 -i "${f.localFile}" -t ${f.targetDur} -c:v libx264 -preset fast -crf 18 -c:a aac "${trimmedPath}"`,
      { stdio: "inherit" }
    );
    cuts.push(trimmedPath);
  }

  console.log("Ghép nối 3 cảnh thành video master 20.0s chuẩn...");
  const listFile = path.join(tempDir, "concat_new_char.txt");
  fs.writeFileSync(listFile, cuts.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n") + "\n");

  const masterFile = path.join(tempDir, "new_character_runway_20s_master.mp4");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${masterFile}"`,
    { stdio: "inherit" }
  );

  const finalDuration = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${masterFile}"`
  ).toString().trim();
  console.log(`Thời lượng video master: ${finalDuration}s`);

  // Tạo poster frame tại 2.0s
  const thumbFile = path.join(tempDir, "poster_new_runway.jpg");
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
    name: "Video Sàn Diễn Thời Trang 20s - Người Mẫu Mới (Master)",
    buffer: fs.readFileSync(masterFile),
    mime: "video/mp4",
    meta: {
      title: "Sàn diễn thời trang Paris Fashion Week (Người mẫu mới 20s)",
      duration: Number(finalDuration),
      resolution: "1280x720",
      fps: 24,
      characterFaceDna: "Alluring East Asian supermodel, long wavy black hair swept over shoulder, sharp V-line jaw, black halter gown",
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
    name: "Poster Sàn Diễn - Người Mẫu Mới (Master)",
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
        id: "image-ref-new-char",
        type: "image",
        position: { x: 40, y: 120 },
        data: {
          status: "succeeded",
          imageUrl: refAsset?.url,
          result: refAsset,
        },
      },
      {
        id: "prompt-runway-new",
        type: "prompt",
        position: { x: 40, y: 360 },
        data: {
          status: "succeeded",
          text: "Chủ đề: Sàn diễn thời trang Paris Fashion Week (Catwalk Runway)\nNhân vật: Siêu mẫu mới (mái tóc đen bồng bềnh lượn sóng buông lệch vai, gương mặt V-line sắc sảo quyến rũ, đầm dạ hội đen cúp ngực halter dress).\nKhông gian: Catwalk bóng gương, đèn rọi sân khấu và ánh chớp flash rực rỡ.",
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
      { id: "e-ref-s1", source: "image-ref-new-char", target: "scene-1-catwalk", animated: true },
      { id: "e-ref-s2", source: "image-ref-new-char", target: "scene-2-catwalk", animated: true },
      { id: "e-ref-s3", source: "image-ref-new-char", target: "scene-3-catwalk", animated: true },
      { id: "e-pr-s1", source: "prompt-runway-new", target: "scene-1-catwalk", animated: true },
      { id: "e-pr-s2", source: "prompt-runway-new", target: "scene-2-catwalk", animated: true },
      { id: "e-pr-s3", source: "prompt-runway-new", target: "scene-3-catwalk", animated: true },
      { id: "e-s1-res", source: "scene-1-catwalk", target: "result-master-20s", animated: true },
      { id: "e-s2-res", source: "scene-2-catwalk", target: "result-master-20s", animated: true },
      { id: "e-s3-res", source: "scene-3-catwalk", target: "result-master-20s", animated: true },
    ],
  };

  saveGraph(projectId, graph);

  console.log("\n========================================================");
  console.log("HOÀN THÀNH 100% VIDEO CHO NHÂN VẬT MỚI:");
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
