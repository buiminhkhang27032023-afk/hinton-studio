with open("components/canvas/studio-canvas.tsx", "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update imports
if "Shirt" not in content:
    content = content.replace(
        '  Sparkles,\n  Type,',
        '  Shirt,\n  SplitSquareVertical,\n  Sparkles,\n  Type,'
    )

# 2. Update NODE_LIBRARY
old_library = '''const NODE_LIBRARY = [
  { type: "prompt", icon: Type, label: "Câu lệnh", hint: "Văn bản mô tả", accent: "text-violet-soft" },
  { type: "image", icon: ImageIcon, label: "Ảnh nguồn", hint: "Tải ảnh lên", accent: "text-sky-300" },
  { type: "generate", icon: Wand2, label: "Tạo ảnh", hint: "Text → ảnh", accent: "text-brass-300", data: { modelKind: "image" } },
  { type: "generate", icon: Play, label: "Tạo video", hint: "Ảnh/chữ → video", accent: "text-brass-300", data: { modelKind: "video" } },
  { type: "upscale", icon: ZoomIn, label: "Upscale", hint: "Làm nét ảnh", accent: "text-emerald-300" },
  { type: "train", icon: BrainCircuit, label: "Train model", hint: "Dạy AI bằng ảnh mẫu", accent: "text-fuchsia-300" },
  { type: "result", icon: Check, label: "Kết quả", hint: "Xem trước & tải về", accent: "text-emerald-300" },
] as const;'''

new_library = '''const NODE_LIBRARY = [
  { type: "prompt", icon: Type, label: "Câu lệnh", hint: "Văn bản mô tả", accent: "text-violet-soft" },
  { type: "image", icon: ImageIcon, label: "Ảnh nguồn", hint: "Tải ảnh lên", accent: "text-sky-300" },
  { type: "fashion_tryon", icon: Shirt, label: "Thử đồ AI", hint: "Ghép người + đồ", accent: "text-rose-300" },
  { type: "fashion_compose", icon: SplitSquareVertical, label: "Ghép Lookbook", hint: "Video chia 60:40 (9:16)", accent: "text-amber-300" },
  { type: "generate", icon: Wand2, label: "Tạo ảnh", hint: "Text → ảnh", accent: "text-brass-300", data: { modelKind: "image" } },
  { type: "generate", icon: Play, label: "Tạo video", hint: "Ảnh/chữ → video", accent: "text-brass-300", data: { modelKind: "video" } },
  { type: "upscale", icon: ZoomIn, label: "Upscale", hint: "Làm nét ảnh", accent: "text-emerald-300" },
  { type: "train", icon: BrainCircuit, label: "Train model", hint: "Dạy AI bằng ảnh mẫu", accent: "text-fuchsia-300" },
  { type: "result", icon: Check, label: "Kết quả", hint: "Xem trước & tải về", accent: "text-emerald-300" },
] as const;'''

if "fashion_tryon" not in content:
    content = content.replace(old_library, new_library)

# 3. Update defaultData
old_default = '''  if (type === "train") return { ...base, name: "model-cua-toi", steps: 1000 };
  return base;'''

new_default = '''  if (type === "train") return { ...base, name: "model-cua-toi", steps: 1000 };
  if (type === "fashion_tryon") return { ...base, prompt: "" };
  if (type === "fashion_compose") return { ...base, headline: "HÃY NHỚ", subheadline: "Bí quyết phối đồ" };
  return base;'''

if "headline: \"HÃY NHỚ\"" not in content:
    content = content.replace(old_default, new_default)

# 4. Add loadFashionTemplate
template_code = '''  const loadFashionTemplate = useCallback(() => {
    const templateNodes: StudioNode[] = [
      {
        id: "model_anchor",
        type: "image",
        position: { x: 50, y: 180 },
        data: {
          imageUrl: "/fashion_sources/model_ref_1.jpg",
          status: "done",
        },
      },
      {
        id: "garment_1",
        type: "image",
        position: { x: 50, y: 520 },
        data: {
          imageUrl: "/fashion_sources/garment_1_blazer.jpg",
          status: "done",
        },
      },
      {
        id: "tryon_1",
        type: "fashion_tryon",
        position: { x: 420, y: 300 },
        data: {
          prompt: "Phong cách công sở thanh lịch: Áo blazer tailored màu xám khói, áo thun trắng ôm dáng, thần thái cuốn hút sang trọng",
          status: "idle",
        },
      },
      {
        id: "compose_1",
        type: "fashion_compose",
        position: { x: 820, y: 220 },
        data: {
          headline: "HÃY NHỚ",
          subheadline: "Bí quyết phối đồ",
          videoUrl: "/model2_evening_dress_runway.mp4",
          imageUrl: "/fashion_sources/model_ref_1.jpg",
          garmentUrl: "/fashion_sources/garment_1_blazer.jpg",
          status: "idle",
        },
      },
      {
        id: "result_1",
        type: "result",
        position: { x: 1220, y: 260 },
        data: { status: "idle" },
      },
    ];

    const templateEdges: Edge[] = [
      { id: "e-m-tryon", source: "model_anchor", target: "tryon_1", targetHandle: "model", animated: true },
      { id: "e-g-tryon", source: "garment_1", target: "tryon_1", targetHandle: "garment", animated: true },
      { id: "e-m-comp", source: "model_anchor", target: "compose_1", targetHandle: "model", animated: true },
      { id: "e-g-comp", source: "garment_1", target: "compose_1", targetHandle: "garment", animated: true },
      { id: "e-tryon-comp", source: "tryon_1", target: "compose_1", targetHandle: "video", animated: true },
      { id: "e-comp-res", source: "compose_1", target: "result_1", targetHandle: "in", animated: true },
    ];

    setNodes(templateNodes);
    setEdges(templateEdges);
    toast("Đã nạp quy trình phối đồ thời trang mẫu!", "success");
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 100);
  }, [fitView, setEdges, setNodes, toast]);

'''

if "loadFashionTemplate" not in content:
    target_place = "  /* ------------------------------- drag & drop ------------------------------ */"
    content = content.replace(target_place, template_code + target_place)

# 5. Add template button to header
old_buttons = '''            <Button
              variant="outline"
              size="sm"
              onClick={runSelected}
              disabled={!selectedId || runningAll}
              className="hidden sm:inline-flex"
            >'''

new_buttons = '''            <Button
              variant="outline"
              size="sm"
              onClick={loadFashionTemplate}
              className="text-amber-300 border-amber-500/40 hover:bg-amber-950/30 font-medium"
            >
              <Shirt size={13} className="text-amber-400" />
              Mẫu Phối Đồ
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={runSelected}
              disabled={!selectedId || runningAll}
              className="hidden sm:inline-flex"
            >'''

if "Mẫu Phối Đồ" not in content:
    content = content.replace(old_buttons, new_buttons)

with open("components/canvas/studio-canvas.tsx", "w", encoding="utf-8") as f:
    f.write(content)

print("components/canvas/studio-canvas.tsx patched successfully!")
