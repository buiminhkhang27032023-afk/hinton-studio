# 1. Fix app/api/fashion/compose/route.ts
with open("app/api/fashion/compose/route.ts", "r", encoding="utf-8") as f:
    r_content = f.read()

r_target = """    try {
      fs.removeSync ? fs.removeSync(tempOut) : fs.unlinkSync(tempOut);
    } catch {
      /* ignore temp cleanup */
    }"""

r_repl = """    try {
      if (fs.existsSync(tempOut)) {
        fs.unlinkSync(tempOut);
      }
    } catch {
      /* ignore temp cleanup */
    }"""

if r_target in r_content:
    r_content = r_content.replace(r_target, r_repl)
    with open("app/api/fashion/compose/route.ts", "w", encoding="utf-8") as f:
        f.write(r_content)
    print("Fixed app/api/fashion/compose/route.ts")

# 2. Fix components/canvas/studio-canvas.tsx
with open("components/canvas/studio-canvas.tsx", "r", encoding="utf-8") as f:
    c_content = f.read()

template_code = """  const loadFashionTemplate = useCallback(() => {
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

"""

c_target = "  /* -------------------------------- drop zone ----------------------------- */"
if c_target in c_content and "const loadFashionTemplate" not in c_content:
    c_content = c_content.replace(c_target, template_code + c_target)
    with open("components/canvas/studio-canvas.tsx", "w", encoding="utf-8") as f:
        f.write(c_content)
    print("Fixed components/canvas/studio-canvas.tsx")
