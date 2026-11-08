import os

voice_node_code = '''"use client";

import React, { memo, useRef, useState, useCallback, useEffect, useMemo } from "react";
import {
  Mic,
  Volume2,
  Play,
  Pause,
  Upload,
  Sparkles,
  Loader2,
  Square,
  Download,
  ShieldCheck,
  Zap,
  X,
  Music,
  FolderOpen,
  Radio,
  Disc,
  Waves,
  RefreshCw,
  Sliders,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { Handle, Position, useNodes, useEdges } from "@xyflow/react";
import { HANDLE_IN, HANDLE_OUT } from "./ports";
import { withBasePath } from "@/lib/base-path";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";

export const VoiceNode = memo(function VoiceNode({ id, data, selected }: { id: string; data: any; selected?: boolean }) {
  const { toast } = useUi();
  const project = useStudio((s) => s.project);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const refAudioRef = useRef<HTMLAudioElement | null>(null);

  const edges = useEdges();
  const nodes = useNodes();

  // Mode: "voice" (Lời thoại), "music" (Âm nhạc BGM), "sfx" (Tiếng động / SFX)
  const [mode, setMode] = useState<"voice" | "music" | "sfx">(data.audioKind || data.mode || "voice");

  // Output Audio
  const [audioUrl, setAudioUrl] = useState<string | undefined>(data.audioUrl || data.result?.url);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [promptText, setPromptText] = useState<string>(data.text || "");
  const [voice, setVoice] = useState<string>(data.voice || "hoai_my");
  const [speed, setSpeed] = useState<number>(data.speed !== undefined ? Number(data.speed) : 1.0);
  const [duration, setDuration] = useState<number>(data.duration !== undefined ? Number(data.duration) : 10);
  const [voiceDescription, setVoiceDescription] = useState<string>(data.voiceDescription || "");

  // Voice Sub-Tab: "clone" (Tự nhái giọng theo mẫu) vs "preset" (Giọng đọc sẵn)
  const [voiceSubTab, setVoiceSubTab] = useState<"clone" | "preset">(
    data.voiceSubTab || (data.referenceAudioUrl || data.voice?.includes("clone") ? "clone" : "clone")
  );
  const [cloneEngine, setCloneEngine] = useState<"elevenlabs" | "omnivoice">(data.cloneEngine || "elevenlabs");
  const [similarityBoost, setSimilarityBoost] = useState<number>(data.similarityBoost !== undefined ? Number(data.similarityBoost) : 0.88);

  // Expand / Collapse State (Double click toggles this)
  const [isExpanded, setIsExpanded] = useState<boolean>(() => !data.audioUrl && !data.result?.url);
  const [hasElevenKey, setHasElevenKey] = useState<boolean>(false);
  const [elevenVoices, setElevenVoices] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [elevenSub, setElevenSub] = useState<{ tier: string; canInstantClone: boolean; charCount: number; charLimit: number } | null>(null);
  const [isLoadingVoices, setIsLoadingVoices] = useState<boolean>(false);

  // Fetch Voice Information & ElevenLabs status
  const loadVoices = useCallback(async () => {
    setIsLoadingVoices(true);
    try {
      const res = await fetch("/api/audio/voices");
      const json = await res.json();
      if (json.ok && json.elevenlabs) {
        setHasElevenKey(json.elevenlabs.hasKey);
        setElevenVoices(json.elevenlabs.voices || []);
        setElevenSub({
          tier: json.elevenlabs.tier,
          canInstantClone: json.elevenlabs.canInstantClone,
          charCount: json.elevenlabs.characterCount,
          charLimit: json.elevenlabs.characterLimit,
        });
      }
    } catch (e) {
      console.warn("Failed to query voices", e);
    } finally {
      setIsLoadingVoices(false);
    }
  }, []);

  useEffect(() => {
    loadVoices();
  }, [loadVoices]);

  // Reference Audio (Input sample for voice cloning)
  const [referenceAudioUrl, setReferenceAudioUrl] = useState<string | undefined>(data.referenceAudioUrl);
  const [referenceAudioName, setReferenceAudioName] = useState<string | undefined>(data.referenceAudioName);
  const [isRefPlaying, setIsRefPlaying] = useState<boolean>(false);

  // Project Audio Picker State
  const [showAssetPicker, setShowAssetPicker] = useState<boolean>(false);
  const [projectAudios, setProjectAudios] = useState<{ id: string; name: string; url: string }[]>([]);
  const [isLoadingAudios, setIsLoadingAudios] = useState<boolean>(false);

  // Automatically detect incoming audio node connected via canvas wire
  const incomingAudio = useMemo(() => {
    const edge = edges.find((e) => e.target === id);
    if (!edge) return null;
    const srcNode = nodes.find((n) => n.id === edge.source);
    if (!srcNode) return null;
    const srcData = srcNode.data as any;
    const url = srcData?.audioUrl || (srcData?.result?.kind === "audio" ? srcData?.result?.url : undefined);
    if (url) {
      return {
        id: srcNode.id,
        name: srcData?.name || srcData?.text?.trim().slice(0, 18) || "Node trước",
        url,
      };
    }
    return null;
  }, [edges, nodes, id]);

  const effectiveRefUrl = referenceAudioUrl || incomingAudio?.url;
  const effectiveRefName = referenceAudioName || (incomingAudio ? `Dây nối: ${incomingAudio.name}` : undefined);
  const hasRefAudio = Boolean(effectiveRefUrl);

  // Cloned voices from ElevenLabs account
  const clonedVoicesList = useMemo(() => {
    return elevenVoices.filter((v) => v.category === "cloned" || v.category === "generated");
  }, [elevenVoices]);

  // Sync incoming text from parent nodes if available
  useEffect(() => {
    if (data.text && !promptText) {
      setPromptText(data.text);
    }
  }, [data.text, promptText]);

  // Update output audio element src when audioUrl changes
  useEffect(() => {
    if (audioUrl) {
      if (!audioRef.current) {
        audioRef.current = new Audio(withBasePath(audioUrl));
        audioRef.current.onended = () => setIsPlaying(false);
      } else {
        audioRef.current.src = withBasePath(audioUrl);
      }
    }
  }, [audioUrl]);

  const togglePlay = () => {
    if (!audioUrl) return;
    if (!audioRef.current) {
      audioRef.current = new Audio(withBasePath(audioUrl));
      audioRef.current.onended = () => setIsPlaying(false);
    }
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play().then(() => setIsPlaying(true)).catch((e) => {
        console.warn("Play audio failed", e);
        setIsPlaying(false);
      });
    }
  };

  const toggleRefPlay = () => {
    if (!effectiveRefUrl) return;
    if (!refAudioRef.current) {
      refAudioRef.current = new Audio(withBasePath(effectiveRefUrl));
      refAudioRef.current.onended = () => setIsRefPlaying(false);
    }
    if (isRefPlaying) {
      refAudioRef.current.pause();
      setIsRefPlaying(false);
    } else {
      refAudioRef.current.play().then(() => setIsRefPlaying(true)).catch(() => setIsRefPlaying(false));
    }
  };

  // Upload custom reference file
  const handleFileUpload = async (file: File) => {
    if (!project?.id) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("projectId", project.id);

    try {
      toast("Đang tải lên file âm thanh mẫu...", "default");
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.error || "Tải lên thất bại");

      setReferenceAudioUrl(resData.url);
      setReferenceAudioName(file.name);
      data.referenceAudioUrl = resData.url;
      data.referenceAudioName = file.name;
      setVoiceSubTab("clone");
      toast(`Đã nhận diện file mẫu: "${file.name}"`, "success");
    } catch (e: any) {
      toast("Lỗi tải file: " + (e.message || String(e)), "error");
    }
  };

  // Open asset picker to choose existing project audio
  const handleOpenAssetPicker = async () => {
    if (!project?.id) {
      toast("Dự án chưa sẵn sàng", "error");
      return;
    }
    setShowAssetPicker(true);
    setIsLoadingAudios(true);
    try {
      const res = await fetch(`/api/assets?projectId=${project.id}`);
      const list = await res.json();
      if (Array.isArray(list)) {
        const audios = list
          .filter((a: any) =>
            a.kind === "audio" ||
            a.mime?.startsWith("audio") ||
            a.url?.endsWith(".wav") ||
            a.url?.endsWith(".mp3")
          )
          .map((a: any) => ({
            id: a.id,
            name: a.name || a.url.split("/").pop(),
            url: a.url,
          }));
        setProjectAudios(audios);
      }
    } catch (e) {
      console.warn("Failed to fetch project audios", e);
    } finally {
      setIsLoadingAudios(false);
    }
  };

  const selectAssetAsReference = (asset: { name: string; url: string }) => {
    setReferenceAudioUrl(asset.url);
    setReferenceAudioName(asset.name);
    data.referenceAudioUrl = asset.url;
    data.referenceAudioName = asset.name;
    setVoiceSubTab("clone");
    setShowAssetPicker(false);
    toast(`Đã chọn mẫu tham chiếu: "${asset.name}"`, "success");
  };

  // Generate Handler for Voice / Music / SFX
  const handleGenerate = async () => {
    if (!promptText.trim()) {
      toast(
        mode === "voice"
          ? "Vui lòng nhập lời thoại nhân vật cần đọc"
          : mode === "music"
          ? "Vui lòng nhập mô tả phong cách âm nhạc cần tạo"
          : "Vui lòng nhập mô tả tiếng động cần tạo",
        "error"
      );
      return;
    }
    if (!project?.id) {
      toast("Dự án chưa sẵn sàng", "error");
      return;
    }

    setIsGenerating(true);
    try {
      if (mode === "voice") {
        const selectedVoice = voiceSubTab === "clone"
          ? (cloneEngine === "elevenlabs" ? "elevenlabs_clone" : "omnivoice_custom")
          : voice;

        const res = await fetch("/api/audio/tts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            text: promptText,
            voice: selectedVoice,
            speed,
            cloneEngine,
            similarityBoost,
            voiceDescription: voiceDescription.trim() || undefined,
            referenceAudio: effectiveRefUrl || (voiceSubTab === "clone" ? "/data/omnivoice/voice-lock-vn-v2.wav" : undefined),
          }),
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Tạo giọng nói thất bại");

        setAudioUrl(resData.url);
        data.audioUrl = resData.url;
        data.result = resData.asset;
        data.text = promptText;
        data.voice = selectedVoice;
        data.speed = speed;
        data.audioKind = "voice";

        toast(`Đã tạo âm thanh thành công (${resData.engine})!`, "success");
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = withBasePath(resData.url);
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }, 200);
      } else {
        // Music or SFX Generation
        const res = await fetch("/api/audio/generate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            projectId: project.id,
            prompt: promptText,
            kind: mode,
            duration,
          }),
        });

        const resData = await res.json();
        if (!res.ok) throw new Error(resData.error || "Tạo âm thanh thất bại");

        setAudioUrl(resData.url);
        data.audioUrl = resData.url;
        data.result = resData.asset;
        data.text = promptText;
        data.duration = duration;
        data.audioKind = mode;

        toast(`Đã tạo ${mode === "music" ? "âm nhạc" : "tiếng động"} thành công (${resData.engine})!`, "success");
        setTimeout(() => {
          if (audioRef.current) {
            audioRef.current.src = withBasePath(resData.url);
            audioRef.current.play().then(() => setIsPlaying(true)).catch(() => {});
          }
        }, 200);
      }
    } catch (e: any) {
      toast("Lỗi tạo âm thanh: " + (e.message || String(e)), "error");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button, input, select, textarea")) return;
    e.stopPropagation();
    setIsExpanded((prev) => !prev);
  }, []);

  return (
    <div
      onDoubleClick={handleDoubleClick}
      className={`group relative rounded-2xl bg-[#121216] border transition-all duration-150 ${
        selected ? "ring-1 ring-cyan-400/90 border-cyan-400/50 shadow-xl shadow-cyan-950/20" : "border-white/10 hover:border-white/20"
      }`}
      style={{ width: 295 }}
    >
      {/* Top Header Label */}
      <div className="pointer-events-none absolute -top-[26px] left-0 right-0 flex items-center justify-between text-[11px] font-medium text-neutral-400 select-none">
        <div className="flex items-center gap-1.5 truncate">
          {mode === "music" ? (
            <Music size={12} className="text-amber-400 shrink-0" />
          ) : mode === "sfx" ? (
            <Waves size={12} className="text-cyan-400 shrink-0" />
          ) : (
            <Volume2 size={12} className="text-emerald-400 shrink-0" />
          )}
          <span className="truncate">{data.name || (mode === "music" ? "Âm nhạc BGM" : mode === "sfx" ? "Tiếng động SFX" : "Lồng tiếng AI")}</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-neutral-500 font-mono">
          <span>[Đúp để mở]</span>
        </div>
      </div>

      <div className="flex flex-col gap-2 p-3">
        {/* COMPACT PLAYER / PREVIEW BAR */}
        <div className="flex items-center gap-2 rounded-xl bg-black/40 p-1.5 border border-white/5">
          <button
            type="button"
            onClick={togglePlay}
            disabled={!audioUrl}
            className={`nodrag flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition ${
              audioUrl
                ? "bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                : "bg-white/5 text-neutral-600 cursor-not-allowed"
            }`}
          >
            {isPlaying ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
          </button>

          <div className="flex-1 min-w-0">
            <div className="text-[11px] font-medium text-white/90 truncate">
              {audioUrl ? (data.result?.name || (mode === "music" ? "Nhạc nền AI" : mode === "sfx" ? "Tiếng động AI" : "Giọng đọc AI")) : "Chưa có âm thanh"}
            </div>
            <div className="text-[9.5px] text-neutral-500 flex items-center gap-1">
              <span>{mode === "music" ? "BGM" : mode === "sfx" ? "SFX" : "Voice"}</span>
              {audioUrl && <span>• Sẵn sàng nối dây</span>}
            </div>
          </div>

          {audioUrl && (
            <a
              href={withBasePath(audioUrl)}
              download
              className="nodrag flex h-7 w-7 items-center justify-center rounded-lg hover:bg-white/10 text-neutral-400 hover:text-white transition"
              title="Tải file âm thanh về máy"
            >
              <Download size={13} />
            </a>
          )}
        </div>

        {/* BẢNG LÀM VIỆC CHI TIẾT (CHỈ HIỆN KHI MỞ RỘNG / ĐÚP CHUỘT) */}
        {isExpanded && (
          <div className="flex flex-col gap-2.5 pt-1 border-t border-white/10">
            {/* Mode Switcher Tabs */}
            <div className="flex rounded-xl bg-black/40 p-1 border border-white/10 gap-1">
              <button
                type="button"
                onClick={() => setMode("voice")}
                className={`nodrag flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10.5px] font-medium transition ${
                  mode === "voice"
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Volume2 size={11} />
                <span>Thoại</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("music")}
                className={`nodrag flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10.5px] font-medium transition ${
                  mode === "music"
                    ? "bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Music size={11} />
                <span>Âm nhạc</span>
              </button>
              <button
                type="button"
                onClick={() => setMode("sfx")}
                className={`nodrag flex-1 flex items-center justify-center gap-1 py-1 rounded-lg text-[10.5px] font-medium transition ${
                  mode === "sfx"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 shadow-sm"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <Waves size={11} />
                <span>Tiếng động</span>
              </button>
            </div>

            {/* TAB 1: THOẠI / VOICE TTS */}
            {mode === "voice" && (
              <div className="flex flex-col gap-2">
                {/* SUB-TABS: TỰ NHÁI GIỌNG (CLONE) vs GIỌNG MẪU SẴN (PRESET) */}
                <div className="flex rounded-lg bg-white/5 p-0.5 border border-white/10">
                  <button
                    type="button"
                    onClick={() => setVoiceSubTab("clone")}
                    className={`nodrag flex-1 py-1 text-[10px] font-medium rounded-md transition flex items-center justify-center gap-1 ${
                      voiceSubTab === "clone"
                        ? "bg-gradient-to-r from-emerald-600/40 to-teal-600/40 text-emerald-200 border border-emerald-500/40 font-semibold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Sparkles size={11} className="text-emerald-400" />
                    <span>🎯 Tự nhái giọng (Voice Clone)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setVoiceSubTab("preset")}
                    className={`nodrag flex-1 py-1 text-[10px] font-medium rounded-md transition flex items-center justify-center gap-1 ${
                      voiceSubTab === "preset"
                        ? "bg-white/15 text-white border border-white/20 font-semibold"
                        : "text-neutral-400 hover:text-white"
                    }`}
                  >
                    <Radio size={11} />
                    <span>Giọng đọc chuẩn</span>
                  </button>
                </div>

                {/* --- PHÂN ĐOÀN 1: TỰ NHÁI GIỌNG (VOICE CLONE) --- */}
                {voiceSubTab === "clone" && (
                  <div className="flex flex-col gap-2 rounded-xl bg-emerald-950/20 border border-emerald-500/25 p-2">
                    {/* Sample Audio Box */}
                    <div className="flex items-center justify-between gap-1.5">
                      <div className="text-[10px] font-medium text-emerald-300 flex items-center gap-1">
                        <Mic size={11} />
                        <span>Mẫu giọng cần nhái:</span>
                      </div>
                      {hasRefAudio && (
                        <button
                          type="button"
                          onClick={toggleRefPlay}
                          className="nodrag text-[9.5px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 flex items-center gap-1 font-mono"
                        >
                          {isRefPlaying ? <Pause size={9} /> : <Play size={9} />}
                          <span>{isRefPlaying ? "Dừng" : "Nghe mẫu"}</span>
                        </button>
                      )}
                    </div>

                    {/* Reference Status / Current Sample */}
                    <div className="flex items-center justify-between gap-1 px-2 py-1.5 rounded-lg bg-black/40 border border-emerald-500/20 text-[10px]">
                      <span className="truncate text-neutral-200 font-mono">
                        {effectiveRefName || "Chưa có file mẫu (Hãy tải lên hoặc chọn)"}
                      </span>
                      {hasRefAudio && (
                        <button
                          type="button"
                          onClick={() => {
                            setReferenceAudioUrl(undefined);
                            setReferenceAudioName(undefined);
                            data.referenceAudioUrl = undefined;
                            data.referenceAudioName = undefined;
                          }}
                          className="text-neutral-400 hover:text-rose-400 shrink-0"
                          title="Hủy file mẫu"
                        >
                          <X size={11} />
                        </button>
                      )}
                    </div>

                    {/* Upload & Choose Sample Buttons */}
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="nodrag flex-1 flex h-7 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[9.5px] text-white hover:bg-white/10 transition"
                      >
                        <Upload size={11} />
                        <span>{referenceAudioUrl ? "Đổi file mẫu" : "Tải file ghi âm"}</span>
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="audio/*"
                        hidden
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          if (f) handleFileUpload(f);
                          e.target.value = "";
                        }}
                      />

                      <button
                        type="button"
                        onClick={handleOpenAssetPicker}
                        className="nodrag flex-1 flex h-7 items-center justify-center gap-1 rounded-lg border border-white/10 bg-white/5 px-2 text-[9.5px] text-white hover:bg-white/10 transition"
                      >
                        <FolderOpen size={11} />
                        <span>Kho dự án</span>
                      </button>
                    </div>

                    {/* Engine Switcher for Voice Clone */}
                    <div className="flex flex-col gap-1 pt-1 border-t border-emerald-500/20">
                      <div className="text-[9.5px] text-neutral-400 font-medium">Mô hình nhái giọng:</div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setCloneEngine("elevenlabs")}
                          className={`nodrag flex-1 py-1 px-1.5 rounded-lg text-[9.5px] font-medium border text-center transition ${
                            cloneEngine === "elevenlabs"
                              ? "bg-amber-500/20 border-amber-400/50 text-amber-200"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          ✨ ElevenLabs Clone
                        </button>
                        <button
                          type="button"
                          onClick={() => setCloneEngine("omnivoice")}
                          className={`nodrag flex-1 py-1 px-1.5 rounded-lg text-[9.5px] font-medium border text-center transition ${
                            cloneEngine === "omnivoice"
                              ? "bg-cyan-500/20 border-cyan-400/50 text-cyan-200"
                              : "bg-white/5 border-white/10 text-neutral-400 hover:text-white"
                          }`}
                        >
                          🎙️ OmniVoice (0đ)
                        </button>
                      </div>

                      {/* Engine Notes */}
                      {cloneEngine === "elevenlabs" ? (
                        <div className="text-[9px] text-amber-300/80 leading-relaxed pt-0.5">
                          {elevenSub?.tier === "free"
                            ? "💡 Gói ElevenLabs Free chưa mở Clone API: Hệ thống sẽ tự động dùng OmniVoice Cục bộ nhái theo file mẫu hoàn toàn miễn phí!"
                            : "✓ Đã kết nối ElevenLabs Instant Voice Clone & Multilingual v2."}
                        </div>
                      ) : (
                        <div className="text-[9px] text-cyan-300/80 leading-relaxed pt-0.5">
                          ✓ OmniVoice F5-TTS Cục bộ: Nhái 100% theo file âm thanh mẫu của bạn, không giới hạn.
                        </div>
                      )}
                    </div>

                    {/* If user has cloned voices in their ElevenLabs account, show dropdown */}
                    {clonedVoicesList.length > 0 && (
                      <div className="flex flex-col gap-1 pt-1">
                        <div className="text-[9.5px] text-neutral-400 font-medium">Hoặc dùng giọng bạn đã clone trên ElevenLabs:</div>
                        <select
                          value={voice}
                          onChange={(e) => setVoice(e.target.value)}
                          className="nodrag w-full rounded-lg border border-amber-500/30 bg-neutral-900 px-2 py-1 text-[10px] text-amber-200 outline-none"
                        >
                          <option value="elevenlabs_clone">🎯 Tự nhái theo file mẫu ở trên</option>
                          {clonedVoicesList.map((v) => (
                            <option key={v.id} value={`el_${v.id}`}>
                              ⭐ {v.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Similarity boost slider */}
                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="text-[9.5px] text-neutral-400">Độ giống mẫu (Similarity):</span>
                      <span className="text-[10px] text-emerald-400 font-mono">{Math.round(similarityBoost * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min="0.5"
                      max="1.0"
                      step="0.05"
                      value={similarityBoost}
                      onChange={(e) => setSimilarityBoost(Number(e.target.value))}
                      className="nodrag w-full accent-emerald-400 h-1 bg-white/10 rounded"
                    />
                  </div>
                )}

                {/* --- PHÂN ĐOÀN 2: GIỌNG ĐỌC MẪU SẴN (PRESET) --- */}
                {voiceSubTab === "preset" && (
                  <div className="flex flex-col gap-2 rounded-xl bg-white/5 border border-white/10 p-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[9.5px] text-neutral-400">Chọn giọng đọc:</span>
                      <button
                        type="button"
                        onClick={loadVoices}
                        className="nodrag text-[9px] text-cyan-400 hover:underline flex items-center gap-0.5"
                      >
                        <RefreshCw size={9} className={isLoadingVoices ? "animate-spin" : ""} />
                        <span>Đồng bộ</span>
                      </button>
                    </div>

                    <select
                      value={voice}
                      onChange={(e) => setVoice(e.target.value)}
                      className="nodrag w-full rounded-lg border border-white/10 bg-neutral-900 px-2 py-1.5 text-[10.5px] text-white/90 outline-none"
                    >
                      <optgroup label="Giọng tiếng Việt chuẩn">
                        <option value="hoai_my">🌸 Hoài My (Nữ Linh · Ấm Áp)</option>
                        <option value="nam_minh">⚡ Nam Minh (Nam Thắng · Trầm Ấm)</option>
                        <option value="omnivoice">🎙️ OmniVoice (Nam Voice-Lock v2)</option>
                      </optgroup>
                      <optgroup label="Giọng Điện ảnh ElevenLabs">
                        <option value="elevenlabs_female">✨ ElevenLabs Linh Nữ</option>
                        <option value="elevenlabs_male">✨ ElevenLabs Thắng Nam</option>
                        {elevenVoices.map((v) => (
                          <option key={v.id} value={`el_${v.id}`}>
                            {v.name}
                          </option>
                        ))}
                      </optgroup>
                    </select>
                  </div>
                )}

                {/* Speed selector */}
                <div className="flex items-center justify-between px-1">
                  <span className="text-[9.5px] text-neutral-400">Tốc độ đọc:</span>
                  <div className="flex items-center gap-1">
                    {[0.9, 1.0, 1.12, 1.2].map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setSpeed(s)}
                        className={`nodrag text-[9px] px-1.5 py-0.5 rounded font-mono transition ${
                          speed === s
                            ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold"
                            : "bg-white/5 text-neutral-400 hover:text-white"
                        }`}
                      >
                        {s}x
                      </button>
                    ))}
                  </div>
                </div>

                {/* Textarea for dialogue */}
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Nhập câu thoại nhân vật cần nói..."
                  rows={2}
                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-white placeholder-white/30 outline-none focus:border-cyan-400/50 resize-none"
                />
              </div>
            )}

            {/* TAB 2: ÂM NHẠC / BGM */}
            {mode === "music" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-amber-300 font-medium flex items-center gap-1">
                    <Music size={11} />
                    Phong cách âm nhạc nền
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9.5px] text-neutral-400">Thời lượng:</span>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="nodrag rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-amber-200 outline-none"
                    >
                      <option value={5} className="bg-neutral-900">5s</option>
                      <option value={10} className="bg-neutral-900">10s</option>
                      <option value={15} className="bg-neutral-900">15s</option>
                      <option value={30} className="bg-neutral-900">30s</option>
                    </select>
                  </div>
                </div>

                {/* Prompt textarea for music */}
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Mô tả điệu nhạc... (VD: Bản piano buồn da diết, sâu lắng cho cảnh tâm sự đêm)"
                  rows={2}
                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-white placeholder-white/30 outline-none focus:border-amber-400/50 resize-none"
                />

                {/* Quick music preset pills */}
                <div className="flex flex-wrap gap-1">
                  {[
                    "🎹 Piano buồn sâu lắng",
                    "☕ Lofi chill nhẹ nhàng",
                    "🎬 Kịch tính điện ảnh",
                    "💖 Lãng mạn du dương",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPromptText(preset)}
                      className="nodrag text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-amber-500/20 text-neutral-300 hover:text-amber-200 border border-white/5 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* TAB 3: TIẾNG ĐỘNG / SFX */}
            {mode === "sfx" && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1">
                    <Waves size={11} />
                    Tiếng động & Hiệu ứng môi trường
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[9.5px] text-neutral-400">Thời lượng:</span>
                    <select
                      value={duration}
                      onChange={(e) => setDuration(Number(e.target.value))}
                      className="nodrag rounded bg-white/5 border border-white/10 px-1.5 py-0.5 text-[10px] text-cyan-200 outline-none"
                    >
                      <option value={3} className="bg-neutral-900">3s</option>
                      <option value={5} className="bg-neutral-900">5s</option>
                      <option value={10} className="bg-neutral-900">10s</option>
                      <option value={15} className="bg-neutral-900">15s</option>
                    </select>
                  </div>
                </div>

                {/* Prompt textarea for SFX */}
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  placeholder="Mô tả tiếng động... (VD: Tiếng gió đêm vi vu và nước chảy bờ sông)"
                  rows={2}
                  className="nodrag w-full rounded-xl border border-white/10 bg-white/5 p-2 text-[11px] text-white placeholder-white/30 outline-none focus:border-cyan-400/50 resize-none"
                />

                {/* Quick SFX preset pills */}
                <div className="flex flex-wrap gap-1">
                  {[
                    "🍃 Gió đêm bờ sông",
                    "🌊 Nước chảy róc rách",
                    "👞 Bước chân trên đá",
                    "🌧️ Mưa rơi tí tách",
                    "💨 Tiếng thở dài",
                  ].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setPromptText(preset)}
                      className="nodrag text-[9px] px-1.5 py-0.5 rounded bg-white/5 hover:bg-cyan-500/20 text-neutral-300 hover:text-cyan-200 border border-white/5 transition"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Generate Button */}
            <button
              type="button"
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`nodrag flex w-full items-center justify-center gap-1.5 rounded-xl py-2 text-[11.5px] font-medium transition shadow-sm border ${
                mode === "music"
                  ? "bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-amber-600/30 hover:from-amber-600/40 hover:to-orange-600/40 border-amber-400/40 text-amber-100"
                  : mode === "sfx"
                  ? "bg-gradient-to-r from-cyan-600/30 via-sky-600/30 to-cyan-600/30 hover:from-cyan-600/40 hover:to-sky-600/40 border-cyan-400/40 text-cyan-100"
                  : "bg-gradient-to-r from-emerald-600/30 via-teal-600/30 to-emerald-600/30 hover:from-emerald-600/40 hover:to-teal-600/40 border-emerald-400/40 text-emerald-100"
              }`}
            >
              {isGenerating ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Sparkles size={13} />
              )}
              <span>
                {isGenerating
                  ? "Đang xử lý & tạo âm thanh..."
                  : mode === "music"
                  ? "🎵 Tạo âm nhạc AI"
                  : mode === "sfx"
                  ? "🔊 Tạo tiếng động AI"
                  : voiceSubTab === "clone"
                  ? (cloneEngine === "elevenlabs" ? "✨ Nhái giọng (ElevenLabs Clone)" : "🎙️ Nhái giọng (OmniVoice Clone)")
                  : "▶ Tạo giọng nói AI"}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* Asset Picker Modal */}
      {showAssetPicker && (
        <div className="absolute top-12 left-2 right-2 z-50 flex flex-col gap-1 p-2 rounded-xl bg-neutral-900 border border-white/15 shadow-2xl max-h-48 overflow-y-auto">
          <div className="flex items-center justify-between pb-1 border-b border-white/10">
            <span className="text-[10px] text-cyan-300 font-medium flex items-center gap-1">
              <FolderOpen size={10} />
              Kho âm thanh dự án
            </span>
            <button type="button" onClick={() => setShowAssetPicker(false)} className="text-neutral-400 hover:text-white">
              <X size={11} />
            </button>
          </div>
          {isLoadingAudios ? (
            <div className="flex items-center justify-center py-3 text-[10px] text-neutral-400 gap-1">
              <Loader2 size={11} className="animate-spin" /> Đang tải...
            </div>
          ) : projectAudios.length === 0 ? (
            <div className="text-[10px] text-neutral-500 text-center py-2">Chưa có file âm thanh trong dự án</div>
          ) : (
            projectAudios.map((a) => (
              <button
                key={a.id}
                type="button"
                onClick={() => selectAssetAsReference(a)}
                className="flex items-center justify-between p-1.5 rounded-lg hover:bg-white/10 text-left transition text-[10px]"
              >
                <span className="truncate text-neutral-200">{a.name}</span>
                <span className="text-cyan-400 text-[9px] shrink-0 font-mono">Chọn</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Connection Ports */}
      <Handle
        type="target"
        position={Position.Left}
        id={HANDLE_IN}
        className="!h-3 !w-3 !rounded-full !border-2 !border-neutral-900 !bg-cyan-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        id={HANDLE_OUT}
        className="!h-3 !w-3 !rounded-full !border-2 !border-neutral-900 !bg-cyan-400"
      />
    </div>
  );
});
'''

with open('d:/phim ai thời trang/components/canvas/voice-node.tsx', 'w', encoding='utf-8') as f:
    f.write(voice_node_code)

print("voice-node.tsx successfully updated!")
