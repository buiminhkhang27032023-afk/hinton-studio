import { NextResponse } from "next/server";
import { createJob, getJob, updateJob } from "@/lib/jobs";
import { getModel } from "@/lib/models";
import { runModel } from "@/lib/provider";
import { prepareReferenceImages, prepareReferenceMedia } from "@/lib/reference-images";
import { localUrlToDataUri, optimizeImageDataUri, persistRemoteAsset } from "@/lib/storage";
import type { ModelKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

/**
 * Run a model. Body: { modelId, kind, projectId, nodeId, vars, name? }
 * `vars` are the placeholder values used to fill the model's body template.
 */
export async function POST(request: Request) {
  const body = (await request.json()) as {
    modelId?: string;
    kind?: ModelKind;
    projectId?: string | null;
    nodeId?: string | null;
    vars?: Record<string, unknown>;
    name?: string;
  };

  if (!body.modelId) {
    return NextResponse.json({ error: "Chưa chọn model." }, { status: 400 });
  }
  const model = getModel(body.modelId);
  if (!model) {
    return NextResponse.json({ error: "Model không tồn tại." }, { status: 404 });
  }

  const projectId = body.projectId ?? null;
  const job = createJob({
    projectId,
    nodeId: body.nodeId ?? null,
    kind: model.kind,
    model: model.id,
    input: body.vars ?? {},
  });

  updateJob(job.id, { status: "running" });

  // Inline & optimize locally stored images — provider servers cannot read /api/files,
  // and uncompressed multi-megabyte PNGs cause upstream gateway timeouts (502 Bad Gateway).
  const vars: Record<string, unknown> = { ...(body.vars ?? {}) };
  const isUrlProvider =
    model.provider === "iooai" ||
    model.provider === "runninghub" ||
    model.provider?.startsWith("runninghub");

  if (!isUrlProvider && typeof vars.image === "string") {
    vars.image = await optimizeImageDataUri(vars.image);
  }
  if (!isUrlProvider && typeof vars.modelImage === "string") {
    vars.modelImage = await optimizeImageDataUri(vars.modelImage);
  }
  if (!isUrlProvider && typeof vars.garmentImage === "string") {
    vars.garmentImage = await optimizeImageDataUri(vars.garmentImage);
  }
  if (!isUrlProvider && Array.isArray(vars.images)) {
    vars.images = await Promise.all(
      vars.images.map((item) =>
        typeof item === "string" ? optimizeImageDataUri(item) : item,
      ),
    );
  }

  try {
    if (isUrlProvider && (model.kind === "video" || model.kind === "image")) {
      const rawSources =
        Array.isArray(vars.images) && vars.images.length
          ? vars.images
          : vars.image ? [vars.image] : [];
      if (rawSources.length > 0) {
        const prepared = await prepareReferenceImages(rawSources);
        vars.images = prepared;
        vars.image = prepared[0];
        vars.firstImageUrl = prepared[0];
        vars.firstFrameUrl = prepared[0];
        vars.imageUrl = prepared[0];
        vars.imageUrls = prepared;
      }
      if (typeof vars.modelImage === "string" && vars.modelImage.trim()) {
        const prep = await prepareReferenceImages([vars.modelImage]);
        vars.modelImage = prep[0];
      }
      if (typeof vars.garmentImage === "string" && vars.garmentImage.trim()) {
        const prep = await prepareReferenceImages([vars.garmentImage]);
        vars.garmentImage = prep[0];
      }
      const rawVideo = (vars.video || vars.videoUrl) as string | undefined;
      if (typeof rawVideo === "string" && rawVideo.trim()) {
        const prep = await prepareReferenceMedia(rawVideo);
        vars.video = prep;
        vars.videoUrl = prep;
      }
    }
    const result = await runModel({
      model: model.id,
      kind: model.kind,
      config: model.config,
      vars,
      providerId: model.provider,
    });

    // Chat-style results are text, not files — return them inline.
    if (model.kind === "chat") {
      const output = {
        id: job.id,
        projectId,
        name: body.name ?? "Kết quả chat",
        kind: "file" as const,
        mime: "text/plain",
        url: "",
        meta: { text: result.source },
        createdAt: Date.now(),
      };
      updateJob(job.id, { status: "succeeded", output, providerJob: result.providerJob });
      return NextResponse.json({ jobId: job.id, output });
    }

    const asset = await persistRemoteAsset({
      projectId,
      name: body.name ?? `${model.label} ${new Date().toLocaleTimeString("vi-VN")}`,
      source: result.source,
      fallbackMime: result.mime,
      meta: { model: model.id, kind: model.kind, vars: body.vars },
    });

    updateJob(job.id, { status: "succeeded", output: asset, providerJob: result.providerJob });
    return NextResponse.json({ jobId: job.id, output: asset });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Lỗi không xác định";
    updateJob(job.id, { status: "failed", error: message });
    return NextResponse.json({ jobId: job.id, error: message }, { status: 502 });
  }
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");
  if (id) {
    const job = getJob(id);
    if (!job) return NextResponse.json({ error: "Không tìm thấy tác vụ" }, { status: 404 });
    return NextResponse.json(job);
  }
  const { listJobs } = await import("@/lib/jobs");
  return NextResponse.json(listJobs(url.searchParams.get("projectId") ?? undefined));
}
