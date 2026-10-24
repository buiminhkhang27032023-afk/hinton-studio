import { getDb, now } from "./db";
import type { ModelConfig, ModelKind, ModelRecord } from "./types";

/**
 * Built-in presets. They cover the common [OI]-style shapes, but every field is
 * editable in the UI — the gateway you point at may name things differently.
 */
const PRESETS: Array<Omit<ModelRecord, "createdAt" | "builtin">> = [
  {
    id: "duomiapi:kling_video",
    label: "DuomiAPI · Kling Video AI",
    kind: "video",
    provider: "duomiapi",
    description: "Tạo video chất lượng điện ảnh thông qua cổng DuomiAPI (多米API).",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: { model: "kling-v1", prompt: "{{prompt}}", seconds: "{{duration}}", input_reference: "{{image}}" },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "succeeded", "success"],
      failedValues: ["failed", "error"],
      resultPath: "data.0.url",
      timeout: 900,
    },
  },
  {
    id: "duomiapi:image",
    label: "DuomiAPI · Tạo ảnh Midjourney / Flux",
    kind: "image",
    provider: "duomiapi",
    description: "Sinh ảnh độ nét cao qua cổng DuomiAPI.",
    config: {
      endpoint: "/images/generations",
      method: "POST",
      body: { model: "flux-schnell", prompt: "{{prompt}}", n: 1, size: "{{size}}" },
      resultPath: "data.0.url",
      timeout: 300,
    },
  },
  {
    id: "iooai:omni_flash_10s", label: "IOOAI · Omni ảnh → video · 10s",
    kind: "video", provider: "iooai",
    description: "Ảnh → video 10s. 720p: ¥0,80/lượt (tiết kiệm); 1080p: ¥0,85/lượt. 1–7 ảnh HTTPS công khai; 16:9 hoặc 9:16. Giá công bố IOOAI 23/10/2026.",
    config: {
      endpoint: "/videos", method: "POST",
      body: { model: "omni_flash_10s", prompt: "{{prompt}}", seconds: "10", resolution: "{{resolution}}", ratio: "{{aspect}}", images: "{{images}}" },
      jobPath: "id", pollEndpoint: "/videos/{{job}}", statusPath: "status",
      doneValues: ["completed"], failedValues: ["failed", "error", "cancelled"], resultPath: "output_url", timeout: 900,
    },
  },
  {
    id: "seed:image:gpt-image",
    label: "Tạo ảnh — Images API",
    kind: "image",
    provider: "openai-compatible",
    description: "Chuẩn /images/generations. Gateway có thể trả URL hoặc base64.",
    config: {
      endpoint: "/images/generations",
      body: {
        model: "{{model}}",
        prompt: "{{prompt}}",
        n: 1,
        size: "{{size}}",
        response_format: "url",
      },
      resultPath: "data.0.url",
      timeout: 300,
    },
  },
  {
    id: "seed:image:chat-image",
    label: "Tạo ảnh — qua Chat Completions",
    kind: "image",
    provider: "openai-compatible",
    description: "Cho gateway trả ảnh trong nội dung chat (markdown hoặc base64).",
    config: {
      endpoint: "/chat/completions",
      body: {
        model: "{{model}}",
        messages: [{ role: "user", content: "{{prompt}}" }],
      },
      resultPath: "choices.0.message.images.0.url",
      timeout: 300,
    },
  },
  {
    id: "seed:video:generic",
    label: "Tạo video — hàng đợi bất đồng bộ",
    kind: "video",
    provider: "openai-compatible",
    description: "POST /videos → job id → hỏi trạng thái → tải file qua /content.",
    config: {
      endpoint: "/videos",
      method: "POST",
      body: {
        model: "{{model}}",
        prompt: "{{prompt}}",
        seconds: "{{duration}}",
        size: "{{size}}",
        input_reference: "{{image}}",
      },
      jobPath: "id",
      pollEndpoint: "/videos/{{job}}",
      statusPath: "status",
      doneValues: ["completed", "succeeded", "success", "done"],
      failedValues: ["failed", "error", "cancelled"],
      contentEndpoint: "/videos/{{job}}/content",
      resultPath: "data.0.url",
      timeout: 900,
    },
  },
  {
    id: "seed:video:sync",
    label: "Tạo video — trả kết quả ngay",
    kind: "video",
    provider: "openai-compatible",
    description: "Dùng khi gateway chờ và trả thẳng URL video trong một request.",
    config: {
      endpoint: "/videos",
      body: {
        model: "{{model}}",
        prompt: "{{prompt}}",
        image: "{{image}}",
        seconds: "{{duration}}",
      },
      resultPath: "data.0.url",
      timeout: 900,
    },
  },
  {
    id: "seed:upscale:generic",
    label: "Upscale ảnh",
    kind: "upscale",
    provider: "openai-compatible",
    description: "Gửi ảnh nguồn + hệ số phóng đại, nhận ảnh đã làm nét.",
    config: {
      endpoint: "/images/upscale",
      body: { model: "{{model}}", image: "{{image}}", scale: "{{scale}}" },
      resultPath: "data.0.url",
      timeout: 300,
    },
  },
  {
    id: "seed:chat:vision",
    label: "Mô tả / phân tích ảnh",
    kind: "chat",
    provider: "openai-compatible",
    description: "Dùng để viết prompt từ ảnh tham chiếu hoặc gợi ý thông số.",
    config: {
      endpoint: "/chat/completions",
      body: {
        model: "{{model}}",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "{{prompt}}" },
              { type: "image_url", image_url: { url: "{{image}}" } },
            ],
          },
        ],
      },
      resultPath: "choices.0.message.content",
      timeout: 120,
    },
  },
  {
    id: "seed:image:gemini-compose",
    label: "Thử Đồ AI — Gemini ghép 2 ảnh (khuyến nghị)",
    kind: "image",
    provider: "openai-compatible",
    description:
      "Đã kiểm chứng: gửi 2 ảnh (người mẫu + trang phục) trong 1 tin nhắn /chat/completions tới " +
      "req/gemini-3.0-pro-image — model thật sự ghép đúng người + đúng đồ, không cần mẹo mô tả " +
      "bằng chữ. Gemini trả ảnh dạng link markdown trong content; provider.ts tự nhận diện " +
      "(regex) và trích URL ra, không cần cấu hình gì thêm. Thời gian phản hồi rất thất thường " +
      "(45s-5 phút) — timeout để cao, không phải lúc nào chậm cũng là lỗi.",
    config: {
      endpoint: "/chat/completions",
      body: {
        model: "req/gemini-3.0-pro-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: "{{prompt}}" },
              { type: "image_url", image_url: { url: "{{modelImage}}" } },
              { type: "image_url", image_url: { url: "{{garmentImage}}" } },
            ],
          },
        ],
      },
      resultPath: "choices.0.message.content",
      timeout: 480,
    },
  },
  {
    id: "seed:image:fashion-tryon",
    label: "Thử Đồ AI — giữ đúng người mẫu (dự phòng, qua gpt-image-2)",
    kind: "image",
    provider: "openai-compatible",
    description:
      "/images/edits chỉ nhận 1 ảnh mỗi lần gọi (đã kiểm chứng: field reference_image/ref_image " +
      "chỉ là alias, không phải ảnh thứ 2). Dùng ẢNH NGƯỜI MẪU làm ảnh gốc để giữ đúng mặt/dáng " +
      "— trang phục được mô tả bằng chữ (lib/execute.ts tự gọi vision model đọc ảnh đồ trước).",
    config: {
      endpoint: "/images/edits",
      body: {
        model: "req/gpt-image-2",
        prompt: "{{prompt}}",
        image: "{{image}}",
        size: "{{size}}",
        n: 1,
      },
      resultPath: "data.0.url",
      timeout: 300,
    },
  },
  {
    id: "seed:video:piapi-omni-reference",
    label: "Omni Reference · Seedance 2 Mini · 4–15s",
    kind: "video",
    provider: "piapi",
    description: "Tham chiếu 1–9 ảnh, chế độ omni_reference cố định. Seedance 2 Mini qua PiAPI, thời lượng 4–15 giây, mặc định 480p. Cần ảnh URL công khai và API key PiAPI riêng; không dùng key IOOAI.",
    config: {
      endpoint: "/task",
      body: {
        model: "seedance",
        task_type: "seedance-2-mini-less-restriction",
        input: {
          prompt: "{{prompt}}",
          mode: "omni_reference",
          duration: "{{piapiDuration}}",
          aspect_ratio: "{{piapiAspect}}",
          resolution: "{{resolution}}",
          image_urls: "{{imageUrls}}",
        },
      },
      jobPath: "data.task_id",
      pollEndpoint: "/task/{{job}}",
      statusPath: "data.status",
      doneValues: ["completed"],
      failedValues: ["failed"],
      resultPath: "data.output.video",
      timeout: 600,
    },
  },
  {
    id: "seed:video:piapi-seedance",
    label: "Tạo video — PiAPI Seedance (bản tiêu chuẩn, 480p, tiết kiệm chi phí)",
    kind: "video",
    provider: "piapi",
    description:
      "Gọi thẳng PiAPI (model \"seedance\", task_type \"seedance-2-fast-less-restriction\" — vẫn là tier " +
      "tiêu chuẩn/fast của PiAPI, không phải bản pro, chỉ khác là tier \"less restriction\" chính PiAPI " +
      "bán công khai trong dashboard của họ, kiểm duyệt nới hơn cho ảnh→video có khuôn mặt người — đã " +
      "kiểm chứng: tier thường (seedance-2-fast) chặn ảnh→video có mặt người thật với lỗi content " +
      "moderation, còn tier less-restriction thì chạy được). Độ phân giải mặc định 480p để tiết kiệm chi " +
      "phí. Không có ảnh nối vào → chữ thành video (text_to_video). Có ảnh nối vào VÀ ảnh đó là URL công " +
      "khai (http/https, không phải file lưu local trên máy bạn) → tự chuyển sang ảnh thành video " +
      "(first_last_frames, tối đa 2 ảnh). Nhập API key PiAPI ở Cài đặt → mục PiAPI — không cần bấm kiểm " +
      "tra kết nối, cứ lưu key là dùng được ngay.",
    config: {
      endpoint: "/task",
      body: {
        model: "seedance",
        task_type: "seedance-2-fast-less-restriction",
        input: {
          prompt: "{{prompt}}",
          mode: "{{piapiMode}}",
          duration: "{{piapiDuration}}",
          aspect_ratio: "{{piapiAspect}}",
          resolution: "{{resolution}}",
          image_urls: "{{imageUrls}}",
        },
      },
      jobPath: "data.task_id",
      pollEndpoint: "/task/{{job}}",
      statusPath: "data.status",
      doneValues: ["completed"],
      failedValues: ["failed"],
      resultPath: "data.output.video",
      timeout: 600,
    },
  },
  {
    id: "seed:train:lora",
    label: "Train LoRA / model riêng",
    kind: "train",
    provider: "openai-compatible",
    description: "Gửi bộ ảnh mẫu để tạo model riêng. Cấu hình theo tài liệu gateway của bạn.",
    config: {
      endpoint: "/fine_tuning/jobs",
      body: {
        model: "{{model}}",
        dataset: "{{dataset}}",
        name: "{{name}}",
        steps: "{{steps}}",
      },
      jobPath: "id",
      pollEndpoint: "/fine_tuning/jobs/{{job}}",
      statusPath: "status",
      doneValues: ["succeeded", "completed", "success", "done"],
      failedValues: ["failed", "error", "cancelled"],
      resultPath: "fine_tuned_model",
      timeout: 3600,
    },
  },
  {
    id: "runninghub:wan-2.1",
    label: "RunningHub · Wan 2.1 (Võ thuật & Siêu năng lực)",
    kind: "video",
    provider: "runninghub",
    description: "Alibaba Wan 2.1 qua RunningHub ComfyUI: Đỉnh cao thế giới về hiệu ứng đánh nhau, sóng xung kích, sét lửa và góc máy 3D xoay quanh điểm nổ.",
    config: {
      endpoint: "/task/openapi/create",
      method: "POST",
      body: {
        workflowId: "wan_2_1_video_workflow",
        apiKey: "{{apiKey}}",
        nodeInputs: { prompt: "{{prompt}}", image: "{{image}}" },
      },
      jobPath: "data.taskId",
      pollEndpoint: "/task/openapi/status",
      pollMethod: "POST",
      statusPath: "data.status",
      doneValues: ["SUCCESS", "completed"],
      failedValues: ["FAILED", "failed", "error"],
      resultPath: "data.outputUrl",
      timeout: 900,
    },
  },
  {
    id: "runninghub:kling-1.5",
    label: "RunningHub · Kling 1.5 (Chuyển động người thật & Cận chiến)",
    kind: "video",
    provider: "runninghub",
    description: "Kling AI qua RunningHub ComfyUI: Xuất sắc về mô phỏng động tác võ thuật, đấm đá mượt mà và camera dolly/pan điện ảnh.",
    config: {
      endpoint: "/task/openapi/create",
      method: "POST",
      body: {
        workflowId: "kling_1_5_video_workflow",
        apiKey: "{{apiKey}}",
        nodeInputs: { prompt: "{{prompt}}", image: "{{image}}" },
      },
      jobPath: "data.taskId",
      pollEndpoint: "/task/openapi/status",
      pollMethod: "POST",
      statusPath: "data.status",
      doneValues: ["SUCCESS", "completed"],
      failedValues: ["FAILED", "failed", "error"],
      resultPath: "data.outputUrl",
      timeout: 900,
    },
  },
  {
    id: "runninghub:video-comfyui",
    label: "RunningHub · Video ComfyUI Task",
    kind: "video",
    provider: "runninghub",
    description: "Chạy quy trình sinh video ComfyUI / Kling qua RunningHub OpenAPI",
    config: {
      endpoint: "/task/openapi/create",
      method: "POST",
      body: {
        workflowId: "default_video_workflow",
        apiKey: "{{apiKey}}",
        nodeInputs: { prompt: "{{prompt}}", image: "{{image}}" },
      },
      jobPath: "data.taskId",
      pollEndpoint: "/task/openapi/status",
      pollMethod: "POST",
      statusPath: "data.status",
      doneValues: ["SUCCESS", "completed"],
      failedValues: ["FAILED", "failed", "error"],
      resultPath: "data.outputUrl",
      timeout: 900,
    },
  },
  {
    id: "runninghub:image-flux",
    label: "RunningHub · Flux / SD Image Task",
    kind: "image",
    provider: "runninghub",
    description: "Sinh ảnh qua ComfyUI Flux / SD workflow trên RunningHub",
    config: {
      endpoint: "/task/openapi/create",
      method: "POST",
      body: {
        workflowId: "default_image_flux",
        apiKey: "{{apiKey}}",
        nodeInputs: { prompt: "{{prompt}}" },
      },
      jobPath: "data.taskId",
      pollEndpoint: "/task/openapi/status",
      pollMethod: "POST",
      statusPath: "data.status",
      doneValues: ["SUCCESS", "completed"],
      failedValues: ["FAILED", "failed", "error"],
      resultPath: "data.outputUrl",
      timeout: 300,
    },
  },
];

/** Bump when a preset's shape changes so existing installs pick it up. */
const PRESET_VERSION = 14;

export function seedModels(): void {
  const db = getDb();
  const stored = db
    .prepare("SELECT value FROM settings WHERE key = 'preset_version'")
    .get() as { value: string } | undefined;
  const version = stored ? Number(JSON.parse(stored.value)) : 0;

  const upsert = db.prepare(
    `INSERT INTO models(id, label, kind, provider, description, config, builtin, created_at)
     VALUES(?, ?, ?, ?, ?, ?, 1, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       kind = excluded.kind,
       provider = excluded.provider,
       description = excluded.description,
       config = excluded.config
     WHERE models.builtin = 1`,
  );

  if (version < PRESET_VERSION) {
    for (const preset of PRESETS) {
      upsert.run(
        preset.id,
        preset.label,
        preset.kind,
        preset.provider,
        preset.description ?? null,
        JSON.stringify(preset.config),
        now(),
      );
    }
    db.prepare(
      "INSERT INTO settings(key, value) VALUES('preset_version', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value",
    ).run(JSON.stringify(PRESET_VERSION));
    return;
  }

  // First run on a fresh install: create any missing presets.
  const count = db.prepare("SELECT COUNT(*) AS n FROM models WHERE builtin = 1").get() as { n: number };
  if (count.n === 0) {
    for (const preset of PRESETS) {
      upsert.run(
        preset.id,
        preset.label,
        preset.kind,
        preset.provider,
        preset.description ?? null,
        JSON.stringify(preset.config),
        now(),
      );
    }
  }
}

export function listModels(kind?: ModelKind): ModelRecord[] {
  seedModels();
  const rows = kind
    ? getDb().prepare("SELECT * FROM models WHERE kind = ? ORDER BY builtin DESC, created_at ASC").all(kind)
    : getDb().prepare("SELECT * FROM models ORDER BY builtin DESC, created_at ASC").all();
  return (rows as Record<string, unknown>[]).map(rowToModel);
}

export function getModel(id: string): ModelRecord | null {
  seedModels();
  const row = getDb().prepare("SELECT * FROM models WHERE id = ?").get(id) as
    | Record<string, unknown>
    | undefined;
  return row ? rowToModel(row) : null;
}

export function rowToModel(row: Record<string, unknown>): ModelRecord {
  return {
    id: String(row.id),
    label: String(row.label),
    kind: row.kind as ModelKind,
    provider: String(row.provider),
    description: row.description ? String(row.description) : undefined,
    config: JSON.parse(String(row.config)) as ModelConfig,
    builtin: Boolean(row.builtin),
    createdAt: Number(row.created_at),
  };
}

export function upsertModel(input: {
  id?: string;
  label: string;
  kind: ModelKind;
  provider?: string;
  description?: string;
  config: ModelConfig;
}): ModelRecord {
  const db = getDb();
  const id = input.id ?? `model_${crypto.randomUUID().slice(0, 8)}`;
  const existing = getModel(id);
  if (existing?.builtin && input.id) {
    // Built-ins are templates: editing one creates a copy so the preset stays intact.
    return upsertModel({ ...input, id: `model_${crypto.randomUUID().slice(0, 8)}` });
  }
  db.prepare(
    `INSERT INTO models(id, label, kind, provider, description, config, builtin, created_at)
     VALUES(?, ?, ?, ?, ?, ?, 0, ?)
     ON CONFLICT(id) DO UPDATE SET
       label = excluded.label,
       kind = excluded.kind,
       provider = excluded.provider,
       description = excluded.description,
       config = excluded.config`,
  ).run(
    id,
    input.label,
    input.kind,
    input.provider ?? "openai-compatible",
    input.description ?? null,
    JSON.stringify(input.config),
    now(),
  );
  return getModel(id)!;
}

export function deleteModel(id: string): void {
  getDb().prepare("DELETE FROM models WHERE id = ? AND builtin = 0").run(id);
}
