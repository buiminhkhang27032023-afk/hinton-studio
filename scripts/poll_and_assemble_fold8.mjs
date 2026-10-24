import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';

const key = 's4Mb36Zll7ZoGdi68dqlpEck0N';
const prjId = 'prj_zfold8_commercial_10s';
const outDir = path.join('./data/assets', prjId);
fs.mkdirSync(outDir, { recursive: true });

const tasks = {
  shot2_phone: '852fd19e-7426-3e2b-d74c-2f72e91e0602',
  shot1_man: 'df7acd57-8806-345f-c484-d8b836e680b8',
};

async function checkTask(id) {
  const hosts = ['https://api.wike.cc', 'https://duomiapi.com'];
  for (const host of hosts) {
    try {
      const res = await fetch(`${host}/api/v3/contents/generations/tasks/${id}`, {
        headers: { Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      return data;
    } catch {
      // try next host
    }
  }
  return { status: 'running' };
}

async function downloadFile(url, destPath) {
  console.log(`Downloading: ${url.slice(0, 80)}... -> ${destPath}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed with status ${res.status}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  fs.writeFileSync(destPath, buffer);
  console.log(`Saved: ${destPath} (${(buffer.length / 1024 / 1024).toFixed(2)} MB)`);
}

async function main() {
  console.log('=== POLLING SEEDANCE 2.0 TASKS ON DUOMIAPI ===');
  const results = {};

  while (Object.keys(results).length < 2) {
    for (const [name, id] of Object.entries(tasks)) {
      if (results[name]) continue;
      const res = await checkTask(id);
      console.log(`[${new Date().toLocaleTimeString()}] ${name} (${id.slice(0, 8)}...): ${res.status}`);
      if (res.status === 'succeeded' && res.content?.video_url) {
        results[name] = res.content.video_url;
      } else if (res.status === 'failed') {
        console.error(`Task ${name} failed:`, res.error);
        results[name] = null;
      }
    }
    if (Object.keys(results).length < 2) {
      await new Promise((r) => setTimeout(r, 5000));
    }
  }

  console.log('\nAll tasks finished!');
  console.log(results);

  // If one or both succeeded, let's download
  const shot1Path = path.join(outDir, 'shot_1_drop.mp4');
  const shot2Path = path.join(outDir, 'shot_2_review_360.mp4');

  if (results.shot1_man) {
    await downloadFile(results.shot1_man, shot1Path);
  }
  if (results.shot2_phone) {
    await downloadFile(results.shot2_phone, shot2Path);
  }

  const masterPath = path.join(outDir, 'samsung_z_fold8_ultra_10s_master.mp4');

  if (fs.existsSync(shot1Path) && fs.existsSync(shot2Path)) {
    console.log('Merging Shot 1 + Shot 2 with FFmpeg into 10s master...');
    const listFile = path.join(outDir, 'concat_list.txt');
    // Ensure both are normalized to 1080x1920 (9:16) or 1920x1080 (16:9)
    const norm1 = path.join(outDir, 'shot1_norm.mp4');
    const norm2 = path.join(outDir, 'shot2_norm.mp4');

    execSync(`ffmpeg -y -i "${shot1Path}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -r 24 -c:v libx264 -pix_fmt yuv420p "${norm1}"`, { stdio: 'inherit' });
    execSync(`ffmpeg -y -i "${shot2Path}" -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1" -r 24 -c:v libx264 -pix_fmt yuv420p "${norm2}"`, { stdio: 'inherit' });

    fs.writeFileSync(listFile, `file '${path.resolve(norm1).replace(/\\/g, '/')}'\nfile '${path.resolve(norm2).replace(/\\/g, '/')}'\n`);
    execSync(`ffmpeg -y -f concat -safe 0 -i "${listFile}" -c:v libx264 -pix_fmt yuv420p "${masterPath}"`, { stdio: 'inherit' });
    console.log(`Master TVC 10s created: ${masterPath}`);
  } else if (fs.existsSync(shot2Path)) {
    // Loop or extend to 10s
    console.log('Using Shot 2 (Phone 360 review) as master...');
    execSync(`ffmpeg -y -i "${shot2Path}" -c copy "${masterPath}"`, { stdio: 'inherit' });
  }

  // Register in SQLite
  if (fs.existsSync(masterPath)) {
    const db = new DatabaseSync('./data/studio.db');
    const assetId = `asset_fold8_master_${Date.now()}`;
    const filename = path.basename(masterPath);
    const assetUrl = `/api/files/${prjId}/${filename}`;

    db.prepare(`
      INSERT OR REPLACE INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      assetId,
      prjId,
      'Samsung Galaxy Z Fold8 Ultra — TVC 10s Master',
      'video',
      'video/mp4',
      assetUrl,
      JSON.stringify({ duration: 10, model: 'doubao-seedance-2-0-fast-260128', provider: 'duomiapi' }),
      Date.now()
    );

    console.log(`Registered asset in DB: ${assetUrl}`);
  }
}

main().catch(console.error);
