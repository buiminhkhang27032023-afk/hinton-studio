import fs from "node:fs";
import { saveAsset } from "../lib/storage.ts";
import { saveMemory } from "../lib/memory.ts";
import { setThumbnail } from "../lib/projects.ts";

async function main() {
  const projectId = "prj_6db5b4ce6484";
  const userImgPath = "C:/Users/Chen Qianyu/.gemini/antigravity/brain/4149a5ae-666d-4654-a6f8-20a00b1b99a6/.user_uploaded/media_1792490541255_4ab9e7b7.png";

  const buffer = fs.readFileSync(userImgPath);

  const asset = saveAsset({
    projectId,
    name: "Nguoi-mau-chinh-reference",
    buffer,
    mime: "image/png",
    meta: {
      isCharacterAnchor: true,
      description: "Young alluring East Asian supermodel, black lace halter dress, long cascading wavy black hair"
    }
  });

  console.log("Saved asset:", asset.id, asset.url);
  setThumbnail(projectId, asset.url);

  const mem = saveMemory({
    projectId,
    kind: "character",
    name: "Người mẫu thời trang quyến rũ",
    description: "Stunning glamorous young East Asian runway supermodel, flawless glowing fair skin, sharp elegant V-line jaw, prominent cheekbones, delicate high-bridged nose, alluring dark almond eyes with intense gaze, soft rosy lips, voluminous glossy black wavy hair cascading over one shoulder, slender refined silhouette wearing a chic black haute couture dress",
    sourceUrl: asset.url,
    tags: ["supermodel", "asian", "glamorous", "high fashion", "black hair", "catwalk"]
  });

  console.log("Saved memory:", mem.id, mem.name);
}

main().catch(console.error);
