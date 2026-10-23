import { DatabaseSync } from "node:sqlite";

const db = new DatabaseSync("./data/studio.db");
const projectId = "prj_1fb5d7a0444e";
const masterAssetId = "asset_54e6ff581a58";
const masterVideoUrl = "/api/files/prj_1fb5d7a0444e/asset_54e6ff581a58-Video-San-Dien-Thoi-Trang-100-Chuan-Mat-20s.mp4";
const posterUrl = "/api/files/prj_1fb5d7a0444e/asset_54e6ff581a58-Poster-San-Dien-100-Chuan-Mat.jpg";

const graph = {
  nodes: [
    {
      id: "node_user_photo",
      type: "asset",
      position: { x: 50, y: 150 },
      data: {
        label: "Ảnh gốc của bạn (Nam người mẫu vest)",
        imageUrl: "/api/files/prj_1fb5d7a0444e/asset_e7676d016145-Nam-nguoi-mau-reference.jpg",
        name: "Ảnh người mẫu gốc",
        kind: "image",
      },
    },
    {
      id: "node_catwalk_anchor",
      type: "asset",
      position: { x: 380, y: 150 },
      data: {
        label: "Ảnh neo sàn diễn 100% chuẩn mặt (Catwalk Anchor)",
        imageUrl: "/api/files/prj_1fb5d7a0444e/catwalk_anchor_male.jpg",
        name: "Catwalk Anchor Frame",
        kind: "image",
      },
    },
    {
      id: "node_master_video_100",
      type: "model",
      position: { x: 750, y: 150 },
      data: {
        label: "Video Sàn Diễn 100% Chuẩn Mặt (20s Master)",
        result: {
          id: masterAssetId,
          name: "Video Sàn Diễn Thời Trang 100% Chuẩn Mặt (20s Master)",
          url: masterVideoUrl,
          kind: "video",
          mime: "video/mp4",
        },
        status: "done",
      },
    },
  ],
  edges: [
    { id: "e1", source: "node_user_photo", target: "node_catwalk_anchor" },
    { id: "e2", source: "node_catwalk_anchor", target: "node_master_video_100" },
  ],
};

db.prepare("INSERT OR REPLACE INTO graphs (project_id, data, updated_at) VALUES (?, ?, ?)").run(
  projectId,
  JSON.stringify(graph),
  Date.now()
);

console.log("Canvas graph updated successfully!");
