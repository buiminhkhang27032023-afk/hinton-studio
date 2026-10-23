import { NextResponse } from "next/server";
import { forgetTunnel, startTunnel, stopTunnel, tunnelStatus, verifyTunnel } from "@/lib/tunnel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

export async function GET() {
  return NextResponse.json(tunnelStatus());
}

/**
 * POST { action: "start" | "stop" | "forget" }
 *
 * Starting launches a Cloudflare Quick Tunnel to the local port, so providers
 * that demand a public URL can fetch our /api/files images.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { action?: string; port?: number };

  if (body.action === "stop") {
    stopTunnel();
    return NextResponse.json(tunnelStatus());
  }
  if (body.action === "forget") {
    forgetTunnel();
    return NextResponse.json(tunnelStatus());
  }

  const port = Number(body.port) || Number(process.env.PORT) || 3210;
  try {
    const url = await startTunnel(port);
    const ok = await verifyTunnel(url);
    return NextResponse.json({ ...tunnelStatus(), url, verified: ok });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Không mở được tunnel." },
      { status: 502 },
    );
  }
}
