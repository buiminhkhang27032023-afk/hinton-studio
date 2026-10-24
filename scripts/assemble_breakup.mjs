import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const baseDir = process.cwd();
const renderDir = path.join(baseDir, 'temp_render_breakup');
const projectId = 'prj_breakup_30s';
const projectDir = path.join(baseDir, 'data', 'assets', projectId);
fs.mkdirSync(projectDir, { recursive: true });

const db = new DatabaseSync(path.join(baseDir, 'data', 'studio.db'));
const row = db.prepare('SELECT value FROM settings WHERE key = ?').get('provider_piapi');
const conf = JSON.parse(row.value);
const apiKey = conf.apiKey;

async function assemble() {
  console.log('1. Fetching Scene 3 task details from PiAPI...');
  let videoUrl = null;
  for (let i = 1; i <= 30; i++) {
    const res = await fetch('https://api.piapi.ai/api/v1/task/891df1f3-d692-45dc-b132-edf942fc95c7', {
      headers: { 'X-API-Key': apiKey }
    });
    const d = await res.json();
    const st = d.data?.status;
    const v = d.data?.output?.video_url || d.data?.output?.video;
    console.log(`Poll ${i}: status=${st}, video=${v || 'none'}`);
    if (st === 'completed' && v) {
      videoUrl = v;
      break;
    }
    if (st === 'failed') {
      throw new Error(`Scene 3 failed: ${JSON.stringify(d.data?.error)}`);
    }
    await new Promise(r => setTimeout(r, 6000));
  }

  if (!videoUrl) throw new Error('Scene 3 not ready yet.');

  console.log(`Downloading Scene 3 from ${videoUrl}...`);
  const vRes = await fetch(videoUrl);
  if (!vRes.ok) throw new Error(`Download HTTP ${vRes.status}`);
  const buf = Buffer.from(await vRes.arrayBuffer());
  const scene3Path = path.join(renderDir, 'scene_3.mp4');
  fs.writeFileSync(scene3Path, buf);
  console.log(`Saved scene_3.mp4 (${buf.length} bytes)`);

  console.log('\n2. Verifying all 3 scene files:');
  for (let i = 1; i <= 3; i++) {
    const p = path.join(renderDir, `scene_${i}.mp4`);
    console.log(`scene_${i}.mp4: ${fs.statSync(p).size} bytes`);
  }

  console.log('\n3. Concatenating into 30s master film...');
  const concatList = path.join(renderDir, 'concat_list.txt');
  fs.writeFileSync(concatList, [
    "file 'scene_1.mp4'",
    "file 'scene_2.mp4'",
    "file 'scene_3.mp4'"
  ].join('\n'));

  const masterPath = path.join(projectDir, 'asset_master_breakup_film_30s.mp4');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${masterPath}"`, { stdio: 'inherit' });
  console.log(`Master film created: ${masterPath} (${fs.statSync(masterPath).size} bytes)`);

  console.log('\n4. Generating poster...');
  const posterPath = path.join(projectDir, 'asset_poster_breakup.jpg');
  execSync(`ffmpeg -y -ss 00:00:03 -i "${masterPath}" -vframes 1 -q:v 2 "${posterPath}"`, { stdio: 'inherit' });

  console.log('\n5. Registering into SQLite...');
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

  console.log('\n=== ALL DONE! Film ready at: /api/files/' + projectId + '/asset_master_breakup_film_30s.mp4 ===');
}

assemble().catch(console.error);
