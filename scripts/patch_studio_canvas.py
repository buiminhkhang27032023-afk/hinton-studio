with open('components/canvas/studio-canvas.tsx', 'r', encoding='utf-8') as f:
    text = f.read().replace('\r\n', '\n')

# Check if handleMultiDragStart already exists
if 'handleMultiDragStart' not in text:
    target_fn = '  }, [nodes, selectedIds, setNodes, getViewport, toast]);\n'
    drag_code = '''
  const handleMultiDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const startX = e.clientX;
      const startY = e.clientY;
      const zoom = getViewport().zoom || 1;
      const initialPositions = new Map(
        nodes.filter((n) => selectedIds.includes(n.id)).map((n) => [n.id, { ...n.position }])
      );
      const onMouseMove = (moveEvent: MouseEvent) => {
        const dx = (moveEvent.clientX - startX) / zoom;
        const dy = (moveEvent.clientY - startY) / zoom;
        setNodes((curr) =>
          curr.map((n) => {
            const init = initialPositions.get(n.id);
            if (init) {
              return {
                ...n,
                position: { x: Math.round(init.x + dx), y: Math.round(init.y + dy) },
              };
            }
            return n;
          })
        );
      };
      const onMouseUp = () => {
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup", onMouseUp);
        pushSnapshot();
      };
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onMouseUp);
    },
    [getViewport, nodes, pushSnapshot, selectedIds, setNodes],
  );
'''
    assert target_fn in text, "target_fn not found in studio-canvas.tsx"
    text = text.replace(target_fn, target_fn + drag_code, 1)

# Now add drag handle button to the Floating Selection Dock
target_dock = '<span className="text-neutral-400 font-medium px-1">Đã chọn {selectedIds.length} khối</span>\n                  <span className="h-3.5 w-px bg-white/15 mx-0.5" />'
drag_button = '''<span className="text-neutral-400 font-medium px-1">Đã chọn {selectedIds.length} khối</span>
                  <span className="h-3.5 w-px bg-white/15 mx-0.5" />
                  <div
                    className="flex items-center gap-1.5 rounded-full bg-brass-500/20 border border-brass-400/40 text-brass-300 hover:bg-brass-500 hover:text-black px-2.5 py-1 text-[11.5px] font-semibold cursor-grab active:cursor-grabbing select-none transition"
                    onMouseDown={handleMultiDragStart}
                    title="Bấm giữ và rê chuột để kéo đồng thời toàn bộ các khối đã chọn"
                  >
                    <Move size={13} className="shrink-0" />
                    <span>Kéo cả nhóm ({selectedIds.length})</span>
                  </div>'''

if 'Kéo cả nhóm' not in text:
    assert target_dock in text, "target_dock not found"
    text = text.replace(target_dock, drag_button, 1)

with open('components/canvas/studio-canvas.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print('Updated studio-canvas.tsx with Master Drag Handle!')
