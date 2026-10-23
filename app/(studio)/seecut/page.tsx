"use client";

import { withBasePath } from "@/lib/base-path";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Award,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clapperboard,
  Clock,
  Download,
  FileCheck2,
  FileText,
  Film,
  FolderOpen,
  Layers,
  Loader2,
  Maximize2,
  Minimize2,
  Music,
  Play,
  Plus,
  RefreshCw,
  Scissors,
  Sliders,
  Sparkles,
  Subtitles,
  Trash2,
  Type,
  Upload,
  Video,
  Volume2,
  Wand2,
} from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api-client";
import { useUi } from "@/lib/ui-store";
import { useStudio } from "@/lib/studio-store";
import type { Asset } from "@/lib/types";
import { Badge, Button, Field, Input, Select, Spinner } from "@/components/ui/primitives";

interface CustomEvidenceItem {
  id: string;
  badge: string;
  claim: string;
  source: string;
}

interface TranscriptSegment {
  id: number;
  start: number;
  end: number;
  duration: number;
  text: string;
  status: "cut" | "keep";
  reason: string;
}

const STYLE_OPTIONS = [
  {
    id: "viral",
    name: "Viral TikTok 🔥",
    badge: "Phổ biến",
    desc: "Cắt nhanh ~1.7s, punch zoom, chữ nảy đàn hồi, chuyển cảnh flash, nhạc sôi động",
    accent: "from-amber-500/20 to-rose-500/20 border-amber-500/40 text-amber-300",
  },
  {
    id: "luxury",
    name: "Luxury Gold ✨",
    badge: "Sang trọng",
    desc: "Ánh kim vàng cao cấp, serif thời trang, chuyển mượt mà, drop shadow điện ảnh",
    accent: "from-yellow-500/20 to-amber-600/20 border-yellow-500/40 text-yellow-300",
  },
  {
    id: "cinematic",
    name: "Điện ảnh 35mm 🎬",
    badge: "Mượt mà",
    desc: "Tone màu ấm 35mm, chuyển cảnh mềm mượt, nhịp thở sâu, camera lướt nhẹ",
    accent: "from-blue-500/20 to-indigo-600/20 border-blue-500/40 text-blue-300",
  },
  {
    id: "editorial",
    name: "Tạp chí High-Fashion 📰",
    badge: "Editorial",
    desc: "Tối giản cao cấp, kiểu chữ Playfair thanh lịch, khung hình tinh xảo sắc nét",
    accent: "from-stone-500/20 to-zinc-600/20 border-stone-500/40 text-stone-200",
  },
  {
    id: "clean",
    name: "Gọn gàng & Khoa học 💎",
    badge: "Kiến thức",
    desc: "Nhịp vừa, tối ưu truyền đạt, thẻ dẫn chứng rõ ràng, hợp video kiến thức/tech",
    accent: "from-cyan-500/20 to-teal-600/20 border-cyan-500/40 text-cyan-300",
  },
  {
    id: "calm",
    name: "Thư thái & Chậm 🌙",
    badge: "Thư giãn",
    desc: "Cảnh dài, chuyển cảnh êm dịu, không giật cục, thư thái và bình yên",
    accent: "from-purple-500/20 to-violet-600/20 border-purple-500/40 text-purple-300",
  },
];

const FONT_OPTIONS = [
  { id: "montserrat", name: "Montserrat Black", tag: "Mạnh mẽ & Viral", sample: "NĂNG ĐỘNG BÙNG NỔ" },
  { id: "playfair", name: "Playfair Display", tag: "Tạp chí thời trang cao cấp", sample: "Thanh Lịch Quý Phái" },
  { id: "cinzel", name: "Cinzel Bold", tag: "Điện ảnh La Mã quyền lực", sample: "QUYỀN UY ĐIỆN ẢNH" },
  { id: "syne", name: "Syne ExtraBold", tag: "Phá cách nghệ thuật đương đại", sample: "SÁNG TẠO ĐỘT PHÁ" },
  { id: "vietnam", name: "Be Vietnam Pro", tag: "Chuẩn quốc tế & Cân đối", sample: "Cân Đối Hiện Đại" },
];

const SMOOTH_OPTIONS = [
  { id: "ultra", name: "Siêu mượt (Ultra Smooth)", desc: "Cosine crossfade, smoothstep camera ease, chuyển mềm" },
  { id: "natural", name: "Tự nhiên (Natural Breathing)", desc: "Giữ nhịp thở tự nhiên, chống cắt cụt âm đầu/cuối" },
  { id: "snappy", name: "Dứt khoát (Snappy Cuts)", desc: "Nhịp cắt nhanh dứt khoát chuẩn short-form TikTok" },
];

const TRANSITION_OPTIONS = [
  { id: "zoom_blur", name: "Zoom Blur ⚡", tag: "CapCut Iconic", desc: "Phóng mờ gia tốc kịch tính" },
  { id: "flash_white", name: "White Flash 💡", tag: "Lóe sáng", desc: "Chớp trắng tạo điểm nhấn thị giác" },
  { id: "glitch_rgb", name: "Glitch RGB 👾", tag: "Sci-Fi / Tech", desc: "Nhiễu sắc sai công nghệ AI" },
  { id: "film_burn", name: "Film Burn 🔥", tag: "Cháy phim", desc: "Rò rỉ ánh sáng điện ảnh retro" },
  { id: "whip_left", name: "Whip Pan 💨", tag: "Lướt quét", desc: "Gạt góc nhìn chuyển nhanh" },
  { id: "smooth_blur", name: "Smooth Blur 🌸", tag: "Mềm mại", desc: "Mờ quang học êm ái dịu mắt" },
  { id: "shake_impact", name: "Shake Impact 💥", tag: "Va đập", desc: "Rung chấn nhấn mạnh từ khóa" },
];

const CAPCUT_EFFECT_OPTIONS = [
  { id: "none", name: "Gốc sắc nét", desc: "Không áp dụng filter màu" },
  { id: "luxury_gold", name: "Luxury Gold ✨", desc: "Tương phản sâu, highlight ánh kim sang trọng" },
  { id: "retro_vhs", name: "Retro VHS 📼", desc: "Nhiễu scanline, màu hoài niệm thập niên 90" },
  { id: "cyberpunk_neon", name: "Cyberpunk Neon 🔮", desc: "Ánh lam ngọc & hồng neon công nghệ cao" },
  { id: "film_grain_35mm", name: "35mm Film Grain 🎞️", desc: "Hạt phim điện ảnh Hollywood" },
  { id: "spotlight_focus", name: "Spotlight Focus 🔦", desc: "Tối viền tập trung chủ thể chính" },
];

const PRESET_OPTIONS = [
  { id: "auto", label: "⚡ Tự động theo video gốc (16:9 hoặc 9:16)" },
  { id: "youtube", label: "🎬 YouTube Ngang 16:9 (1920×1080)" },
  { id: "tiktok", label: "📱 TikTok Dọc 9:16 (1080×1920)" },
  { id: "shorts", label: "⚡ YouTube Shorts 9:16" },
  { id: "reels", label: "✨ Instagram Reels 9:16" },
];

const STEPS = [
  { tag: "[1/7]", label: "Phân tích video & bối cảnh âm thanh" },
  { tag: "[2/7]", label: "Tìm nói lặp, lọc & cắt câu từ lỗi" },
  { tag: "[3/7]", label: "Chép lời chính xác & phụ đề Karaoke" },
  { tag: "[4/7]", label: "Não AI lập kế hoạch dẫn chứng" },
  { tag: "[5/7]", label: "Cắt cảnh cho mượt hơn đổi khung 16:9 / 9:16" },
  { tag: "[6/7]", label: "Render nghệ thuật + Chèn B-roll" },
  { tag: "[7/7]", label: "Hoàn tất và cho phép xuất video" },
];

export default function SeeCutEditorPage() {
  const { toast } = useUi();
  const currentProject = useStudio((s) => s.project);

  // Input states
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedAssetUrl, setSelectedAssetUrl] = useState<string>("");
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string>("");
  const [showLibraryModal, setShowLibraryModal] = useState(false);
  const [libraryAssets, setLibraryAssets] = useState<Asset[]>([]);

  // Config states
  const [preset, setPreset] = useState("auto");
  const [style, setStyle] = useState("viral");
  const [font, setFont] = useState("montserrat");
  const [smooth, setSmooth] = useState("ultra");
  const [transition, setTransition] = useState("zoom_blur");
  const [capcutEffect, setCapcutEffect] = useState("none");
  const [exportingCapcut, setExportingCapcut] = useState(false);
  const [capcutMessage, setCapcutMessage] = useState<string | null>(null);
  const [title, setTitle] = useState("");
  const [karaoke, setKaraoke] = useState(true);
  const [music, setMusic] = useState(true);
  const [gemini, setGemini] = useState(true);
  const [evidenceMode, setEvidenceMode] = useState(true);
  const [customEvidence, setCustomEvidence] = useState<CustomEvidenceItem[]>([
    {
      id: "ev-1",
      badge: "SỐ LIỆU CHỨNG MINH",
      claim: "TĂNG TRƯỞNG ĐỘT PHÁ NĂM 2026",
      source: "Báo cáo Nghiên cứu AI",
    },
  ]);

  // B-roll files
  const [brollFiles, setBrollFiles] = useState<File[]>([]);

  // Job & Execution states
  const [jobId, setJobId] = useState<string | null>(null);
  const [jobStatus, setJobStatus] = useState<"idle" | "running" | "done" | "error">("idle");
  const [elapsed, setElapsed] = useState(0);
  const [logs, setLogs] = useState<string>("");
  const [progressPercent, setProgressPercent] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [resultVideoUrl, setResultVideoUrl] = useState<string | null>(null);
  const [savedAsset, setSavedAsset] = useState<Asset | null>(null);
  const [planData, setPlanData] = useState<Record<string, unknown> | null>(null);
  const [showSegments, setShowSegments] = useState(true);
  const [advancedOpen, setAdvancedOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const brollInputRef = useRef<HTMLInputElement>(null);
  const logContainerRef = useRef<HTMLPreElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load library assets
  useEffect(() => {
    fetch(withBasePath("/api/assets"))
      .then((res) => (res.ok ? res.json() : []))
      .then((items: Asset[]) => {
        const videos = items.filter((a) => a.kind === "video");
        setLibraryAssets(videos);
      })
      .catch(() => {});
  }, []);

  // Handle local file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setSelectedFile(f);
      setSelectedAssetUrl("");
      const url = URL.createObjectURL(f);
      setVideoPreviewUrl(url);
    }
  };

  // Handle asset pick from library
  const handlePickAsset = (asset: Asset) => {
    setSelectedAssetUrl(asset.url);
    setSelectedFile(null);
    setVideoPreviewUrl(asset.url);
    setShowLibraryModal(false);
    toast(`Đã chọn video: ${asset.name}`);
  };

  // Handle custom evidence items
  const addEvidenceItem = () => {
    setCustomEvidence((prev) => [
      ...prev,
      {
        id: `ev-${Date.now()}`,
        badge: "DẪN CHỨNG XÁC THỰC",
        claim: "SỰ THẬT ĐÃ ĐƯỢC KIỂM CHỨNG",
        source: "Nguồn chính thức",
      },
    ]);
  };

  const removeEvidenceItem = (id: string) => {
    setCustomEvidence((prev) => prev.filter((item) => item.id !== id));
  };

  const updateEvidenceItem = (id: string, field: keyof CustomEvidenceItem, value: string) => {
    setCustomEvidence((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // Start SeeCut Job
  const handleStartEdit = async () => {
    if (!selectedFile && !selectedAssetUrl) {
      toast("Vui lòng chọn hoặc tải lên một video trước.", "error");
      return;
    }

    setJobStatus("running");
    setErrorMessage(null);
    setLogs("[SeeCut] Đang chuẩn bị dữ liệu và gửi yêu cầu tới server...\n");
    setProgressPercent(5);
    setCurrentStepIndex(0);
    setResultVideoUrl(null);
    setSavedAsset(null);
    setPlanData(null);

    const formData = new FormData();
    if (selectedFile) {
      formData.append("file", selectedFile);
    } else {
      formData.append("assetUrl", selectedAssetUrl);
    }

    formData.append("preset", preset);
    formData.append("style", style);
    formData.append("font", font);
    formData.append("smooth", smooth);
    formData.append("transition", transition);
    formData.append("capcutEffect", capcutEffect);
    formData.append("title", title);
    formData.append("karaoke", karaoke ? "1" : "0");
    formData.append("music", music ? "1" : "0");
    formData.append("gemini", gemini ? "1" : "0");
    formData.append("evidence", evidenceMode ? "1" : "0");
    formData.append("custom_evidence", JSON.stringify(customEvidence));
    if (currentProject?.id) {
      formData.append("projectId", currentProject.id);
    }

    for (const bf of brollFiles) {
      formData.append("broll", bf);
    }

    try {
      const res = await api.seecut.start(formData);
      setJobId(res.id);
      startPolling(res.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setJobStatus("error");
      setErrorMessage(msg);
      toast(`Lỗi khởi động: ${msg}`, "error");
    }
  };

  // Export directly to CapCut Desktop
  const handleExportCapCut = async () => {
    if (!jobId) return;
    setExportingCapcut(true);
    setCapcutMessage(null);
    try {
      const res = await fetch(withBasePath("/api/seecut/capcut-export"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, projectName: selectedFile?.name || "SeeCut Video" }),
      });
      const data = await res.json();
      if (data.success) {
        toast("Đã xuất vào CapCut Desktop thành công! Mở CapCut PC để xem dự án.");
        setCapcutMessage(data.message);
      } else {
        toast(data.error || "Lỗi khi xuất CapCut", "error");
      }
    } catch (err: unknown) {
      toast(String(err), "error");
    } finally {
      setExportingCapcut(false);
    }
  };

  // Poll Job Status
  const startPolling = (id: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    pollTimerRef.current = setInterval(async () => {
      try {
        const info = await api.seecut.status(id);
        setElapsed(info.elapsed);
        setLogs(info.log || "");

        // Compute step progress from logs
        let calculatedProgress = 10;
        let stepIdx = 0;
        STEPS.forEach((step, idx) => {
          if (info.log && info.log.includes(step.tag)) {
            stepIdx = idx;
            calculatedProgress = Math.min(95, Math.round(((idx + 1) / STEPS.length) * 100));
          }
        });
        setCurrentStepIndex(stepIdx);
        setProgressPercent(info.status === "done" ? 100 : calculatedProgress);

        if (logContainerRef.current) {
          logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
        }

        if (info.status === "done") {
          clearInterval(pollTimerRef.current!);
          setJobStatus("done");
          setProgressPercent(100);
          setResultVideoUrl(info.resultUrl || null);
          setSavedAsset(info.asset || null);
          setPlanData(info.plan || null);
          toast("Biên tập SeeCut hoàn tất xuất sắc!", "success");
        } else if (info.status === "error") {
          clearInterval(pollTimerRef.current!);
          setJobStatus("error");
          setErrorMessage(info.error || "Có lỗi xảy ra trong quá trình xử lý.");
          toast("Quá trình biên tập gặp lỗi.", "error");
        }
      } catch {
        // ignore intermittent network hiccups
      }
    }, 1500);
  };

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, []);

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-ink-950 p-6 text-ink-100">
      {/* Top Header */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 border-b border-ink-800/80 pb-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brass-400 to-amber-600 text-ink-950 shadow-lg shadow-brass-500/20">
            <Scissors size={22} strokeWidth={2.4} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight text-ink-50">SeeCut AI Video Editor</h1>
              <span className="rounded-full border border-brass-400/40 bg-brass-400/10 px-2.5 py-0.5 text-[11px] font-semibold text-brass-300">
                Ultra Smooth &amp; Typography
              </span>
            </div>
            <p className="text-[13px] text-ink-400">
              Trình biên tập video tự động: cắt cảnh mượt mà, phân tích dẫn chứng, hiệu ứng chữ và phông nghệ thuật.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {jobStatus === "running" ? (
            <div className="flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-medium text-amber-300">
              <Spinner size={14} />
              Đang biên tập… ({elapsed}s)
            </div>
          ) : (
            <Button
              variant="primary"
              size="md"
              onClick={handleStartEdit}
              disabled={!selectedFile && !selectedAssetUrl}
              className="px-5 shadow-lg shadow-brass-500/20"
            >
              <Scissors size={15} strokeWidth={2.2} />
              Bắt đầu Edit Video
            </Button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Config / Right Preview & Logs */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Input + Controls (7 cols) */}
        <div className="space-y-6 lg:col-span-7">
          {/* Section 1: Video Input */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                1 · Chọn Video Cần Edit
              </span>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowLibraryModal(true)}
                  className="h-7 text-xs"
                >
                  <FolderOpen size={13} />
                  Chọn từ Thư viện
                </Button>
              </div>
            </div>

            <div
              onClick={() => fileInputRef.current?.click()}
              className={clsx(
                "group relative flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-6 text-center transition",
                selectedFile || selectedAssetUrl
                  ? "border-brass-500/60 bg-brass-500/5 hover:border-brass-400"
                  : "border-ink-700 hover:border-ink-500 hover:bg-ink-800/40"
              )}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="video/*"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-ink-800 text-brass-400 transition group-hover:scale-110">
                {selectedFile || selectedAssetUrl ? <Film size={22} /> : <Upload size={22} />}
              </div>
              {selectedFile ? (
                <div>
                  <p className="text-sm font-semibold text-brass-300">{selectedFile.name}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {(selectedFile.size / 1024 / 1024).toFixed(1)} MB · Nhấp để đổi file khác
                  </p>
                </div>
              ) : selectedAssetUrl ? (
                <div>
                  <p className="text-sm font-semibold text-brass-300">Đã chọn video từ thư viện</p>
                  <p className="mt-1 text-xs text-ink-400">{selectedAssetUrl}</p>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-ink-200">Kéo thả file video hoặc nhấp để tải lên</p>
                  <p className="mt-1 text-xs text-ink-500">Hỗ trợ MP4, MOV, WebM (chất lượng HD/4K)</p>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Style Selection */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-ink-400">
              2 · Phong Cách Dựng &amp; Cắt Cảnh
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
              {STYLE_OPTIONS.map((st) => {
                const active = style === st.id;
                return (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => setStyle(st.id)}
                    className={clsx(
                      "flex flex-col justify-between rounded-xl border p-3.5 text-left transition",
                      active
                        ? "border-brass-400 bg-brass-400/10 shadow-[0_0_15px_rgba(230,175,46,0.15)] ring-1 ring-brass-400"
                        : "border-ink-800 bg-ink-850/60 hover:border-ink-700 hover:bg-ink-800/50"
                    )}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-[13px] font-semibold text-ink-100">{st.name}</span>
                        <span className="rounded bg-ink-750 px-1.5 py-0.5 text-[10px] text-ink-400">
                          {st.badge}
                        </span>
                      </div>
                      <p className="mt-1.5 text-[11.5px] leading-relaxed text-ink-400">{st.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 3: Artistic Fonts & Typography */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                3 · Phông Chữ Nghệ Thuật &amp; Typography
              </span>
              <span className="rounded border border-ink-700 bg-ink-800 px-2 py-0.5 text-[10px] text-brass-300">
                Hỗ trợ 100% Tiếng Việt có dấu
              </span>
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {FONT_OPTIONS.map((f) => {
                const active = font === f.id;
                return (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFont(f.id)}
                    className={clsx(
                      "flex items-center justify-between rounded-xl border p-3 text-left transition",
                      active
                        ? "border-brass-400 bg-brass-400/10 ring-1 ring-brass-400"
                        : "border-ink-800 bg-ink-850/60 hover:border-ink-700 hover:bg-ink-800/50"
                    )}
                  >
                    <div>
                      <p className="text-[13px] font-semibold text-ink-100">{f.name}</p>
                      <p className="text-[11px] text-ink-400">{f.tag}</p>
                    </div>
                    <div className="rounded border border-ink-700/60 bg-ink-800 px-2 py-1 text-right text-[11px] font-bold text-brass-300">
                      {f.sample}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 4: CapCut Transitions (Hiệu Ứng Chuyển Cảnh CapCut) */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                4 · Hiệu Ứng Chuyển Cảnh CapCut (Transitions Engine)
              </span>
              <span className="rounded border border-indigo-500/40 bg-indigo-500/10 px-2 py-0.5 text-[10px] font-medium text-indigo-300">
                CapCut &amp; JianYing Draft Library
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {TRANSITION_OPTIONS.map((tr) => {
                const active = transition === tr.id;
                return (
                  <button
                    key={tr.id}
                    type="button"
                    onClick={() => setTransition(tr.id)}
                    className={clsx(
                      "rounded-xl border p-2.5 text-left transition",
                      active
                        ? "border-brass-400 bg-brass-400/10 ring-1 ring-brass-400"
                        : "border-ink-800 bg-ink-850/60 hover:border-ink-700 hover:bg-ink-800/50"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[12px] font-semibold text-ink-100">{tr.name}</span>
                      <span className="text-[9.5px] text-ink-400">{tr.tag}</span>
                    </div>
                    <p className="mt-1 line-clamp-1 text-[10.5px] text-ink-400">{tr.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 5: CapCut Visual Atmospheres & Overlays */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                5 · Lớp Phủ Hiệu Ứng &amp; Màu Sắc (Visual Atmospheres)
              </span>
              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                Color Grade &amp; Film Grain
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {CAPCUT_EFFECT_OPTIONS.map((fx) => {
                const active = capcutEffect === fx.id;
                return (
                  <button
                    key={fx.id}
                    type="button"
                    onClick={() => setCapcutEffect(fx.id)}
                    className={clsx(
                      "rounded-xl border p-2.5 text-left transition",
                      active
                        ? "border-brass-400 bg-brass-400/10 ring-1 ring-brass-400"
                        : "border-ink-800 bg-ink-850/60 hover:border-ink-700 hover:bg-ink-800/50"
                    )}
                  >
                    <span className="text-[12px] font-semibold text-ink-100">{fx.name}</span>
                    <p className="mt-1 line-clamp-1 text-[10.5px] text-ink-400">{fx.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 6: Smoothness & Transitions */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-ink-400">
              6 · Độ Mượt Mà Cắt Nối (Smooth Editing)
            </span>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              {SMOOTH_OPTIONS.map((sm) => {
                const active = smooth === sm.id;
                return (
                  <button
                    key={sm.id}
                    type="button"
                    onClick={() => setSmooth(sm.id)}
                    className={clsx(
                      "rounded-xl border p-3 text-left transition",
                      active
                        ? "border-brass-400 bg-brass-400/10 ring-1 ring-brass-400"
                        : "border-ink-800 bg-ink-850/60 hover:border-ink-700 hover:bg-ink-800/50"
                    )}
                  >
                    <span className="text-[13px] font-semibold text-ink-100">{sm.name}</span>
                    <p className="mt-1 text-[11px] leading-relaxed text-ink-400">{sm.desc}</p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Section 7: Evidence & Proof Scenes (Cảnh Làm Dẫn Chứng & Đồ Họa Bento) */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                  7 · Đồ Họa Thị Giác &amp; Dẫn Chứng (Bento, Mockups &amp; 3D Stickers)
                </span>
                <p className="mt-0.5 text-[12px] text-ink-400">
                  Tự động chèn 5 loại thẻ đồ họa: Thẻ so sánh Bento, Mô phỏng Trình duyệt Safari, Checklist tính năng, Call-to-action &amp; Nhãn dán 3D.
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  <span className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-300">📊 Bento So Sánh</span>
                  <span className="rounded border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-medium text-cyan-300">🖥️ Browser Safari Mockup</span>
                  <span className="rounded border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-300">📋 Feature Checklist</span>
                  <span className="rounded border border-rose-500/30 bg-rose-500/10 px-2 py-0.5 text-[10px] font-medium text-rose-300">📞 Call To Action</span>
                  <span className="rounded border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-[10px] font-medium text-purple-300">🤖 16+ 3D Emoji Stickers</span>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={evidenceMode}
                  onChange={(e) => setEvidenceMode(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ink-700 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-brass-500 peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>

            {evidenceMode && (
              <div className="mt-4 space-y-3 rounded-lg border border-ink-800 bg-ink-950/70 p-3.5">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] font-medium text-brass-300">
                    Thẻ Dẫn Chứng Tùy Biến ({customEvidence.length})
                  </span>
                  <Button size="sm" variant="outline" onClick={addEvidenceItem} className="h-6 text-[11px]">
                    <Plus size={12} />
                    Thêm dẫn chứng
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {customEvidence.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-2 rounded-lg border border-ink-750 bg-ink-850 p-2.5"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded bg-ink-700 text-[10px] font-bold text-ink-300">
                        {idx + 1}
                      </span>
                      <Input
                        value={item.badge}
                        onChange={(e) => updateEvidenceItem(item.id, "badge", e.target.value)}
                        placeholder="Tag (VD: SỐ LIỆU XÁC THỰC)"
                        className="h-8 text-xs font-semibold text-brass-400"
                      />
                      <Input
                        value={item.claim}
                        onChange={(e) => updateEvidenceItem(item.id, "claim", e.target.value)}
                        placeholder="Nội dung luận điểm/số liệu chính"
                        className="h-8 flex-1 text-xs"
                      />
                      <Input
                        value={item.source}
                        onChange={(e) => updateEvidenceItem(item.id, "source", e.target.value)}
                        placeholder="Nguồn trích dẫn (VD: Báo cáo OpenAI)"
                        className="h-8 text-xs text-ink-400"
                      />
                      <button
                        type="button"
                        onClick={() => removeEvidenceItem(item.id)}
                        className="text-ink-400 transition hover:text-red-400"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Advanced Options (Collapsible) */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-4">
            <button
              type="button"
              onClick={() => setAdvancedOpen(!advancedOpen)}
              className="flex w-full items-center justify-between text-xs font-semibold uppercase tracking-wider text-ink-400"
            >
              <span>6 · Tùy Chọn Nâng Cao &amp; Khung Hình</span>
              {advancedOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>

            {advancedOpen && (
              <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Khung hình">
                  <Select value={preset} onChange={(e) => setPreset(e.target.value)}>
                    {PRESET_OPTIONS.map((opt) => (
                      <option key={opt.id} value={opt.id}>
                        {opt.label}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Tiêu đề Hook mở đầu (để trống = AI tự tạo)">
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="VD: 3 BÍ QUYẾT EDIT VIDEO TRIỆU VIEW"
                  />
                </Field>

                <div className="space-y-2 sm:col-span-2">
                  <label className="flex items-center gap-2 text-xs text-ink-300">
                    <input
                      type="checkbox"
                      checked={karaoke}
                      onChange={(e) => setKaraoke(e.target.checked)}
                      className="rounded border-ink-700 bg-ink-800"
                    />
                    Phụ đề Karaoke nghệ thuật (Tô vàng từ đang nói + Phóng to từ khóa)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink-300">
                    <input
                      type="checkbox"
                      checked={music}
                      onChange={(e) => setMusic(e.target.checked)}
                      className="rounded border-ink-700 bg-ink-800"
                    />
                    Nhạc nền tự động căn nhịp + Hiệu ứng âm thanh SFX (Whoosh, Ding, Impact)
                  </label>
                  <label className="flex items-center gap-2 text-xs text-ink-300">
                    <input
                      type="checkbox"
                      checked={gemini}
                      onChange={(e) => setGemini(e.target.checked)}
                      className="rounded border-ink-700 bg-ink-800"
                    />
                    Gemini AI Vision xem toàn bộ clip &amp; phân tích từng cảnh
                  </label>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Preview Player & Live Terminal (5 cols) */}
        <div className="space-y-6 lg:col-span-5">
          {/* Video Comparison / Preview */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <span className="mb-3 block text-xs font-semibold uppercase tracking-wider text-ink-400">
              Trình Xem Trước Video (Player)
            </span>

            {resultVideoUrl ? (
              <div className="space-y-3">
                <div className="relative overflow-hidden rounded-xl border border-brass-500/40 bg-black shadow-2xl">
                  <video
                    src={withBasePath(resultVideoUrl)}
                    controls
                    autoPlay
                    playsInline
                    className="max-h-[460px] w-full object-contain"
                  />
                  <div className="absolute right-3 top-3 rounded-md bg-brass-500/90 px-2 py-1 text-[11px] font-bold text-ink-950 backdrop-blur-sm">
                    ĐÃ EDIT XONG
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={withBasePath(resultVideoUrl)}
                      download="seecut-edited.mp4"
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-brass-500 py-2.5 text-xs font-semibold text-ink-950 transition hover:bg-brass-400"
                    >
                      <Download size={14} />
                      Tải Video Đã Edit
                    </a>
                    <button
                      type="button"
                      disabled={exportingCapcut}
                      onClick={handleExportCapCut}
                      className="flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-indigo-500/40 bg-indigo-500/10 py-2.5 text-xs font-semibold text-indigo-300 transition hover:bg-indigo-500/20 disabled:opacity-50"
                    >
                      <Scissors size={14} />
                      {exportingCapcut ? "Đang xuất CapCut..." : "Đẩy vào CapCut Desktop"}
                    </button>
                  </div>
                  {capcutMessage && (
                    <p className="rounded-md border border-indigo-500/30 bg-indigo-950/40 px-3 py-1.5 text-[11.5px] text-indigo-200">
                      ✂️ {capcutMessage}
                    </p>
                  )}
                  {savedAsset && (
                    <span className="flex items-center gap-1 text-[11.5px] text-emerald-400">
                      <CheckCircle2 size={14} />
                      Đã lưu vào Thư viện: {savedAsset.name}
                    </span>
                  )}
                </div>
              </div>
            ) : videoPreviewUrl ? (
              <div className="relative overflow-hidden rounded-xl border border-ink-800 bg-black">
                <video
                  src={withBasePath(videoPreviewUrl)}
                  controls
                  playsInline
                  className="max-h-[380px] w-full object-contain"
                />
                <div className="absolute left-3 top-3 rounded-md bg-ink-900/80 px-2 py-1 text-[11px] text-ink-300 backdrop-blur-sm">
                  Video gốc
                </div>
              </div>
            ) : (
              <div className="flex h-56 flex-col items-center justify-center rounded-xl border border-ink-800/80 bg-ink-950/60 p-6 text-center text-ink-500">
                <Video size={36} strokeWidth={1.5} className="mb-2 text-ink-600" />
                <p className="text-xs">Chưa có video được chọn</p>
                <p className="mt-1 text-[11px] text-ink-600">
                  Tải lên video bên trái để xem trước và biên tập
                </p>
              </div>
            )}
          </div>

          {/* Live Progress Tracker */}
          <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-5 backdrop-blur-sm">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-ink-400">
                Tiến Độ Xử Lý
              </span>
              <span className="text-xs font-bold text-brass-400">{progressPercent}%</span>
            </div>

            {/* Progress Bar */}
            <div className="mb-4 h-2 w-full overflow-hidden rounded-full bg-ink-800">
              <div
                className="h-full bg-gradient-to-r from-brass-500 via-amber-400 to-yellow-300 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Steps List */}
            <div className="space-y-1.5">
              {STEPS.map((st, idx) => {
                const isPassed = idx < currentStepIndex || jobStatus === "done";
                const isCurrent = idx === currentStepIndex && jobStatus === "running";
                return (
                  <div
                    key={st.tag}
                    className={clsx(
                      "flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-[12px] transition",
                      isCurrent && "bg-brass-500/10 font-semibold text-brass-300",
                      isPassed && "text-ink-300",
                      !isPassed && !isCurrent && "text-ink-600"
                    )}
                  >
                    {isPassed ? (
                      <Check size={13} className="text-emerald-400" />
                    ) : isCurrent ? (
                      <Spinner size={13} />
                    ) : (
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-700" />
                    )}
                    <span>
                      {st.tag} {st.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Live Terminal Log */}
          <div className="rounded-xl border border-ink-800 bg-ink-950 p-4">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[11px] font-mono uppercase tracking-wider text-ink-400">
                Terminal Output
              </span>
              {jobStatus === "running" && (
                <span className="flex items-center gap-1.5 text-[11px] text-amber-400">
                  <span className="h-2 w-2 animate-ping rounded-full bg-amber-400" />
                  Live
                </span>
              )}
            </div>
            <pre
              ref={logContainerRef}
              className="max-h-[220px] overflow-y-auto whitespace-pre-wrap font-mono text-[11px] leading-relaxed text-ink-300"
            >
              {logs || "// Đang chờ khởi động pipeline…"}
            </pre>
          </div>

          {/* AI Plan Summary Cards (When finished) */}
          {planData && (
            <div className="rounded-xl border border-ink-800 bg-ink-900/60 p-4 text-xs">
              <span className="mb-2 block font-semibold text-brass-300">
                AI Director Insights & Phân Tích Phụ Đề
              </span>
              {Boolean(planData.summary) && (
                <p className="mb-2 text-ink-300">
                  <span className="font-semibold text-ink-100">Tóm tắt:</span>{" "}
                  {String(planData.summary)}
                </p>
              )}
              {Array.isArray(planData.broll_placed) && planData.broll_placed.length > 0 && (
                <p className="mb-2 text-ink-400">
                  Đã chèn {planData.broll_placed.length} cảnh B-roll / Dẫn chứng khớp ngữ cảnh.
                </p>
              )}
              {Array.isArray(planData.transcript_segments) && planData.transcript_segments.length > 0 && (
                <div className="mt-3 border-t border-ink-800/80 pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-brass-300">
                      Phân tích phụ đề theo phân đoạn ({planData.transcript_segments.length} đoạn)
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowSegments((prev) => !prev)}
                      className="text-[11px] text-brass-400 hover:underline"
                    >
                      {showSegments ? "Thu gọn ▲" : "Xem chi tiết ▼"}
                    </button>
                  </div>
                  {showSegments && (
                    <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                      {(planData.transcript_segments as TranscriptSegment[]).map((seg) => (
                        <div
                          key={seg.id}
                          className={clsx(
                            "rounded-lg p-2 text-[11px] border transition",
                            seg.status === "cut"
                              ? "bg-rose-950/20 border-rose-900/40 text-rose-300"
                              : "bg-emerald-950/20 border-emerald-900/40 text-emerald-300"
                          )}
                        >
                          <div className="flex items-center justify-between font-mono text-[10px] opacity-80">
                            <span>#{seg.id + 1} ({seg.start}s - {seg.end}s)</span>
                            <span className={clsx(
                              "font-bold uppercase px-1.5 py-0.5 rounded text-[9px]",
                              seg.status === "cut" ? "bg-rose-900/60 text-rose-200" : "bg-emerald-900/60 text-emerald-200"
                            )}>
                              {seg.status === "cut" ? "Cắt bỏ" : "Giữ lại"}
                            </span>
                          </div>
                          <p className="mt-1 font-sans text-ink-100">{seg.text}</p>
                          <p className="mt-0.5 text-[10px] italic opacity-75">{seg.reason}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Library Picker Modal */}
      {showLibraryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="max-h-[80vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-ink-700 bg-ink-900 p-6 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink-50">Chọn Video từ Thư viện</h3>
              <Button size="sm" variant="ghost" onClick={() => setShowLibraryModal(false)}>
                Đóng
              </Button>
            </div>

            {libraryAssets.length === 0 ? (
              <p className="py-8 text-center text-xs text-ink-400">Chưa có video nào trong thư viện.</p>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {libraryAssets.map((asset) => (
                  <button
                    key={asset.id}
                    type="button"
                    onClick={() => handlePickAsset(asset)}
                    className="group flex flex-col items-center overflow-hidden rounded-xl border border-ink-800 bg-ink-850 p-2 text-left transition hover:border-brass-400"
                  >
                    <div className="flex h-24 w-full items-center justify-center rounded-lg bg-black">
                      <Film size={24} className="text-ink-500 group-hover:text-brass-400" />
                    </div>
                    <span className="mt-2 line-clamp-1 w-full text-xs font-medium text-ink-200">
                      {asset.name}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
