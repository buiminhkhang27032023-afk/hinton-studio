import { NextResponse } from "next/server";
import { listProviderModels } from "@/lib/provider";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** GET {baseUrl}/models with the saved key and return { models }. */
export async function GET() {
  try {
    const models = await listProviderModels();
    return NextResponse.json({ models });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Không kết nối được API";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
