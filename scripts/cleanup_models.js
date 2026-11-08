const { DatabaseSync } = require("node:sqlite");
const db = new DatabaseSync("data/studio.db");

// 1. Delete dead/retired IOOAI models
const deadIds = [
  "iooai:seedance25-md",
  "iooai:seedance2.5 快速版",
  "iooai:seedance2.5 LW",
  "iooai:seedance25-fast-diagnostic",
  "iooai:seedance2.5 线路三",
  "iooai:seedance2.5线路二",
  "model_323723a0",
  "iooai:seedance20-official-mini",
  "iooai:MiniMax H3 1080p"
];

for (const id of deadIds) {
  db.prepare("DELETE FROM models WHERE id = ?").run(id);
}
console.log("Deleted dead models:", deadIds.length);

// 2. Define the exact clean IOOAI models matching the user's marketplace screenshot
const cleanIooaiModels = [
  {
    id: "iooai:omni_flash_10s",
    label: "IOOAI · Omni Flash 10s (0.80 Tệ · 10s · Siêu Tốc)",
    kind: "video",
    provider: "iooai",
    description: "Omni Flash 10 giây tốc độ cao, hỗ trợ tối đa 7 ảnh tham chiếu. Giá chỉ 0.8 Tệ, render trong ~1 phút.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "omni_flash_10s",
        prompt: "{{prompt}}",
        seconds: "10",
        ratio: "{{aspect}}",
        resolution: "{{resolution}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:seedance20-special",
    label: "IOOAI · Seedance 2.0 特价 (1.50 Tệ · Cố định 15s)",
    kind: "video",
    provider: "iooai",
    description: "Seedance 2.0 Tuyến Đặc Biệt, cố định 15 giây, hỗ trợ tối đa 10 ảnh tham chiếu, giá 1.5 Tệ/lượt.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "seedance2.0 特价",
        prompt: "{{prompt}}",
        seconds: "15",
        ratio: "{{aspect}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:seedance20-line2",
    label: "IOOAI · Seedance 2.0 线路二 (1.80 Tệ · Cố định 15s)",
    kind: "video",
    provider: "iooai",
    description: "Seedance 2.0 Tuyến 2 chính thức, cố định 15 giây, giá 1.8 Tệ/lượt.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "seedance2.0 线路二",
        prompt: "{{prompt}}",
        seconds: "15",
        ratio: "{{aspect}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:seedance20-mini-stable",
    label: "IOOAI · Seedance 2.0 Mini 稳定 (2.00 Tệ · 5–12s)",
    kind: "video",
    provider: "iooai",
    description: "Seedance 2.0 Mini Tuyến Ổn Định, hỗ trợ tối đa 9 ảnh, giá 2.0 Tệ/lượt.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "seedance2.0 Mini 稳定",
        prompt: "{{prompt}}",
        seconds: "{{duration}}",
        ratio: "{{aspect}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:seedance 2.0 fast",
    label: "IOOAI · Seedance 2.0 Fast (0.18 Tệ/s · 4–15s)",
    kind: "video",
    provider: "iooai",
    description: "Seedance 2.0 Fast tính theo giây (0.18 Tệ/giây), render nhanh trong 30-45 giây.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "seedance 2.0 fast",
        prompt: "{{prompt}}",
        seconds: "{{duration}}",
        ratio: "{{aspect}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:seedance 2.0 满血",
    label: "IOOAI · Seedance 2.0 满血 (0.29 Tệ/s · 4–15s)",
    kind: "video",
    provider: "iooai",
    description: "Seedance 2.0 Bản Đầy Đủ Cao Cấp tính theo giây (0.29 Tệ/giây), chuyển động mượt và biểu cảm sắc nét.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "seedance 2.0 满血",
        prompt: "{{prompt}}",
        seconds: "{{duration}}",
        ratio: "{{aspect}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:seedance 2.0 官渠",
    label: "IOOAI · Seedance 2.0 官渠 (Chính Ngạch ByteDance · 0.12–0.40 Tệ/s)",
    kind: "video",
    provider: "iooai",
    description: "Seedance 2.0 Kênh Chính Thức ByteDance (Mini: 0.12/s, Fast: 0.20/s, 满血: 0.40/s). Hỗ trợ tối đa 9 ảnh tham chiếu.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "Seedance 2.0 官渠",
        prompt: "{{prompt}}",
        seconds: "{{duration}}",
        ratio: "{{aspect}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:seedance2.5 官渠",
    label: "IOOAI · Seedance 2.5 官渠 (Chính Ngạch 4K · 0.70 Tệ/s · 4–30s)",
    kind: "video",
    provider: "iooai",
    description: "Kênh chính hãng ByteDance trực tiếp qua IOOAI, độ phân giải cao và tính toàn vẹn nhân vật cao nhất (0.7 Tệ/giây).",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "seedance2.5 官渠",
        prompt: "{{prompt}}",
        seconds: "{{duration}}",
        ratio: "{{aspect}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 1200
    }
  },
  {
    id: "iooai:MiniMax H3",
    label: "IOOAI · MiniMax H3 (Hailuo AI · 0.105 Tệ/s · Diễn Xuất Tự Nhiên)",
    kind: "video",
    provider: "iooai",
    description: "Mô hình video Hailuo H3 của MiniMax (480p: 0.075/s, 768p: 0.105/s, 1080p: 0.225/s), hỗ trợ tối đa 9 ảnh tham chiếu.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "MiniMax H3",
        prompt: "{{prompt}}",
        seconds: "{{duration}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:omni 可编辑视频",
    label: "IOOAI · Omni Video Editor (Sửa Video · 1.65 Tệ · 10s)",
    kind: "video",
    provider: "iooai",
    description: "Mô hình chuyên nhận Video tham chiếu có sẵn để đổi nhân vật, đổi bối cảnh hoặc làm mới phong cách (Video-to-Video).",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "omni 可编辑视频",
        prompt: "{{prompt}}",
        videos: "{{videos}}",
        images: "{{images}}"
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "success"],
      failedValues: ["failed", "error"],
      resultPath: "video_url",
      timeout: 900
    }
  },
  {
    id: "iooai:gpt-image-2-4k",
    label: "IOOAI · GPT Image 2 (Tạo ảnh tĩnh 4K · 0.08–0.15 Tệ)",
    kind: "image",
    provider: "iooai",
    description: "Tạo ảnh độ phân giải 1K–4K chi tiết cao cho nhân vật và bối cảnh.",
    config: {
      endpoint: "/images/generations",
      method: "POST",
      body: {
        model: "GPT Image 2",
        prompt: "{{prompt}}",
        size: "1024x1024"
      },
      resultPath: "data.0.url",
      timeout: 300
    }
  },
  {
    id: "iooai:gpt-image-2-line2",
    label: "IOOAI · GPT Image 2 Tuyến 2 (Tạo ảnh tĩnh · 0.08–0.15 Tệ)",
    kind: "image",
    provider: "iooai",
    description: "Tạo ảnh tĩnh qua tuyến 2 hỗ trợ tới 5 ảnh tham chiếu URL.",
    config: {
      endpoint: "/images/generations",
      method: "POST",
      body: {
        model: "GPT Image 2 线路二",
        prompt: "{{prompt}}",
        size: "1024x1024"
      },
      resultPath: "data.0.url",
      timeout: 300
    }
  }
];

const upsert = db.prepare(`
  INSERT INTO models (id, label, kind, provider, description, config, builtin, created_at)
  VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  ON CONFLICT(id) DO UPDATE SET
    label = excluded.label,
    kind = excluded.kind,
    provider = excluded.provider,
    description = excluded.description,
    config = excluded.config
`);

for (const m of cleanIooaiModels) {
  upsert.run(m.id, m.label, m.kind, m.provider, m.description, JSON.stringify(m.config), Date.now());
  console.log(`+ Upserted model: ${m.id}`);
}

const current = db.prepare("SELECT id, label FROM models WHERE provider = 'iooai'").all();
console.log("\n=== Cleaned IOOAI models in DB (Total: " + current.length + ") ===");
current.forEach(c => console.log(`- [${c.id}]: ${c.label}`));
