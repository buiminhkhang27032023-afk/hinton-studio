import { NextResponse } from "next/server";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { saveAsset } from "@/lib/storage";
import { ASSET_DIR } from "@/lib/db";
import type { Asset } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { jobsMap, type SeeCutJob } from "@/lib/seecut-jobs";

const JOBS_DIR = path.join(process.cwd(), "data", "seecut_jobs");
fs.mkdirSync(JOBS_DIR, { recursive: true });

const defaultSeeCutDir = fs.existsSync(path.join(process.cwd(), "..", "seecut"))
  ? path.resolve(process.cwd(), "..", "seecut")
  : fs.existsSync(path.join(process.cwd(), "seecut"))
  ? path.resolve(process.cwd(), "seecut")
  : (process.platform === "win32" ? "c:\\Users\\Chen Qianyu\\SeeCut" : path.join(process.cwd(), "vendor", "SeeCut"));

const SEECUT_DIR = process.env.SEECUT_DIR || defaultSeeCutDir;
const defaultPython = fs.existsSync(path.join(SEECUT_DIR, ".venv", "Scripts", "python.exe"))
  ? path.join(SEECUT_DIR, ".venv", "Scripts", "python.exe")
  : (process.platform === "win32" ? "python" : "python3");

const PYTHON_PATH = process.env.SEECUT_PYTHON || defaultPython;

export async function GET() {
  return NextResponse.json({
    presets: ["auto", "youtube", "tiktok", "shorts", "reels"],
    fonts: [
      { id: "montserrat", name: "Montserrat Black", tag: "Mạnh mẽ & Viral" },
      { id: "playfair", name: "Playfair Display", tag: "Tạp chí thời trang cao cấp" },
      { id: "cinzel", name: "Cinzel Bold", tag: "Điện ảnh La Mã quyền lực" },
      { id: "syne", name: "Syne ExtraBold", tag: "Phá cách nghệ thuật đương đại" },
      { id: "vietnam", name: "Be Vietnam Pro", tag: "Chuẩn quốc tế & Cân đối" },
    ],
    styles: [
      { id: "viral", name: "Viral TikTok 🔥", desc: "Cắt nhanh ~1.7s, punch zoom, flash, chữ nảy, nhạc sôi động" },
      { id: "luxury", name: "Luxury Gold ✨", desc: "Ánh kim vàng sang trọng, serif thanh lịch, chuyển mượt" },
      { id: "cinematic", name: "Điện ảnh 🎬", desc: "Màu ấm 35mm, chuyển cảnh mềm mượt, nhịp thở sâu" },
      { id: "editorial", name: "Tạp chí 📰", desc: "High-fashion minimalist, thanh lịch và sắc nét" },
      { id: "clean", name: "Gọn gàng 💎", desc: "Nhịp vừa, rõ ràng, phù hợp video kiến thức" },
      { id: "calm", name: "Thư thái 🌙", desc: "Cảnh dài, chuyển êm ái, thư thái và tinh tế" },
    ],
    smoothModes: [
      { id: "ultra", name: "Siêu mượt (Ultra Smooth)", desc: "Cosine crossfade, smoothstep camera ease, chuyển mềm" },
      { id: "natural", name: "Tự nhiên (Natural)", desc: "Giữ nhịp thở tự nhiên, chống cắt cụt chữ" },
      { id: "snappy", name: "Dứt khoát (Snappy)", desc: "Nhịp cắt nhanh chuẩn short-form TikTok" },
    ],
    transitions: [
      { id: "zoom_blur", name: "Zoom Blur (CapCut)", desc: "Phóng mờ gia tốc kịch tính" },
      { id: "flash_white", name: "White Flash (CapCut)", desc: "Chớp sáng trắng kịch tính" },
      { id: "glitch_rgb", name: "Glitch RGB (CapCut)", desc: "Nhiễu sắc sai công nghệ AI" },
      { id: "film_burn", name: "Film Burn (CapCut)", desc: "Cháy phim rò rỉ ánh sáng điện ảnh" },
      { id: "whip_left", name: "Whip Pan (CapCut)", desc: "Lướt quét góc nhìn chuyển nhanh" },
      { id: "smooth_blur", name: "Smooth Blur (CapCut)", desc: "Mờ quang học dịu mắt" },
      { id: "shake_impact", name: "Shake Impact (CapCut)", desc: "Rung chấn va đập mạnh mẽ" },
    ],
    capcutEffects: [
      { id: "none", name: "Gốc sắc nét", desc: "Không áp dụng filter màu" },
      { id: "luxury_gold", name: "Luxury Gold", desc: "Tương phản sâu, highlight ánh kim sang trọng" },
      { id: "retro_vhs", name: "Retro VHS Camcorder", desc: "Nhiễu scanline, màu hoài niệm thập niên 90" },
      { id: "cyberpunk_neon", name: "Cyberpunk Neon", desc: "Ánh lam ngọc & hồng neon công nghệ cao" },
      { id: "film_grain_35mm", name: "35mm Film Grain", desc: "Hạt phim điện ảnh Hollywood" },
      { id: "spotlight_focus", name: "Spotlight Focus", desc: "Tối viền tập trung chủ thể chính" },
    ],
  });
}

export async function POST(request: Request) {
  try {
    if (!fs.existsSync(SEECUT_DIR)) return NextResponse.json({ error: "SeeCut chưa được cài trên máy chủ. Cấu hình SEECUT_DIR và SEECUT_PYTHON." }, { status: 503 });
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const assetUrl = (formData.get("assetUrl") as string | null) || "";
    const preset = (formData.get("preset") as string) || "tiktok";
    const style = (formData.get("style") as string) || "viral";
    const font = (formData.get("font") as string) || "montserrat";
    const smooth = (formData.get("smooth") as string) || "ultra";
    const transition = (formData.get("transition") as string) || "zoom_blur";
    const capcutEffect = (formData.get("capcutEffect") as string) || "";
    const title = (formData.get("title") as string) || "";
    const language = (formData.get("language") as string) || "";
    const karaoke = formData.get("karaoke") !== "0" && formData.get("karaoke") !== "false";
    const evidence = formData.get("evidence") !== "0" && formData.get("evidence") !== "false";
    const music = formData.get("music") !== "0" && formData.get("music") !== "false";
    const gemini = formData.get("gemini") !== "0" && formData.get("gemini") !== "false";
    const projectId = (formData.get("projectId") as string | null) || "_library";

    const jobId = `sc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    const jobDir = path.join(JOBS_DIR, jobId);
    fs.mkdirSync(jobDir, { recursive: true });

    let inputPath = path.join(jobDir, "input.mp4");
    let inputName = "video.mp4";

    if (file && file.size > 0) {
      inputName = file.name || "video.mp4";
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(inputPath, buffer);
    } else if (assetUrl) {
      // Resolve asset from Hinton Studio storage
      const match = assetUrl.match(/\/api\/files\/([^/]+)\/(.+)$/);
      if (match) {
        const pId = decodeURIComponent(match[1]).replace(/[^a-zA-Z0-9_-]/g, "");
        const fName = path.basename(decodeURIComponent(match[2]));
        const localPath = path.join(ASSET_DIR, pId, fName);
        if (fs.existsSync(localPath)) {
          fs.copyFileSync(localPath, inputPath);
          inputName = fName;
        } else {
          return NextResponse.json({ error: "Không tìm thấy file nguồn trong thư viện." }, { status: 404 });
        }
      } else {
        return NextResponse.json({ error: "URL video không hợp lệ." }, { status: 400 });
      }
    } else {
      return NextResponse.json({ error: "Vui lòng chọn hoặc tải lên một video." }, { status: 400 });
    }

    // Save B-roll files if any
    const brollDir = path.join(jobDir, "broll");
    fs.mkdirSync(brollDir, { recursive: true });
    const brollFiles = formData.getAll("broll") as File[];
    for (const bf of brollFiles) {
      if (bf && bf.size > 0 && bf.name) {
        const bBuffer = Buffer.from(await bf.arrayBuffer());
        fs.writeFileSync(path.join(brollDir, bf.name.replace(/[^a-zA-Z0-9._-]/g, "_")), bBuffer);
      }
    }

    const outputPath = path.join(jobDir, "output.mp4");
    const workdir = path.join(jobDir, "work");

    const jobRecord: SeeCutJob = {
      id: jobId,
      status: "running",
      startedAt: Date.now(),
      log: [`[SeeCut] Khởi tạo job ${jobId}`, `[SeeCut] Style: ${style} · Font: ${font} · Smooth: ${smooth}`],
      inputName,
      inputUrl: `/api/seecut/files/${jobId}/input.mp4`,
      workdir,
      outputPath,
    };

    jobsMap.set(jobId, jobRecord);

    // Build SeeCut CLI arguments
    const args = [
      "-m", "seecut.cli", "edit",
      inputPath,
      "-o", outputPath,
      "--preset", preset,
      "--style", style,
      "--font", font,
      "--smooth", smooth,
      "--workdir", workdir,
    ];

    if (karaoke) args.push("--karaoke");
    if (!evidence) args.push("--no-evidence");
    if (transition && transition !== "none") args.push("--transition", transition);
    if (capcutEffect && capcutEffect !== "none") args.push("--capcut-effect", capcutEffect);
    if (title.trim()) args.push("--title", title.trim());
    if (language.trim()) args.push("--language", language.trim());
    if (!music) args.push("--no-music");
    if (!gemini) args.push("--no-gemini");

    if (fs.existsSync(brollDir) && fs.readdirSync(brollDir).length > 0) {
      args.push("--broll-dir", brollDir);
    }

    jobRecord.log.push(`[SeeCut] Lệnh: python ${args.join(" ")}`);

    // Run Python process in background
    const child = spawn(PYTHON_PATH, args, {
      cwd: SEECUT_DIR,
      env: {
        ...process.env,
        PYTHONUNBUFFERED: "1",
      },
    });

    child.stdout.on("data", (data) => {
      const text = data.toString("utf-8").trim();
      if (text) {
        for (const line of text.split("\n")) {
          const l = line.trim();
          if (l) jobRecord.log.push(l);
        }
      }
    });

    child.stderr.on("data", (data) => {
      const text = data.toString("utf-8").trim();
      if (text) {
        for (const line of text.split("\n")) {
          const l = line.trim();
          if (l) jobRecord.log.push(l);
        }
      }
    });

    child.on("close", (code) => {
      jobRecord.endedAt = Date.now();
      const elapsed = ((jobRecord.endedAt - jobRecord.startedAt) / 1000).toFixed(1);

      if (code === 0 && fs.existsSync(outputPath)) {
        jobRecord.status = "done";
        jobRecord.log.push(`[SeeCut] Hoàn tất xuất sắc trong ${elapsed}s! ✅`);
        jobRecord.resultUrl = `/api/seecut/files/${jobId}/output.mp4`;

        // Save into Hinton Studio library
        try {
          const videoBuffer = fs.readFileSync(outputPath);
          const assetName = `SeeCut - ${title ? title.trim() : inputName}`;
          const saved = saveAsset({
            projectId: projectId === "_library" ? null : projectId,
            name: assetName,
            buffer: videoBuffer,
            mime: "video/mp4",
            meta: {
              source: "seecut",
              style,
              font,
              smooth,
              evidence,
              jobId,
            },
          });
          jobRecord.asset = saved;
          jobRecord.log.push(`[SeeCut] Đã lưu vào Thư viện Hinton Studio: ${saved.name}`);
        } catch (err) {
          jobRecord.log.push(`[Cảnh báo] Lỗi lưu asset vào thư viện: ${err}`);
        }

        // Try reading plan.json
        const planPath = path.join(workdir, "plan.json");
        if (fs.existsSync(planPath)) {
          try {
            jobRecord.plan = JSON.parse(fs.readFileSync(planPath, "utf-8"));
          } catch {
            // ignore JSON parse error
          }
        }
      } else {
        jobRecord.status = "error";
        jobRecord.error = `Quá trình SeeCut kết thúc với mã lỗi ${code}`;
        jobRecord.log.push(`[SeeCut] Lỗi: ${jobRecord.error}`);
      }

      // Persist job info to disk
      try {
        fs.writeFileSync(path.join(jobDir, "job.json"), JSON.stringify(jobRecord, null, 2));
      } catch {}
    });

    return NextResponse.json({ id: jobId });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Không thể bắt đầu job SeeCut: ${message}` }, { status: 500 });
  }
}
