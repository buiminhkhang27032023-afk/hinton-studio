import re

with open('components/canvas/nodes.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Define useNodeUpdater definition
use_node_updater_code = '''function useNodeUpdater(id: string) {
  const { setNodes } = useReactFlow();
  return useCallback(
    (patch: Partial<StudioNodeData>) => {
      setNodes((nodes) =>
        nodes.map((node) =>
          node.id === id ? { ...node, data: { ...node.data, ...patch } } : node,
        ),
      );
    },
    [id, setNodes],
  );
}
'''

# 2. Check if useNodeUpdater is at the bottom. We will remove old one or replace it.
# Let's see old useNodeUpdater
old_updater_pattern = re.compile(r'function useNodeUpdater\(id: string\) \{[\s\S]*?\n\}\n', re.MULTILINE)
m = old_updater_pattern.search(text)
if m:
    text = text[:m.start()] + text[m.end():]

# Now insert useNodeUpdater right before function TapFrame
tap_idx = text.find('function TapFrame(')
assert tap_idx != -1
text = text[:tap_idx] + use_node_updater_code + '\n' + text[tap_idx:]

# 3. New TapFrame definition
new_tapframe = '''function TapFrame({
  id,
  selected,
  label,
  icon: Icon,
  data,
  preview,
  video,
  text,
  canRun = true,
  busy,
  width,
  onMediaClick,
  onDrop,
  editor,
  children,
}: {
  id: string;
  selected?: boolean;
  label: string;
  icon: typeof ImageIcon;
  data: StudioNodeData;
  preview?: string;
  video?: string;
  text?: string;
  canRun?: boolean;
  busy?: boolean;
  width?: number;
  onMediaClick?: () => void;
  onDrop?: (event: React.DragEvent) => void;
  editor?: ReactNode;
  children?: ReactNode;
}) {
  const ready = data.status === "done" || Boolean(preview || video);
  const { openLightbox, toast } = useUi();
  const run = useRunNode();
  const menu = useNodeMenu();
  const updateNode = useNodeUpdater(id);
  const lastRunTimeRef = useRef(0);

  // Lịch sử tạo video/ảnh (Version History: v1, v2, v3...)
  const historyList = useMemo(() => {
    const list = Array.isArray(data.history) ? [...data.history] : [];
    return list;
  }, [data.history]);

  const [selectedVersionIdx, setSelectedVersionIdx] = useState<number>(-1);

  // Xác định media đang xem (bản lịch sử được chọn hoặc bản mới nhất)
  const activeHistory = selectedVersionIdx >= 0 && historyList[selectedVersionIdx] ? historyList[selectedVersionIdx] : null;
  const activeVideo = activeHistory ? (activeHistory.kind === "video" ? activeHistory.url : undefined) : video;
  const activePreview = activeHistory ? (activeHistory.kind === "image" ? activeHistory.url : undefined) : preview;
  const hasMedia = Boolean(activePreview || activeVideo);

  const handleRun = useCallback(
    (e: React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const now = Date.now();
      if (now - lastRunTimeRef.current < 400) return;
      lastRunTimeRef.current = now;
      run(id);
    },
    [id, run],
  );

  // Kích thước & Tỷ lệ co giãn động theo tham số aspect (16:9, 9:16, 1:1, 4:5, 21:9...)
  const aspect = data.aspect || "16:9";
  const { frameWidth, frameStyle } = useMemo(() => {
    if (text != null && !activePreview && !activeVideo) {
      return { frameWidth: width || 280, frameStyle: { minHeight: 120 } };
    }
    let calculatedWidth = width;
    let ratio = "16 / 9";
    switch (aspect) {
      case "16:9":
        calculatedWidth = width || 380;
        ratio = "16 / 9";
        break;
      case "9:16":
        calculatedWidth = width || 230;
        ratio = "9 / 16";
        break;
      case "1:1":
        calculatedWidth = width || 300;
        ratio = "1 / 1";
        break;
      case "4:5":
        calculatedWidth = width || 260;
        ratio = "4 / 5";
        break;
      case "21:9":
        calculatedWidth = width || 420;
        ratio = "21 / 9";
        break;
      case "3:2":
        calculatedWidth = width || 340;
        ratio = "3 / 2";
        break;
      case "2:3":
        calculatedWidth = width || 250;
        ratio = "2 / 3";
        break;
      default:
        calculatedWidth = width || 360;
        ratio = "16 / 9";
        break;
    }
    return { frameWidth: calculatedWidth, frameStyle: { aspectRatio: ratio } };
  }, [aspect, width, text, activePreview, activeVideo]);

  return (
    <div
      className="group relative"
      style={{ width: frameWidth }}
      onDragOver={onDrop ? (event) => event.preventDefault() : undefined}
      onDrop={onDrop}
    >
      {/* Top Header Bar */}
      <div className="pointer-events-none absolute -top-[28px] left-0 right-0 flex items-center justify-between text-[11.5px] font-medium text-neutral-400 select-none">
        <div className="flex max-w-[60%] items-center gap-1.5 truncate">
          <Icon size={12} className="text-neutral-400 shrink-0" strokeWidth={1.8} />
          <span className="truncate">{data.name || label}</span>
          {ready && !data.identityNeedsReview && data.status !== "running" && data.status !== "error" && (
            <Check size={11} className="text-emerald-400 shrink-0" strokeWidth={2.4} />
          )}
          {data.status === "running" && <Loader2 size={11} className="animate-spin text-amber-400 shrink-0" />}
          {data.status === "error" && <AlertCircle size={11} className="text-rose-400 shrink-0" />}
          {Boolean(data.identityNeedsReview) && (
            <AlertCircle size={11} className="text-amber-400 shrink-0" aria-label="Cần kiểm tra nhân vật tham chiếu" />
          )}
        </div>

        {/* Bộ chuyển phiên bản (Version Switcher pills: v1, v2...) */}
        <div className="pointer-events-auto flex items-center gap-1">
          {historyList.length > 1 && (
            <div className="flex items-center gap-0.5 rounded-full bg-black/70 px-1.5 py-0.5 border border-white/15 text-[9.5px]">
              <History size={10} className="text-neutral-400 shrink-0 mr-0.5" />
              {historyList.map((h, idx) => {
                const isActive = (selectedVersionIdx === -1 && idx === historyList.length - 1) || selectedVersionIdx === idx;
                return (
                  <button
                    key={h.id || idx}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedVersionIdx(idx);
                    }}
                    className={clsx(
                      "nodrag px-1.5 py-0.5 rounded font-bold transition",
                      isActive
                        ? "bg-amber-400 text-black shadow-sm"
                        : "text-white/60 hover:bg-white/15 hover:text-white"
                    )}
                    title={h.label || `Phiên bản v${idx + 1}`}
                  >
                    v{idx + 1}
                  </button>
                );
              })}
            </div>
          )}

          {canRun && (
            <button
              type="button"
              className="pointer-events-auto nodrag flex items-center gap-1 rounded-full bg-white/10 hover:bg-brass-400 hover:text-black px-2 py-0.5 text-[10.5px] text-white/90 transition shadow-sm font-medium"
              disabled={data.status === "running"}
              onMouseDown={handleRun}
              onClick={handleRun}
              title="Chạy khối này ngay (1 nhấp chuột)"
            >
              {data.status === "running" ? (
                <Loader2 size={10} className="animate-spin" />
              ) : (
                <Play size={10} fill="currentColor" />
              )}
              <span>{data.status === "running" ? "Đang tạo…" : ready ? "Tạo lại" : "Chạy"}</span>
            </button>
          )}
        </div>
      </div>

      {/* Media Card (Xem video trực tiếp không bị bung popup che mất màn hình) */}
      <div
        className={clsx(
          "relative overflow-hidden rounded-2xl bg-[#121216] border border-white/10 transition-all duration-150 shadow-xl",
          selected ? "ring-2 ring-white/80 border-white/40 shadow-2xl" : "hover:border-white/20",
        )}
        style={frameStyle}
      >
        {activeVideo ? (
          <div className="relative h-full w-full bg-black group/video">
            <video
              src={withBasePath(activeVideo)}
              controls
              playsInline
              preload="metadata"
              className="h-full w-full object-contain"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ) : activePreview ? (
          <div
            className="h-full w-full cursor-pointer bg-neutral-950"
            onClick={() => {
              if (onMediaClick) onMediaClick();
              else openLightbox({ url: activePreview!, kind: "image", title: data.name || label });
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img loading="lazy" decoding="async" src={withBasePath(activePreview)} alt="" className="h-full w-full object-contain" />
          </div>
        ) : text != null ? (
          <p className={clsx("line-clamp-6 p-3 text-[12.5px] leading-relaxed", text ? "text-white/90" : "text-white/35")}>
            {text || "Nhập câu lệnh…"}
          </p>
        ) : (
          <span className="grid h-full place-items-center text-white/25">
            {busy || data.status === "running" ? <Loader2 size={24} className="animate-spin text-amber-400" /> : <Icon size={28} strokeWidth={1.3} />}
          </span>
        )}

        {/* Thanh công cụ nhanh nổi trên góc media khi hover */}
        {hasMedia && (
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto z-20">
            <a
              href={withBasePath((activeVideo || activePreview)!)}
              download
              target="_blank"
              rel="noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white shadow-md backdrop-blur-md hover:bg-white hover:text-black transition"
              title="Tải video/ảnh về máy"
            >
              <Download size={10} />
              <span>Tải</span>
            </a>

            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                openLightbox({
                  url: (activeVideo || activePreview)!,
                  kind: activeVideo ? "video" : "image",
                  title: data.name || label,
                });
              }}
              className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white shadow-md backdrop-blur-md hover:bg-white hover:text-black transition"
              title="Phóng to toàn màn hình"
            >
              <Maximize2 size={10} />
              <span>Phóng to</span>
            </button>

            {onMediaClick && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onMediaClick();
                }}
                className="flex items-center gap-1 rounded-full bg-black/80 px-2 py-0.5 text-[10px] font-medium text-white/80 shadow-md backdrop-blur-md hover:bg-white hover:text-black transition"
                title="Thay đổi file"
              >
                <span>Đổi file</span>
              </button>
            )}
          </div>
        )}

        {/* Cắt frame video (Đầu / Dừng / Cuối) */}
        {activeVideo && (
          <div className="absolute bottom-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-auto z-20">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: data.projectId, videoUrl: activeVideo, mode: "first" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", "Cảnh đầu video");
                  }
                } catch {}
              }}
              className="rounded bg-black/80 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition"
              title="Cắt cảnh đầu video (0.0s) đưa lên Canvas"
            >
              🎬 Đầu
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: data.projectId, videoUrl: activeVideo, mode: "current" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", "Cảnh dừng video");
                  }
                } catch {}
              }}
              className="rounded bg-amber-500/20 border border-amber-400/40 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition"
              title="Cắt cảnh đang dừng video đưa lên Canvas"
            >
              ⏸️ Dừng
            </button>
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation();
                try {
                  const res = await fetch("/api/video/extract-frame", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ projectId: data.projectId, videoUrl: activeVideo, mode: "last" }),
                  });
                  const resData = await res.json();
                  if (resData.url && menu?.reuse) {
                    menu.reuse(id, resData.url, "image", "Cảnh cuối video");
                  }
                } catch {}
              }}
              className="rounded bg-black/80 hover:bg-amber-500 hover:text-black px-1.5 py-0.5 text-[9px] font-medium text-amber-200 backdrop-blur-md transition"
              title="Cắt cảnh cuối video đưa lên Canvas"
            >
              🏁 Cuối
            </button>
          </div>
        )}

        {/* Nút khôi phục bản cũ làm bản chính nếu đang xem v1/v2 cũ */}
        {selectedVersionIdx >= 0 && selectedVersionIdx !== historyList.length - 1 && activeHistory && (
          <div className="absolute bottom-2 left-2 z-20 pointer-events-auto">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateNode({
                  result: {
                    id: activeHistory.id || `hist_${selectedVersionIdx}`,
                    url: activeHistory.url,
                    kind: activeHistory.kind,
                    name: activeHistory.label || `Phiên bản v${selectedVersionIdx + 1}`,
                  },
                  videoUrl: activeHistory.kind === "video" ? activeHistory.url : undefined,
                  imageUrl: activeHistory.kind === "image" ? activeHistory.url : undefined,
                });
                setSelectedVersionIdx(-1);
                toast(`Đã khôi phục bản v${selectedVersionIdx + 1} làm bản chính!`, "success");
              }}
              className="rounded-full bg-amber-400 text-black px-2.5 py-0.5 text-[10px] font-bold shadow-md hover:bg-amber-300 transition"
              title="Khôi phục phiên bản này làm bản chính"
            >
              Dùng bản v{selectedVersionIdx + 1} này
            </button>
          </div>
        )}
      </div>

      {/* KHUNG THAO TÁC (EDITOR) ĐƯA HẾT XUỐNG DƯỚI NHƯ TAPNOW TRONG ẢNH 1 */}
      {editor && (
        <div className="mt-2.5 rounded-2xl border border-white/10 bg-[#121217]/95 p-3 shadow-2xl backdrop-blur-md">
          {editor}
        </div>
      )}

      {children}
    </div>
  );
}
'''

# Replace TapFrame from 'function TapFrame(' to 'function NodePorts('
start_tf = text.find('function TapFrame(')
end_tf = text.find('function NodePorts(')
assert start_tf != -1 and end_tf != -1
text = text[:start_tf] + new_tapframe + '\n\n' + text[end_tf:]

# 4. New GenerateNode
new_generatenode = '''export const GenerateNode = memo(function GenerateNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const models = useModelsOfKind(nodeData.modelKind ?? "image");
  const model = useModelById(nodeData.modelId);
  const providerMeta = getProviderMeta(model?.provider || model?.id);
  const run = useRunNode();
  const result = nodeData.result;
  const imageTags = useConnectedImageTags(id);

  const isVideo = nodeData.modelKind === "video";
  return (
    <TapFrame
      id={id}
      selected={selected}
      label={isVideo ? "Tạo video" : "Tạo ảnh"}
      icon={isVideo ? Play : ImageIcon}
      data={nodeData}
      preview={result?.kind === "image" ? result.url : undefined}
      video={result?.kind === "video" ? result.url : undefined}
      editor={
        <div className="space-y-2.5">
          <NodeMasterPromptBar data={nodeData} onPatch={update} kind={isVideo ? "video" : "image"} />

          {/* Dòng Reference Slot theo phong cách Ảnh 1 TapNow */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-[11px] text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white/80">Reference</span>
                <span className="text-white/30">|</span>
                <span className="text-white/50 text-[10px]">First/Last frame</span>
              </div>
              <span className="text-[10px] text-neutral-500">{imageTags.length} ảnh kết nối</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto py-1">
              {imageTags.map((tag, idx) => (
                <button
                  key={tag.label + idx}
                  type="button"
                  onClick={() => {
                    const tagCode = `[@Image ${idx + 1}]`;
                    const cur = nodeData.prompt ?? "";
                    if (!cur.includes(tagCode)) {
                      update({ prompt: cur ? `${cur} ${tagCode}` : tagCode });
                    }
                  }}
                  className="nodrag group/slot relative h-8 w-8 rounded-lg border border-purple-500/40 bg-purple-950/30 p-0.5 hover:border-purple-400 hover:scale-105 transition shrink-0"
                  title={`Bấm để chèn [@Image ${idx + 1}] - ${tag.name || tag.label}`}
                >
                  {tag.preview ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={withBasePath(tag.preview)} alt="" className="h-full w-full rounded object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-[10px] text-purple-300 font-bold">#{idx + 1}</span>
                  )}
                  <span className="absolute -bottom-1 -right-1 rounded bg-black/90 px-1 text-[8px] font-mono text-purple-300 border border-purple-500/40">
                    #{idx + 1}
                  </span>
                </button>
              ))}
              {imageTags.length < 8 && (
                <div
                  className="h-8 w-8 rounded-lg border border-dashed border-white/20 bg-white/5 flex items-center justify-center text-white/30 text-[12px] shrink-0"
                  title="Kéo dây từ khối ảnh vào cổng bên trái để thêm tham chiếu"
                >
                  +
                </div>
              )}
            </div>
          </div>

          {/* Ô nhập prompt tích hợp Popover @ Mention chuẩn Ảnh 3 */}
          <MentionTextarea
            className="field nodrag min-h-[78px] text-[12.5px] leading-relaxed"
            placeholder={tr("node.promptPlaceholder")}
            value={nodeData.prompt ?? ""}
            onChange={(next) => update({ prompt: next })}
            tags={imageTags}
          />

          {/* Báo lỗi gọn gàng, KHÔNG che kín màn hình hoặc làm mất tương tác */}
          {nodeData.error && (
            <div className="flex items-start gap-2 rounded-xl border border-rose-500/30 bg-rose-500/10 p-2.5 text-rose-300 text-[11.5px]">
              <AlertCircle size={14} className="shrink-0 mt-0.5 text-rose-400" />
              <div className="flex-1 break-words leading-tight">{nodeData.error}</div>
              <button
                type="button"
                onClick={() => run(id)}
                disabled={nodeData.status === "running"}
                className="shrink-0 rounded bg-rose-500/20 hover:bg-rose-500/30 px-2 py-0.5 text-[10.5px] font-semibold text-rose-200 transition disabled:opacity-50"
              >
                Thử lại
              </button>
            </div>
          )}

          {/* Thanh thông số dưới cùng: Model, Aspect, Resolution, Duration, Nút tạo */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
            {model && (
              <span
                className="nodrag flex items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-medium text-white/80"
                title={`Nguồn: ${providerMeta.label}`}
              >
                <span>{providerMeta.icon}</span>
                <span>{providerMeta.short}</span>
              </span>
            )}
            <PillSelect
              value={nodeData.modelId ?? ""}
              onChange={(value) => {
                if (!value) {
                  update({ modelId: "" });
                  return;
                }
                const avail = durationOptions(value);
                let dur = nodeData.duration;
                if (!dur || !avail.includes(dur)) {
                  dur = getDefaultDuration(value);
                  if (!avail.includes(dur)) {
                    dur = avail[avail.length - 1] ?? 10;
                  }
                }
                let aspect = nodeData.aspect ?? "16:9";
                const p = (nodeData.prompt ?? "").toLowerCase();
                if (p.includes("9:16") || p.includes("dọc") || p.includes("vertical") || p.includes("tiktok")) {
                  aspect = "9:16";
                } else if (p.includes("16:9") || p.includes("ngang") || p.includes("landscape")) {
                  aspect = "16:9";
                }

                if (value.startsWith("iooai:")) {
                  update({ modelId: value, duration: dur, resolution: nodeData.resolution ?? "720p", aspect });
                } else if (value.includes("piapi")) {
                  const pDur = Math.min(15, Math.max(4, dur));
                  update({
                    modelId: value,
                    duration: pDur,
                    resolution: nodeData.resolution ?? "480p",
                    aspect,
                  });
                } else if (value.includes("veo")) {
                  const vDur = [4, 6, 8].includes(dur) ? dur : 6;
                  update({
                    modelId: value,
                    duration: vDur,
                    aspect,
                  });
                } else {
                  update({ modelId: value, duration: dur, aspect });
                }
              }}
              className="min-w-[130px] max-w-[200px]"
              options={[
                { value: "", label: models.length ? tr("node.model") : tr("node.noModel") },
                ...models.map((item) => ({
                  value: item.id,
                  label: item.label,
                  group: getProviderMeta(item.provider || item.id).short,
                })),
              ]}
            />
            <PillSelect
              value={nodeData.aspect ?? "16:9"}
              onChange={(value) => update({ aspect: value })}
              options={["16:9", "9:16", "1:1", "4:5", "3:2", "2:3", "21:9"].map((ratio) => ({ value: ratio, label: ratio }))}
            />
            <PillSelect
              value={model?.provider === "iooai" ? (nodeData.resolution === "1080p" ? "1080p" : "720p") : nodeData.resolution ?? "480p"}
              onChange={(value) => update({ resolution: value })}
              options={[
                ...(model?.provider === "iooai" ? [] : [{ value: "480p", label: "480p" }]),
                { value: "720p", label: "720p" },
                { value: "1080p", label: "1080p" },
              ]}
            />
            {isVideo ? (
              <PillSelect
                value={String(nodeData.duration ?? 10)}
                onChange={(value) => update({ duration: Number(value) })}
                options={durationOptions(model?.id).map((seconds) => ({ value: String(seconds), label: `${seconds}s` }))}
              />
            ) : (
              <button
                className="nodrag rounded-full border border-white/15 px-2.5 py-1 text-[11px] text-white/70"
                onClick={() => update({ seed: Math.floor(Math.random() * 1_000_000) })}
                title={tr("node.seed")}
              >
                🎲 {nodeData.seed ?? "—"}
              </button>
            )}

            {/* Chi phí ước tính badge */}
            <span className="text-[10px] text-neutral-400 font-mono ml-auto">
              {model?.id?.includes("seedance") ? "🪙 1.8 Tệ" : model?.id?.includes("minimax") ? "🪙 1.3 Tệ" : "⚡ Ready"}
            </span>

            <button
              onClick={() => run(id)}
              disabled={nodeData.status === "running"}
              className="nodrag grid h-7 w-7 place-items-center rounded-full bg-white text-black hover:bg-brass-400 transition disabled:opacity-50 shadow-md"
              title="Chạy tạo ngay"
            >
              {nodeData.status === "running" ? <Loader2 size={13} className="animate-spin" /> : <ArrowUp size={14} strokeWidth={2.5} />}
            </button>
          </div>
          {result?.kind !== "image" && result?.kind !== "video" && result?.meta?.text != null && (
            <p className="max-h-24 overflow-y-auto whitespace-pre-wrap text-[11.5px] text-white/70">{String(result.meta.text)}</p>
          )}
        </div>
      }
    >
      <NodePorts out={isVideo ? "video" : "image"} accept={isVideo ? "text image video" : "text image"} />
    </TapFrame>
  );
});
'''

start_gn = text.find('export const GenerateNode =')
end_gn = text.find('export const UpscaleNode =')
assert start_gn != -1 and end_gn != -1
text = text[:start_gn] + new_generatenode + '\n\n' + text[end_gn:]

# 5. New MentionTextarea
new_mention_textarea = '''export function MentionTextarea({
  value,
  onChange,
  placeholder,
  tags,
  className,
  rows,
}: {
  value: string;
  onChange: (next: string) => void;
  placeholder?: string;
  tags: ImageTag[];
  className?: string;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [query, setQuery] = useState<string | null>(null);
  const [searchFilter, setSearchFilter] = useState("");
  const allNodes = useNodes();

  const mentionAt = (text: string, caret: number) => {
    const match = /@([^\s@]*)$/.exec(text.slice(0, caret));
    return match ? { query: match[1], start: caret - match[0].length } : null;
  };

  const insert = useCallback(
    (tagToInsert: string) => {
      const el = ref.current;
      if (!el) return;
      const caret = el.selectionStart ?? value.length;
      const hit = mentionAt(value, caret);
      const prefix = hit ? value.slice(0, hit.start) : value.slice(0, caret);
      const suffix = value.slice(caret);
      const next = `${prefix}${tagToInsert} ${suffix}`;
      onChange(next);
      setQuery(null);
      setSearchFilter("");
      requestAnimationFrame(() => {
        el.focus();
        const pos = prefix.length + tagToInsert.length + 1;
        el.setSelectionRange(pos, pos);
      });
    },
    [value, onChange]
  );

  // Private library categories from canvas nodes
  const characterNodes = useMemo(() => {
    return allNodes
      .filter((n) => {
        const d = (n.data || {}) as StudioNodeData;
        const name = (d.name || (n.data as { label?: string })?.label || "").toLowerCase();
        return n.type === "image" || name.includes("nhân vật") || name.includes("hero") || name.includes("linh") || name.includes("nam") || name.includes("ref");
      })
      .map((n, i) => {
        const d = (n.data || {}) as StudioNodeData;
        return {
          id: n.id,
          name: d.name || (n.data as { label?: string })?.label || `Nhân vật ${i + 1}`,
          preview: d.imageUrl || (d.result?.kind === "image" ? d.result.url : undefined),
        };
      });
  }, [allNodes]);

  const sceneNodes = useMemo(() => {
    return allNodes
      .filter((n) => {
        const d = (n.data || {}) as StudioNodeData;
        const name = (d.name || (n.data as { label?: string })?.label || "").toLowerCase();
        return name.includes("cảnh") || name.includes("bối cảnh") || name.includes("scene") || name.includes("location");
      })
      .map((n, i) => {
        const d = (n.data || {}) as StudioNodeData;
        return {
          id: n.id,
          name: d.name || (n.data as { label?: string })?.label || `Bối cảnh ${i + 1}`,
          preview: d.imageUrl || (d.result?.kind === "image" ? d.result.url : undefined),
        };
      });
  }, [allNodes]);

  const [activeLibraryTab, setActiveLibraryTab] = useState<"none" | "character" | "scene">("none");

  const effectiveFilter = (searchFilter || query || "").toLowerCase();
  const filteredTags = tags.filter((t, i) => {
    const labelMatch = t.label.toLowerCase().includes(effectiveFilter);
    const nameMatch = (t.name || "").toLowerCase().includes(effectiveFilter);
    const numMatch = String(i + 1).includes(effectiveFilter);
    return labelMatch || nameMatch || numMatch;
  });

  return (
    <div className="relative">
      <textarea
        ref={ref}
        className={className}
        placeholder={placeholder}
        value={value}
        onChange={(event) => {
          const next = event.target.value;
          onChange(next);
          const hit = mentionAt(next, event.target.selectionStart ?? next.length);
          setQuery(hit ? hit.query : null);
          if (hit) setActiveLibraryTab("none");
        }}
        onKeyDown={(event) => {
          if (query !== null) {
            if (event.key === "Escape") {
              setQuery(null);
              setActiveLibraryTab("none");
            } else if (event.key >= "1" && event.key <= "9") {
              const num = parseInt(event.key, 10);
              if (num <= tags.length) {
                event.preventDefault();
                insert(`[@Image ${num}]`);
              }
            }
          }
        }}
      />

      {/* POPOVER @ MENTION THEO PHONG CÁCH ẢNH 3 */}
      {query !== null && (
        <div className="nodrag absolute left-0 bottom-full z-50 mb-1.5 w-[300px] overflow-hidden rounded-2xl border border-white/20 bg-[#16161b]/98 shadow-2xl backdrop-blur-xl">
          {/* Thanh tìm kiếm Search */}
          <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
            <Search size={13} className="text-neutral-400 shrink-0" />
            <input
              autoFocus
              type="text"
              placeholder="Search"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full bg-transparent text-[11.5px] text-white placeholder-neutral-500 focus:outline-none"
            />
          </div>

          <div className="max-h-64 overflow-y-auto p-1.5 space-y-1">
            {activeLibraryTab === "none" && (
              <>
                {/* Mục Linked node */}
                <div>
                  <div className="flex items-center justify-between px-2 py-1 text-[10.5px]">
                    <span className="font-semibold text-neutral-300">Linked node</span>
                    <span className="text-[9.5px] text-neutral-500 font-mono">Type a number to select</span>
                  </div>

                  {tags.length === 0 ? (
                    <div className="px-2 py-1.5 text-[11px] text-neutral-400">
                      Chưa có khối ảnh nào nối vào cổng bên trái.
                    </div>
                  ) : filteredTags.length === 0 ? (
                    <div className="px-2 py-1.5 text-[11px] text-neutral-500">
                      Không tìm thấy ảnh khớp &quot;{effectiveFilter}&quot;.
                    </div>
                  ) : (
                    filteredTags.map((tag, idx) => (
                      <button
                        key={tag.label + idx}
                        type="button"
                        onClick={() => insert(`[@Image ${idx + 1}]`)}
                        className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11.5px] text-white hover:bg-white/10 transition group/tag"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {tag.preview ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={withBasePath(tag.preview)} alt="" className="h-6 w-6 rounded object-cover border border-white/20 shrink-0" />
                          ) : (
                            <ImageIcon size={14} className="text-neutral-400 shrink-0" />
                          )}
                          <span className="truncate text-neutral-200 group-hover/tag:text-white font-medium">
                            {tag.name || tag.label}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-purple-300 bg-purple-950/60 border border-purple-500/30 px-1.5 py-0.5 rounded shrink-0">
                          #{idx + 1}
                        </span>
                      </button>
                    ))
                  )}
                </div>

                {/* Mục Private library */}
                <div className="border-t border-white/10 pt-1">
                  <div className="px-2 py-1 text-[10.5px] font-semibold text-neutral-300">
                    Private library
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveLibraryTab("character")}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11.5px] text-neutral-300 hover:bg-white/10 hover:text-white transition"
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={13} className="text-sky-400" />
                      <span>Character</span>
                    </div>
                    <ChevronRight size={12} className="text-neutral-500" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveLibraryTab("scene")}
                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-[11.5px] text-neutral-300 hover:bg-white/10 hover:text-white transition"
                  >
                    <div className="flex items-center gap-2">
                      <Folder size={13} className="text-emerald-400" />
                      <span>Scene</span>
                    </div>
                    <ChevronRight size={12} className="text-neutral-500" />
                  </button>
                </div>
              </>
            )}

            {/* Chi tiết thư viện Character */}
            {activeLibraryTab === "character" && (
              <div>
                <button
                  type="button"
                  onClick={() => setActiveLibraryTab("none")}
                  className="flex items-center gap-1 px-2 py-1 text-[10.5px] text-sky-400 hover:underline mb-1"
                >
                  ← Quay lại thư viện
                </button>
                <div className="px-2 py-0.5 text-[10.5px] font-semibold text-neutral-300">Nhân vật dự án</div>
                {characterNodes.length === 0 ? (
                  <div className="px-2 py-1 text-[11px] text-neutral-500">Chưa có ảnh nhân vật trên Canvas.</div>
                ) : (
                  characterNodes.map((char) => (
                    <button
                      key={char.id}
                      type="button"
                      onClick={() => insert(`[Nhân vật: ${char.name}]`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11.5px] text-neutral-200 hover:bg-white/10 hover:text-white transition"
                    >
                      {char.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={withBasePath(char.preview)} alt="" className="h-6 w-6 rounded object-cover border border-white/20 shrink-0" />
                      ) : (
                        <User size={14} className="text-neutral-400 shrink-0" />
                      )}
                      <span className="truncate">{char.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}

            {/* Chi tiết thư viện Scene */}
            {activeLibraryTab === "scene" && (
              <div>
                <button
                  type="button"
                  onClick={() => setActiveLibraryTab("none")}
                  className="flex items-center gap-1 px-2 py-1 text-[10.5px] text-emerald-400 hover:underline mb-1"
                >
                  ← Quay lại thư viện
                </button>
                <div className="px-2 py-0.5 text-[10.5px] font-semibold text-neutral-300">Bối cảnh dự án</div>
                {sceneNodes.length === 0 ? (
                  <div className="px-2 py-1 text-[11px] text-neutral-500">Chưa có ảnh bối cảnh trên Canvas.</div>
                ) : (
                  sceneNodes.map((sc) => (
                    <button
                      key={sc.id}
                      type="button"
                      onClick={() => insert(`[Bối cảnh: ${sc.name}]`)}
                      className="flex w-full items-center gap-2 rounded-lg px-2 py-1 text-left text-[11.5px] text-neutral-200 hover:bg-white/10 hover:text-white transition"
                    >
                      {sc.preview ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={withBasePath(sc.preview)} alt="" className="h-6 w-6 rounded object-cover border border-white/20 shrink-0" />
                      ) : (
                        <Film size={14} className="text-neutral-400 shrink-0" />
                      )}
                      <span className="truncate">{sc.name}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
'''

start_mt = text.find('export function MentionTextarea(')
end_mt = text.find('export const GroupNode =')
assert start_mt != -1 and end_mt != -1
text = text[:start_mt] + new_mention_textarea + '\n\n' + text[end_mt:]

# 6. GroupNode Header with Master Drag Handle (Scene 1 Move)
text = text.replace(
    '<div className="nodrag absolute -top-6 left-1 flex items-center gap-1.5 z-10">\n        <input\n          value={groupData.label ?? "New Group"}\n          onChange={(event) => setLabel(event.target.value)}\n          className="bg-transparent text-[12px] font-semibold text-neutral-400 hover:text-white focus:text-white focus:outline-none max-w-[200px] transition cursor-text tracking-wide"\n          placeholder="New Group"\n        />\n      </div>',
    '''{/* Group Title with Master Drag Handle: Positioned cleanly at top-left matching Image 2 */}
      <div className="nodrag absolute -top-7 left-1 flex items-center gap-1.5 z-10">
        <div
          className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-black/70 border border-white/15 text-neutral-300 hover:text-white cursor-grab active:cursor-grabbing backdrop-blur-md shadow-md transition"
          title="Kéo để di chuyển cả nhóm Scene này"
        >
          <Move size={12} className="text-amber-400 shrink-0" />
          <input
            value={groupData.label ?? "Scene 1"}
            onChange={(event) => setLabel(event.target.value)}
            className="bg-transparent text-[11.5px] font-semibold text-neutral-200 hover:text-white focus:text-white focus:outline-none max-w-[160px] transition cursor-text tracking-wide"
            placeholder="Scene 1"
          />
        </div>
      </div>'''
)

with open('components/canvas/nodes.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated components/canvas/nodes.tsx successfully!')
