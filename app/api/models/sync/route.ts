import { NextResponse } from "next/server";
import { listModels } from "@/lib/models";
import { detectKind, syncProviderModels, type CatalogEntry } from "@/lib/model-sync";
import { listProviderModels } from "@/lib/provider";
import type { ModelKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const KINDS = new Set<ModelKind>(["chat", "image", "video", "upscale", "train"]);

function toCatalog(raw: unknown[]): CatalogEntry[] {
  const entries: CatalogEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    if (typeof row.id !== "string" || !row.id.trim()) continue;
    entries.push({
      id: row.id,
      displayName: typeof row.displayName === "string" ? row.displayName : typeof row.name === "string" ? row.name : undefined,
      billingUnit:
        typeof row.billingUnit === "string" ? row.billingUnit : typeof row.billing_unit === "string" ? row.billing_unit : undefined,
      hints: typeof row.hints === "string" ? row.hints : undefined,
    });
  }
  return entries;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    onlyNew?: boolean;
    replace?: boolean;
    ids?: string[];
    kind?: string;
    raw?: unknown[];
  };
  try {
    const source = Array.isArray(body.raw) ? body.raw : await listProviderModels();
    let entries = toCatalog(source);
    if (Array.isArray(body.ids) && body.ids.length) {
      const allow = new Set(body.ids);
      entries = entries.filter((entry) => allow.has(entry.id));
    }
    if (body.kind && KINDS.has(body.kind as ModelKind)) {
      const kind = body.kind as ModelKind;
      entries = entries.filter((entry) => detectKind(entry) === kind);
    }
    const result = syncProviderModels(entries, { onlyNew: body.onlyNew, replace: body.replace });
    return NextResponse.json({ ...result, models: listModels() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không đồng bộ được model";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
