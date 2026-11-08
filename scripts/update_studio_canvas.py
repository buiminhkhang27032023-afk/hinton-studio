with open(r'd:\phim ai thời trang\components\canvas\studio-canvas.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update reuseNode
target_reuse = '''  const reuseNode = useCallback(
    (nodeId: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      const data = target.data as StudioNodeData;
      const url = data.result?.url || data.imageUrl || data.videoUrl;
      const kind = data.result?.kind || (data.videoUrl ? "video" : "image");
      if (!url) {
        toast("Khối này chưa có hình ảnh hoặc video để dùng lại", "default");
        return;
      }
      const isVid = kind === "video" || /\\.(mp4|webm|mov)(\\?|$)/i.test(url);
      const spot = {
        x: target.position.x + 280,
        y: target.position.y,
      };
      const name = `Dùng lại: ${target.data?.name || (isVid ? "Video" : "Ảnh")}`;'''

replace_reuse = '''  const reuseNode = useCallback(
    (nodeId: string, customUrl?: string, customKind?: "image" | "video", customName?: string) => {
      const target = nodes.find((n) => n.id === nodeId);
      if (!target) return;
      const data = target.data as StudioNodeData;
      const url = customUrl || data.result?.url || data.imageUrl || data.videoUrl;
      const kind = customKind || data.result?.kind || (data.videoUrl ? "video" : "image");
      if (!url) {
        toast("Khối này chưa có hình ảnh hoặc video để dùng lại", "default");
        return;
      }
      const isVid = kind === "video" || /\\.(mp4|webm|mov)(\\?|$)/i.test(url);
      const spot = {
        x: target.position.x + 280,
        y: target.position.y,
      };
      const name = customName || (customUrl ? `Khung hình cắt: ${target.data?.name || "Video"}` : `Dùng lại: ${target.data?.name || (isVid ? "Video" : "Ảnh")}`);'''

code = code.replace(target_reuse.replace('\n', '\r\n'), replace_reuse.replace('\n', '\r\n'))
if replace_reuse not in code and target_reuse in code:
    code = code.replace(target_reuse, replace_reuse)

# 2. Update defaultData
target_default = '''  if (type === "audio") return { ...base, text: "Giọng đọc truyền cảm, âm thanh sống động…", name: "Âm thanh" };
  if (type === "3d") return { ...base, text: "3D camera orbit 360 degree, depth scene…", name: "Studio 3D" };'''

replace_default = '''  if (type === "audio" || type === "voice") return { ...base, text: "Giọng đọc truyền cảm, âm thanh sống động…", name: "Giọng nói & Âm thanh", voice: "nova" };
  if (type === "3d" || type === "model3d") return { ...base, preset: "mannequin", name: "Mô hình 3D Tham Chiếu" };'''

code = code.replace(target_default.replace('\n', '\r\n'), replace_default.replace('\n', '\r\n'))
if replace_default not in code and target_default in code:
    code = code.replace(target_default, replace_default)

with open(r'd:\phim ai thời trang\components\canvas\studio-canvas.tsx', 'w', encoding='utf-8', newline='') as f:
    f.write(code)

print("Updated studio-canvas.tsx successfully!")
