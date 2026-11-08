import { NextResponse } from "next/server";
import { pausedModelResponse, consumeModelApproval } from "@/lib/model-call-guard";
import { claimJob, getJob, updateJob, setJobRecovery, type JobRecovery } from "@/lib/jobs";
import { jobErrorStatus } from "@/lib/job-outcome";
import { getModel } from "@/lib/models";
import { runModel, getProvider } from "@/lib/provider";
import { prepareReferenceImages, prepareReferenceMedia, prepareReferenceAudios, uploadToPiApi, assertReferenceReachable } from "@/lib/reference-images";
import { localUrlToDataUri, optimizeImageDataUri, persistRemoteAsset, resolveLocalAssetPath } from "@/lib/storage";
import fs from "node:fs";
import type { ModelKind } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 900;

/**
 * Run a model. Body: { modelId, kind, projectId, nodeId, vars, name? }
 * `vars` are the placeholder values used to fill the model's body template.
 */
export async function POST(request: Request) {
  const paused = pausedModelResponse();
  const approvalToken = request.headers.get("x-generation-approval");
  if (paused && !approvalToken) return paused;
  const body = (await request.json()) as {
    modelId?: string;
    kind?: ModelKind;
    projectId?: string | null;
    nodeId?: string | null;
    vars?: Record<string, unknown>;
    name?: string;
    requestId?: string;
  };

  if (!body.modelId) {
    return NextResponse.json({ error: "Chưa chọn model." }, { status: 400 });
  }
  const model = getModel(body.modelId);
  if (!model) {
    return NextResponse.json({ error: "Model không tồn tại." }, { status: 404 });
  }

  const projectId = body.projectId ?? null;
  const approvedPausedRun = Boolean(paused && consumeModelApproval(approvalToken, {
    modelId: model.id, projectId, nodeId: body.nodeId ?? null,
  }));
  if (paused && !approvedPausedRun) return paused;
  const requestKey = typeof body.requestId === "string" && /^[\w-]{8,100}$/.test(body.requestId)
    ? `${projectId ?? "library"}:${body.nodeId ?? "none"}:${body.requestId}`
    : crypto.randomUUID();
  const claimed = claimJob({
    projectId,
    nodeId: body.nodeId ?? null,
    kind: model.kind,
    model: model.id,
    input: body.vars ?? {},
  }, requestKey, approvedPausedRun);
  const job = claimed.job;
  if (claimed.existing) {
    if (job.status === "succeeded" && job.output) return NextResponse.json({ jobId: job.id, output: job.output });
    return NextResponse.json({ jobId: job.id, providerJob: job.providerJob, status: job.status,
      error: "Cảnh này đã có yêu cầu trước đó. Chưa gửi lệnh mới; hãy kiểm tra tác vụ cũ trong bảng điều khiển." }, { status: 409 });
  }
  const recovery: JobRecovery = { providerId: model.provider, baseUrl: getProvider(model.provider).baseUrl, phase: "preparing", name: body.name ?? model.label };
  setJobRecovery(job.id, recovery);

  updateJob(job.id, { status: "running" });

  // Inline & optimize locally stored images — provider servers cannot read /api/files,
  // and uncompressed multi-megabyte PNGs cause upstream gateway timeouts (502 Bad Gateway).
  const vars: Record<string, unknown> = { ...(body.vars ?? {}) };
  // The approved low-cost smoke test cannot be expanded into a pricier request.
  if (approvedPausedRun && model.id === "iooai:omni_flash_10s") {
    vars.resolution = "720p";
    vars.duration = 10;
    vars.seconds = "10";
  }
  const isUrlProvider =
    model.provider === "iooai" ||
    model.provider === "runninghub" ||
    model.provider?.startsWith("runninghub");

  try {
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

    if (isUrlProvider && (model.kind === "video" || model.kind === "image")) {
      const rawSources =
        Array.isArray(vars.images) && vars.images.length
          ? vars.images
          : vars.image ? [vars.image] : [];
      if (rawSources.length > 0) {
        const prepared = await prepareReferenceImages(rawSources);
        for (const url of prepared) await assertReferenceReachable(url);
        recovery.referenceUrls = prepared;
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
        vars.videos = [prep];
      }
      const rawAudios = (Array.isArray(vars.audios) && vars.audios.length
        ? (vars.audios as string[])
        : vars.audio ? [vars.audio as string] : vars.audioUrl ? [vars.audioUrl as string] : []
      ).filter(Boolean);
      if (rawAudios.length > 0) {
        const prepAudios = await prepareReferenceAudios(rawAudios);
        vars.audios = prepAudios;
        vars.audio = prepAudios[0];
        vars.audioUrl = prepAudios[0];
        vars.audio_url = prepAudios[0];
      }
    }
    // PiAPI fetches reference images itself: local /api/files paths and data: URIs
    // are unreachable, so publish them first (same uploader IOOAI uses).
    if (model.provider === "piapi" && model.kind === "video") {
      const current = Array.isArray(vars.imageUrls) ? (vars.imageUrls as string[]) : [];
      const sources = (Array.isArray(vars.images) ? (vars.images as unknown[]) : []).filter(
        (item): item is string => typeof item === "string" && item.length > 0,
      );
      if (!current.length && sources.length) {
        // PiAPI's own ephemeral store: its renderer reliably fetches from here
        // (third-party CDN links were rejected as "Invalid input").
        const prepared: string[] = [];
        for (const src of sources.slice(0, 9)) {
          prepared.push(/^https:\/\//i.test(src) ? src : await uploadToPiApi(src));
        }
        vars.imageUrls = prepared;
        vars.images = prepared;
        vars.piapiMode = prepared.length > 2 ? "omni_reference" : "first_last_frames";
        if (typeof vars.prompt === "string") {
          vars.prompt = vars.prompt.replace(/Ảnh (\d+) \(Image \d+\)/g, "@image$1");
        }
      }
    }
    const result = await runModel({
      model: model.id,
      kind: model.kind,
      config: model.config,
      vars,
      providerId: model.provider,
      approvedPausedRun,
      onSubmit: () => {
        recovery.phase = "submitting";
        setJobRecovery(job.id, recovery);
      },
      onJobId: (providerJob) => {
        updateJob(job.id, { providerJob });
        recovery.phase = "accepted";
        setJobRecovery(job.id, recovery);
      },
    });

    recovery.phase = "downloading";
    recovery.source = result.source;
    recovery.mime = result.mime;
    setJobRecovery(job.id, recovery);

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
      setJobRecovery(job.id, { providerId: model.provider, baseUrl: recovery.baseUrl, phase: "finished" });
      return NextResponse.json({ jobId: job.id, output });
    }

    const asset = await persistRemoteAsset({
      projectId,
      name: body.name ?? `${model.label} ${new Date().toLocaleTimeString("vi-VN")}`,
      source: result.source,
      fallbackMime: result.mime,
      meta: { model: model.id, kind: model.kind, providerJob: result.providerJob, jobId: job.id },
    });

    // If an audio track was wired into a video generation node AND audioMode === "mux",
    // mux the audio track into the generated video. Otherwise (default: "reference"),
    // preserve the video's native audio generated by Seedance / AI model.
    const rawAudio = (vars.audio || vars.audioUrl) as string | undefined;
    const audioMode = (vars.audioMode as string | undefined) ?? "reference";
    if (model.kind === "video" && rawAudio && asset.url && audioMode === "mux") {
      const vidPath = resolveLocalAssetPath(asset.url);
      const audPath = resolveLocalAssetPath(rawAudio);
      if (vidPath && audPath && fs.existsSync(vidPath) && fs.existsSync(audPath)) {
        const tempMuxed = vidPath + ".muxed.mp4";
        try {
          const { execFile } = await import("node:child_process");
          const { promisify } = await import("node:util");
          const execFileAsync = promisify(execFile);
          await execFileAsync("ffmpeg", [
            "-v", "error",
            "-y",
            "-i", vidPath,
            "-i", audPath,
            "-map", "0:v:0",
            "-map", "1:a:0",
            "-c:v", "copy",
            "-c:a", "aac",
            "-b:a", "192k",
            "-shortest",
            tempMuxed
          ], { timeout: 30000 });
          if (fs.existsSync(tempMuxed) && fs.statSync(tempMuxed).size > 0) {
            fs.copyFileSync(tempMuxed, vidPath);
            fs.unlinkSync(tempMuxed);
          }
        } catch (muxErr) {
          console.warn("[AudioMux] Failed to mux audio into video:", muxErr);
          if (fs.existsSync(tempMuxed)) {
            try { fs.unlinkSync(tempMuxed); } catch {}
          }
        }
      }
    }

    updateJob(job.id, { status: "succeeded", output: asset, providerJob: result.providerJob });
    setJobRecovery(job.id, { providerId: model.provider, baseUrl: recovery.baseUrl, phase: "finished" });
    return NextResponse.json({ jobId: job.id, output: asset });
  } catch (error) {
    let message = error instanceof Error ? error.message : "Lỗi không xác định";
    if (model.provider === "piapi" && Array.isArray(vars.imageUrls)) {
      message += ` | mode=${String(vars.piapiMode)} dur=${String(vars.piapiDuration)} res=${String(vars.resolution)} ar=${String(vars.piapiAspect)} imgs=${(vars.imageUrls as string[]).map((u) => String(u).slice(0, 80)).join(" , ")} promptLen=${String(vars.prompt ?? "").length}`;
    }
    const status = jobErrorStatus(recovery.phase, message);
    if (status === "pending") message += " Chưa xác nhận thất bại phía nhà cung cấp. Không gửi lại; kiểm tra hoặc tải lại tác vụ cũ.";
    updateJob(job.id, { status, error: message });
    return NextResponse.json({ jobId: job.id, providerJob: getJob(job.id)?.providerJob, status, error: message }, { status: 502 });
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
