import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SYSTEM_PROMPT = `Bạn là "Bậc Thầy Viết Prompt" (AI Master Prompt Architect) chuyên tối ưu hóa câu lệnh cho các mô hình AI tạo ảnh và video điện ảnh hàng đầu (Seedance, Veo, Omni, Kling, Flux, Midjourney).

Nhiệm vụ: Khi nhận được một ý tưởng thô sơ hoặc câu lệnh ngắn từ người dùng (bằng tiếng Việt hoặc tiếng Anh), hãy nâng cấp và hoàn thiện nó thành một Master Prompt chuẩn điện ảnh, chi tiết và sống động nhất.

Quy tắc tối thượng:
1. TUYỆT ĐỐI BẢO TOÀN ý định gốc của người dùng. Nếu có các tag tham chiếu như @Ảnh1, @Ảnh2, @image1... BẮT BUỘC giữ nguyên chính xác vị trí và tên tag trong prompt hoàn thiện.
2. Thêm các yếu tố điện ảnh đỉnh cao:
   - Chủ thể: biểu cảm khuôn mặt sống động, cử chỉ tự nhiên, trang phục, kết cấu da chân thực.
   - Góc máy & chuyển động: cinematic tracking shot, slow pan, eye-level, rule of thirds, shallow depth of field, 8k resolution.
   - Ánh sáng & khí quyển: cinematic soft light, volumetric rim lighting, realistic atmospheric dust/glow.
   - Bối cảnh: chiều sâu không gian, chi tiết môi trường xung quanh chân thực.
3. Xuất ra 2 phiên bản:
   - enhancedPrompt: Viết bằng tiếng Anh điện ảnh chuẩn quốc tế (các model AI hiểu và sinh hình ảnh chuẩn nhất).
   - enhancedPromptVi: Viết bằng tiếng Việt chau chuốt phong cách đạo diễn điện ảnh.
4. Trả về đúng định dạng JSON thuần túy (không kèm markdown ngoài khối JSON):
{
  "enhancedPrompt": "...",
  "enhancedPromptVi": "...",
  "highlights": ["Góc máy: ...", "Ánh sáng: ...", "Chi tiết: ..."]
}`;

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      prompt?: string;
      kind?: "image" | "video";
      style?: string;
      preferredLang?: "en" | "vi";
    };

    const rawPrompt = body.prompt?.trim();
    if (!rawPrompt) {
      return NextResponse.json({ error: "Vui lòng nhập câu lệnh hoặc ý tưởng cần hoàn thiện." }, { status: 400 });
    }

    const provider = getProvider("provider");
    if (!provider.apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình API key cho Gateway Bùi Hữu Thắng. Vui lòng vào Cài đặt để nhập key." },
        { status: 400 },
      );
    }

    const baseUrl = provider.baseUrl.replace(/\/+$/, "");
    const userPrompt = [
      `Câu lệnh gốc: "${rawPrompt}"`,
      body.kind ? `Loại nội dung mục tiêu: ${body.kind === "video" ? "Video chuyển động điện ảnh" : "Hình ảnh chi tiết cao"}` : "",
      body.style ? `Phong cách mong muốn: ${body.style}` : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Primary model: gemini-3.5-flash (basic model from buihuuthang), Fallback: deepseek-v4-flash
    const candidateModels = ["gemini-3.5-flash", "deepseek-v4-flash"];
    let lastError: string | null = null;
    let resultJson: {
      enhancedPrompt?: string;
      enhancedPromptVi?: string;
      highlights?: string[];
    } | null = null;
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
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 1200,
            response_format: { type: "json_object" },
          }),
          signal: AbortSignal.timeout(30_000),
        });

        if (!res.ok) {
          const errText = await res.text();
          lastError = `Model ${model} trả về HTTP ${res.status}: ${errText}`;
          continue;
        }

        const data = await res.json();
        const content = data.choices?.[0]?.message?.content?.trim();
        if (!content) {
          lastError = `Model ${model} không trả về nội dung.`;
          continue;
        }

        // Parse JSON (strip any ```json fences if model returned them)
        const cleaned = content.replace(/^```json\s*/i, "").replace(/\s*```$/, "").trim();
        resultJson = JSON.parse(cleaned);
        if (resultJson && (resultJson.enhancedPrompt || resultJson.enhancedPromptVi)) {
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (!resultJson || (!resultJson.enhancedPrompt && !resultJson.enhancedPromptVi)) {
      return NextResponse.json(
        { error: lastError || "Không thể tối ưu hóa prompt lúc này. Vui lòng thử lại sau." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      originalPrompt: rawPrompt,
      enhancedPrompt: resultJson.enhancedPrompt || resultJson.enhancedPromptVi || rawPrompt,
      enhancedPromptVi: resultJson.enhancedPromptVi || resultJson.enhancedPrompt || rawPrompt,
      highlights: Array.isArray(resultJson.highlights) ? resultJson.highlights : [],
      model: `${usedModel} (Gateway Bùi Hữu Thắng)`,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lỗi xử lý server";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
