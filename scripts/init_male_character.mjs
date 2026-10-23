import fs from "node:fs";
import { saveAsset } from "../lib/storage.ts";
import { saveMemory } from "../lib/memory.ts";
import { setThumbnail } from "../lib/projects.ts";

async function main() {
  const projectId = "prj_1fb5d7a0444e";
  const userImgPath = "C:/Users/Chen Qianyu/.gemini/antigravity/brain/4149a5ae-666d-4654-a6f8-20a00b1b99a6/.user_uploaded/media_1792492490295_655176d1.jpg";

  const buffer = fs.readFileSync(userImgPath);

  const asset = saveAsset({
    projectId,
    name: "Nam-nguoi-mau-reference",
    buffer,
    mime: "image/jpeg",
    meta: {
      isCharacterAnchor: true,
      description: "Handsome young Vietnamese male model in sharp black suit, modern undercut haircut, warm radiant smile"
    }
  });

  console.log("Saved asset:", asset.id, asset.url);
  setThumbnail(projectId, asset.url);

  const mem = saveMemory({
    projectId,
    kind: "character",
    name: "Nam người mẫu lịch lãm",
    description: "Handsome charismatic young Vietnamese male runway model, late 20s, styled short modern faded undercut haircut, warm radiant confident smile, friendly expressive dark eyes, fair clean complexion, wearing a bespoke tailored black designer suit with crisp white dress shirt, confident masculine runway stride",
    sourceUrl: asset.url,
    tags: ["male model", "vietnamese", "suit", "handsome", "undercut", "catwalk", "men fashion"]
  });

  console.log("Saved memory:", mem.id, mem.name);
}

main().catch(console.error);
