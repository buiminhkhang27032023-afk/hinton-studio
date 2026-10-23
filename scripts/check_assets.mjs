import { DatabaseSync } from "node:sqlite";
import { execSync } from "node:child_process";
import fs from "node:fs";

const db = new DatabaseSync("data/studio.db");
const assets = db.prepare("SELECT * FROM assets WHERE kind = 'video'").all();

console.log(`Found ${assets.length} video assets:`);
for (const a of assets) {
  // Try to find the file
  const relative = a.url.replace(/^\/api\/files\//, "data/assets/");
  let duration = "N/A";
  if (fs.existsSync(relative)) {
    try {
      duration = execSync(`ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${relative}"`).toString().trim();
    } catch (e) {
      duration = "err";
    }
  }
  console.log(`- [${a.id}] ${a.name} (${duration}s) -> ${relative}`);
}
