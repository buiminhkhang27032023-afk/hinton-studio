const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs");
const path = require("path");

const db = new DatabaseSync(path.join(__dirname, "../data/studio.db"));
const row = db.prepare("SELECT value FROM settings WHERE key = 'provider_iooai'").get();
const iooai = JSON.parse(row.value);
const baseUrl = iooai.baseUrl || "https://api.iooai.cn/v1";

const tasks = [
  { id: "task_lXcoL2t5FVSZOvs1tpaRkJ8KOlT6aKKW", name: "Seedance 2.5 官渠 (15s)" },
  { id: "task_OuFzasqgV2WXw9MkGzYGJnvmWEhwYSQr", name: "Seedance 2.0 官渠 满血 (15s)" },
  { id: "task_upwGBKDKp1sGsypRjO3hdNEJ4kjBjLsb", name: "Seedance 2.0 官渠 mini (15s)" },
  { id: "task_WBBbERHCUP9XBVFHnrPo1kbWUxcv3q3K", name: "Seedance 2.0 官渠 fast (15s)" },
  { id: "task_GfyoJ4w1I8KUfFB5Js72ct28t0sv7CJt", name: "Seedance 2.5 线路二 (30s)" },
  { id: "task_VrEsgIlBuyb1tmorMyn9ESIhIU5sclD1", name: "Omni Flash (10s)" }
];

async function downloadAll() {
  const assetDir = path.join(__dirname, "../data/assets");
  fs.mkdirSync(assetDir, { recursive: true });

  for (const t of tasks) {
    try {
      console.log(`Checking ${t.id} (${t.name})...`);
      const res = await fetch(`${baseUrl}/videos/${t.id}`, {
        headers: { "Authorization": `Bearer ${iooai.apiKey}` }
      });
      const data = await res.json();
      const videoUrl = data.output_url || data.download_url;
      if (!videoUrl) {
        console.log(`No url for ${t.id}`);
        continue;
      }

      const filename = `video_${t.id}.mp4`;
      const filePath = path.join(assetDir, filename);

      if (fs.existsSync(filePath) && fs.statSync(filePath).size > 100000) {
        console.log(`Already downloaded: ${filename}`);
      } else {
        console.log(`Downloading from ${videoUrl.slice(0, 50)}...`);
        const vRes = await fetch(videoUrl);
        if (!vRes.ok) {
          console.log(`Download failed ${vRes.status}`);
          continue;
        }
        const buf = Buffer.from(await vRes.arrayBuffer());
        fs.writeFileSync(filePath, buf);
        console.log(`Saved ${filename}, size: ${buf.length} bytes`);
      }

      // Record in assets table
      const assetId = `asset_${t.id}`;
      const url = `/api/files/assets/${filename}`;
      const existing = db.prepare("SELECT id FROM assets WHERE id = ?").get(assetId);
      if (!existing) {
        db.prepare(`
          INSERT INTO assets (id, project_id, name, kind, mime, url, meta, created_at)
          VALUES (?, ?, ?, 'video', 'video/mp4', ?, ?, ?)
        `).run(
          assetId,
          "prj_06d6f1c9496a",
          t.name,
          url,
          JSON.stringify({ taskId: t.id, model: data.model, seconds: data.seconds }),
          Date.now()
        );
        console.log(`Registered asset ${assetId}`);
      }
    } catch (e) {
      console.log(`Error on ${t.id}:`, e.message);
    }
  }
}

downloadAll();
