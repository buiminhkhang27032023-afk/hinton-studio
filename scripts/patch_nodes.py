import re

with open("components/canvas/nodes.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
if "Shirt" not in content:
    content = content.replace(
        '  BrainCircuit,\n} from "lucide-react";',
        '  BrainCircuit,\n  Shirt,\n  SplitSquareVertical,\n  Layers,\n} from "lucide-react";'
    )

# 2. Add FashionTryOnNode and FashionComposeNode before "/* --------------------------------- helper"
new_nodes = '''/* --------------------------- Fashion Try-On node -------------------------- */

export const FashionTryOnNode = memo(function FashionTryOnNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const run = useRunNode();
  const result = nodeData.result;

  return (
    <div
      className={clsx(NODE_SHELL, "w-[310px]", selected ? "border-brass-500/70" : "border-ink-700/70")}
    >
      <Handle type="target" position={Position.Left} id="model" className="!top-[28%] !bg-rose-400" />
      <Handle type="target" position={Position.Left} id="garment" className="!top-[56%] !bg-amber-400" />
      <Handle type="target" position={Position.Left} id="prompt" className="!top-[84%] !bg-violet-400" />

      <NodeHeader
        icon={Shirt}
        title="Thử Đồ AI (Fashion Try-On)"
        data={nodeData}
        accent="bg-rose-900/40 text-rose-300"
      />

      <div className="space-y-2.5 p-3">
        <div className="flex items-center justify-between text-[11px] text-ink-400">
          <span>Ghép trang phục vào người mẫu</span>
          <span className="rounded bg-rose-500/10 px-1.5 py-0.5 text-[10px] font-medium text-rose-300">Omni / Try-On</span>
        </div>

        <textarea
          className="field nodrag min-h-[64px] text-[12px]"
          placeholder="Mô tả phong cách phối đồ (VD: Áo blazer kết hợp quần âu, phong cách sang trọng catwalk...)"
          value={nodeData.prompt ?? ""}
          onChange={(event) => update({ prompt: event.target.value })}
        />

        <div className="grid grid-cols-2 gap-2 text-[10.5px] text-ink-400">
          <div className="flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-900/60 p-2">
            <span className="h-2 w-2 rounded-full bg-rose-400" />
            <span className="truncate">Cổng: Người mẫu</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-lg border border-ink-800 bg-ink-900/60 p-2">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="truncate">Cổng: Trang phục</span>
          </div>
        </div>

        {result?.url && (
          <div className="overflow-hidden rounded-lg border border-ink-700">
            {result.kind === "video" ? (
              <video src={result.url} controls className="aspect-[9/16] w-full object-cover" />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={result.url} alt="" className="aspect-[4/3] w-full object-cover" />
            )}
          </div>
        )}

        <button
          onClick={() => run(id)}
          disabled={nodeData.status === "running"}
          className="btn-primary nodrag flex w-full items-center justify-center gap-2 py-2 text-[12.5px]"
        >
          {nodeData.status === "running" ? <Loader2 size={12.5} className="animate-spin" /> : <Play size={12.5} />}
          {nodeData.status === "running" ? tr("node.running") : "Chạy Thử Đồ (Try-On)"}
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="result" className="!bg-rose-400" />
    </div>
  );
});

/* ----------------------- Fashion Compose (9:16) Node ---------------------- */

export const FashionComposeNode = memo(function FashionComposeNode({ id, data, selected }: NodeProps) {
  const { tr } = useUi();
  const update = useNodeUpdater(id);
  const nodeData = data as StudioNodeData;
  const run = useRunNode();
  const result = nodeData.result;

  return (
    <div
      className={clsx(NODE_SHELL, "w-[320px]", selected ? "border-brass-500/70" : "border-ink-700/70")}
    >
      <Handle type="target" position={Position.Left} id="video" className="!top-[26%] !bg-sky-400" />
      <Handle type="target" position={Position.Left} id="model" className="!top-[50%] !bg-rose-400" />
      <Handle type="target" position={Position.Left} id="garment" className="!top-[74%] !bg-amber-400" />

      <NodeHeader
        icon={SplitSquareVertical}
        title="Ghép Lookbook (9:16)"
        data={nodeData}
        accent="bg-amber-900/40 text-amber-300"
      />

      <div className="space-y-2.5 p-3">
        <div className="flex items-center justify-between text-[11px] text-ink-400">
          <span>Bố cục TikTok Split (60:40)</span>
          <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">1080x1920</span>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-ink-300">Tiêu đề chính (Banner):</label>
          <input
            type="text"
            className="field nodrag text-[12px] font-bold tracking-wide"
            placeholder="VD: HÃY NHỚ"
            value={nodeData.headline ?? "HÃY NHỚ"}
            onChange={(e) => update({ headline: e.target.value })}
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-medium text-ink-300">Tiêu đề phụ:</label>
          <input
            type="text"
            className="field nodrag text-[12px] text-amber-300"
            placeholder="VD: Bí quyết phối đồ"
            value={nodeData.subheadline ?? "Bí quyết phối đồ"}
            onChange={(e) => update({ subheadline: e.target.value })}
          />
        </div>

        <div className="rounded-lg border border-ink-800 bg-ink-900/70 p-2 text-[10.5px] text-ink-400 space-y-1">
          <div className="flex items-center gap-1.5 text-ink-300 font-medium">
            <Layers size={11} className="text-amber-400" /> Cổng kết nối (3 luồng):
          </div>
          <div className="leading-tight text-ink-400">
            • <b>Video</b> (Trái 60%): Người mẫu chuyển động<br/>
            • <b>Người mẫu</b> (Phải trên 50%): Ảnh chân dung<br/>
            • <b>Trang phục</b> (Phải dưới 50%): Ảnh sản phẩm
          </div>
        </div>

        {result?.url && (
          <div className="overflow-hidden rounded-lg border border-brass-500/50">
            <video src={result.url} controls className="aspect-[9/16] w-full object-cover" />
          </div>
        )}

        <button
          onClick={() => run(id)}
          disabled={nodeData.status === "running"}
          className="btn-primary nodrag flex w-full items-center justify-center gap-2 py-2 text-[12.5px] font-medium"
        >
          {nodeData.status === "running" ? <Loader2 size={12.5} className="animate-spin" /> : <Play size={12.5} />}
          {nodeData.status === "running" ? tr("node.running") : "Xuất Video Lookbook 9:16"}
        </button>
      </div>

      <Handle type="source" position={Position.Right} id="result" className="!bg-amber-400" />
    </div>
  );
});

'''

if "FashionTryOnNode" not in content:
    target = "/* --------------------------------- helper -------------------------------- */"
    content = content.replace(target, new_nodes + target)

# 3. Update NODE_TYPES
if "fashion_tryon" not in content:
    content = content.replace(
        "export const NODE_TYPES = {\n  prompt: PromptNode,\n  image: ImageNode,\n  generate: GenerateNode,\n  upscale: UpscaleNode,\n  train: TrainNode,\n  result: OutputNode,\n};",
        "export const NODE_TYPES = {\n  prompt: PromptNode,\n  image: ImageNode,\n  generate: GenerateNode,\n  upscale: UpscaleNode,\n  train: TrainNode,\n  result: OutputNode,\n  fashion_tryon: FashionTryOnNode,\n  fashion_compose: FashionComposeNode,\n};"
    )

with open("components/canvas/nodes.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("components/canvas/nodes.tsx patched successfully!")
