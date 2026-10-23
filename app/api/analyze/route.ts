import { NextResponse } from "next/server";
import { analyseVideo, saveAnalysis, saveMemory, listAnalyses } from "@/lib/memory";
import { getAsset } from "@/lib/storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function GET(request: Request) {
  const projectId = new URL(request.url).searchParams.get("projectId") ?? undefined;
  return NextResponse.json(listAnalyses(projectId));
}

/**
 * Read a finished clip: what worked, what drifted, what to prompt differently.
 * Body: { assetId, projectId?, remember?: boolean }
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    assetId?: string;
    projectId?: string | null;
    remember?: boolean;
  };
  const asset = body.assetId ? getAsset(body.assetId) : null;
  if (!asset) return NextResponse.json({ error: "Không tìm thấy video." }, { status: 404 });

  try {
    const result = await analyseVideo(asset.url);
    const analysis = saveAnalysis({
      projectId: body.projectId ?? asset.projectId,
      assetId: asset.id,
      kind: "video",
      summary: result.summary,
      payload: { ...result, assetUrl: asset.url, name: asset.name },
    });

    // Feed what worked back into memory so later batches start smarter.
    if (body.remember && result.promptSuggestions.length) {
      saveMemory({
        projectId: body.projectId ?? asset.projectId,
        kind: "style",
        name: `Học từ ${asset.name}`.slice(0, 60),
        description: result.promptSuggestions.join(" "),
        sourceUrl: asset.url,
        tags: result.strengths.slice(0, 6),
      });
    }

    return NextResponse.json({ analysis, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Phân tích video thất bại." },
      { status: 502 },
    );
  }
}
