"use client";

import React, { useEffect, useState } from "react";
import {
  X,
  PlugZap,
  Check,
  KeyRound,
  Link2,
  Plus,
  Trash2,
  RotateCcw,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import clsx from "clsx";
import { useUi } from "@/lib/ui-store";

interface GatewayConfig {
  id: string;
  name: string;
  short: string;
  icon: string;
  badge: string;
  baseUrl: string;
  apiKey: string;
  hasKey: boolean;
  docUrl?: string;
  description: string;
  defaultUrl: string;
}

const PRESET_GATEWAYS: Array<Omit<GatewayConfig, "apiKey" | "hasKey" | "baseUrl"> & { defaultUrl: string }> = [
  {
    id: "provider",
    name: "Gateway Bùi Hữu Thắng",
    short: "Bùi Hữu Thắng",
    icon: "🚪",
    badge: "PRIMARY",
    defaultUrl: "https://api.buihuuthang.com/v1",
    description: "Cổng chính kết nối 170+ model AI (Gemini 3.5, Veo, Seedance, DeepSeek, Flux, Midjourney).",
  },
  {
    id: "duomiapi",
    name: "DuomiAPI (多米API)",
    short: "DuomiAPI",
    icon: "💎",
    badge: "DUOMI",
    defaultUrl: "https://api.wike.cc",
    docUrl: "https://api.wike.cc",
    description: "Cổng tổng hợp chuyên Seedance 2.0 (Doubao), Kling Video AI, Sora, Veo, Midjourney.",
  },
  {
    id: "iooai",
    name: "IOOAI Video Gateway",
    short: "IOOAI",
    icon: "⚡",
    badge: "IOOAI",
    defaultUrl: "https://api.iooai.cn/v1",
    docUrl: "https://buy.iooai.cn/omni-flash.html",
    description: "Chuyên Omni Flash 10s chuyển ảnh thành video điện ảnh siêu mượt.",
  },
  {
    id: "piapi",
    name: "PiAPI Seedance",
    short: "PiAPI",
    icon: "🎬",
    badge: "PIAPI",
    defaultUrl: "https://api.piapi.ai/api/v1",
    docUrl: "https://piapi.ai",
    description: "Cổng chuyên chạy Seedance 2.0 Fast và Mini, tạo video người mẫu chân thực.",
  },
  {
    id: "runninghub",
    name: "RunningHub AI",
    short: "RunningHub",
    icon: "🚀",
    badge: "RUNNINGHUB",
    defaultUrl: "https://www.runninghub.ai",
    docUrl: "https://www.runninghub.ai",
    description: "Nền tảng ComfyUI Cloud, sinh ảnh Flux, Kling và LLM OpenAPI.",
  },
  {
    id: "siliconflow",
    name: "SiliconFlow (SiliconCloud 硅基流动)",
    short: "SiliconFlow",
    icon: "🌟",
    badge: "SILICON",
    defaultUrl: "https://api.siliconflow.cn/v1",
    docUrl: "https://siliconflow.cn",
    description: "Hạ tầng AI Cloud giá rẻ, hỗ trợ Flux, SD3, Kolors, Qwen, DeepSeek.",
  },
  {
    id: "deepseek",
    name: "DeepSeek Official Gateway",
    short: "DeepSeek",
    icon: "🤖",
    badge: "DEEPSEEK",
    defaultUrl: "https://api.deepseek.com/v1",
    docUrl: "https://platform.deepseek.com",
    description: "Cổng trực tiếp DeepSeek-V3 và DeepSeek-R1 lý luận logic đỉnh cao.",
  },
  {
    id: "openrouter",
    name: "OpenRouter Unified",
    short: "OpenRouter",
    icon: "🧭",
    badge: "OPENROUTER",
    defaultUrl: "https://openrouter.ai/api/v1",
    docUrl: "https://openrouter.ai",
    description: "Cổng đa năng kết nối mọi model trên toàn thế giới qua 1 API key duy nhất.",
  },
  {
    id: "groq",
    name: "Groq Cloud LPU",
    short: "Groq",
    icon: "⚡",
    badge: "GROQ",
    defaultUrl: "https://api.groq.com/openai/v1",
    docUrl: "https://console.groq.com",
    description: "Tốc độ phản hồi cực nhanh trên chip LPU dành cho prompt và kịch bản.",
  },
];

interface ApiGatewaysModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ApiGatewaysModal({ isOpen, onClose }: ApiGatewaysModalProps) {
  const { toast } = useUi();
  const [selectedId, setSelectedId] = useState("provider");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; message: string } | null>(null);

  // Stored state for all gateways
  const [gatewaysData, setGatewaysData] = useState<Record<string, { baseUrl: string; apiKey: string; hasKey: boolean }>>({});
  const [customList, setCustomList] = useState<Array<{ id: string; name: string; baseUrl: string; apiKey: string; hasKey: boolean; icon: string }>>([]);

  const loadSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/settings");
      if (!res.ok) throw new Error("Không thể tải cài đặt cổng.");
      const data = await res.json();

      const map: Record<string, { baseUrl: string; apiKey: string; hasKey: boolean }> = {
        provider: {
          baseUrl: data.baseUrl || "https://api.buihuuthang.com/v1",
          apiKey: data.apiKey || "",
          hasKey: data.hasKey || false,
        },
        duomiapi: {
          baseUrl: data.duomiapi?.baseUrl || "https://duomiapi.com/v1",
          apiKey: data.duomiapi?.apiKey || "",
          hasKey: data.duomiapi?.hasKey || false,
        },
        iooai: {
          baseUrl: data.iooai?.baseUrl || "https://api.iooai.cn/v1",
          apiKey: data.iooai?.apiKey || "",
          hasKey: data.iooai?.hasKey || false,
        },
        piapi: {
          baseUrl: data.piapi?.baseUrl || "https://api.piapi.ai/api/v1",
          apiKey: data.piapi?.apiKey || "",
          hasKey: data.piapi?.hasKey || false,
        },
        runninghub: {
          baseUrl: data.runninghub?.baseUrl || "https://www.runninghub.ai",
          apiKey: data.runninghub?.apiKey || "",
          hasKey: data.runninghub?.hasKey || false,
        },
        siliconflow: {
          baseUrl: data.siliconflow?.baseUrl || "https://api.siliconflow.cn/v1",
          apiKey: data.siliconflow?.apiKey || "",
          hasKey: data.siliconflow?.hasKey || false,
        },
        deepseek: {
          baseUrl: data.deepseek?.baseUrl || "https://api.deepseek.com/v1",
          apiKey: data.deepseek?.apiKey || "",
          hasKey: data.deepseek?.hasKey || false,
        },
        openrouter: {
          baseUrl: data.openrouter?.baseUrl || "https://openrouter.ai/api/v1",
          apiKey: data.openrouter?.apiKey || "",
          hasKey: data.openrouter?.hasKey || false,
        },
        groq: {
          baseUrl: data.groq?.baseUrl || "https://api.groq.com/openai/v1",
          apiKey: data.groq?.apiKey || "",
          hasKey: data.groq?.hasKey || false,
        },
      };

      setGatewaysData(map);
      if (Array.isArray(data.customProviders)) {
        setCustomList(data.customProviders);
      }
    } catch {
      toast("Lỗi tải thông tin cổng API", "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadSettings();
      setTestResult(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const currentPreset = PRESET_GATEWAYS.find((p) => p.id === selectedId);
  const currentCustom = customList.find((c) => c.id === selectedId);

  const currentConfig = currentPreset
    ? {
        id: currentPreset.id,
        name: currentPreset.name,
        short: currentPreset.short,
        icon: currentPreset.icon,
        badge: currentPreset.badge,
        description: currentPreset.description,
        defaultUrl: currentPreset.defaultUrl,
        docUrl: currentPreset.docUrl,
        baseUrl: gatewaysData[currentPreset.id]?.baseUrl || currentPreset.defaultUrl,
        apiKey: gatewaysData[currentPreset.id]?.apiKey || "",
        hasKey: gatewaysData[currentPreset.id]?.hasKey || false,
      }
    : currentCustom
    ? {
        id: currentCustom.id,
        name: currentCustom.name,
        short: currentCustom.name,
        icon: currentCustom.icon || "⚙️",
        badge: "CUSTOM",
        description: "Cổng API tùy chỉnh do bạn thiết lập.",
        defaultUrl: currentCustom.baseUrl,
        baseUrl: currentCustom.baseUrl,
        apiKey: currentCustom.apiKey,
        hasKey: currentCustom.hasKey,
      }
    : null;

  const updateCurrentConfig = (field: "baseUrl" | "apiKey", val: string) => {
    if (currentPreset) {
      setGatewaysData((prev) => ({
        ...prev,
        [currentPreset.id]: {
          ...(prev[currentPreset.id] || { baseUrl: currentPreset.defaultUrl, apiKey: "", hasKey: false }),
          [field]: val,
        },
      }));
    } else if (currentCustom) {
      setCustomList((prev) =>
        prev.map((c) => (c.id === currentCustom.id ? { ...c, [field]: val } : c)),
      );
    }
    setTestResult(null);
  };

  const handleSave = async () => {
    if (!currentConfig) return;
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {};

      if (currentConfig.id === "provider") {
        payload.baseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.apiKey = currentConfig.apiKey;
      } else if (currentConfig.id === "duomiapi") {
        payload.duomiapiBaseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.duomiapiApiKey = currentConfig.apiKey;
      } else if (currentConfig.id === "iooai") {
        if (!currentConfig.apiKey.includes("••••")) payload.iooaiApiKey = currentConfig.apiKey;
      } else if (currentConfig.id === "piapi") {
        if (!currentConfig.apiKey.includes("••••")) payload.piapiApiKey = currentConfig.apiKey;
      } else if (currentConfig.id === "runninghub") {
        payload.runninghubBaseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.runninghubApiKey = currentConfig.apiKey;
      } else if (currentConfig.id === "siliconflow") {
        payload.siliconflowBaseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.siliconflowApiKey = currentConfig.apiKey;
      } else if (currentConfig.id === "deepseek") {
        payload.deepseekBaseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.deepseekApiKey = currentConfig.apiKey;
      } else if (currentConfig.id === "openrouter") {
        payload.openrouterBaseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.openrouterApiKey = currentConfig.apiKey;
      } else if (currentConfig.id === "groq") {
        payload.groqBaseUrl = currentConfig.baseUrl;
        if (!currentConfig.apiKey.includes("••••")) payload.groqApiKey = currentConfig.apiKey;
      } else if (currentCustom) {
        payload.customProviders = customList;
      }

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Lưu thất bại.");
      toast(`Đã lưu cấu hình cổng [${currentConfig.name}] thành công!`, "success");
      loadSettings();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      toast(msg, "error");
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    if (!currentConfig) return;
    setTesting(true);
    setTestResult(null);

    try {
      const res = await fetch("/api/settings/test-gateway", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          providerId: currentConfig.id,
          baseUrl: currentConfig.baseUrl,
          apiKey: currentConfig.apiKey.includes("••••") ? "" : currentConfig.apiKey,
        }),
      });

      const data = await res.json();
      if (data.ok) {
        setTestResult({ ok: true, message: data.message });
        toast(data.message, "success");
      } else {
        setTestResult({ ok: false, message: data.error || "Kiểm tra kết nối thất bại." });
        toast(data.error || "Lỗi kết nối", "error");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ ok: false, message: msg });
      toast(msg, "error");
    } finally {
      setTesting(false);
    }
  };

  const handleAddCustom = () => {
    const newId = `custom_${Date.now()}`;
    const newEntry = {
      id: newId,
      name: `Cổng Tùy Chỉnh ${customList.length + 1}`,
      baseUrl: "https://",
      apiKey: "",
      hasKey: false,
      icon: "⚙️",
    };
    setCustomList((prev) => [...prev, newEntry]);
    setSelectedId(newId);
  };

  const handleDeleteCustom = (id: string) => {
    setCustomList((prev) => prev.filter((c) => c.id !== id));
    setSelectedId("provider");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
      <div className="flex h-[600px] w-[860px] max-w-full flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#141418] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-3.5 bg-white/[0.02]">
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-500/20 text-sky-400">
              <PlugZap size={18} />
            </span>
            <div>
              <h2 className="text-[15px] font-semibold text-white">Quản Lý Cổng Nối API (AI Gateways)</h2>
              <p className="text-[11.5px] text-neutral-400">
                Lưu nhiều cổng nối cùng lúc (Bùi Hữu Thắng, DuomiAPI, IOOAI, PiAPI, RunningHub, SiliconFlow...) và chuyển đổi tức thì
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-neutral-400 hover:bg-white/10 hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content Body: Sidebar list + Detail Editor */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar List of Gateways */}
          <div className="w-[280px] border-r border-white/10 bg-black/20 p-2.5 overflow-y-auto space-y-1">
            <div className="px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
              Cổng có sẵn ({PRESET_GATEWAYS.length})
            </div>

            {PRESET_GATEWAYS.map((p) => {
              const active = selectedId === p.id;
              const hasKey = gatewaysData[p.id]?.hasKey || Boolean(gatewaysData[p.id]?.apiKey);

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(p.id);
                    setTestResult(null);
                  }}
                  className={clsx(
                    "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition",
                    active
                      ? "bg-sky-500/20 text-white shadow-sm border border-sky-500/40"
                      : "text-neutral-300 hover:bg-white/5",
                  )}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[15px]">{p.icon}</span>
                    <div className="min-w-0 truncate">
                      <div className="text-[12.5px] font-medium truncate">{p.short}</div>
                      <div className="text-[10px] text-neutral-500 truncate">{p.defaultUrl.replace(/^https?:\/\//, "")}</div>
                    </div>
                  </div>
                  <div>
                    {hasKey ? (
                      <span className="flex items-center gap-1 rounded-full bg-emerald-500/15 px-1.5 py-0.5 text-[9.5px] font-medium text-emerald-400 border border-emerald-500/30">
                        <Check size={9} /> Đã có key
                      </span>
                    ) : (
                      <span className="rounded-full bg-neutral-800 px-1.5 py-0.5 text-[9.5px] text-neutral-500">
                        Chưa có key
                      </span>
                    )}
                  </div>
                </button>
              );
            })}

            {/* Custom Gateways */}
            <div className="pt-2">
              <div className="flex items-center justify-between px-2 py-1 text-[10.5px] font-semibold uppercase tracking-wider text-neutral-500">
                <span>Cổng Tùy Chỉnh ({customList.length})</span>
                <button
                  type="button"
                  onClick={handleAddCustom}
                  className="flex items-center gap-1 text-[10px] text-sky-400 hover:underline"
                >
                  <Plus size={11} /> Thêm cổng
                </button>
              </div>

              {customList.map((c) => {
                const active = selectedId === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(c.id);
                      setTestResult(null);
                    }}
                    className={clsx(
                      "flex w-full items-center justify-between rounded-xl px-2.5 py-2 text-left transition",
                      active
                        ? "bg-sky-500/20 text-white shadow-sm border border-sky-500/40"
                        : "text-neutral-300 hover:bg-white/5",
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span>{c.icon || "⚙️"}</span>
                      <span className="text-[12.5px] font-medium truncate">{c.name}</span>
                    </div>
                    {c.hasKey && (
                      <span className="h-2 w-2 rounded-full bg-emerald-400" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Editor Detail */}
          <div className="flex-1 p-5 overflow-y-auto">
            {currentConfig ? (
              <div className="space-y-4 max-w-xl">
                {/* Gateway Title Banner */}
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 flex items-start justify-between">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">{currentConfig.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-[16px] font-semibold text-white">{currentConfig.name}</h3>
                        <span className="rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-medium text-sky-300 border border-sky-500/30">
                          {currentConfig.badge}
                        </span>
                      </div>
                      <p className="mt-1 text-[12px] text-neutral-300 leading-relaxed">
                        {currentConfig.description}
                      </p>
                    </div>
                  </div>

                  {currentConfig.docUrl && (
                    <a
                      href={currentConfig.docUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-lg border border-white/10 px-2 py-1 text-[11px] text-neutral-400 hover:bg-white/5 hover:text-white"
                    >
                      <ExternalLink size={12} /> Tài liệu
                    </a>
                  )}
                </div>

                {/* Base URL Input */}
                <div>
                  <label className="block text-[12px] font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <Link2 size={13} className="text-neutral-400" />
                      Địa chỉ Base URL (Endpoint)
                    </span>
                    {currentConfig.defaultUrl && currentConfig.baseUrl !== currentConfig.defaultUrl && (
                      <button
                        type="button"
                        onClick={() => updateCurrentConfig("baseUrl", currentConfig.defaultUrl)}
                        className="text-[10.5px] text-sky-400 hover:underline"
                      >
                        Khôi phục mặc định
                      </button>
                    )}
                  </label>
                  <input
                    type="text"
                    value={currentConfig.baseUrl}
                    onChange={(e) => updateCurrentConfig("baseUrl", e.target.value)}
                    placeholder={currentConfig.defaultUrl}
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-[12.5px] font-mono text-white outline-none focus:border-sky-500"
                  />
                </div>

                {/* API Key Input */}
                <div>
                  <label className="block text-[12px] font-medium text-neutral-300 mb-1.5 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound size={13} className="text-neutral-400" />
                      Khóa API Key ({currentConfig.name})
                    </span>
                    {currentConfig.hasKey && (
                      <span className="text-[10.5px] text-emerald-400 flex items-center gap-1">
                        <Check size={11} /> Đã lưu key trong hệ thống
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={currentConfig.apiKey}
                    onChange={(e) => updateCurrentConfig("apiKey", e.target.value)}
                    onFocus={() => currentConfig.apiKey.includes("••••") && updateCurrentConfig("apiKey", "")}
                    placeholder="Nhập API key (sk-...)"
                    autoComplete="off"
                    className="w-full rounded-xl border border-white/15 bg-black/40 px-3 py-2 text-[12.5px] font-mono text-white outline-none focus:border-sky-500"
                  />
                  <p className="mt-1 text-[11px] text-neutral-500">
                    Khóa được lưu cục bộ trên máy bạn an toàn và tự động mã hóa khi hiển thị lại.
                  </p>
                </div>

                {/* Test Result Feedback */}
                {testResult && (
                  <div
                    className={clsx(
                      "flex items-center gap-2 rounded-xl p-3 text-[12px]",
                      testResult.ok
                        ? "border border-emerald-500/40 bg-emerald-950/30 text-emerald-300"
                        : "border border-red-500/40 bg-red-950/30 text-red-300",
                    )}
                  >
                    {testResult.ok ? <ShieldCheck size={16} /> : <AlertCircle size={16} />}
                    <span>{testResult.message}</span>
                  </div>
                )}

                {/* Bottom Actions: Test + Save */}
                <div className="flex items-center justify-between pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTest}
                      disabled={testing}
                      className="flex items-center gap-1.5 rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-[12px] font-medium text-neutral-200 transition hover:bg-white/10 disabled:opacity-40"
                    >
                      <PlugZap size={14} className={testing ? "animate-spin" : ""} />
                      {testing ? "Đang kiểm tra..." : "Kiểm tra kết nối"}
                    </button>

                    {currentCustom && (
                      <button
                        type="button"
                        onClick={() => handleDeleteCustom(currentCustom.id)}
                        className="flex items-center gap-1.5 rounded-xl border border-red-500/20 bg-red-950/20 px-3 py-2 text-[12px] text-red-400 hover:bg-red-900/30"
                      >
                        <Trash2 size={13} /> Xóa cổng
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-[12.5px] font-medium text-black shadow-lg transition hover:bg-sky-400 disabled:opacity-40"
                  >
                    <Check size={14} />
                    {saving ? "Đang lưu..." : `Lưu cổng ${currentConfig.short}`}
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid h-full place-items-center text-neutral-500 text-xs">
                Chọn một cổng nối bên trái để xem và chỉnh sửa thông tin.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
