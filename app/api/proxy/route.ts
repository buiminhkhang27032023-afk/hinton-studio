import { NextResponse } from "next/server";
import { getProvider } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Stream remote assets through the server so the browser never hits CORS or
 * hot-link blocks from provider CDNs.
 */
export async function GET(request: Request) {
  const provider = getProvider();
  if (!provider.proxyAssets) {
    return NextResponse.json({ error: "Proxy đang tắt." }, { status: 403 });
  }

  const target = new URL(request.url).searchParams.get("url");
  if (!target || !/^https?:\/\//i.test(target)) {
    return NextResponse.json({ error: "URL không hợp lệ." }, { status: 400 });
  }

  const upstream = await fetch(target, { signal: AbortSignal.timeout(120_000) });
  if (!upstream.ok || !upstream.body) {
    return NextResponse.json({ error: `Nguồn trả về ${upstream.status}` }, { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": upstream.headers.get("content-type") ?? "application/octet-stream",
      "Cache-Control": "public, max-age=86400",
    },
  });
}
