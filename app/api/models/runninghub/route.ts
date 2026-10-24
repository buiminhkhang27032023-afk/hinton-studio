import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";
import { upsertModel } from "@/lib/models";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const provider = getProvider("runninghub");
  if (!provider.apiKey) {
    return NextResponse.json({ error: "Chưa cấu hình API key RunningHub" }, { status: 400 });
  }

  try {
    const host = new URL(provider.baseUrl || "https://www.runninghub.ai").host;
    const res = await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/uc/openapi/accountStatus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: host,
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({ apiKey: provider.apiKey }),
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Lỗi kết nối RunningHub" },
      { status: 500 },
    );
  }
}

export async function POST() {
  const provider = getProvider("runninghub");
  if (!provider.apiKey) {
    return NextResponse.json({ error: "Chưa cấu hình API key RunningHub trong Cài đặt." }, { status: 400 });
  }

  // 1. Check RunningHub LLM Gateway (supports Enterprise Shared Key & Universal Keys)
  let llmCount = 0;
  let llmOk = false;
  try {
    const llmRes = await fetch("https://llm.runninghub.ai/v1/models", {
      headers: {
        Authorization: `Bearer ${provider.apiKey}`,
        Accept: "application/json",
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (llmRes.ok) {
      const llmData = await llmRes.json();
      const models = Array.isArray(llmData.data) ? llmData.data : [];
      llmCount = models.length;
      llmOk = true;

      // Register top featured runninghub models
      for (const m of models.slice(0, 30)) {
        if (!m || typeof m.id !== "string") continue;
        upsertModel({
          id: `runninghub:${m.id}`,
          label: `RunningHub · ${m.id}`,
          kind: "chat",
          provider: "runninghub-llm",
          description: `Context: ${m.context_length ?? "N/A"}. Qua RunningHub LLM Gateway`,
          config: {
            endpoint: "/chat/completions",
            body: {
              model: m.id,
              messages: [{ role: "user", content: "{{prompt}}" }],
            },
            resultPath: "choices.0.message.content",
          },
        });
      }
    }
  } catch {}

  // 2. Check RunningHub Member Account Status (supports Member Keys)
  let memberOk = false;
  let coinInfo = "";
  try {
    const host = new URL(provider.baseUrl || "https://www.runninghub.ai").host;
    const statusRes = await fetch(`${provider.baseUrl.replace(/\/+$/, "")}/uc/openapi/accountStatus`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Host: host,
        Authorization: `Bearer ${provider.apiKey}`,
      },
      body: JSON.stringify({ apiKey: provider.apiKey }),
      signal: AbortSignal.timeout(10_000),
    });
    const statusData = await statusRes.json();
    if (statusData.code === 0 && statusData.data) {
      memberOk = true;
      const coin = statusData.data.remainCoin ?? statusData.data.balance ?? "0";
      coinInfo = `Số dư: ${coin} Coins. `;
    }
  } catch {}

  if (llmOk || memberOk) {
    const typeStr = llmOk && memberOk
      ? "Khóa đa năng (LLM + OpenAPI)"
      : llmOk
        ? "Khóa chia sẻ doanh nghiệp (LLM Gateway)"
        : "Khóa thành viên (OpenAPI / ComfyUI)";
    return NextResponse.json({
      ok: true,
      message: `Kết nối RunningHub thành công! [${typeStr}]. ${coinInfo}${llmCount > 0 ? `Đã đồng bộ ${llmCount} model.` : ""}`,
    });
  }

  return NextResponse.json({
    error: "API key không hợp lệ hoặc không kết nối được tới RunningHub. Vui lòng kiểm tra lại key.",
  }, { status: 400 });
}
