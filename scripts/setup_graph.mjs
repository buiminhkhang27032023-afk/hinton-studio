import { getDb, now } from "../lib/db.ts";
import { saveGraph } from "../lib/projects.ts";

const projectId = "prj_703de5d73a4e";
const db = getDb();

const masterAsset = db
  .prepare("SELECT * FROM assets WHERE project_id = ? AND kind = 'video' ORDER BY created_at DESC LIMIT 1")
  .get(projectId);

console.log("Found master asset:", masterAsset?.id, masterAsset?.name, masterAsset?.url);

const graph = {
  nodes: [
    {
      id: "prompt-beach-party",
      type: "prompt",
      position: { x: 50, y: 200 },
      data: {
        status: "succeeded",
        text: "Chủ đề: Tiệc bãi biển hoàng hôn (Beach Party Sunset)\nPhong cách: Điện ảnh 35mm, ánh sáng golden hour, không khí mùa hè nhiệt đới rạng rỡ, thời trang bãi biển thanh lịch, màu film ấm áp.",
      },
    },
    {
      id: "scene-1",
      type: "generate",
      position: { x: 450, y: 50 },
      data: {
        modelKind: "video",
        model: "veo-3.1",
        duration: 8,
        aspect: "16:9",
        status: "succeeded",
        prompt: "Cảnh 1 (0:00 - 0:08): Toàn cảnh hoàng hôn bãi biển nhiệt đới, dạo cát ven sóng biển, ánh sáng vàng ấm áp, tà váy và tóc bay nhẹ trong gió.",
      },
    },
    {
      id: "scene-2",
      type: "generate",
      position: { x: 450, y: 250 },
      data: {
        modelKind: "video",
        model: "veo-3.1",
        duration: 8,
        aspect: "16:9",
        status: "succeeded",
        prompt: "Cảnh 2 (0:08 - 0:16): Không khí tiệc hè sôi động bên sóng biển, té nước rạng rỡ, nụ cười rạng ngời, năng lượng trẻ trung.",
      },
    },
    {
      id: "scene-3",
      type: "generate",
      position: { x: 450, y: 450 },
      data: {
        modelKind: "video",
        model: "veo-3.1",
        duration: 4,
        aspect: "16:9",
        status: "succeeded",
        prompt: "Cảnh 3 (0:16 - 0:20): Gió chiều hoàng hôn, xoay người ngắm nhìn chân trời biển cả lung linh, kết màn 20s êm đềm.",
      },
    },
    {
      id: "result-master-20s",
      type: "result",
      position: { x: 880, y: 220 },
      data: {
        status: "succeeded",
        videoUrl: masterAsset?.url,
        result: {
          id: masterAsset?.id,
          projectId: projectId,
          name: masterAsset?.name,
          kind: "video",
          mime: "video/mp4",
          url: masterAsset?.url,
          duration: 20.04,
        },
      },
    },
  ],
  edges: [
    { id: "e-prompt-s1", source: "prompt-beach-party", target: "scene-1", animated: true },
    { id: "e-prompt-s2", source: "prompt-beach-party", target: "scene-2", animated: true },
    { id: "e-prompt-s3", source: "prompt-beach-party", target: "scene-3", animated: true },
    { id: "e-s1-res", source: "scene-1", target: "result-master-20s", animated: true },
    { id: "e-s2-res", source: "scene-2", target: "result-master-20s", animated: true },
    { id: "e-s3-res", source: "scene-3", target: "result-master-20s", animated: true },
  ],
};

saveGraph(projectId, graph);
console.log("Graph saved successfully for project", projectId);
