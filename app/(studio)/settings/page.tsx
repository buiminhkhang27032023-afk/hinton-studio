"use client";

import { withBasePath } from "@/lib/base-path";

import { useEffect, useState } from "react";
import { Check, Database, KeyRound, Languages, Link2, PlugZap, X } from "lucide-react";
import clsx from "clsx";
import { api } from "@/lib/api-client";
import { useUi } from "@/lib/ui-store";
import { Button, Field, Input, Spinner } from "@/components/ui/primitives";

export default function SettingsPage() {
  const { tr, toast, lang, setLang } = useUi();
  const [baseUrl, setBaseUrl] = useState("https://api.buihuuthang.com/v1");
  const [apiKey, setApiKey] = useState("");
  const [hasKey, setHasKey] = useState(false);
  const [proxy, setProxy] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<"ok" | "fail" | null>(null);
  const [testMessage, setTestMessage] = useState("");

  const [iooaiKey, setIooaiKey] = useState("");
  const [iooaiHasKey, setIooaiHasKey] = useState(false);
  const [iooaiBusy, setIooaiBusy] = useState(false);
  const [iooaiScan, setIooaiScan] = useState("");
  const scanIooai = async () => {
    setIooaiBusy(true);
    try {
      await api.settings.save({ iooaiApiKey: iooaiKey.includes("••••") ? "" : iooaiKey });
      const res = await fetch(withBasePath("/api/models/iooai"), { method: "POST" });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      setIooaiHasKey(true);
      setIooaiKey((key) => key.includes("••••") ? key : `••••${key.slice(-4)}`);
      setIooaiScan(result.message);
      toast("Đã lưu IOOAI và quét model", "success");
    } catch (error) { setIooaiScan(error instanceof Error ? error.message : "Lỗi kết nối IOOAI"); }
    finally { setIooaiBusy(false); }
  };

  const [piapiKey, setPiapiKey] = useState("");
  const [piapiHasKey, setPiapiHasKey] = useState(false);
  const [piapiSaving, setPiapiSaving] = useState(false);

  useEffect(() => {
    api.settings
      .get()
      .then((settings) => {
        setIooaiKey(settings.iooai?.apiKey ?? "");
        setIooaiHasKey(settings.iooai?.hasKey ?? false);
        setBaseUrl(settings.baseUrl);
        setHasKey(settings.hasKey);
        setApiKey(settings.apiKey);
        setProxy(settings.proxyAssets);
        setPiapiHasKey(settings.piapi?.hasKey ?? false);
        setPiapiKey(settings.piapi?.apiKey ?? "");
      })
      .catch(() => {});
  }, []);

  const savePiapi = async () => {
    setPiapiSaving(true);
    try {
      // No connection test here on purpose — the key is saved and put straight to work.
      await api.settings.save({ piapiApiKey: piapiKey.includes("••••") ? "" : piapiKey });
      setPiapiHasKey(Boolean(piapiKey.trim()) || piapiHasKey);
      toast(tr("settings.saved"), "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Lỗi", "error");
    } finally {
      setPiapiSaving(false);
    }
  };

  const save = async () => {
    setSaving(true);
    try {
      await api.settings.save({
        baseUrl,
        apiKey: apiKey.includes("••••") ? "" : apiKey,
        proxyAssets: proxy,
        language: lang,
      });
      toast(tr("settings.saved"), "success");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Lỗi", "error");
    } finally {
      setSaving(false);
    }
  };

  const test = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await api.settings.save({
        baseUrl,
        apiKey: apiKey.includes("••••") ? "" : apiKey,
        proxyAssets: proxy,
      });
      const result = await api.models.discover();
      setTestResult("ok");
      setTestMessage(`${result.models.length} model`);
    } catch (error) {
      setTestResult("fail");
      setTestMessage(error instanceof Error ? error.message : "Lỗi");
    } finally {
      setTesting(false);
    }
  };

  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <header className="px-8 pb-5 pt-8">
        <h1 className="font-display text-[30px] leading-tight tracking-tight">{tr("settings.title")}</h1>
      </header>

      <div className="mx-auto w-full max-w-2xl space-y-5 px-8 pb-12">
        <section className="rounded-xl2 border border-ink-700/70 bg-ink-850/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brass-700/25 text-brass-300">
              <PlugZap size={14} />
            </span>
            <h2 className="text-[14px] font-medium">{tr("settings.api")}</h2>
          </div>

          <div className="space-y-3.5">
            <Field label={tr("settings.baseUrl")}>
              <div className="relative">
                <Link2 size={13.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
                <Input
                  value={baseUrl}
                  onChange={(event) => setBaseUrl(event.target.value)}
                  className="pl-8 font-mono text-[12px]"
                  placeholder="https://api.buihuuthang.com/v1"
                />
              </div>
            </Field>

            <Field label={tr("settings.apiKey")} hint={hasKey ? "đã lưu" : "chưa có"}>
              <div className="relative">
                <KeyRound size={13.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
                <Input
                  type="password"
                  value={apiKey}
                  onChange={(event) => setApiKey(event.target.value)}
                  onFocus={() => apiKey.includes("••••") && setApiKey("")}
                  className="pl-8 font-mono text-[12px]"
                  placeholder="sk-…"
                  autoComplete="off"
                />
              </div>
            </Field>
            <p className="text-[11.5px] leading-relaxed text-ink-500">{tr("settings.apiKeyHint")}</p>

            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={test} disabled={testing}>
                {testing ? <Spinner /> : <PlugZap size={13.5} />}
                {tr("settings.test")}
              </Button>
              {testResult && (
                <span
                  className={clsx(
                    "flex items-center gap-1.5 text-[12px]",
                    testResult === "ok" ? "text-emerald-300" : "text-red-300",
                  )}
                >
                  {testResult === "ok" ? <Check size={13} /> : <X size={13} />}
                  {testResult === "ok" ? tr("settings.testOk") : tr("settings.testFail")}
                  {testMessage && <span className="text-ink-500">· {testMessage}</span>}
                </span>
              )}
            </div>
          </div>
        </section>

        <section className="rounded-xl2 border border-ink-700/70 bg-ink-850/60 p-5">
          <h2 className="mb-4 text-[14px] font-medium">IOOAI · Omni ảnh → video</h2>
          <div className="space-y-3.5">
            <Field label="Endpoint"><Input value="https://api.iooai.cn/v1" readOnly /></Field>
            <Field label="API key IOOAI" hint={iooaiHasKey ? "đã lưu" : "chưa có"}>
              <Input type="password" value={iooaiKey} onChange={(e) => setIooaiKey(e.target.value)}
                onFocus={() => iooaiKey.includes("••••") && setIooaiKey("")}
                autoComplete="off" placeholder="sk-…" />
            </Field>
            <p className="text-[12px] leading-relaxed text-ink-400">
              Omni Flash: 10 giây, 720p ¥0,80/lượt (mặc định tiết kiệm); 1080p ¥0,85/lượt.
              Cần 1–7 ảnh có URL HTTPS công khai, khung 16:9 hoặc 9:16.
              Ảnh tải lên localhost chưa thể gửi trực tiếp cho IOOAI.
            </p>
            <Button onClick={scanIooai} disabled={iooaiBusy}>
              {iooaiBusy ? <Spinner /> : <PlugZap size={14} />} Lưu và quét model IOOAI
            </Button>
            {iooaiScan && <p className="text-[12px] text-ink-300" role="status">{iooaiScan}</p>}
            <a className="text-[12px] text-brass-300 underline" href="https://buy.iooai.cn/omni-flash.html" target="_blank" rel="noreferrer">Bảng giá và tài liệu Omni IOOAI</a>
          </div>
        </section>

        <section className="rounded-xl2 border border-ink-700/70 bg-ink-850/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-brass-700/25 text-brass-300">
              <KeyRound size={14} />
            </span>
            <h2 className="text-[14px] font-medium">PiAPI</h2>
          </div>

          <div className="space-y-3.5">
            <Field label="Endpoint" hint="cố định">
              <div className="relative">
                <Link2 size={13.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
                <Input
                  value="https://api.piapi.ai/api/v1"
                  readOnly
                  className="pl-8 font-mono text-[12px] opacity-70"
                />
              </div>
            </Field>

            <Field label="API key" hint={piapiHasKey ? "đã lưu" : "chưa có"}>
              <div className="relative">
                <KeyRound size={13.5} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-500" />
                <Input
                  type="password"
                  value={piapiKey}
                  onChange={(event) => setPiapiKey(event.target.value)}
                  onFocus={() => piapiKey.includes("••••") && setPiapiKey("")}
                  className="pl-8 font-mono text-[12px]"
                  placeholder="piapi key…"
                  autoComplete="off"
                />
              </div>
            </Field>
            <p className="text-[11.5px] leading-relaxed text-ink-500">
              Dùng cho model video &quot;Tạo video — PiAPI Seedance&quot; trong trang Model. Lưu key là dùng
              được ngay, không cần bấm kiểm tra kết nối.
            </p>

            <div className="flex justify-end">
              <Button variant="primary" onClick={savePiapi} disabled={piapiSaving}>
                {piapiSaving ? <Spinner /> : <Check size={14} />}
                {tr("common.save")}
              </Button>
            </div>
          </div>
        </section>

        <section className="rounded-xl2 border border-ink-700/70 bg-ink-850/60 p-5">
          <div className="mb-4 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-750 text-ink-300">
              <Languages size={14} />
            </span>
            <h2 className="text-[14px] font-medium">{tr("settings.language")}</h2>
          </div>

          <div className="flex gap-2">
            {(["vi", "en"] as const).map((code) => (
              <button
                key={code}
                onClick={() => setLang(code)}
                className={clsx(
                  "flex-1 rounded-lg border px-3 py-2.5 text-left transition",
                  lang === code
                    ? "border-brass-600/70 bg-brass-700/15"
                    : "border-ink-700 hover:border-ink-500",
                )}
              >
                <span className="block text-[13px] text-ink-100">{code === "vi" ? "Tiếng Việt" : "English"}</span>
                <span className="mt-0.5 block text-[11px] text-ink-500">
                  {code === "vi" ? "Giao diện mặc định" : "Interface in English"}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="rounded-xl2 border border-ink-700/70 bg-ink-850/60 p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-md bg-ink-750 text-ink-300">
              <Database size={14} />
            </span>
            <h2 className="text-[14px] font-medium">{tr("settings.proxy")}</h2>
          </div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={proxy}
              onChange={(event) => setProxy(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-brass-500"
            />
            <span>
              <span className="block text-[12.5px] text-ink-200">{tr("settings.proxy")}</span>
              <span className="mt-0.5 block text-[11.5px] leading-relaxed text-ink-500">
                {tr("settings.proxyHint")}
              </span>
            </span>
          </label>

          <div className="mt-4 rounded-lg border border-ink-700/70 bg-ink-900/60 p-3">
            <p className="text-[11.5px] leading-relaxed text-ink-500">{tr("settings.storageHint")}</p>
            <p className="mt-1.5 font-mono text-[11px] text-ink-400">./data/</p>
          </div>
        </section>

        <div className="flex justify-end">
          <Button variant="primary" onClick={save} disabled={saving}>
            {saving ? <Spinner /> : <Check size={14} />}
            {tr("common.save")}
          </Button>
        </div>
      </div>
    </div>
  );
}
