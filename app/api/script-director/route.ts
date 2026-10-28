import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";
import { listAssets } from "@/lib/storage";
import { listModels } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export interface ProductionPlan {
  project_analysis: {
    title: string;
    genre: string;
    target_duration_sec: number;
    recommended_aspect: "9:16" | "16:9" | "1:1";
    recommended_model: string;
    model_reason: string;
    visual_style: string;
    pacing: string;
  };
  entities: {
    characters: Array<{
      id: string;
      name: string;
      gender: "male" | "female" | "unspecified";
      matched_asset_id?: string | null;
      matched_asset_name?: string | null;
      matched_asset_url?: string | null;
      face_consistency: "strict" | "flexible";
      description: string;
    }>;
    outfits: Array<{
      id: string;
      name: string;
      matched_asset_id?: string | null;
      matched_asset_name?: string | null;
      matched_asset_url?: string | null;
      status: "matched" | "missing_asset";
      description: string;
    }>;
    props_and_setting: Array<{
      id: string;
      name: string;
      description: string;
    }>;
  };
  constraints_and_warnings: Array<{
    type: "mismatch" | "model_capability" | "duration_check" | "post_production_layer" | "asset_gap";
    severity: "error" | "warning" | "tip";
    message: string;
    suggestion: string;
  }>;
  shots: Array<{
    shot_index: number;
    title: string;
    time_range: string;
    duration_sec: number;
    framing: string;
    camera_movement: string;
    character_action: string;
    outfit_id?: string;
    transition_out: string;
    prompt_en: string;
    prompt_vi?: string;
  }>;
  master_prompt_unified: string;
  post_production_plan: {
    video_layer: string;
    graphic_layer: string;
    audio_layer: string;
  };
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      script?: string;
      projectId?: string;
      assets?: Array<{ id: string; name: string; url: string; mime?: string; kind?: string }>;
      targetModel?: string;
      targetDuration?: number;
      targetAspect?: "9:16" | "16:9" | "1:1";
    };

    const rawScript = body.script?.trim();
    if (!rawScript) {
      return NextResponse.json({ error: "Vui lòng nhập kịch bản hoặc ý tưởng cần phân tích." }, { status: 400 });
    }

    // 1. Resolve Project Assets
    let projectAssets = body.assets ?? [];
    if (projectAssets.length === 0 && body.projectId) {
      const dbAssets = listAssets(body.projectId);
      projectAssets = dbAssets
        .filter((a) => a.kind === "image" || a.mime.startsWith("image/"))
        .map((a) => ({
          id: a.id,
          name: a.name,
          url: a.url,
          mime: a.mime,
          kind: a.kind,
        }));
    }

    // 2. Fetch available models for context
    const videoModels = listModels("video");
    const modelCatalogSummary = videoModels
      .slice(0, 10)
      .map((m) => `- ID: "${m.id}", Label: "${m.label}", Provider: "${m.provider}", Desc: "${m.description}"`)
      .join("\n");

    const assetsSummary =
      projectAssets.length > 0
        ? projectAssets.map((a, i) => `[Tài nguyên ${i + 1}]: ID="${a.id}", Tên="${a.name}", URL="${a.url}"`).join("\n")
        : "Không có tài nguyên ảnh nào sẵn trong dự án (User chưa tải lên).";

    // 3. System Prompt embodying Flova.ai's Script-to-Production Engine
    const systemPrompt = `Bạn là "Flova Script Director Brain" — Hệ thống AI chuyên gia đọc hiểu kịch bản và lập kế hoạch sản xuất video điện ảnh đa tầng cho Hinton Studio.

NHIỆM VỤ CỐT LÕI CỦA BẠN (THEO CHUẨN FLOVA.AI):
1. HIỂU YÊU CẦU & ĐỊNH HƯỚNG NGHỆ THUẬT:
   - Xác định mục tiêu, thể loại (Lookbook thời trang, Phim hành động, TVC thương mại, MV ca nhạc, Sci-fi...), tỉ lệ khung hình tối ưu, nhịp độ và phong cách quay phim (35mm film, anamorphic, handheld, steadycam, anime...).
   - Đề xuất Model video AI phù hợp nhất:
     * Nếu đổi nhiều bộ đồ hoặc cần nạp 2-7 ảnh tham chiếu: Đề xuất "iooai:omni_flash_10s" (gắn tag @Ảnh1, @Ảnh2).
     * Nếu cần chuyển động phức tạp/combat/hành động dài 15s hoặc 30s với 1 nhân vật: Đề xuất "iooai:seedance2.5 快速版" (Seedance 2.5 快速版).
     * Nếu cần điện ảnh cao cấp: Đề xuất "duomiapi:seedance2" hoặc "veo-3.1".

2. BÓC TÁCH THỰC THỂ & KHỚP NỐI TÀI NGUYÊN (ENTITY & ASSET EXTRACTION):
   - Bóc tách nhân vật (tên, giới tính, phong cách, độ nghiêm ngặt giữ mặt).
   - Bóc tách trang phục theo từng bộ (Outfit 1, Outfit 2...), mô tả chi tiết chất liệu, phom dáng, màu sắc.
   - So khớp với danh sách tài nguyên hiện có:
     * Nếu tên file hoặc ngữ nghĩa khớp (vd "man", "suit", "vest" -> asset nam mặc vest), gắn "matched_asset_id" tương ứng.
     * Nếu kịch bản nhắc đến nhưng chưa có ảnh tham chiếu trong kho: Đánh dấu status="missing_asset".

3. KIỂM TRA RÀNG BUỘC & CẢNH BÁO MÂU THUẪN (CRITICAL - FLOVA SANITY RADAR):
   - Mâu thuẫn tài nguyên: Phát hiện nếu kịch bản mô tả đồ nữ nhưng ảnh trong kho là nam (hoặc ngược lại).
   - Ràng buộc năng lực Model:
     * Cảnh báo nếu người dùng muốn đổi 3 bộ đồ nhưng chọn model chỉ hỗ trợ 1 ảnh (như Seedance 2.0 / 2.5 single I2V) -> giải thích hiện tượng morphing/biến dạng và khuyên giải pháp (Omni Flash hoặc chia 3 sub-shots độc lập).
   - Ràng buộc thời lượng: So khớp tổng thời lượng các cảnh với thời lượng model hỗ trợ (10s, 15s, 30s).
   - Tách biệt lớp Hậu kỳ (Layer Separation): Phát hiện nếu kịch bản yêu cầu chèn nhãn giá, logo thương hiệu, sticker chibi, chữ phụ đề karaoke -> Cảnh báo KHÔNG đưa vào prompt video AI mà tách riêng sang Graphic Layer cho CapCut/SeeCut để tránh rác chữ.

4. BẢNG PHÂN CẢNH TIMELINE (STRUCTURED SHOTLIST):
   - Chia kịch bản thành 2-4 phân cảnh/nhịp rõ ràng.
   - Mỗi cảnh có mốc thời gian bắt đầu và kết thúc (vd: "00:00 - 00:05").
   - Bố cục góc máy (Wide, Medium, Close-up, Low-angle...).
   - Chuyển động camera rõ ràng (Dolly in, side-tracking, orbit, tilt-up, steadycam).
   - Hành động nhân vật cụ thể, không viết chung chung.
   - Kiểu chuyển cảnh dứt khoát (Hard cut on beat, Whip pan, Fade...).
   - Viết câu lệnh Prompt tiếng Anh điện ảnh chuẩn 40-70 từ cho từng cảnh.

5. MASTER PROMPT TỔNG THỂ & PHÂN TÁCH LỚP HẬU KỲ:
   - "master_prompt_unified": Câu lệnh tổng hợp chuẩn điện ảnh (nếu là Omni Flash thì chèn cú pháp @Ảnh1, @Ảnh2).
   - "post_production_plan": Tách 3 lớp rõ ràng: Lớp Video AI, Lớp Đồ họa Typography, Lớp Âm thanh SFX.

QUY TẮC ĐẦU RA:
- BẮT BUỘC chỉ trả về DUY NHẤT một chuỗi JSON hợp lệ theo đúng schema bên dưới. Tuyệt đối không thêm bất kỳ văn bản chào hỏi, giải thích hay markdown code block nào bên ngoài JSON.`;

    const userPrompt = `[KỊCH BẢN / Ý TƯỞNG CỦA NGƯỜI DÙNG]:
"${rawScript}"

[CẤU HÌNH YÊU CẦU]:
- Thời lượng mong muốn: ${body.targetDuration ? `${body.targetDuration}s` : "Tự động phân tích tối ưu (10s - 15s)"}
- Tỉ lệ khung hình mong muốn: ${body.targetAspect ?? "9:16"}
- Model ưu tiên (nếu có): ${body.targetModel ?? "Tự động đề xuất theo kịch bản"}

[DANH SÁCH TÀI NGUYÊN ẢNH HIỆN CÓ TRONG DỰ ÁN]:
${assetsSummary}

[DANH SÁCH MODEL VIDEO CÓ TRONG HỆ THỐNG]:
${modelCatalogSummary}

Hãy phân tích toàn diện theo chuẩn Flova và trả về JSON theo schema:
{
  "project_analysis": {
    "title": "string (Tên dự án ngắn gọn, hấp dẫn)",
    "genre": "string (Thể loại phim/video)",
    "target_duration_sec": 15,
    "recommended_aspect": "9:16",
    "recommended_model": "string (ID model tối ưu, vd: iooai:omni_flash_10s hoặc iooai:seedance2.5 快速版)",
    "model_reason": "string (Lý do chọn model theo năng lực kỹ thuật)",
    "visual_style": "string (Phong cách thị giác)",
    "pacing": "string (Nhịp điệu dựng phim)"
  },
  "entities": {
    "characters": [
      {
        "id": "char_1",
        "name": "string",
        "gender": "male" | "female" | "unspecified",
        "matched_asset_id": "string | null",
        "matched_asset_name": "string | null",
        "matched_asset_url": "string | null",
        "face_consistency": "strict" | "flexible",
        "description": "string"
      }
    ],
    "outfits": [
      {
        "id": "outfit_1",
        "name": "string",
        "matched_asset_id": "string | null",
        "matched_asset_name": "string | null",
        "matched_asset_url": "string | null",
        "status": "matched" | "missing_asset",
        "description": "string"
      }
    ],
    "props_and_setting": [
      { "id": "prop_1", "name": "string", "description": "string" }
    ]
  },
  "constraints_and_warnings": [
    {
      "type": "mismatch" | "model_capability" | "duration_check" | "post_production_layer" | "asset_gap",
      "severity": "error" | "warning" | "tip",
      "message": "string (Mô tả cảnh báo sắc sảo)",
      "suggestion": "string (Giải pháp cụ thể cho người dựng)"
    }
  ],
  "shots": [
    {
      "shot_index": 1,
      "title": "string (Tên cảnh)",
      "time_range": "00:00 - 00:05",
      "duration_sec": 5,
      "framing": "string",
      "camera_movement": "string",
      "character_action": "string",
      "outfit_id": "string",
      "transition_out": "string",
      "prompt_en": "string (English cinema prompt 40-70 words)",
      "prompt_vi": "string (Tóm tắt tiếng Việt)"
    }
  ],
  "master_prompt_unified": "string (Prompt tổng hợp)",
  "post_production_plan": {
    "video_layer": "string",
    "graphic_layer": "string",
    "audio_layer": "string"
  }
}`;

    const provider = getProvider("provider");
    if (!provider.apiKey) {
      return NextResponse.json(
        { error: "Chưa cấu hình API Key cho Gateway Bùi Hữu Thắng. Vui lòng vào Cài đặt để nhập key." },
        { status: 400 },
      );
    }

    const baseUrl = provider.baseUrl.replace(/\/+$/, "");
    const candidateModels = ["gemini-3.5-flash", "deepseek-v4-flash", "gpt-5.6-luna"];
    let planData: ProductionPlan | null = null;
    let lastError: string | null = null;

    for (const model of candidateModels) {
      try {
        const res = await fetch(`${baseUrl}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${provider.apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userPrompt },
            ],
            temperature: 0.2,
            max_tokens: 3000,
          }),
          signal: AbortSignal.timeout(60_000),
        });

        if (!res.ok) {
          const errText = await res.text();
          lastError = `Model ${model} HTTP ${res.status}: ${errText}`;
          continue;
        }

        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
        };
        const rawContent = json.choices?.[0]?.message?.content ?? "";
        if (!rawContent) {
          lastError = `Model ${model} trả về nội dung rỗng`;
          continue;
        }

        // Clean markdown backticks if any
        let clean = rawContent.trim();
        if (clean.startsWith("```json")) {
          clean = clean.slice(7);
        } else if (clean.startsWith("```")) {
          clean = clean.slice(3);
        }
        if (clean.endsWith("```")) {
          clean = clean.slice(0, -3);
        }

        const parsed = JSON.parse(clean.trim()) as ProductionPlan;
        if (parsed.shots && Array.isArray(parsed.shots)) {
          // Fill matched asset URLs if matched_asset_id exists
          if (parsed.entities?.characters) {
            for (const char of parsed.entities.characters) {
              if (char.matched_asset_id) {
                const found = projectAssets.find((a) => a.id === char.matched_asset_id);
                if (found) {
                  char.matched_asset_name = found.name;
                  char.matched_asset_url = found.url;
                }
              }
            }
          }
          if (parsed.entities?.outfits) {
            for (const outfit of parsed.entities.outfits) {
              if (outfit.matched_asset_id) {
                const found = projectAssets.find((a) => a.id === outfit.matched_asset_id);
                if (found) {
                  outfit.matched_asset_name = found.name;
                  outfit.matched_asset_url = found.url;
                  outfit.status = "matched";
                }
              }
            }
          }
          planData = parsed;
          break;
        }
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
      }
    }

    if (!planData) {
      return NextResponse.json(
        {
          error: `Không thể hoàn tất phân tích kịch bản: ${lastError || "Lỗi xử lý phản hồi từ AI"}`,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: true,
      plan: planData,
      assets: projectAssets,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Lỗi máy chủ khi phân tích kịch bản." },
      { status: 500 },
    );
  }
}
