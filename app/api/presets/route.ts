import { NextResponse } from "next/server";
import { listPresets, savePreset } from "@/lib/presets";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(listPresets());
}

export async function POST(request: Request) {
  const body = (await request.json()) as Record<string, unknown>;
  if (!body.name || typeof body.name !== "string") {
    return NextResponse.json({ error: "Thiếu tên bộ nhìn." }, { status: 400 });
  }
  return NextResponse.json(
    savePreset({
      ...(typeof body.id === "string" ? { id: body.id } : {}),
      name: body.name,
      characterId: (body.characterId as string | null) ?? null,
      wardrobe: String(body.wardrobe ?? ""),
      location: String(body.location ?? ""),
      styleId: String(body.styleId ?? "cinematic"),
      promptSuffix: String(body.promptSuffix ?? ""),
      refUrl: (body.refUrl as string | null) ?? null,
      seed: body.seed == null ? null : Number(body.seed),
    }),
  );
}
