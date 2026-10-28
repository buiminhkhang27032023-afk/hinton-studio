import sqlite3 from "node:sqlite3";
import { prepareReferenceImages } from "./lib/reference-images";

async function main() {
  try {
    const res = await prepareReferenceImages(["/api/files/prj_5fc08884710a/asset_14b75a593189-fashion-tryon-14-12-23.jpg"]);
    console.log("prepareReferenceImages result:", res);
  } catch (err) {
    console.error("prepareReferenceImages error:", err);
  }
}

main();
