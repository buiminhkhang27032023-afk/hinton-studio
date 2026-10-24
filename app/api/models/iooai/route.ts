import { NextResponse } from "next/server";
import { listProviderModels } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Scan the saved IOOAI gateway and report how many models it lists. */
export async function POST() {
  try {
    const models = await listProviderModels("iooai");
    return NextResponse.json({ message: `Tìm thấy ${models.length} model IOOAI`, models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi kết nối IOOAI";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
