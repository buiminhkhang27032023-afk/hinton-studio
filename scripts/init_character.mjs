import fs from "node:fs";
import path from "node:path";
import { saveAsset } from "../lib/storage.ts";
import { saveMemory } from "../lib/memory.ts";
import { setThumbnail } from "../lib/projects.ts";

async function main() {
  const projectId = "prj_dd30b182250a";
  const userImgPath = "C:/Users/Chen Qianyu/.gemini/antigravity/brain/4149a5ae-666d-4654-a6f8-20a00b1b99a6/.user_uploaded/media_1792489431374_43c29072.jpg";

  console.log("Reading uploaded image...");
  const buffer = fs.readFileSync(userImgPath);

  console.log("Saving asset into project...");
  const asset = saveAsset({
    projectId,
    name: "Khuon-mat-goc-reference",
    buffer,
    mime: "image/jpeg",
    meta: {
      isCharacterAnchor: true,
      description: "Young Asian female model reference portrait"
    }
  });

  console.log("Character anchor asset saved:", asset.id, asset.url);

  // Set project thumbnail
  setThumbnail(projectId, asset.url);

  // Save into character memory
  const mem = saveMemory({
    projectId,
    kind: "character",
    name: "Người mẫu thời trang (Khuôn mặt nhân bản)",
    description: "the exact same young Asian woman as the reference image: sweet heart-shaped face, soft expressive eyes, youthful delicate features, soft smile, dark brown parted hair framing her face, graceful runway posture",
    sourceUrl: asset.url,
    tags: ["model", "fashion", "asian", "runway", "sweet face"]
  });

  console.log("Saved memory entry:", mem.id, mem.name);
}

main().catch(console.error);
