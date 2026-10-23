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
    name: "Cảnh 1: Nam người mẫu bước ra sàn diễn thời trang Paris trong bộ suit đen",
    prompt: "Cinematic establishing wide tracking shot of Paris Men's Fashion Week runway show. A handsome young Vietnamese male runway model with a modern faded undercut hairstyle, warm confident smile, and clean fair skin. He wears a bespoke tailored luxury black designer suit with a crisp white shirt, walking down the glossy black mirrored catwalk with charismatic masculine stride. Dramatic overhead runway spotlights, camera flashbulbs firing from the audience and photographers, 35mm film aesthetic, 4k.",
    jobId: "svgen_f74790a7-36f0-4426-b5a8-1ac753170a7b",
    targetDur: 7.0
  },
  {
    sceneIndex: 2,
    name: "Cảnh 2: Sải bước catwalk tracking shot & Thần thái lịch lãm",
    prompt: "Medium dynamic tracking camera shot gliding backwards in front of the handsome young Vietnamese male model as he strides down the fashion runway. His tailored black suit fits impeccably, modern undercut hair neatly styled, flashing a warm charismatic smile towards the camera, fashion VIPs and critics watching from front row seats, soft lens flare, dramatic theatrical lighting, 35mm film color grading, 4k.",
    jobId: "svgen_ab8aa357-b273-42f4-8bd4-ee00ae60c500",
    targetDur: 7.0
  },
  {
    sceneIndex: 3,
    name: "Cảnh 3: Tạo dáng đầu sàn catwalk & Nụ cười tự tin toả sáng",
    prompt: "Cinematic three-quarter medium shot as the handsome young Vietnamese male model reaches the front edge of the catwalk runway. He pauses confidently, adjusting his black suit jacket with one hand, offering a radiant warm smile to the photographers, camera flashbulbs flashing brilliantly, then performing a smooth confident pivot turn, audience applauding in soft bokeh background, 35mm film look, 4k.",
    jobId: "svgen_180abdfb-3ed1-4d3d-8d38-708f32300bc3",
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
  const projectId = "prj_1fb5d7a0444e";
  const tempDir = path.join(process.cwd(), "temp_render_male_runway");
  fs.mkdirSync(tempDir, { recursive: true });

  const provider = getProvider();
  console.log("=== THEO DÕI & TẢI 3 CẢNH SÀN DIỄN THỜI TRANG NAM (NHÂN VẬT MỚI) ===");

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

    const localFile = path.join(tempDir, `male_runway_scene_${job.sceneIndex}.mp4`);
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

  console.log("\n=== TẤT CẢ 3 CẢNH NAM RUNWAY ĐÃ RENDER XONG ===");

  const cuts = [];
  for (let i = 0; i < 3; i++) {
    const f = downloadedFiles[i];
    const trimmedPath = path.join(tempDir, `trimmed_male_${i + 1}.mp4`);
    console.log(`Cắt Cảnh ${i + 1} thành ${f.targetDur}s...`);
    execSync(
      `ffmpeg -y -ss 00:00:00.000 -i "${f.localFile}" -t ${f.targetDur} -c:v libx264 -preset fast -crf 18 -c:a aac "${trimmedPath}"`,
      { stdio: "inherit" }
    );
    cuts.push(trimmedPath);
  }

  console.log("Ghép nối 3 cảnh thành video master 20.0s chuẩn...");
  const listFile = path.join(tempDir, "concat_male.txt");
  fs.writeFileSync(listFile, cuts.map((c) => `file '${c.replace(/\\/g, "/")}'`).join("\n") + "\n");

  const masterFile = path.join(tempDir, "male_runway_catwalk_20s_master.mp4");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${masterFile}"`,
    { stdio: "inherit" }
  );

  const finalDuration = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${masterFile}"`
  ).toString().trim();
  console.log(`Thời lượng video sàn diễn nam master: ${finalDuration}s`);

  // Tạo poster frame tại 2.0s
  const thumbFile = path.join(tempDir, "poster_male_runway.jpg");
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
    name: "Video Sàn Diễn Thời Trang Nam 20s - Lịch Lãm (Master)",
    buffer: fs.readFileSync(masterFile),
    mime: "video/mp4",
    meta: {
      title: "Sàn diễn thời trang nam Paris Fashion Week (20 giây)",
      duration: Number(finalDuration),
      resolution: "1280x720",
      fps: 24,
      characterFaceDna: "Handsome young Vietnamese male model in sharp tailored black suit, modern undercut haircut, warm bright confident smile",
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
    name: "Poster Sàn Diễn Nam (Master)",
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
        id: "image-ref-male-char",
        type: "image",
        position: { x: 40, y: 120 },
        data: {
          status: "succeeded",
          imageUrl: refAsset?.url,
          result: refAsset,
        },
      },
      {
        id: "prompt-male-runway",
        type: "prompt",
        position: { x: 40, y: 360 },
        data: {
          status: "succeeded",
          text: "Chủ đề: Sàn diễn thời trang nam Paris Men's Fashion Week (Catwalk Runway)\nNhân vật: Nam người mẫu lịch lãm (tóc undercut hiện đại, nụ cười tự tin toả sáng, âu phục suit đen may đo cao cấp).\nKhông gian: Catwalk tráng lệ, đèn rọi spotlight, hàng trăm ánh chớp máy ảnh của giới mộ điệu thời trang.",
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
      { id: "e-ref-s1", source: "image-ref-male-char", target: "scene-1-catwalk", animated: true },
      { id: "e-ref-s2", source: "image-ref-male-char", target: "scene-2-catwalk", animated: true },
      { id: "e-ref-s3", source: "image-ref-male-char", target: "scene-3-catwalk", animated: true },
      { id: "e-pr-s1", source: "prompt-male-runway", target: "scene-1-catwalk", animated: true },
      { id: "e-pr-s2", source: "prompt-male-runway", target: "scene-2-catwalk", animated: true },
      { id: "e-pr-s3", source: "prompt-male-runway", target: "scene-3-catwalk", animated: true },
      { id: "e-s1-res", source: "scene-1-catwalk", target: "result-master-20s", animated: true },
      { id: "e-s2-res", source: "scene-2-catwalk", target: "result-master-20s", animated: true },
      { id: "e-s3-res", source: "scene-3-catwalk", target: "result-master-20s", animated: true },
    ],
  };

  saveGraph(projectId, graph);

  console.log("\n========================================================");
  console.log("HOÀN THÀNH 100% VIDEO CHO NAM NGƯỜI MẪU:");
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
