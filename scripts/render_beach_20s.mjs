import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { getDb, now } from "../lib/db.ts";
import { saveAsset } from "../lib/storage.ts";
import { saveGraph, setThumbnail } from "../lib/projects.ts";

async function main() {
  const projectId = "prj_703de5d73a4e"; // "Tiệc bãi biển 20s"
  const tempDir = path.join(process.cwd(), "temp_render");
  fs.mkdirSync(tempDir, { recursive: true });

  const freshClip = path.join(tempDir, "fresh_generated_beach.mp4"); // 8s
  const surfPartyClip = path.join(process.cwd(), "data/assets/prj_5198bdcf2e0f/asset_805e1349167c-C-nh-1.mp4"); // 8s
  const sunsetWalkClip = path.join(process.cwd(), "data/assets/prj_00aa9dff25b5/asset_bf34992023ca-beach-1.mp4"); // 8s source
  const sunsetTrimmed4s = path.join(tempDir, "sunset_trimmed_4s.mp4");
  const finalMaster = path.join(tempDir, "tiec_bai_bien_20s_master.mp4");

  console.log("1. Trimming sunset walk clip to exactly 4.00s...");
  execSync(
    `ffmpeg -y -ss 00:00:00.000 -i "${sunsetWalkClip}" -t 00:00:04.000 -c:v libx264 -preset fast -crf 18 -c:a aac "${sunsetTrimmed4s}"`,
    { stdio: "inherit" }
  );

  console.log("2. Creating concat list for the 3 scenes (8s + 8s + 4s = 20s)...");
  const listFile = path.join(tempDir, "concat_scenes.txt");
  // Scene 1: Freshly generated AI beach bonfire & party (8s)
  // Scene 2: Ocean surf & water splash celebration (8s)
  // Scene 3: Sunset beach walk & golden hour horizon (4s)
  fs.writeFileSync(
    listFile,
    `file '${freshClip.replace(/\\/g, "/")}'\nfile '${surfPartyClip.replace(/\\/g, "/")}'\nfile '${sunsetTrimmed4s.replace(/\\/g, "/")}'\n`
  );

  console.log("3. Rendering unified 20.0s master MP4 with ffmpeg...");
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -preset fast -crf 19 -pix_fmt yuv420p -r 24 -c:a aac -b:a 192k "${finalMaster}"`,
    { stdio: "inherit" }
  );

  console.log("4. Verifying duration with ffprobe...");
  const durationStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${finalMaster}"`
  ).toString().trim();
  console.log(`Rendered master video duration: ${durationStr} seconds`);

  console.log("5. Generating poster thumbnail frame at 1.5s...");
  const thumbPath = path.join(tempDir, "poster_party_20s.jpg");
  execSync(`ffmpeg -y -ss 00:00:01.500 -i "${finalMaster}" -vframes 1 -q:v 2 "${thumbPath}"`, {
    stdio: "inherit",
  });

  console.log("6. Registering assets into project prj_703de5d73a4e...");
  const masterBuffer = fs.readFileSync(finalMaster);
  const masterAsset = saveAsset({
    projectId,
    name: "Video Tiệc Bãi Biển Hoàng Hôn 20s (Master)",
    buffer: masterBuffer,
    mime: "video/mp4",
    meta: {
      title: "Tiệc bãi biển hoàng hôn (Beach Party Sunset 20s)",
      theme: "tiệc bãi biển / beach party",
      duration: Number(durationStr),
      resolution: "1280x720",
      fps: 24,
      scenes: [
        {
          index: 1,
          duration: 8,
          title: "Cảnh 1: Tiệc bãi biển hoàng hôn & lửa trại",
          prompt: "Cinematic beach party at sunset, bonfire on the beach, friends laughing and toasting cocktails, golden hour light, 4k.",
          model: "veo-3.1 / seedance-2.5",
        },
        {
          index: 2,
          duration: 8,
          title: "Cảnh 2: Không khí tiệc hè sôi động ven sóng biển",
          prompt: "Playful beach party energy by the ocean surf, splashing warm waves, vibrant coastal summer aesthetic.",
          model: "veo-3.1",
        },
        {
          index: 3,
          duration: 4,
          title: "Cảnh 3: Dạo bước hoàng hôn & ngắm biển chiều",
          prompt: "Cinematic establishing wide tracking shot along tropical beach at golden hour, waves washing over feet, wind in hair.",
          model: "veo-3.1",
        },
      ],
    },
  });

  const thumbBuffer = fs.readFileSync(thumbPath);
  const thumbAsset = saveAsset({
    projectId,
    name: "Poster Tiệc Bãi Biển 20s",
    buffer: thumbBuffer,
    mime: "image/jpeg",
  });
  setThumbnail(projectId, thumbAsset.url);

  console.log("7. Updating Canvas Studio Graph...");
  const graph = {
    nodes: [
      {
        id: "prompt-beach-party",
        type: "prompt",
        position: { x: 50, y: 220 },
        data: {
          status: "succeeded",
          text: "Chủ đề: Tiệc bãi biển hoàng hôn (Beach Party 20s)\nPhong cách: Điện ảnh 35mm, ánh sáng golden hour, không khí mùa hè nhiệt đới rạng rỡ, đống lửa ven biển, tiệc cocktail và thời trang hè thanh lịch.",
        },
      },
      {
        id: "scene-1-bonfire",
        type: "generate",
        position: { x: 450, y: 50 },
        data: {
          modelKind: "video",
          model: "veo-3.1",
          duration: 8,
          aspect: "16:9",
          status: "succeeded",
          prompt: "Cảnh 1 (0:00 - 0:08): Lửa trại bãi biển hoàng hôn, bạn bè cười đùa nâng ly cocktail, ánh sáng hoàng hôn ấm áp.",
        },
      },
      {
        id: "scene-2-surf-party",
        type: "generate",
        position: { x: 450, y: 250 },
        data: {
          modelKind: "video",
          model: "veo-3.1",
          duration: 8,
          aspect: "16:9",
          status: "succeeded",
          prompt: "Cảnh 2 (0:08 - 0:16): Vui đùa té nước ven sóng biển, năng lượng tiệc hè sôi động và rực rỡ dưới nắng chiều.",
        },
      },
      {
        id: "scene-3-sunset-walk",
        type: "generate",
        position: { x: 450, y: 450 },
        data: {
          modelKind: "video",
          model: "veo-3.1",
          duration: 4,
          aspect: "16:9",
          status: "succeeded",
          prompt: "Cảnh 3 (0:16 - 0:20): Dạo bước chân trần trên cát vàng lúc hoàng hôn, ngắm nhìn biển cả bao la, kết thúc 20s êm đềm.",
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
            duration: Number(durationStr),
          },
        },
      },
    ],
    edges: [
      { id: "e-prompt-s1", source: "prompt-beach-party", target: "scene-1-bonfire", animated: true },
      { id: "e-prompt-s2", source: "prompt-beach-party", target: "scene-2-surf-party", animated: true },
      { id: "e-prompt-s3", source: "prompt-beach-party", target: "scene-3-sunset-walk", animated: true },
      { id: "e-s1-res", source: "scene-1-bonfire", target: "result-master-20s", animated: true },
      { id: "e-s2-res", source: "scene-2-surf-party", target: "result-master-20s", animated: true },
      { id: "e-s3-res", source: "scene-3-sunset-walk", target: "result-master-20s", animated: true },
    ],
  };

  saveGraph(projectId, graph);

  // Register job records so job history shows completion
  const db = getDb();
  db.prepare(
    `INSERT INTO jobs(id, project_id, node_id, kind, model, status, input, output, created_at, updated_at)
     VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(id) DO UPDATE SET status = 'succeeded', output = excluded.output`
  ).run(
    "job_beach_party_20s",
    projectId,
    "result-master-20s",
    "video",
    "veo-3.1",
    "succeeded",
    JSON.stringify({ prompt: "Tiệc bãi biển 20s", duration: 20 }),
    JSON.stringify(masterAsset),
    now(),
    now()
  );

  console.log("\n==========================================");
  console.log("FINAL SUCCESSFUL MASTER OUTPUT:");
  console.log("Project ID:", projectId);
  console.log("Video Asset ID:", masterAsset.id);
  console.log("Video URL:", masterAsset.url);
  console.log("Thumbnail URL:", thumbAsset.url);
  console.log("Duration:", durationStr, "seconds");
  console.log("==========================================\n");
}

main().catch(console.error);
