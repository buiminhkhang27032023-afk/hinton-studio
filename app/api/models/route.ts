import { NextResponse } from "next/server";
import { deleteModel, listModels, upsertModel } from "@/lib/models";
import type { ModelConfig, ModelKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set<ModelKind>(["chat", "image", "video", "upscale", "train"]);

export async function GET(request: Request) {
  const kind = new URL(request.url).searchParams.get("kind");
  return NextResponse.json(listModels(kind && KINDS.has(kind as ModelKind) ? (kind as ModelKind) : undefined));
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    id?: string;
    label?: string;
    kind?: string;
    provider?: string;
    description?: string;
    config?: ModelConfig;
  } | null;
  if (!body?.label?.trim() || !body.kind || !KINDS.has(body.kind as ModelKind) || !body.config) {
    return NextResponse.json({ error: "Thiếu tên, loại hoặc cấu hình model." }, { status: 400 });
  }
  return NextResponse.json(
    upsertModel({
      id: body.id,
      label: body.label.trim(),
      kind: body.kind as ModelKind,
      provider: body.provider,
      description: body.description,
      config: body.config,
    }),
  );
}

export async function DELETE(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Thiếu id." }, { status: 400 });
  deleteModel(id);
  return NextResponse.json({ ok: true });
}
