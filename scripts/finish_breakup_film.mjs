import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const baseDir = process.cwd();
const renderDir = path.join(baseDir, 'temp_render_breakup');
const projectId = 'prj_breakup_30s';
const projectDir = path.join(baseDir, 'data', 'assets', projectId);
fs.mkdirSync(projectDir, { recursive: true });

async function finish() {
  console.log('1. Downloading Scene 3...');
  const res = await fetch('https://img.theapi.app/ephemeral/fca87602-0ee8-4c91-b6bf-7e3f6d7dd59b.mp4');
  const buffer = Buffer.from(await res.arrayBuffer());
  const scene3Path = path.join(renderDir, 'scene_3.mp4');
  fs.writeFileSync(scene3Path, buffer);
  console.log('Saved scene_3.mp4, size:', buffer.length);

  console.log('2. Stitching into 30s master film with FFmpeg...');
  const concatList = path.join(renderDir, 'concat_list.txt');
  fs.writeFileSync(concatList, [
    "file 'scene_1.mp4'",
    "file 'scene_2.mp4'",
    "file 'scene_3.mp4'"
  ].join('\n'));

  const masterPath = path.join(projectDir, 'asset_master_breakup_film_30s.mp4');
  execSync(`ffmpeg -y -f concat -safe 0 -i "${concatList}" -c copy "${masterPath}"`, { stdio: 'inherit' });
  console.log('Master film created:', masterPath, 'size:', fs.statSync(masterPath).size);

  console.log('3. Generating poster frame...');
  const posterPath = path.join(projectDir, 'asset_poster_breakup.jpg');
  execSync(`ffmpeg -y -ss 00:00:03 -i "${masterPath}" -vframes 1 -q:v 2 "${posterPath}"`, { stdio: 'inherit' });

  console.log('4. Registering into SQLite...');
  const db = new DatabaseSync(path.join(baseDir, 'data', 'studio.db'));
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

finish().catch(console.error);
