# 1. Update studio-canvas.tsx
with open('components/canvas/studio-canvas.tsx', 'r', encoding='utf-8') as f:
    text_canvas = f.read().replace('\r\n', '\n')

old_connect_end = '''  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      setLinkDrag(null);
      if (reconnecting.current || state.toNode || !state.fromNode) return;
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) return;
      // The mouseup that ends a drag can also emit a pane click and dismiss the menu.
      ignorePaneClick.current = true;
      window.setTimeout(() => {
        ignorePaneClick.current = false;
      }, 80);
      openAddAt(point.clientX, point.clientY, {
        nodeId: state.fromNode.id,
        handleId: state.fromHandle?.id ?? null,
        handleType: state.fromHandle?.type === "target" ? "target" : "source",
      });
    },
    [openAddAt],
  );'''

new_connect_end = '''  const onConnectEnd = useCallback(
    (event: MouseEvent | TouchEvent, state: FinalConnectionState) => {
      setLinkDrag(null);
      if (reconnecting.current || !state.fromNode) return;
      const point = "changedTouches" in event ? event.changedTouches[0] : event;
      if (!point) return;

      // 1. Kéo vào bất kỳ vị trí nào bên trong khối (card) là tự động nhận, không bắt buộc trúng điểm chấm tròn
      const elementUnderCursor = document.elementFromPoint(point.clientX, point.clientY);
      const targetNodeEl = elementUnderCursor?.closest<HTMLElement>(".react-flow__node");

      if (targetNodeEl) {
        const targetNodeId = targetNodeEl.getAttribute("data-id");
        if (targetNodeId && targetNodeId !== state.fromNode.id) {
          const isFromTarget = state.fromHandle?.type === "target";
          const sourceId = isFromTarget ? targetNodeId : state.fromNode.id;
          const targetId = isFromTarget ? state.fromNode.id : targetNodeId;
          const sourceHandle = isFromTarget ? HANDLE_OUT : (state.fromHandle?.id || HANDLE_OUT);
          const targetHandle = isFromTarget ? (state.fromHandle?.id || HANDLE_IN) : HANDLE_IN;

          const connection: Connection = {
            source: sourceId,
            target: targetId,
            sourceHandle,
            targetHandle,
          };

          if (isValidConnection(connection)) {
            const alreadyExists = edges.some(
              (e) => e.source === sourceId && e.target === targetId
            );
            if (!alreadyExists) {
              onConnect(connection);
              toast("Đã kết nối khối thành công!", "success");
            }
            return;
          } else {
            toast("Hai khối này không tương thích kiểu dữ liệu đầu vào/ra.", "default");
            return;
          }
        }
      }

      if (state.toNode) return;

      // 2. Nhả chuột ra ngoài khoảng trống canvas mới hiện popup gợi ý thêm khối
      ignorePaneClick.current = true;
      window.setTimeout(() => {
        ignorePaneClick.current = false;
      }, 80);
      openAddAt(point.clientX, point.clientY, {
        nodeId: state.fromNode.id,
        handleId: state.fromHandle?.id ?? null,
        handleType: state.fromHandle?.type === "target" ? "target" : "source",
      });
    },
    [edges, isValidConnection, onConnect, openAddAt, toast],
  );'''

assert old_connect_end in text_canvas, "old_connect_end not found"
text_canvas = text_canvas.replace(old_connect_end, new_connect_end)

# Also increase connectionRadius to 60px
text_canvas = text_canvas.replace('connectionRadius={48}', 'connectionRadius={60}')
text_canvas = text_canvas.replace('reconnectRadius={24}', 'reconnectRadius={40}')

with open('components/canvas/studio-canvas.tsx', 'w', encoding='utf-8') as f:
    f.write(text_canvas)
print('Updated studio-canvas.tsx successfully!')

# 2. Update NodePorts in components/canvas/nodes.tsx
with open('components/canvas/nodes.tsx', 'r', encoding='utf-8') as f:
    text_nodes = f.read().replace('\r\n', '\n')

old_ports = '''function NodePorts({ out, accept }: { out?: PortKind | null; accept?: string | null }) {
  const hasAccept = Boolean(accept && accept.trim().length > 0);
  const hasOut = Boolean(out);

  return (
    <>
      {hasAccept && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          title="Đầu vào"
          data-accept={accept}
          className="!h-2.5 !w-2.5 !border-2 !border-[#121216] !bg-neutral-400 hover:!bg-sky-400 hover:!scale-125 transition-all !cursor-crosshair"
        />
      )}
      {hasOut && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          title="Đầu ra"
          data-port={out}
          className="!h-2.5 !w-2.5 !border-2 !border-[#121216] !bg-neutral-400 hover:!bg-amber-400 hover:!scale-125 transition-all !cursor-crosshair"
        />
      )}
    </>
  );
}'''

new_ports = '''function NodePorts({ out, accept }: { out?: PortKind | null; accept?: string | null }) {
  const hasAccept = Boolean(accept && accept.trim().length > 0);
  const hasOut = Boolean(out);

  return (
    <>
      {hasAccept && (
        <Handle
          type="target"
          position={Position.Left}
          id="in"
          title="Đầu vào (Hoặc thả trực tiếp vào khối)"
          data-accept={accept}
          className="!h-3 !w-3 !border-2 !border-[#121216] !bg-neutral-400 hover:!bg-sky-400 hover:!scale-125 transition-all !cursor-crosshair before:content-[''] before:absolute before:-inset-4 before:rounded-full"
        />
      )}
      {hasOut && (
        <Handle
          type="source"
          position={Position.Right}
          id="out"
          title="Đầu ra"
          data-port={out}
          className="!h-3 !w-3 !border-2 !border-[#121216] !bg-neutral-400 hover:!bg-amber-400 hover:!scale-125 transition-all !cursor-crosshair before:content-[''] before:absolute before:-inset-4 before:rounded-full"
        />
      )}
    </>
  );
}'''

assert old_ports in text_nodes, "old_ports not found"
text_nodes = text_nodes.replace(old_ports, new_ports)

with open('components/canvas/nodes.tsx', 'w', encoding='utf-8') as f:
    f.write(text_nodes)
print('Updated nodes.tsx successfully!')

# 3. Add visual highlight to app/globals.css
with open('app/globals.css', 'r', encoding='utf-8') as f:
    text_css = f.read().replace('\r\n', '\n')

css_highlight = '''
/* Hiệu ứng viền sáng khi kéo dây nối lướt qua bất kỳ khối nào */
.rf-connecting .react-flow__node:hover > div {
  box-shadow: 0 0 0 2px rgba(56, 189, 248, 0.9), 0 0 25px rgba(56, 189, 248, 0.3) !important;
  cursor: copy !important;
}
'''

if '.rf-connecting .react-flow__node:hover' not in text_css:
    text_css += css_highlight
    with open('app/globals.css', 'w', encoding='utf-8') as f:
        f.write(text_css)
    print('Updated globals.css successfully!')
