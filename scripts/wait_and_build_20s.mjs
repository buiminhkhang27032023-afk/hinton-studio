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
    name: "Cảnh 1: Khởi đầu tiệc bãi biển hoàng hôn & Quầy bar",
    prompt: "Cinematic establishing wide tracking shot of an upscale beach party at golden hour sunset, palm trees decorated with warm fairy lights, tiki torches burning gently, friends gathering near a bamboo tiki bar with tropical cocktails, waves washing on white sand, 35mm film look, luxury summer aesthetic, 4k.",
    jobId: "svgen_a2c8cd4a-a75a-4f64-bee2-a5704ecdf06f",
  },
  {
    sceneIndex: 2,
    name: "Cảnh 2: Nhảy múa & Lửa trại bãi biển lúc chạng vạng",
    prompt: "Medium dynamic tracking shot of attractive young friends in stylish summer resort wear dancing and laughing around a glowing beach bonfire at dusk, sparks drifting in ocean breeze, golden sunset on the horizon, joyful party atmosphere, warm lighting, 35mm film aesthetic, 4k.",
    jobId: "svgen_d560abfc-2f61-4aba-9a92-220340128d36",
  },
  {
    sceneIndex: 3,
    name: "Cảnh 3: Nâng ly chúc mừng & Pháo hoa que bên biển",
    prompt: "Cinematic three-quarter medium shot of friends at the beach party toasting cocktails and sparkling champagne glasses at sunset, holding glowing sparklers, cheerful laughter, bokeh lights from the beach party behind them, ocean waves in background, warm golden hour, 4k.",
    jobId: "svgen_8c67beeb-b820-40c2-8f80-6b49372c9564",
  },
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
  const projectId = "prj_703de5d73a4e";
  const tempDir = path.join(process.cwd(), "temp_render_fresh");
  fs.mkdirSync(tempDir, { recursive: true });

  const provider = getProvider();
  console.log("=== BẮT ĐẦU CHỜ VÀ THEO DÕI 3 CẢNH TẠO MỚI TỪ AI ===");

  const downloadedFiles = [];

  for (const job of jobs) {
    console.log(`\nĐang theo dõi Cảnh ${job.sceneIndex} [${job.jobId}]...`);
    let completed = false;
    let attempts = 0;
    while (!completed && attempts < 120) {
      // up to 10-15 minutes
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

    const localFile = path.join(tempDir, `fresh_scene_${job.sceneIndex}.mp4`);
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

  console.log("\n=== TẤT CẢ 3 CẢNH ĐÃ ĐƯỢC TẠO MỚI 100% TỪ AI ===");

  // Now, cut and assemble into exactly 20.0s:
  // Scene 1: 7.0s
  // Scene 2: 7.0s
  // Scene 3: 6.0s
  // Total: 7 + 7 + 6 = 20.0s exact
  const cuts = [
    { targetDur: 7.0, trimmed: path.join(tempDir, "trimmed_1.mp4") },
    { targetDur: 7.0, trimmed: path.join(tempDir, "trimmed_2.mp4") },
    { targetDur: 6.0, trimmed: path.join(tempDir, "trimmed_3.mp4") },
  ];

  for (let i = 0; i < 3; i++) {
    const f = downloadedFiles[i];
    const c = cuts[i];
    console.log(`Cắt Cảnh ${i + 1} thành ${c.targetDur}s chuẩn...`);
    execSync(
      `ffmpeg -y -ss 00:00:00.000 -i "${f.localFile}" -t ${c.targetDur} -c:v libx264 -preset fast -crf 18 -c:a aac "${c.trimmed}"`,
      { stdio: "inherit" }
    );
  }

  console.log("Ghép nối 3 cảnh mới tạo thành video master 20 giây...");
  const listFile = path.join(tempDir, "concat_3_fresh_scenes.txt");
  fs.writeFileSync(
    listFile,
    cuts.map((c) => `file '${c.trimmed.replace(/\\/g, "/")}'`).join("\n") + "\n"
  );

  const masterFile = path.join(tempDir, "beach_party_20s_all_fresh.mp4");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${masterFile}"`,
    { stdio: "inherit" }
  );

  const finalDuration = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${masterFile}"`
  ).toString().trim();
  console.log(`Thời lượng video master hoàn chỉnh: ${finalDuration}s`);

  // Tạo poster thumbnail
  const thumbFile = path.join(tempDir, "poster_master_fresh.jpg");
  execSync(`ffmpeg -y -ss 00:00:02.000 -i "${masterFile}" -vframes 1 -q:v 2 "${thumbFile}"`, {
    stdio: "inherit",
  });

  // Lưu từng cảnh riêng lẻ vào tài sản dự án (Project Assets)
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
        model: "veo-3.1 / seedance-2.5",
        duration: f.rawDuration,
      },
    });
    registeredScenes.push(asset);
  }

  // Lưu video master 20s
  const masterAsset = saveAsset({
    projectId,
    name: "Video Tiệc Bãi Biển 20s - 3 Cảnh Tạo Mới Từ AI (Master)",
    buffer: fs.readFileSync(masterFile),
    mime: "video/mp4",
    meta: {
      title: "Tiệc bãi biển hoàng hôn 20s (3 cảnh hoàn toàn tạo mới từ AI)",
      duration: Number(finalDuration),
      resolution: "1280x720",
      fps: 24,
      totalScenes: 3,
      scenes: downloadedFiles.map((d, idx) => ({
        index: idx + 1,
        title: d.name,
        prompt: d.prompt,
        jobId: d.jobId,
        durationInMaster: cuts[idx].targetDur,
      })),
    },
  });

  // Lưu thumbnail
  const thumbAsset = saveAsset({
    projectId,
    name: "Poster Tiệc Bãi Biển (Master 20s)",
    buffer: fs.readFileSync(thumbFile),
    mime: "image/jpeg",
  });
  setThumbnail(projectId, thumbAsset.url);

  // Cập nhật Canvas Graph
  const graph = {
    nodes: [
      {
        id: "prompt-beach-party",
        type: "prompt",
        position: { x: 40, y: 220 },
        data: {
          status: "succeeded",
          text: "Chủ đề: Tiệc bãi biển mùa hè (Beach Party 20s - 3 Cảnh tạo mới từ AI)\nPhong cách: Điện ảnh 35mm, ánh sáng hoàng hôn golden hour, bạn bè tụ họp tiệc tùng, lửa trại và pháo hoa que bên bờ biển.",
        },
      },
      {
        id: "scene-1-fresh",
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
        id: "scene-2-fresh",
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
        id: "scene-3-fresh",
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
      { id: "e-prompt-s1", source: "prompt-beach-party", target: "scene-1-fresh", animated: true },
      { id: "e-prompt-s2", source: "prompt-beach-party", target: "scene-2-fresh", animated: true },
      { id: "e-prompt-s3", source: "prompt-beach-party", target: "scene-3-fresh", animated: true },
      { id: "e-s1-res", source: "scene-1-fresh", target: "result-master-20s", animated: true },
      { id: "e-s2-res", source: "scene-2-fresh", target: "result-master-20s", animated: true },
      { id: "e-s3-res", source: "scene-3-fresh", target: "result-master-20s", animated: true },
    ],
  };

  saveGraph(projectId, graph);

  console.log("\n========================================================");
  console.log("HOÀN THÀNH 100% QUÁ TRÌNH TẠO 3 CẢNH MỚI VÀ RENDER 20S:");
  console.log("Dự án ID:", projectId);
  console.log("Video Master Asset ID:", masterAsset.id);
  console.log("Video Master URL:", masterAsset.url);
  console.log("Poster URL:", thumbAsset.url);
  console.log("Thời lượng:", finalDuration, "giây");
  console.log("Cảnh 1:", registeredScenes[0].url);
  console.log("Cảnh 2:", registeredScenes[1].url);
  console.log("Cảnh 3:", registeredScenes[2].url);
  console.log("========================================================\n");
}

main().catch((err) => {
  console.error("Lỗi:", err);
  process.exit(1);
});
