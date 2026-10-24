import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `Bạn là "Hinton AI Studio Copilot" — Trợ lý AI sáng tạo & đạo diễn điện ảnh tích hợp trực tiếp trong phòng dựng Hinton Studio.
Bạn đang vận hành trên mô hình siêu nhẹ và siêu tốc độ (gemini-3.5-flash từ Gateway Bùi Hữu Thắng).

VAI TRÒ VÀ NĂNG LỰC CỦA BẠN:
1. Đạo diễn & Biên kịch AI:
   - Viết kịch bản video ngắn, TVC quảng cáo, lookbook thời trang, video TikTok/Reels/Shorts, cinematic clip.
   - Tư vấn góc máy (wide shot, tracking shot, close-up), chuyển động camera, ánh sáng (volumetric, cinematic rim light, golden hour), bố cục và nhịp độ.

2. Hiểu sâu sắc hệ thống Hinton Studio Canvas:
   - Các loại Node:
     * Câu lệnh (Prompt): Nhập câu lệnh tạo ảnh/video.
     * Trợ lý Bậc Thầy (Prompt Master): Tối ưu câu lệnh thô sơ thành Master Prompt điện ảnh.
     * Ảnh / Video (Media): Tải lên hoặc hiển thị ảnh tham chiếu (ảnh người mẫu, ảnh trang phục, video gốc).
     * Tạo (Generate): Chạy các model AI đỉnh cao (Seedance, Veo, Omni Flash, Kling, Flux).
     * Phối đồ / Thay đồ (Fashion Try-on & Compose): Thử đồ ảo cho người mẫu, ghép video thời trang.
     * Nâng cấp (Upscale) & Kết quả (Result): Xem kết quả video/ảnh full size, nâng độ phân giải lên 4K.
   - Cách nối dây (Wiring):
     * Cổng vào (In - màu xanh cyan): Ở bên Trái, Trên (Top), Dưới (Bottom), và cổng phụ bên Phải.
     * Cổng ra (Out - màu vàng hổ phách): Ở bên Phải, Trên (Top), Dưới (Bottom), và cổng phụ bên Trái.
     * Có thể nối đa hướng (ngang, dọc, chéo) mà không sợ bị trùng hay rối dây.

3. TƯƠNG TÁC TRỰC TIẾP VỚI CANVAS (CỰC KỲ QUAN TRỌNG):
Khi bạn đề xuất câu lệnh hoặc kịch bản, hãy đính kèm khối Action dạng markdown code block để người dùng có thể bấm 1 nút là đưa ngay lên Canvas:

- Gợi ý 1 Prompt đơn lẻ:
\`\`\`copilot-action:add_prompt
{
  "title": "Tên ngắn gọn cho cảnh",
  "prompt": "Prompt chi tiết bằng tiếng Anh hoặc tiếng Việt chuẩn điện ảnh"
}
\`\`\`

- Gợi ý Kịch Bản Nhiều Cảnh (Storyboard 2-4 cảnh):
\`\`\`copilot-action:storyboard
{
  "title": "Tên kịch bản",
  "scenes": [
    {
      "title": "Cảnh 1: Thiết lập không gian",
      "prompt": "Cinematic wide establishing shot...",
      "modelKind": "video"
    },
    {
      "title": "Cảnh 2: Chủ thể tương tác",
      "prompt": "Medium tracking shot...",
      "modelKind": "video"
    },
    {
      "title": "Cảnh 3: Cận cảnh điểm nhấn",
      "prompt": "Close-up cinematic macro shot...",
      "modelKind": "video"
    }
  ]
}
\`\`\`

PHONG CÁCH TRẢ LỜI:
- Trả lời bằng tiếng Việt thân thiện, súc tích, chuyên nghiệp, nhiệt tình hỗ trợ.
- Format markdown rõ ràng, có gạch đầu dòng, emoji sinh động, dễ đọc lướt.
- Luôn khuyến khích sáng tạo và đưa ra các đề xuất cụ thể, khả thi.`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      messages?: Array<{ role: "system" | "user" | "assistant"; content: string }>;
      context?: {
        nodesSummary?: string;
        selectedNode?: { id: string; type: string; prompt?: string; text?: string } | null;
        projectName?: string;
      };
    };

    const userMessages = body.messages ?? [];
    if (!Array.isArray(userMessages) || userMessages.length === 0) {
      return NextResponse.json({ error: "Không tìm thấy nội dung tin nhắn." }, { status: 400 });
    }

    const provider = getProvider("provider");
    if (!provider.apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình API key cho Gateway Bùi Hữu Thắng. Vui lòng vào Cài đặt để nhập key." },
        { status: 400 },
      );
    }

    const baseUrl = provider.baseUrl.replace(/\/+$/, "");

    // Build context summary if provided
    let contextNote = "";
    if (body.context) {
      const parts: string[] = [];
      if (body.context.projectName) parts.push(`Dự án hiện tại: "${body.context.projectName}"`);
      if (body.context.nodesSummary) parts.push(`Các node hiện có trên Canvas: ${body.context.nodesSummary}`);
      if (body.context.selectedNode) {
        parts.push(
          `Node người dùng đang chọn: ID "${body.context.selectedNode.id}", Loại: "${body.context.selectedNode.type}"${
            body.context.selectedNode.text || body.context.selectedNode.prompt
              ? `, Nội dung: "${body.context.selectedNode.text || body.context.selectedNode.prompt}"`
              : ""
          }`,
        );
      }
      if (parts.length > 0) {
        contextNote = `\n\n[BỐI CẢNH CANVAS HIỆN TẠI]:\n${parts.join("\n")}`;
      }
    }

    const systemMessage = {
      role: "system",
      content: BASE_SYSTEM_PROMPT + contextNote,
    };

    const candidateModels = ["gemini-3.5-flash", "deepseek-v4-flash"];
    let lastError: string | null = null;
    let replyContent = "";
    let usedModel = candidateModels[0];

    for (const model of candidateModels) {
      try {
        usedModel = model;
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${provider.apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [systemMessage, ...userMessages],
            temperature: 0.75,
            max_tokens: 1600,
          }),
          signal: AbortSignal.timeout(35_000),
        });

        if (!res.ok) {
          const errText = await res.text();
          lastError = `Model ${model} trả về HTTP ${res.status}: ${errText}`;
          continue;
        }

        const data = await res.json();
        replyContent = data.choices?.[0]?.message?.content?.trim() || "";
        if (replyContent) break;
      } catch (err: unknown) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (!replyContent) {
      return NextResponse.json(
        {
          error: lastError || "Không nhận được phản hồi từ AI Copilot. Vui lòng kiểm tra API Gateway.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: {
        role: "assistant",
        content: replyContent,
      },
      model: usedModel,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
