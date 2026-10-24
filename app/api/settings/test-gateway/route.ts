import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      providerId?: string;
      baseUrl?: string;
      apiKey?: string;
    };

    let baseUrl = (body.baseUrl || "").trim().replace(/\/+$/, "");
    let apiKey = (body.apiKey || "").trim();

    // If apiKey is masked or not provided, retrieve from stored provider settings
    if (!apiKey || apiKey.includes("••••")) {
      const stored = getProvider(body.providerId || "openai-compatible");
      if (!baseUrl) baseUrl = stored.baseUrl;
      apiKey = stored.apiKey;
    }

    if (!baseUrl) {
      return NextResponse.json({ ok: false, error: "Chưa nhập Base URL cho cổng này." }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Chưa có API key để kiểm tra." }, { status: 400 });
    }

    const isPiapi = body.providerId === "piapi";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(isPiapi ? { "x-api-key": apiKey } : { Authorization: `Bearer ${apiKey}` }),
    };

    // Try GET /models or /v1/models first
    let res: Response | null = null;
    let endpointTried = `${baseUrl}/models`;

    try {
      res = await fetch(endpointTried, {
        method: "GET",
        headers,
        signal: AbortSignal.timeout(12000),
      });
    } catch {
      // Fallback: try /chat/completions with minimal payload
      endpointTried = `${baseUrl}/chat/completions`;
      try {
        res = await fetch(endpointTried, {
          method: "POST",
          headers,
          body: JSON.stringify({
            model: "gemini-3.5-flash",
            messages: [{ role: "user", content: "hi" }],
            max_tokens: 1,
          }),
          signal: AbortSignal.timeout(12000),
        });
      } catch (err2: unknown) {
        const msg = err2 instanceof Error ? err2.message : String(err2);
        return NextResponse.json(
          { ok: false, error: `Không thể kết nối đến ${baseUrl}: ${msg}` },
          { status: 502 },
        );
      }
    }

    if (!res) {
      return NextResponse.json(
        { ok: false, error: `Không thể kết nối đến máy chủ ${baseUrl}.` },
        { status: 502 },
      );
    }

    if (!res.ok) {
      const text = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          status: res.status,
          error: `Máy chủ trả về HTTP ${res.status}: ${text.slice(0, 200)}`,
        },
        { status: 200 },
      );
    }

    const data = await res.json().catch(() => ({}));
    const modelList = Array.isArray(data.data) ? data.data : Array.isArray(data.models) ? data.models : [];
    const count = modelList.length;

    return NextResponse.json({
      ok: true,
      status: 200,
      message: count > 0 ? `Kết nối thành công! Nhận dạng được ${count} model.` : "Kết nối thành công! Cổng sẵn sàng hoạt động.",
      modelCount: count,
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
