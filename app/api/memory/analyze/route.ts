import { NextResponse } from "next/server";
import { describeCharacterImage, describeStyleImage, saveMemory, type MemoryKind } from "@/lib/memory";
import { getAsset } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 240;

/**
 * Let the vision model read a reference image and store what it learned.
 * Body: { assetUrl | assetId, kind: "character" | "style" }
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    assetUrl?: string;
    assetId?: string;
    kind?: MemoryKind;
    name?: string;
    projectId?: string | null;
  };

  const sourceUrl = body.assetUrl ?? (body.assetId ? getAsset(body.assetId)?.url : undefined);
  if (!sourceUrl) {
    return NextResponse.json({ error: "Thiếu ảnh tham chiếu." }, { status: 400 });
  }

  try {
    if (body.kind === "style" || body.kind === "trend") {
      const result = await describeStyleImage(sourceUrl);
      const entry = saveMemory({
        projectId: body.projectId ?? null,
        kind: body.kind,
        name: body.name?.trim() || "Phong cách",
        description: result.description,
        sourceUrl,
        tags: result.tags,
      });
      return NextResponse.json(entry);
    }

    const result = await describeCharacterImage(sourceUrl);
    const entry = saveMemory({
      projectId: body.projectId ?? null,
      kind: "character",
      name: body.name?.trim() || result.name,
      description: result.description,
      sourceUrl,
      tags: result.tags,
    });
    return NextResponse.json(entry);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Phân tích ảnh thất bại." },
      { status: 502 },
    );
  }
}
