# 1. Update components/canvas/nodes.tsx
with open('components/canvas/nodes.tsx', 'r', encoding='utf-8') as f:
    text_nodes = f.read().replace('\r\n', '\n')

# Ensure editor only shows when selected
old_editor_block = '''      {/* KHUNG THAO TÁC (EDITOR) ĐƯA HẾT XUỐNG DƯỚI NHƯ TAPNOW TRONG ẢNH 1 */}
      {editor && (
        <div className="mt-2.5 rounded-2xl border border-white/10 bg-[#121217]/95 p-3 shadow-2xl backdrop-blur-md">
          {editor}
        </div>
      )}'''

new_editor_block = '''      {/* KHUNG THAO TÁC (EDITOR) CHỈ HIỆN KHI BẤM CHỌN THẺ (SELECTED) */}
      {selected && editor && (
        <div className="mt-2.5 rounded-2xl border border-white/10 bg-[#121217]/95 p-3 shadow-2xl backdrop-blur-md">
          {editor}
        </div>
      )}'''

assert old_editor_block in text_nodes, "old_editor_block not found"
text_nodes = text_nodes.replace(old_editor_block, new_editor_block)

# Ensure clicking image preview ALWAYS opens lightbox to VIEW the image (not download or upload)
old_img_click = '''        ) : activePreview ? (
          <div
            className="h-full w-full cursor-pointer bg-neutral-950"
            onClick={() => {
              if (onMediaClick) onMediaClick();
              else openLightbox({ url: activePreview!, kind: "image", title: data.name || label });
            }}
          >'''

new_img_click = '''        ) : activePreview ? (
          <div
            className="h-full w-full cursor-pointer bg-neutral-950"
            onClick={(e) => {
              e.stopPropagation();
              openLightbox({ url: activePreview!, kind: "image", title: data.name || label });
            }}
          >'''

assert old_img_click in text_nodes, "old_img_click not found"
text_nodes = text_nodes.replace(old_img_click, new_img_click)

# When placeholder is empty, clicking triggers onMediaClick
old_empty_placeholder = '''        ) : (
          <span className="grid h-full place-items-center text-white/25">
            {busy || data.status === "running" ? <Loader2 size={24} className="animate-spin text-amber-400" /> : <Icon size={28} strokeWidth={1.3} />}
          </span>
        )'''

new_empty_placeholder = '''        ) : (
          <div
            className="grid h-full place-items-center text-white/25 cursor-pointer hover:text-white/40 transition"
            onClick={() => onMediaClick?.()}
          >
            {busy || data.status === "running" ? <Loader2 size={24} className="animate-spin text-amber-400" /> : <Icon size={28} strokeWidth={1.3} />}
          </div>
        )'''

assert old_empty_placeholder in text_nodes, "old_empty_placeholder not found"
text_nodes = text_nodes.replace(old_empty_placeholder, new_empty_placeholder)

with open('components/canvas/nodes.tsx', 'w', encoding='utf-8') as f:
    f.write(text_nodes)

print('Updated nodes.tsx successfully!')

# 2. Update components/canvas/studio-canvas.tsx to remove right-hand Inspector sidebar
with open('components/canvas/studio-canvas.tsx', 'r', encoding='utf-8') as f:
    text_canvas = f.read().replace('\r\n', '\n')

old_auto_inspect = '''  useEffect(() => {
    if (selectedId) {
      const node = nodesRef.current.find((n) => n.id === selectedId);
      if (node && node.type !== "group") {
        setInspectedId(selectedId);
      }
    }
  }, [selectedId]);'''

new_auto_inspect = '''  // Auto-inspect disabled: docked TapNow editor directly on node handles all controls
  useEffect(() => {
    // Keep inspectedId null so right sidebar drawer does not cover the canvas
  }, [selectedId]);'''

if old_auto_inspect in text_canvas:
    text_canvas = text_canvas.replace(old_auto_inspect, new_auto_inspect)
    print('Disabled auto-inspect effect in studio-canvas.tsx')

# Remove <Inspector ... /> JSX element
old_inspector_jsx = '''      <Inspector
        node={inspectedNode}
        nodes={nodes}
        edges={edges}
        onPatch={patchNode}
        onRun={() => (inspectedNode ? runNode(inspectedNode.id) : runSelected())}
        onReuse={handleReuseMedia}
        onClose={() => {
          setInspectedId(null);
          setSelectedId(null);
        }}
      />'''

if old_inspector_jsx in text_canvas:
    text_canvas = text_canvas.replace(old_inspector_jsx, '{/* Right sidebar inspector removed per user request */}')
    print('Removed Inspector JSX in studio-canvas.tsx')

with open('components/canvas/studio-canvas.tsx', 'w', encoding='utf-8') as f:
    f.write(text_canvas)

print('Updated studio-canvas.tsx successfully!')
