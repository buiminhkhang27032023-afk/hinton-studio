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

    const stored = getProvider(body.providerId || "openai-compatible");
    if (!baseUrl) baseUrl = stored.baseUrl;

    // If apiKey is masked or not provided, retrieve from stored provider settings
    if (!apiKey || apiKey.includes("••••")) {
      apiKey = stored.apiKey;
    }

    if (!baseUrl) {
      return NextResponse.json({ ok: false, error: "Chưa nhập Base URL cho cổng này." }, { status: 400 });
    }
    if (!apiKey) {
      return NextResponse.json({ ok: false, error: "Chưa có API key để kiểm tra." }, { status: 400 });
    }

    const isPiapi = body.providerId === "piapi";
    const isDuomi = body.providerId === "duomiapi" || baseUrl.includes("duomiapi") || baseUrl.includes("wike.cc");
    const isBailian = body.providerId === "bailian" || body.providerId === "dashscope" || baseUrl.includes("dashscope");
    const isAutodl = body.providerId === "autodl" || baseUrl.includes("gpuhub.com") || baseUrl.includes(":8188");
    const isRunningHub = body.providerId === "runninghub" || baseUrl.includes("runninghub");

    if (isRunningHub) {
      try {
        const testRes = await fetch("https://www.runninghub.ai/uc/openapi/accountStatus", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({ apiKey }),
          signal: AbortSignal.timeout(8000),
        });
        const data = await testRes.json().catch(() => ({}));
        if (data.code === 0 && data.data) {
          const money = data.data.remainMoney ?? "0";
          const coins = data.data.remainCoins ?? "0";
          const currency = data.data.currency || "CNY";
          return NextResponse.json({
            ok: true,
            status: 200,
            message: `Kết nối RunningHub thành công! Số dư: ${money} ${currency} • Điểm coins: ${coins} Coins. Cổng ComfyUI Cloud & OpenAPI sẵn sàng.`,
            account: data.data,
          });
        }
        return NextResponse.json({
          ok: false,
          error: `RunningHub báo lỗi: ${data.msg || "API key không hợp lệ hoặc tài khoản bị khóa."}`,
        });
      } catch (err: unknown) {
        return NextResponse.json({
          ok: false,
          error: `Không thể kết nối đến RunningHub: ${err instanceof Error ? err.message : String(err)}`,
        });
      }
    }

    if (isAutodl) {
      try {
        const testRes = await fetch(`${baseUrl}/system_stats`, {
          method: "GET",
          signal: AbortSignal.timeout(7000),
        }).catch(async () => {
          return await fetch(`${baseUrl}/`, {
            method: "GET",
            signal: AbortSignal.timeout(7000),
          });
        });

        if (testRes.ok || testRes.status === 200 || testRes.status === 404) {
          return NextResponse.json({
            ok: true,
            status: 200,
            message: "Kết nối máy chủ AutoDL ComfyUI thành công! GPU sẵn sàng chạy MimicMotion 0 giây chờ đợi.",
          });
        }
        return NextResponse.json({
          ok: false,
          error: `Máy chủ AutoDL trả về mã lỗi ${testRes.status}. Vui lòng kiểm tra lại đường link WebUI hoặc port ComfyUI.`,
        });
      } catch (err: unknown) {
        return NextResponse.json({
          ok: false,
          error: `Không thể kết nối đến máy chủ AutoDL (${err instanceof Error ? err.message : String(err)}). Hãy đảm bảo máy đang BẬT (开机).`,
        });
      }
    }

    if (isBailian) {
      try {
        const testRes = await fetch(`${baseUrl}/models`, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${apiKey}`,
          },
          signal: AbortSignal.timeout(8000),
        });
        const text = await testRes.text();
        let json: { code?: string; message?: string } = {};
        try { json = JSON.parse(text); } catch {}

        if (testRes.status === 401 || json.code === "InvalidApiKey") {
          return NextResponse.json({
            ok: false,
            error: "Alibaba Bailian báo lỗi: Khóa API DashScope không hợp lệ hoặc chưa được kích hoạt.",
          });
        }

        return NextResponse.json({
          ok: true,
          status: 200,
          message: "Kết nối Alibaba Cloud Bailian (DashScope) thành công! Cổng sẵn sàng cho AnimateAnyone và Wan 2.2.",
        });
      } catch (err: unknown) {
        return NextResponse.json({
          ok: false,
          error: `Không thể kết nối đến Alibaba DashScope (${err instanceof Error ? err.message : String(err)}).`,
        });
      }
    }

    // Special handling for DuomiAPI (Volcengine Doubao / Seedance / Kling format)
    if (isDuomi) {
      const cleanBase = baseUrl.replace(/\/v1\/?$/, "").replace(/\/+$/, "");
      const hostsToTry = [
        cleanBase,
        "https://api.wike.cc",
        "https://duomiapi.com",
      ].filter((h, i, arr) => Boolean(h) && arr.indexOf(h) === i);

      let lastError = "";
      for (const host of hostsToTry) {
        try {
          const testEndpoint = `${host}/api/v3/contents/generations/tasks`;
          const res = await fetch(testEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({}),
            signal: AbortSignal.timeout(7000),
          });

          const text = await res.text();
          let json: { code?: number; msg?: string } = {};
          try { json = JSON.parse(text); } catch {}

          if (json.code === 403 || (json.msg && json.msg.includes("KEY不正确"))) {
            return NextResponse.json({
              ok: false,
              error: "DuomiAPI báo lỗi: Khóa bí mật API không đúng hoặc chưa được kích hoạt. Bạn vui lòng kiểm tra và copy lại đúng chuỗi khóa trong mục 'Khóa API' của DuomiAPI.",
            });
          }

          // If server responded and did not reject the key (e.g. valid key, missing body fields)
          return NextResponse.json({
            ok: true,
            status: 200,
            message: `Kết nối DuomiAPI thành công qua [${host}]! Cổng sẵn sàng chạy Seedance 2.0, Kling, Veo...`,
          });
        } catch (err: unknown) {
          lastError = err instanceof Error ? err.message : String(err);
        }
      }

      return NextResponse.json({
        ok: false,
        error: `Không thể kết nối đến DuomiAPI qua mạng hiện tại (${lastError}). Vui lòng thử đổi Base URL sang https://api.wike.cc.`,
      });
    }

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
