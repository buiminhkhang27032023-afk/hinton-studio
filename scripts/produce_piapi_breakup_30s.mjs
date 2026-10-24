import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const baseDir = process.cwd();
const db = new DatabaseSync(path.join(baseDir, 'data', 'studio.db'));

const piapiRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('provider_piapi');
const piapiConf = JSON.parse(piapiRow.value);
const apiKey = piapiConf.apiKey;

const tunnelRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('public_url');
const tunnelConf = tunnelRow ? JSON.parse(tunnelRow.value) : { baseUrl: '' };
const tunnelUrl = tunnelConf.baseUrl || 'https://order-participant-doll-telecommunications.trycloudflare.com';

const projectId = 'prj_breakup_30s';
const projectDir = path.join(baseDir, 'data', 'assets', projectId);
fs.mkdirSync(projectDir, { recursive: true });

const renderDir = path.join(baseDir, 'temp_render_breakup');
fs.mkdirSync(renderDir, { recursive: true });
const stateFile = path.join(renderDir, 'state.json');

const femaleTurnaroundUrl = `${tunnelUrl}/api/files/${projectId}/female_turnaround.jpg`;
const maleTurnaroundUrl = `${tunnelUrl}/api/files/${projectId}/male_turnaround.jpg`;
const femaleFaceUrl = `${tunnelUrl}/api/files/${projectId}/female_face_top.jpg`;
const maleFaceUrl = `${tunnelUrl}/api/files/${projectId}/male_face_top.jpg`;

const scenes = [
  {
    index: 1,
    name: 'Cảnh 1: Khoảng cách & Lời mở đầu (Toàn cảnh 2 người)',
    prompt: 'Cinematic medium-wide establishing two-shot. In a heavy rainy dusk outside a vintage glass-front cafe in Hanoi, the young Asian woman in @image1 (wearing round thin wireframe glasses, cute pink hair clip, charcoal ribbed knit cardigan, white camisole with ribbon, cream wide-leg jeans, sneakers) and the adult Asian man in @image2 (wearing dark navy tailored suit, white open-collar dress shirt, black leather dress shoes) stand outside under the dark awning. Glistening rain pouring down reflecting warm amber lights on the dark wet street. They stand two meters apart in painful emotional silence. He turns his head to look at her with profound sorrow and hesitation. Realistic heavy rain sound, male voice speaks with quiet heartbreak: "Em... chúng ta thật sự phải thế này sao?", sad cello chords in background.',
    images: [femaleTurnaroundUrl, maleTurnaroundUrl],
    duration: 10,
    taskId: 'f01c516f-7a50-4017-beba-a95473b8eca8'
  },
  {
    index: 2,
    name: 'Cảnh 2: Giọt nước mắt sau tròng kính (Cận cảnh bạn Nữ)',
    prompt: 'Cinematic intimate close-up (85mm lens, shallow depth of field). Raindrops blur in the warm bokeh background. Focus on the young Asian woman in @image1 with glasses and small pink hair clip under the cafe awning. Her eyes behind the round glasses fill with glistening tears. Her lower lip trembles softly as a single teardrop rolls slowly down her soft cheek. She forces a faint, bitter, heartbroken smile, shaking her head gently with painful acceptance. Heavy rain patter sound, female voice whispers softly through tears: "Em xin lỗi... Em trả lại tự do cho anh. Mình dừng lại thôi nhé.", sorrowful solo piano melody.',
    images: [femaleFaceUrl],
    duration: 10,
    taskId: 'b805e883-968c-419c-9494-360eed07ab34'
  },
  {
    index: 3,
    name: 'Cảnh 3: Bàn tay bất lực & Bước đi vào màn mưa',
    prompt: 'Cinematic over-the-shoulder tracking shot. The Asian man in @image1 raises his trembling right hand reaching toward her shoulder to pull her back, but his fingers freeze in mid-air with deep regret and slowly drop back down in defeat. The young woman in @image2 opens a clear transparent umbrella, turns around, and walks away into the pouring rain down the glistening wet street. The camera slowly dollies back past the man standing alone under the cafe awning lights, watching her silhouette fade into the rainy mist. Rain splashing on the pavement, footsteps receding, deep male trembling sigh. Emotional piano and cello swell together in a heartbreaking climax.',
    images: [maleFaceUrl, femaleTurnaroundUrl],
    duration: 10,
    taskId: null
  }
];

function loadState() {
  if (fs.existsSync(stateFile)) {
    try { return JSON.parse(fs.readFileSync(stateFile, 'utf-8')); } catch {}
  }
  return scenes;
}

function saveState(s) {
  fs.writeFileSync(stateFile, JSON.stringify(s, null, 2));
}

async function submitSceneWithRetry(scene) {
  if (scene.taskId) {
    console.log(`[Scene ${scene.index}] Already has Task ID: ${scene.taskId}`);
    return scene.taskId;
  }

  for (let attempt = 1; attempt <= 10; attempt++) {
    console.log(`[Scene ${scene.index}] Attempt ${attempt} submitting: ${scene.name}...`);
    try {
      const res = await fetch('https://api.piapi.ai/api/v1/task', {
        method: 'POST',
        headers: { 'X-API-Key': apiKey, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'seedance',
          task_type: 'seedance-2-fast-less-restriction',
          input: {
            prompt: scene.prompt,
            mode: 'omni_reference',
            duration: scene.duration,
            resolution: '720p',
            aspect_ratio: '16:9',
            audio: true,
            image_urls: scene.images
          }
        })
      });
      const data = await res.json();
      if (res.status === 429) {
        console.log(`[Scene ${scene.index}] Rate limit 429 (Too many requests). Waiting 15s before retry...`);
        await new Promise(r => setTimeout(r, 15000));
        continue;
      }
      if (data.code !== 200 || !data.data?.task_id) {
        throw new Error(`Submit error: ${JSON.stringify(data)}`);
      }
      scene.taskId = data.data.task_id;
      console.log(`[Scene ${scene.index}] Submitted successfully! Task ID: ${scene.taskId}`);
      return scene.taskId;
    } catch (err) {
      console.log(`[Scene ${scene.index}] Error: ${err.message}. Retrying in 10s...`);
      await new Promise(r => setTimeout(r, 10000));
    }
  }
  throw new Error(`Failed to submit Scene ${scene.index} after multiple retries`);
}

async function pollTask(taskId, sceneIndex) {
  console.log(`[Scene ${sceneIndex}] Polling task ${taskId}...`);
  for (let attempt = 1; attempt <= 150; attempt++) {
    await new Promise(r => setTimeout(r, 7000));
    try {
      const res = await fetch(`https://api.piapi.ai/api/v1/task/${taskId}`, {
        headers: { 'X-API-Key': apiKey }
      });
      const data = await res.json();
      const status = data.data?.status;
      if (attempt % 3 === 0) {
        console.log(`[Scene ${sceneIndex}] Attempt ${attempt}: status=${status}`);
      }
      if (status === 'completed') {
        const videoUrl = data.data?.output?.video_url || data.data?.output?.video;
        if (!videoUrl) throw new Error('Completed but video URL missing');
        console.log(`[Scene ${sceneIndex}] COMPLETED! Video: ${videoUrl}`);
        return videoUrl;
      }
      if (status === 'failed') {
        throw new Error(`Task ${taskId} failed: ${JSON.stringify(data.data?.error || data)}`);
      }
    } catch (e) {
      if (e.message.includes('failed')) throw e;
      console.log(`[Scene ${sceneIndex}] Poll check: ${e.message}`);
    }
  }
  throw new Error(`Timeout waiting for task ${taskId}`);
}

async function downloadVideo(url, destPath) {
  if (fs.existsSync(destPath) && fs.statSync(destPath).size > 1000000) {
    console.log(`File already downloaded: ${destPath}`);
    return;
  }
  console.log(`Downloading: ${url} -> ${destPath}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP error ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`Saved ${destPath} (${buffer.length} bytes)`);
}

async function main() {
  console.log('===============================================================');
  console.log('   PRODUCING 30-SECOND CINEMATIC BREAKUP FILM (PIAPI SEEDANCE)  ');
  console.log('===============================================================');

  const currentScenes = loadState();

  // Try submitting Scene 3 if not already submitted
  const scene3 = currentScenes.find(s => s.index === 3);
  if (!scene3.taskId) {
    console.log('\n--- Checking Scene 3 submission ---');
    await submitSceneWithRetry(scene3);
    saveState(currentScenes);
  }

  // Poll and download all clips
  const clipPaths = [];
  for (const scene of currentScenes) {
    const dest = path.join(renderDir, `scene_${scene.index}.mp4`);
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1000000) {
      console.log(`[Scene ${scene.index}] Clip already exists (${fs.statSync(dest).size} bytes)`);
      clipPaths.push(dest);
      continue;
    }
    const videoUrl = await pollTask(scene.taskId, scene.index);
    await downloadVideo(videoUrl, dest);
    clipPaths.push(dest);
  }

  // Concatenate into 30s master movie
  console.log('\n=== CONCATENATING 3 SCENES INTO 30S MASTER FILM ===');
  const concatList = path.join(renderDir, 'concat_list.txt');
  fs.writeFileSync(concatList, clipPaths.map(p => `file '${p.replace(/\\/g, "/")}'`).join('\n'));

  const masterPath = path.join(renderDir, 'master_breakup_film_30s.mp4');
  execSync(
    `ffmpeg -y -f concat -safe 0 -i "${concatList}" -c:v libx264 -preset fast -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k "${masterPath}"`,
    { stdio: 'inherit' }
  );
  console.log(`Master movie ready: ${masterPath} (${fs.statSync(masterPath).size} bytes)`);

  // Copy to project asset directory
  const finalDest = path.join(projectDir, 'asset_master_breakup_film_30s.mp4');
  fs.copyFileSync(masterPath, finalDest);

  // Generate poster
  const posterDest = path.join(projectDir, 'asset_poster_breakup.jpg');
  execSync(`ffmpeg -y -ss 00:00:03 -i "${masterPath}" -vframes 1 -q:v 2 "${posterDest}"`, { stdio: 'inherit' });

  // Register in SQLite
  const now = Date.now();
  db.prepare(`
    INSERT OR REPLACE INTO projects (id, name, thumbnail, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    projectId,
    'Phim ngắn 30s: Cơn Mưa Chia Tay (PiAPI Seedance 2.0)',
    `/api/files/${projectId}/asset_poster_breakup.jpg`,
    now,
    now
  );

  db.prepare(`
    INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    'asset_breakup_master_30s',
    projectId,
    'Phim ngắn 30s: Cơn Mưa Chia Tay — Bản Điện Ảnh Master',
    'file',
    'video/mp4',
    `/api/files/${projectId}/asset_master_breakup_film_30s.mp4`,
    JSON.stringify({ duration: 30.0, resolution: '1280x720', fps: 24, model: 'PiAPI Seedance 2.0 Fast Less Restriction' }),
    now
  );

  console.log('\n===============================================================');
  console.log('   🎉 30-SECOND CINEMATIC BREAKUP FILM PRODUCED SUCCESSFULLY!  ');
  console.log(`   URL: /api/files/${projectId}/asset_master_breakup_film_30s.mp4`);
  console.log('===============================================================');
}

main().catch(err => {
  console.error('\nProduction failed:', err);
  process.exit(1);
});
