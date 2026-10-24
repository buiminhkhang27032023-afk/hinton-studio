"use client";

import { withBasePath } from "@/lib/base-path";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  addEdge,
  ConnectionLineType,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  reconnectEdge,
  useConnection,
  useEdgesState,
  useNodesState,
  useReactFlow,
  useViewport,
  type Connection,
  type Edge,
  type FinalConnectionState,
  type OnConnectStartParams,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import {
  BrainCircuit,
  Check,
  Clapperboard,
  Image as ImageIcon,
  Layers,
  Loader2,
  Play,
  Plus,
  Shirt,
  SplitSquareVertical,
  Sparkles,
  Type,
  Wand2,
  ZoomIn,
  Copy,
  Trash2,
  Minus,
  Undo2,
  Redo2,
  Upload,
  Bot,
} from "lucide-react";
import clsx from "clsx";
import { CanvasCopilot } from "@/components/canvas/canvas-copilot";
import { api } from "@/lib/api-client";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";
import { runStudioNode, type StudioNode, type StudioNodeData } from "@/lib/execute";
import type { ProjectSummary } from "@/lib/types";
import { Spinner } from "@/components/ui/primitives";
import { NODE_TYPES } from "./nodes";
import { Inspector } from "./inspector";
import { NodeMenuContext, RunNodeContext } from "./run-context";
import { StudioConnectionLine, StudioEdge } from "./studio-edge";
import {
  HANDLE_IN,
  HANDLE_OUT,
  accepts,
  kindsCompatible,
  outputKind,
  targetHandleFor,
  type PortKind,
} from "./ports";

// Stable references — inline objects here make React Flow re-subscribe every render.
const FIT_VIEW_OPTIONS = { padding: 0.3 } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;
const DEFAULT_EDGE_OPTIONS = { type: "studio", animated: false, style: { stroke: "#d4d4d4", strokeWidth: 1.5 } } as const;
const EDGE_TYPES = { studio: StudioEdge };

type AddMenuState = {
  x: number;
  y: number;
  flow: { x: number; y: number };
  connect?: {
    nodeId: string;
    handleId: string | null;
    handleType: "source" | "target";
  };
};

type LinkDrag = { from: "source"; out: PortKind } | { from: "target"; accepts: string };

const LEGACY_HANDLES = new Set(["model", "model_image", "garment", "garment_image", "video", "prompt", "image", "images"]);

/** Every wire uses the single in/out handles. Old port names are kept only as a role hint. */
function decorateEdge(edge: Edge, _list?: unknown): Edge {
  const data = { ...(edge.data as Record<string, unknown> | undefined) };
  const prev = typeof edge.targetHandle === "string" ? edge.targetHandle : "";
  const stored = typeof data.legacyHandle === "string" ? data.legacyHandle : "";
  const legacy = LEGACY_HANDLES.has(stored) ? stored : LEGACY_HANDLES.has(prev) ? prev : "";
  if (legacy) data.legacyHandle = legacy;
  else delete data.legacyHandle;
  return {
    ...edge,
    type: "studio",
    animated: false,
    sourceHandle: edge.sourceHandle || HANDLE_OUT,
    targetHandle: edge.targetHandle || HANDLE_IN,
    data,
    style: { stroke: "#d4d4d4", strokeWidth: 1.5 },
  };
}

function minimapColor(): string {
  return "#a3a3a3";
}

const NODE_LIBRARY = [
  { type: "prompt", icon: Type, label: "Câu lệnh", hint: "Văn bản mô tả", accent: "text-violet-soft" },
  { type: "prompt_master", icon: Sparkles, label: "Trợ lý Bậc Thầy", hint: "Tối ưu hóa câu lệnh AI", accent: "text-amber-300" },
  { type: "image", icon: ImageIcon, label: "Ảnh nguồn", hint: "Tải ảnh lên", accent: "text-sky-300" },
  { type: "fashion_tryon", icon: Shirt, label: "Thử đồ AI", hint: "Ghép người + đồ", accent: "text-rose-300" },
  { type: "fashion_compose", icon: SplitSquareVertical, label: "Ghép Lookbook", hint: "Video chia 60:40 (9:16)", accent: "text-amber-300" },
  { type: "generate", icon: Wand2, label: "Tạo ảnh", hint: "Text → ảnh", accent: "text-brass-300", data: { modelKind: "image" } },
  { type: "generate", icon: Play, label: "Tạo video", hint: "Ảnh/chữ → video", accent: "text-brass-300", data: { modelKind: "video" } },
  { type: "upscale", icon: ZoomIn, label: "Upscale", hint: "Làm nét ảnh", accent: "text-emerald-300" },
  { type: "train", icon: BrainCircuit, label: "Train model", hint: "Dạy AI bằng ảnh mẫu", accent: "text-fuchsia-300" },
  { type: "result", icon: Check, label: "Kết quả", hint: "Xem trước & tải về", accent: "text-emerald-300" },
] as const;

type LibItem = (typeof NODE_LIBRARY)[number];

function itemData(item: LibItem): { modelKind?: string } | undefined {
  return "data" in item ? item.data : undefined;
}

function defaultData(type: string, extra?: Record<string, unknown>): StudioNodeData {
  const base: StudioNodeData = { status: "idle" };
  if (type === "prompt") return { ...base, text: "" };
  if (type === "prompt_master") return { ...base, text: "", masterPromptEnabled: true };
  if (type === "image") return { ...base };
  if (type === "generate") {
    const isVideo = (extra as any)?.modelKind === "video";
    return {
      ...base,
      prompt: "",
      aspect: isVideo ? "16:9" : "1:1",
      duration: isVideo ? 10 : 5,
      modelKind: isVideo ? "video" : "image",
      modelId: isVideo ? "iooai:omni_flash_10s" : "req/gpt-image-2",
      resolution: isVideo ? "720p" : "1080p",
    };
  }
  if (type === "upscale") return { ...base, scale: 2 };
  if (type === "train") return { ...base, name: "model-cua-toi", steps: 1000 };
  if (type === "fashion_tryon") return { ...base, prompt: "", modelId: "seed:image:gemini-compose" };
  if (type === "fashion_compose") return { ...base, headline: "HÃY NHỚ", subheadline: "Bí quyết phối đồ" };
  return base;
}

function CanvasInner({ project }: { project: ProjectSummary }) {
  const { tr, toast } = useUi();
  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [menu, setMenu] = useState<{ x: number; y: number; nodeId: string } | null>(null);
  const [addMenu, setAddMenu] = useState<AddMenuState | null>(null);
  const [linkDrag, setLinkDrag] = useState<LinkDrag | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [runningAll, setRunningAll] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const reconnecting = useRef(false);
  const lastPaneClick = useRef(0);
  const ignorePaneClick = useRef(false);
  const { screenToFlowPosition, fitView, getViewport } = useReactFlow();

  // Undo / Redo history stacks
  const historyRef = useRef<{ nodes: StudioNode[]; edges: Edge[] }[]>([]);
  const redoRef = useRef<{ nodes: StudioNode[]; edges: Edge[] }[]>([]);
  const isUndoRedoAction = useRef(false);

  const pushSnapshot = useCallback(() => {
    if (isUndoRedoAction.current) return;
    historyRef.current.push({
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    });
    if (historyRef.current.length > 50) historyRef.current.shift();
    redoRef.current = [];
  }, [nodes, edges]);

  const undo = useCallback(() => {
    if (historyRef.current.length === 0) {
      toast("Không còn thao tác nào để hoàn tác", "default");
      return;
    }
    const current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    redoRef.current.push(current);

    const prev = historyRef.current.pop()!;
    isUndoRedoAction.current = true;
    setNodes(prev.nodes);
    setEdges(prev.edges);
    toast("Đã hoàn tác (Ctrl+Z)", "success");
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 100);
  }, [nodes, edges, setEdges, setNodes, toast]);

  const redo = useCallback(() => {
    if (redoRef.current.length === 0) {
      toast("Không có thao tác nào để làm lại", "default");
      return;
    }
    const current = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    historyRef.current.push(current);

    const next = redoRef.current.pop()!;
    isUndoRedoAction.current = true;
    setNodes(next.nodes);
    setEdges(next.edges);
    toast("Đã làm lại (Ctrl+Y)", "success");
    setTimeout(() => {
      isUndoRedoAction.current = false;
    }, 100);
  }, [nodes, edges, setEdges, setNodes, toast]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeEl = document.activeElement;
      const isInput =
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          (activeEl as HTMLElement).isContentEditable);

      if (isInput) return;

      const isMac = typeof navigator !== "undefined" && navigator.platform.toUpperCase().indexOf("MAC") >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier && e.key.toLowerCase() === "z" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        undo();
      } else if (
        (modifier && e.key.toLowerCase() === "y") ||
        (modifier && e.key.toLowerCase() === "z" && e.shiftKey)
      ) {
        e.preventDefault();
        e.stopPropagation();
        redo();
      }
    };

    window.addEventListener("keydown", handleKeyDown, true);
    return () => window.removeEventListener("keydown", handleKeyDown, true);
  }, [undo, redo]);

  const handleNodesChange = useCallback(
    (changes: Parameters<typeof onNodesChange>[0]) => {
      if (changes.some((c) => c.type === "remove")) {
        pushSnapshot();
      }
      onNodesChange(changes);
    },
    [onNodesChange, pushSnapshot],
  );

  const handleEdgesChange = useCallback(
    (changes: Parameters<typeof onEdgesChange>[0]) => {
      if (changes.some((c) => c.type === "remove")) {
        pushSnapshot();
      }
      onEdgesChange(changes);
    },
    [onEdgesChange, pushSnapshot],
  );

  const onNodeDragStart = useCallback(() => {
    pushSnapshot();
  }, [pushSnapshot]);


  /* ------------------------------ persistence ----------------------------- */

  useEffect(() => {
    let cancelled = false;
    api.projects
      .graph(project.id)
      .then((graph) => {
        if (cancelled) return;
        const loadedNodes = (graph.nodes as StudioNode[]) ?? [];
        setNodes(loadedNodes);
        setEdges(((graph.edges as Edge[]) ?? []).map((edge) => decorateEdge(edge, loadedNodes)));
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
    return () => {
      cancelled = true;
    };
  }, [project.id, setEdges, setNodes]);

  const persist = useCallback(() => {
    setSaveState("saving");
    const payload = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
      })),
      edges: edges.map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle || HANDLE_OUT,
        targetHandle: edge.targetHandle || HANDLE_IN,
        data: edge.data,
      })),
      viewport: getViewport(),
    };
    api.projects
      .saveGraph(project.id, payload as never)
      .then(() => {
        setSaveState("saved");
        setTimeout(() => setSaveState("idle"), 1600);
      })
      .catch(() => setSaveState("idle"));
  }, [edges, getViewport, nodes, project.id]);

  const dirtyRef = useRef(false);
  const persistRef = useRef(persist);
  persistRef.current = persist;

  // Debounced autosave with immediate flush on unmount or tab switch
  useEffect(() => {
    if (!loaded) return;
    dirtyRef.current = true;
    const timer = setTimeout(() => {
      persist();
      dirtyRef.current = false;
    }, 900);
    return () => {
      clearTimeout(timer);
      if (dirtyRef.current) {
        persistRef.current();
        dirtyRef.current = false;
      }
    };
  }, [nodes, edges, loaded, persist]);

  // Flush on visibilitychange (when user switches browser tabs)
  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden" && dirtyRef.current) {
        persistRef.current();
        dirtyRef.current = false;
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  /* --------------------------------- nodes -------------------------------- */

  const addNode = useCallback(
    (type: string, position?: { x: number; y: number }, extra?: Record<string, unknown>) => {
      pushSnapshot();
      const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
      const spot =
        position ??
        screenToFlowPosition({
          x: (wrapper.current?.clientWidth ?? 900) / 2 - 140 + Math.random() * 80,
          y: (wrapper.current?.clientHeight ?? 700) / 2 - 100 + Math.random() * 60,
        });
      setNodes((current) => [
        ...current,
        {
          id,
          type,
          position: spot,
          data: { ...defaultData(type, extra), ...extra },
        } as StudioNode,
      ]);
      setSelectedId(id);
      return id;
    },
    [screenToFlowPosition, setNodes],
  );

  const handleAddPromptFromCopilot = useCallback(
    (promptText: string) => {
      addNode("prompt", undefined, { text: promptText });
    },
    [addNode],
  );

  const handleAddStoryboardFromCopilot = useCallback(
    (scenes: Array<{ title: string; prompt: string; modelKind?: "image" | "video" }>) => {
      pushSnapshot();
      const center = screenToFlowPosition({
        x: (wrapper.current?.clientWidth ?? 900) / 2 - 280,
        y: (wrapper.current?.clientHeight ?? 700) / 2 - 160,
      });

      const newNodes: StudioNode[] = [];
      const newEdges: Edge[] = [];

      scenes.forEach((sc, idx) => {
        const promptId = `prompt-copilot-${Date.now()}-${idx}`;
        const genId = `gen-copilot-${Date.now()}-${idx}`;
        const isVideo = sc.modelKind !== "image";
        const yOffset = idx * 240;

        // Prompt Node
        newNodes.push({
          id: promptId,
          type: "prompt",
          position: { x: center.x, y: center.y + yOffset },
          data: {
            ...defaultData("prompt"),
            text: sc.prompt,
          },
        } as StudioNode);

        // Generate Node (placed to the right)
        newNodes.push({
          id: genId,
          type: "generate",
          position: { x: center.x + 360, y: center.y + yOffset },
          data: {
            ...defaultData("generate", { modelKind: isVideo ? "video" : "image" }),
            prompt: sc.prompt,
            modelKind: isVideo ? "video" : "image",
            modelId: isVideo ? "iooai:omni_flash_10s" : "req/gpt-image-2",
          },
        } as StudioNode);

        // Connect Prompt Node to Generate Node
        newEdges.push({
          id: `edge-${promptId}-${genId}`,
          source: promptId,
          sourceHandle: "out",
          target: genId,
          targetHandle: "in",
          type: "studio",
          style: { stroke: "#d4d4d4", strokeWidth: 1.5 },
        });
      });

      setNodes((curr) => [...curr, ...newNodes]);
      setEdges((curr) => [...curr, ...newEdges]);
      if (newNodes.length > 0) {
        setSelectedId(newNodes[0].id);
      }
    },
    [screenToFlowPosition, setNodes, setEdges, pushSnapshot],
  );

  const handleUpdateSelectedNodeText = useCallback(
    (newText: string) => {
      if (!selectedId) return;
      pushSnapshot();
      setNodes((curr) =>
        curr.map((n) => {
          if (n.id !== selectedId) return n;
          if (n.type === "prompt" || n.type === "prompt_master") {
            return { ...n, data: { ...n.data, text: newText } };
          }
          if (n.type === "generate" || n.type === "fashion_tryon") {
            return { ...n, data: { ...n.data, prompt: newText } };
          }
          return n;
        }),
      );
    },
    [selectedId, pushSnapshot, setNodes],
  );

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return false;
    const list = nodesRef.current;
    const source = list.find((node) => node.id === connection.source);
    const target = list.find((node) => node.id === connection.target);
    if (!source || !target) return false;
    return kindsCompatible(outputKind(source.type, source.data), accepts(target.type, target.data));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;
      pushSnapshot();
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            sourceHandle: connection.sourceHandle || HANDLE_OUT,
            targetHandle: connection.targetHandle || HANDLE_IN,
            type: "studio",
            animated: false,
            data: {},
            style: { stroke: "#d4d4d4", strokeWidth: 1.5 },
          },
          current,
        ),
      );
    },
    [isValidConnection, setEdges],
  );

  const onReconnect = useCallback(
    (oldEdge: Edge, connection: Connection) => {
      if (!isValidConnection(connection)) return;
      setEdges((current) =>
        reconnectEdge(oldEdge, connection, current).map((edge) =>
          edge.source === connection.source && edge.target === connection.target
            ? {
                ...edge,
                type: "studio",
                animated: false,
                sourceHandle: connection.sourceHandle || edge.sourceHandle || HANDLE_OUT,
                targetHandle: connection.targetHandle || edge.targetHandle || HANDLE_IN,
                data: {},
                style: { stroke: "#d4d4d4", strokeWidth: 1.5 },
              }
            : edge,
        ),
      );
    },
    [isValidConnection, setEdges],
  );

  const openAddAt = useCallback(
    (x: number, y: number, connect?: AddMenuState["connect"]) => {
      setMenu(null);
      setAddMenu({ x, y, flow: screenToFlowPosition({ x, y }), connect });
    },
    [screenToFlowPosition],
  );

  const onConnectStart = useCallback((_event: MouseEvent | TouchEvent, params: OnConnectStartParams) => {
    const node = nodesRef.current.find((item) => item.id === params.nodeId);
    if (params.handleType === "target") {
      setLinkDrag({ from: "target", accepts: accepts(node?.type, node?.data).join(" ") });
      return;
    }
    setLinkDrag({ from: "source", out: outputKind(node?.type, node?.data) ?? "any" });
  }, []);

  const onConnectEnd = useCallback(
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
  );

  const onSelectionChange = useCallback(({ nodes: selected }: OnSelectionChangeParams) => {
    setSelectedId(selected[0]?.id ?? null);
    setSelectedIds(selected.map((node) => node.id));
  }, []);

  const groupSelected = useCallback(() => {
    if (selectedIds.length < 2) return;
    pushSnapshot();
    const selected = nodes.filter((n) => selectedIds.includes(n.id) && n.type !== "group");
    if (selected.length < 2) return;

    // Nodes picked by a marquee select are often scattered (different rows,
    // big gaps) — a box drawn around their raw positions ends up mostly
    // empty. Instead, repack them into a tidy grid inside the new group, the
    // way a real "New Group" looks, measuring each node's real rendered size
    // (not a guess) so cards of different heights still line up cleanly.
    const zoom = getViewport().zoom || 1;
    const pad = 24;
    const gap = 16;
    const labelSpace = 30;
    const cols = Math.max(1, Math.ceil(Math.sqrt(selected.length)));

    const sized = selected.map((n) => {
      const rect = wrapper.current?.querySelector<HTMLElement>(`[data-id="${n.id}"]`)?.getBoundingClientRect();
      return {
        id: n.id,
        width: rect ? rect.width / zoom : 260,
        height: rect ? rect.height / zoom : 160,
      };
    });

    const placements = new Map<string, { x: number; y: number }>();
    let y = pad + labelSpace;
    let groupWidth = 0;
    for (let i = 0; i < sized.length; i += cols) {
      const row = sized.slice(i, i + cols);
      let x = pad;
      for (const item of row) {
        placements.set(item.id, { x, y });
        x += item.width + gap;
      }
      groupWidth = Math.max(groupWidth, x - gap + pad);
      y += Math.max(...row.map((item) => item.height)) + gap;
    }
    const groupHeight = y - gap + pad;

    const anchor = selected.reduce(
      (min, n) => ({ x: Math.min(min.x, n.position.x), y: Math.min(min.y, n.position.y) }),
      { x: Infinity, y: Infinity },
    );

    const groupId = `group_${Math.random().toString(36).slice(2, 10)}`;
    const groupNode: StudioNode = {
      id: groupId,
      type: "group",
      position: anchor,
      zIndex: -1,
      data: { label: "Nhóm mới", width: groupWidth, height: groupHeight } as unknown as StudioNodeData,
    };

    setNodes((current) => [
      groupNode,
      ...current.map((n) => {
        const place = placements.get(n.id);
        if (!place) return n;
        return { ...n, parentId: groupId, extent: "parent" as const, position: place };
      }),
    ]);
  }, [nodes, selectedIds, setNodes, getViewport]);

  /* --------------------------------- run ---------------------------------- */

  const patchNode = useCallback(
    (id: string, patch: Partial<StudioNodeData>) => {
      setNodes((current) =>
        current.map((node) => (node.id === id ? { ...node, data: { ...node.data, ...patch } } : node)),
      );
    },
    [setNodes],
  );

  const runNode = useCallback(
    async (nodeId: string, snapshotNodes?: StudioNode[], snapshotEdges?: Edge[]) => {
      const list = snapshotNodes ?? nodes;
      const links = snapshotEdges ?? edges;
      const node = list.find((item) => item.id === nodeId);
      if (!node) return;

      if (!["prompt", "prompt_master", "image", "result", "fashion_compose", "split_video"].includes(node.type ?? "")) {
        const data = node.data ?? {};
        if (node.type === "fashion_tryon" && !data.modelId) {
          data.modelId = "seed:image:gemini-compose";
        }
        if (!data.modelId && node.type !== "train") {
          patchNode(nodeId, { status: "error", error: tr("node.needModel") });
          throw new Error(tr("node.needModel"));
        }
      }

      patchNode(nodeId, { status: "running", error: null });
      try {
        const result = await runStudioNode(node, list, links, project.id);
        patchNode(nodeId, { status: "done", result: result.asset });
        return result.asset;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Lỗi";
        patchNode(nodeId, { status: "error", error: message });
        throw error;
      }
    },
    [edges, nodes, patchNode, project.id, tr],
  );

  const runGroup = useCallback(
    async (groupId: string) => {
      const members = nodes.filter((n) => n.parentId === groupId);
      const order = topoSort(members, edges);
      let failures = 0;
      for (const node of order) {
        try {
          await runNode(node.id);
        } catch (error) {
          failures += 1;
          toast(error instanceof Error ? error.message : "Một khối trong nhóm bị lỗi", "error");
        }
      }
      if (failures === 0) toast(tr("toast.generated"), "success");
    },
    [nodes, edges, runNode, toast, tr],
  );

  const ungroupSelected = useCallback(
    (groupId: string) => {
      setNodes((current) => {
        const group = current.find((n) => n.id === groupId);
        if (!group) return current;
        return current
          .filter((n) => n.id !== groupId)
          .map((n) => {
            if (n.parentId !== groupId) return n;
            const { parentId, extent, ...rest } = n;
            void parentId;
            void extent;
            return { ...rest, position: { x: group.position.x + n.position.x, y: group.position.y + n.position.y } };
          });
      });
      setSelectedId(null);
      setSelectedIds([]);
    },
    [setNodes],
  );

  const duplicateNode = useCallback(
    (nodeId: string) => {
      pushSnapshot();
      const source = nodes.find((n) => n.id === nodeId);
      if (!source) return;
      const copy: StudioNode = {
        ...source,
        id: `${source.type}_${Math.random().toString(36).slice(2, 9)}`,
        position: { x: source.position.x + 28, y: source.position.y + 28 },
        selected: false,
        data: { ...source.data },
      };
      setNodes((current) => [...current, copy]);
    },
    [nodes, setNodes],
  );

  const deleteNode = useCallback(
    (nodeId: string) => {
      pushSnapshot();
      setNodes((current) => current.filter((n) => n.id !== nodeId));
      setEdges((current) => current.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setMenu(null);
    },
    [setNodes, setEdges],
  );

  const deleteGroupWithMembers = useCallback(
    (groupId: string) => {
      pushSnapshot();
      const memberIds = new Set(
        nodes.filter((n) => n.parentId === groupId).map((n) => n.id),
      );
      memberIds.add(groupId);
      setNodes((current) => current.filter((n) => !memberIds.has(n.id)));
      setEdges((current) => current.filter((e) => !memberIds.has(e.source) && !memberIds.has(e.target)));
      setMenu(null);
    },
    [nodes, setNodes, setEdges],
  );

  /** Execute in dependency order: upstream nodes first. */
  const runAll = useCallback(async () => {
    setRunningAll(true);
    const runnable = nodes.filter((node) => !["prompt", "image", "result"].includes(node.type ?? ""));
    const order = topoSort(runnable, edges);

    let working = nodes;
    let links = edges;
    let failures = 0;

    // Branches here fan out independently (one model image → several
    // garments), so one branch failing (e.g. a flaky upstream gateway call)
    // must not stop the others — keep going and report a summary at the end.
    for (const node of order) {
      try {
        const asset = await runNode(node.id, working, links);
        working = working.map((item) =>
          item.id === node.id ? { ...item, data: { ...item.data, result: asset, status: "done" } } : item,
        );
        setNodes(working);
      } catch (error) {
        failures += 1;
        toast(error instanceof Error ? error.message : "Một khối bị lỗi", "error");
      }
    }
    setRunningAll(false);
    if (failures > 0) {
      toast(`Hoàn tất với ${failures} khối lỗi — bấm "Chạy" riêng từng khối lỗi để thử lại.`, "error");
    } else {
      toast(tr("toast.generated"), "success");
    }
  }, [edges, nodes, runNode, setNodes, toast, tr]);

  const runSelected = useCallback(async () => {
    if (!selectedId) return;
    try {
      await runNode(selectedId);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Lỗi", "error");
    }
  }, [runNode, selectedId, toast]);

  const loadFashionTemplate = useCallback(() => {
    pushSnapshot();
    const templateNodes: StudioNode[] = [
      {
        id: "model_anchor",
        type: "image",
        position: { x: 40, y: 220 },
        data: {
          name: "Ảnh người mẫu",
          imageUrl: "/fashion_sources/model_ref_1.jpg",
          status: "idle",
        },
      },
      {
        id: "garment_1",
        type: "image",
        position: { x: 40, y: 520 },
        data: {
          name: "Ảnh trang phục",
          imageUrl: "/fashion_sources/garment_1_blazer.jpg",
          status: "idle",
        },
      },
      {
        id: "video_ai_1",
        type: "generate",
        position: { x: 440, y: 320 },
        data: {
          modelKind: "video",
          modelId: "iooai:omni_flash_10s",
          aspect: "9:16",
          duration: 10,
          resolution: "720p",
          prompt: "Người mẫu mặc trang phục sải bước tự tin trên sàn diễn runway thời trang Paris, ánh sáng studio mềm mại, phong cách lookbook cao cấp, chuyển động tự nhiên.",
          status: "idle",
        },
      },
      {
        id: "result_1",
        type: "result",
        position: { x: 860, y: 320 },
        data: { status: "idle" },
      },
    ];

    const templateEdges: Edge[] = [
      { id: "e-m-v", source: "model_anchor", target: "video_ai_1", sourceHandle: "out", targetHandle: "in" },
      { id: "e-g-v", source: "garment_1", target: "video_ai_1", sourceHandle: "out", targetHandle: "in" },
      { id: "e-v-res", source: "video_ai_1", target: "result_1", sourceHandle: "out", targetHandle: "in" },
    ];

    setNodes(templateNodes);
    setEdges(templateEdges.map((edge) => decorateEdge(edge, templateNodes)));
    toast("Đã nạp quy trình phối đồ thời trang mẫu!", "success");
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 100);
  }, [fitView, setEdges, setNodes, toast]);

  const loadFilmTemplate = useCallback(() => {
    pushSnapshot();
    const templateNodes: StudioNode[] = [
      {
        id: 'char_ref_1',
        type: 'image',
        position: { x: 40, y: 220 },
        data: { name: 'Nhân vật chính 1', status: 'idle' },
      },
      {
        id: 'char_ref_2',
        type: 'image',
        position: { x: 40, y: 560 },
        data: { name: 'Nhân vật chính 2', status: 'idle' },
      },
      {
        id: 'script_master',
        type: 'prompt',
        position: { x: 300, y: 80 },
        data: {
          text: 'Kịch bản tổng thể bộ phim: Mô tả phong cách điện ảnh (Cinematic 35mm), tone màu, bối cảnh xuyên suốt và tâm lý nhân vật.',
        },
      },
      {
        id: 'shot_1_prompt',
        type: 'prompt',
        position: { x: 300, y: 280 },
        data: {
          text: 'Phân cảnh 1 (Mở đầu): Thiết lập không gian, toàn cảnh nhân vật xuất hiện trong bối cảnh.',
        },
      },
      {
        id: 'shot_1_video',
        type: 'generate',
        position: { x: 620, y: 280 },
        data: {
          modelKind: 'video',
          aspect: '16:9',
          duration: 10,
          resolution: '720p',
          prompt: 'Phân cảnh 1: Thiết lập không gian...',
          status: 'idle',
        },
      },
      {
        id: 'shot_2_prompt',
        type: 'prompt',
        position: { x: 300, y: 560 },
        data: {
          text: 'Phân cảnh 2 (Cao trào): Cận cảnh trung tâm biểu cảm đối thoại kịch tính.',
        },
      },
      {
        id: 'shot_2_video',
        type: 'generate',
        position: { x: 620, y: 560 },
        data: {
          modelKind: 'video',
          aspect: '16:9',
          duration: 10,
          resolution: '720p',
          prompt: 'Phân cảnh 2: Cận cảnh đối thoại...',
          status: 'idle',
        },
      },
      {
        id: 'shot_3_prompt',
        type: 'prompt',
        position: { x: 300, y: 840 },
        data: {
          text: 'Phân cảnh 3 (Hạ màn): Góc máy xa dần, chuyển động chậm lột tả sự lắng đọng kết phim.',
        },
      },
      {
        id: 'shot_3_video',
        type: 'generate',
        position: { x: 620, y: 840 },
        data: {
          modelKind: 'video',
          aspect: '16:9',
          duration: 10,
          resolution: '720p',
          prompt: 'Phân cảnh 3: Kết thúc lắng đọng...',
          status: 'idle',
        },
      },
      {
        id: 'master_output',
        type: 'result',
        position: { x: 960, y: 520 },
        data: { status: 'idle' },
      },
    ];

    const templateEdges: Edge[] = [
      { id: 'e-c1-s1', source: 'char_ref_1', target: 'shot_1_video' },
      { id: 'e-c1-s2', source: 'char_ref_1', target: 'shot_2_video' },
      { id: 'e-c2-s2', source: 'char_ref_2', target: 'shot_2_video' },
      { id: 'e-c1-s3', source: 'char_ref_1', target: 'shot_3_video' },
      { id: 'e-p1-s1', source: 'shot_1_prompt', target: 'shot_1_video' },
      { id: 'e-p2-s2', source: 'shot_2_prompt', target: 'shot_2_video' },
      { id: 'e-p3-s3', source: 'shot_3_prompt', target: 'shot_3_video' },
      { id: 'e-s1-out', source: 'shot_1_video', target: 'master_output' },
      { id: 'e-s2-out', source: 'shot_2_video', target: 'master_output' },
      { id: 'e-s3-out', source: 'shot_3_video', target: 'master_output' },
    ];

    setNodes(templateNodes);
    setEdges(templateEdges.map((edge) => decorateEdge(edge, templateNodes)));
    toast('Đã nạp quy trình làm phim điện ảnh phân cảnh!', 'success');
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 100);
  }, [fitView, setEdges, setNodes, toast]);


  /* ---------------------- upload & clipboard paste ----------------------- */

  const getCenterFlowPosition = useCallback(() => {
    const width = wrapper.current?.clientWidth ?? window.innerWidth;
    const height = wrapper.current?.clientHeight ?? window.innerHeight;
    return screenToFlowPosition({
      x: width / 2 - 80 + (Math.random() * 40 - 20),
      y: height / 2 - 100 + (Math.random() * 40 - 20),
    });
  }, [screenToFlowPosition]);

  const handleUploadFiles = useCallback(
    async (files: File[], customPosition?: { x: number; y: number }) => {
      const validFiles = files.filter(
        (f) =>
          f.type.startsWith("image/") ||
          f.type.startsWith("video/") ||
          /\.(png|jpe?g|webp|gif|svg|mp4|webm|mov)$/i.test(f.name),
      );
      if (validFiles.length === 0) {
        toast("Vui lòng chọn hoặc dán file ảnh (PNG, JPG, WEBP...) hoặc video (MP4, WEBM, MOV...)", "default");
        return;
      }

      pushSnapshot();
      const basePos = customPosition ?? getCenterFlowPosition();

      // If exactly 1 file and an image node is currently selected, update that node directly!
      if (validFiles.length === 1 && selectedId) {
        const selNode = nodesRef.current.find((n) => n.id === selectedId);
        if (selNode && selNode.type === "image") {
          const file = validFiles[0];
          const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
          patchNode(selectedId, { status: "running" });
          try {
            const asset = await api.assets.upload(file, project.id);
            if (isVideo) {
              patchNode(selectedId, {
                videoUrl: asset.url,
                imageUrl: undefined,
                result: asset,
                name: file.name,
                status: "done",
              });
              toast(`Đã tải lên video: ${file.name}`, "success");
            } else {
              patchNode(selectedId, {
                imageUrl: asset.url,
                videoUrl: undefined,
                result: asset,
                name: file.name,
                status: "done",
              });
              toast(`Đã tải lên ảnh: ${file.name}`, "success");
            }
          } catch (err) {
            patchNode(selectedId, {
              status: "error",
              error: err instanceof Error ? err.message : "Tải lên thất bại",
            });
            toast(err instanceof Error ? err.message : "Tải lên thất bại", "error");
          }
          return;
        }
      }

      // Otherwise, create new nodes for each file!
      for (let i = 0; i < validFiles.length; i++) {
        const file = validFiles[i];
        const isVideo = file.type.startsWith("video/") || /\.(mp4|webm|mov)$/i.test(file.name);
        const pos = {
          x: basePos.x + (i % 3) * 200,
          y: basePos.y + Math.floor(i / 3) * 240,
        };
        const id = addNode("image", pos, {
          name: file.name,
          status: "running",
        });

        try {
          const asset = await api.assets.upload(file, project.id);
          if (isVideo) {
            patchNode(id, {
              videoUrl: asset.url,
              imageUrl: undefined,
              result: asset,
              name: file.name,
              status: "done",
            });
            toast(`Đã tải lên video: ${file.name}`, "success");
          } else {
            patchNode(id, {
              imageUrl: asset.url,
              videoUrl: undefined,
              result: asset,
              name: file.name,
              status: "done",
            });
            toast(`Đã tải lên ảnh: ${file.name}`, "success");
          }
        } catch (err) {
          patchNode(id, {
            status: "error",
            error: err instanceof Error ? err.message : "Tải lên thất bại",
          });
          toast(err instanceof Error ? err.message : "Tải lên thất bại", "error");
        }
      }
    },
    [addNode, getCenterFlowPosition, patchNode, project.id, pushSnapshot, selectedId, toast],
  );

  /* -------------------------------- drop zone ----------------------------- */

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/atelier-node");
      if (raw) {
        pushSnapshot();
        let payload: { type: string; data?: Record<string, unknown> } = { type: raw };
        try {
          payload = JSON.parse(raw);
        } catch {
          /* legacy plain string */
        }
        addNode(payload.type, screenToFlowPosition({ x: event.clientX, y: event.clientY }), payload.data);
        return;
      }

      const files = Array.from(event.dataTransfer.files || []);
      if (files.length > 0) {
        const dropPos = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        handleUploadFiles(files, dropPos);
      }
    },
    [addNode, handleUploadFiles, pushSnapshot, screenToFlowPosition],
  );

  /* --------------------- Global / Canvas Paste (Ctrl+V) ------------------- */

  useEffect(() => {
    const handlePaste = async (event: ClipboardEvent) => {
      // Don't intercept if user is typing in an input, textarea, or contentEditable element!
      const activeEl = document.activeElement as HTMLElement | null;
      if (
        activeEl &&
        (activeEl.tagName === "INPUT" ||
          activeEl.tagName === "TEXTAREA" ||
          activeEl.isContentEditable)
      ) {
        return;
      }

      const clipboardData = event.clipboardData;
      if (!clipboardData) return;

      // 1. Check for files or items with kind === 'file' (screenshots, copied files)
      const files: File[] = [];
      if (clipboardData.files && clipboardData.files.length > 0) {
        for (let i = 0; i < clipboardData.files.length; i++) {
          files.push(clipboardData.files[i]);
        }
      } else if (clipboardData.items && clipboardData.items.length > 0) {
        for (let i = 0; i < clipboardData.items.length; i++) {
          const item = clipboardData.items[i];
          if (item.kind === "file") {
            const f = item.getAsFile();
            if (f) files.push(f);
          }
        }
      }

      if (files.length > 0) {
        event.preventDefault();
        event.stopPropagation();
        handleUploadFiles(files);
        return;
      }

      // 2. Check for text in clipboard
      const text = clipboardData.getData("text")?.trim();
      if (text) {
        // Image URL?
        if (/^https?:\/\/.*\.(png|jpg|jpeg|webp|gif)(\?.*)?$/i.test(text)) {
          event.preventDefault();
          event.stopPropagation();
          pushSnapshot();
          addNode("image", getCenterFlowPosition(), { imageUrl: text, name: "Ảnh từ link dán" });
          toast("Đã dán ảnh từ URL vào canvas (Ctrl+V)", "success");
          return;
        }
        // Video URL?
        if (/^https?:\/\/.*\.(mp4|webm|mov)(\?.*)?$/i.test(text)) {
          event.preventDefault();
          event.stopPropagation();
          pushSnapshot();
          addNode("image", getCenterFlowPosition(), { videoUrl: text, name: "Video từ link dán" });
          toast("Đã dán video từ URL vào canvas (Ctrl+V)", "success");
          return;
        }
        // Normal text (Prompt)
        event.preventDefault();
        event.stopPropagation();
        pushSnapshot();
        addNode("prompt", getCenterFlowPosition(), { text });
        toast("Đã dán câu lệnh vào canvas (Ctrl+V)", "success");
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [addNode, getCenterFlowPosition, handleUploadFiles, pushSnapshot, toast]);

  const runNodeById = useCallback(
    async (nodeId: string) => {
      try {
        await runNode(nodeId);
      } catch (error) {
        toast(error instanceof Error ? error.message : "Lỗi", "error");
      }
    },
    [runNode, toast],
  );

  const nodeMenu = useMemo(
    () => ({ duplicate: duplicateNode, remove: deleteNode }),
    [duplicateNode, deleteNode],
  );

  const placeFromMenu = useCallback(
    (item: LibItem) => {
      if (!addMenu) return;
      const extra = itemData(item);
      const connect = addMenu.connect;
      const position = connect
        ? {
            x: addMenu.flow.x + (connect.handleType === "target" ? -300 : 28),
            y: addMenu.flow.y - 24,
          }
        : addMenu.flow;
      const id = addNode(item.type, position, extra);
      if (connect?.handleType === "source") {
        const source = nodesRef.current.find((node) => node.id === connect.nodeId);
        const kind = outputKind(source?.type, source?.data) ?? "any";
        if (targetHandleFor(item.type, extra, kind)) {
          setEdges((current) =>
            addEdge(
              {
                source: connect.nodeId,
                sourceHandle: connect.handleId || HANDLE_OUT,
                target: id,
                targetHandle: HANDLE_IN,
                type: "studio",
                style: { stroke: "#d4d4d4", strokeWidth: 1.5 },
              },
              current,
            ),
          );
        }
      } else if (connect?.handleType === "target") {
        const kind = outputKind(item.type, extra);
        const target = nodesRef.current.find((node) => node.id === connect.nodeId);
        if (kind && kindsCompatible(kind, accepts(target?.type, target?.data))) {
          setEdges((current) =>
            addEdge(
              {
                source: id,
                sourceHandle: HANDLE_OUT,
                target: connect.nodeId,
                targetHandle: connect.handleId || HANDLE_IN,
                type: "studio",
                style: { stroke: "#d4d4d4", strokeWidth: 1.5 },
              },
              current,
            ),
          );
        }
      }
      setAddMenu(null);
    },
    [addMenu, addNode, setEdges],
  );

  const menuItems = useMemo(() => {
    if (!addMenu?.connect) return NODE_LIBRARY;
    const connect = addMenu.connect;
    const node = nodes.find((item) => item.id === connect.nodeId);
    if (connect.handleType === "source") {
      const kind = outputKind(node?.type, node?.data) ?? "any";
      return NODE_LIBRARY.filter((item) => targetHandleFor(item.type, itemData(item), kind));
    }
    const accepted = accepts(node?.type, node?.data);
    return NODE_LIBRARY.filter((item) => kindsCompatible(outputKind(item.type, itemData(item)), accepted));
  }, [addMenu, nodes]);

  const selectedNode = useMemo(() => {
    const node = nodes.find((n) => n.id === selectedId) ?? null;
    // Group boxes are a pure visual container — nothing in them to inspect/run.
    return node?.type === "group" ? null : node;
  }, [nodes, selectedId]);

  const hasKey = useStudio((s) => s.hasKey);

  return (
    <div className="relative h-full min-h-0 bg-black">
        <header className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2">
          <h1 className="pointer-events-auto truncate text-[13px] text-white/80">{project.name}</h1>
          <span className="text-[10px] text-white/40">
            {saveState === "saving" ? tr("common.saving") : saveState === "saved" ? tr("common.saved") : ""}
          </span>
        </header>

        {!hasKey && (
          <div className="absolute left-1/2 top-3 z-20 flex -translate-x-1/2 items-center gap-3 rounded-full border border-amber-900/50 bg-amber-950/80 px-3 py-1.5 text-[12px] text-amber-200">
            <span className="flex items-center gap-2">
              <Layers size={13} />
              {tr("toast.noKey")}
            </span>
            <a href={withBasePath("/settings")} className="rounded border border-amber-800/60 px-2 py-0.5 text-[11.5px] hover:bg-amber-900/30">
              {tr("nav.settings")}
            </a>
          </div>
        )}

        <div
          ref={wrapper}
          className={clsx("absolute inset-0", linkDrag && "rf-connecting")}
          data-from={linkDrag?.from}
          data-out={linkDrag?.from === "source" ? linkDrag.out : undefined}
          data-accepts={linkDrag?.from === "target" ? linkDrag.accepts : undefined}
          onDrop={onDrop}
          onDragOver={(event) => event.preventDefault()}
        >
          <RunNodeContext.Provider value={runNodeById}>
          <NodeMenuContext.Provider value={nodeMenu}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={handleNodesChange}
            onEdgesChange={handleEdgesChange}
            onNodeDragStart={onNodeDragStart}
            onConnect={onConnect}
            onConnectStart={onConnectStart}
            onConnectEnd={onConnectEnd}
            onReconnect={onReconnect}
            onReconnectStart={() => {
              reconnecting.current = true;
            }}
            onReconnectEnd={() => {
              reconnecting.current = false;
            }}
            isValidConnection={isValidConnection}
            onSelectionChange={onSelectionChange}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
            connectionLineType={ConnectionLineType.Bezier}
            connectionLineComponent={StudioConnectionLine}
            connectionRadius={48}
            reconnectRadius={24}
            edgesReconnectable
            fitView
            fitViewOptions={FIT_VIEW_OPTIONS}
            minZoom={0.12}
            maxZoom={2.2}
            proOptions={PRO_OPTIONS}
            defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
            colorMode="dark"
            onlyRenderVisibleElements
            zoomOnDoubleClick={false}
            onNodeDoubleClick={(_event, node) => runNode(node.id).catch(() => {})}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              setAddMenu(null);
              setMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
            }}
            onPaneContextMenu={(event) => {
              event.preventDefault();
              openAddAt(event.clientX, event.clientY);
            }}
            onPaneClick={(event) => {
              if (ignorePaneClick.current) return;
              setMenu(null);
              const now = Date.now();
              if (now - lastPaneClick.current < 320) {
                lastPaneClick.current = 0;
                openAddAt(event.clientX, event.clientY);
                return;
              }
              lastPaneClick.current = now;
              setAddMenu(null);
            }}
            onMove={() => setMenu(null)}
            deleteKeyCode={["Backspace", "Delete"]}
            panOnDrag
            selectionOnDrag={false}
            selectionKeyCode="Shift"
            selectionMode={SelectionMode.Partial}
            className="bg-black"
          >
            <ConnectHint />
            <ZoomBar />
            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              className="!overflow-hidden !rounded-xl !border !border-white/10 !bg-[#101014]/95 !shadow-xl"
              style={{ width: 148, height: 96 }}
              nodeColor={minimapColor}
              maskColor="rgba(8,8,10,.62)"
            />
            <Panel position="bottom-center" className="!mb-3">
              <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#16161c]/95 p-1 shadow-[0_16px_40px_-16px_rgba(0,0,0,.85)] backdrop-blur">
                <button
                  type="button"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    openAddAt(rect.left, rect.top - 12);
                  }}
                  className="flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-[12.5px] font-medium text-ink-950"
                >
                  <Plus size={14} />
                  {tr("canvas.add")}
                </button>
                <label
                  title="Tải ảnh hoặc video từ máy tính (hoặc kéo thả / Ctrl+V)"
                  className="flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] font-medium text-emerald-300 transition hover:bg-white/10"
                >
                  <Upload size={13} />
                  Tải ảnh / video
                  <input
                    type="file"
                    multiple
                    accept="image/*,video/*"
                    hidden
                    onChange={(event) => {
                      const files = event.target.files ? Array.from(event.target.files) : [];
                      if (files.length > 0) handleUploadFiles(files);
                      event.target.value = "";
                    }}
                  />
                </label>
                                <button
                  type="button"
                  onClick={loadFilmTemplate}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] text-sky-200 hover:bg-white/10"
                >
                  <Clapperboard size={13} />
                  Mẫu làm phim
                </button>
<button
                  type="button"
                  onClick={loadFashionTemplate}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] text-amber-200 hover:bg-white/10"
                >
                  <Shirt size={13} />
                  Mẫu phối đồ
                </button>
                <button
                  type="button"
                  onClick={() => setCopilotOpen((v) => !v)}
                  className={clsx(
                    "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition",
                    copilotOpen
                      ? "bg-violet-600 text-white shadow-[0_0_14px_rgba(139,92,246,0.6)]"
                      : "border border-violet-500/30 bg-violet-950/40 text-violet-200 hover:bg-violet-900/60 hover:text-white",
                  )}
                  title="Trợ lý AI phòng dựng (gemini-3.5-flash)"
                >
                  <Bot size={13} className="text-violet-300" />
                  Trợ lý AI
                </button>
                <span className="mx-0.5 h-4 w-px bg-white/10" />
                <button
                  type="button"
                  onClick={undo}
                  title="Hoàn tác (Ctrl+Z)"
                  className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] text-ink-300 hover:bg-white/10 hover:text-white"
                >
                  <Undo2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={redo}
                  title="Làm lại (Ctrl+Y)"
                  className="flex items-center gap-1 rounded-full px-2 py-1.5 text-[12px] text-ink-300 hover:bg-white/10 hover:text-white"
                >
                  <Redo2 size={13} />
                </button>
                <button
                  type="button"
                  onClick={runSelected}
                  disabled={!selectedId || runningAll}
                  className="rounded-full px-2.5 py-1.5 text-[12px] text-ink-100 hover:bg-white/10 disabled:opacity-40"
                >
                  {tr("canvas.toolbar.run")}
                </button>
                <button
                  type="button"
                  onClick={runAll}
                  disabled={runningAll || !nodes.length}
                  className="flex items-center gap-1.5 rounded-full bg-brass-500 px-3 py-1.5 text-[12px] font-medium text-ink-950 hover:bg-brass-400 disabled:opacity-40"
                >
                  {runningAll ? <Spinner /> : <Sparkles size={13} />}
                  {tr("canvas.toolbar.runAll")}
                </button>
              </div>
            </Panel>
            {selectedIds.length >= 2 && (
              <Panel position="top-center">
                <button
                  onClick={groupSelected}
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#16161c] px-3 py-1.5 text-[12px] font-medium text-ink-100 shadow-lg hover:bg-[#1e1e24]"
                >
                  <Layers size={13} />
                  Nhóm {selectedIds.length} khối đã chọn
                </button>
              </Panel>
            )}
            {selectedIds.length === 1 && nodes.find((n) => n.id === selectedIds[0])?.type === "group" && (
              <Panel position="top-center">
                <div className="flex items-center gap-1 rounded-full border border-white/10 bg-[#16161c] p-1 text-[12px] text-ink-200 shadow-lg">
                  <button
                    onClick={() => runGroup(selectedIds[0])}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-brass-300 hover:bg-white/10"
                  >
                    <Play size={12.5} />
                    Chạy nhóm
                  </button>
                  <span className="h-4 w-px bg-white/10" />
                  <button
                    onClick={() => ungroupSelected(selectedIds[0])}
                    className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 hover:bg-white/10"
                  >
                    <Layers size={12.5} />
                    Bỏ nhóm
                  </button>
                </div>
              </Panel>
            )}
          </ReactFlow>
          </NodeMenuContext.Provider>
          </RunNodeContext.Provider>

          {menu && (() => {
            const target = nodes.find((n) => n.id === menu.nodeId);
            if (!target) return null;
            const isGroup = target.type === "group";
            const item = (label: string, icon: ReactNode, onClick: () => void, danger?: boolean) => (
              <button
                key={label}
                onClick={() => {
                  onClick();
                  setMenu(null);
                }}
                className={clsx(
                  "flex w-full items-center gap-2 px-3 py-2 text-left text-[12.5px] hover:bg-ink-800",
                  danger ? "text-red-400" : "text-ink-200",
                )}
              >
                {icon}
                {label}
              </button>
            );
            return (
              <div
                className="fixed z-50 w-44 overflow-hidden rounded-lg border border-ink-700 bg-ink-850 py-1 shadow-xl"
                style={{ left: menu.x, top: menu.y }}
              >
                {isGroup ? (
                  <>
                    {item("Chạy nhóm", <Play size={13} />, () => runGroup(menu.nodeId))}
                    {item("Bỏ nhóm", <Layers size={13} />, () => ungroupSelected(menu.nodeId))}
                    {item("Xoá cả nhóm", <Trash2 size={13} />, () => deleteGroupWithMembers(menu.nodeId), true)}
                  </>
                ) : (
                  <>
                    {item("Chạy", <Play size={13} />, () => runNode(menu.nodeId).catch(() => {}))}
                    {item("Nhân bản", <Copy size={13} />, () => duplicateNode(menu.nodeId))}
                    {item("Xoá", <Trash2 size={13} />, () => deleteNode(menu.nodeId), true)}
                  </>
                )}
              </div>
            );
          })()}

          {addMenu && (
            <div
              className="fixed z-50 w-[232px] overflow-hidden rounded-2xl border border-white/10 bg-[#16161c]/95 p-1.5 shadow-2xl backdrop-blur"
              style={{
                left: Math.max(8, Math.min(addMenu.x, window.innerWidth - 248)),
                top: Math.max(8, Math.min(addMenu.y, window.innerHeight - 420)),
              }}
            >
              <p className="px-2 pb-1 pt-1 text-[11px] font-medium text-ink-200">
                {addMenu.connect?.handleType === "source"
                  ? tr("canvas.connectTo")
                  : addMenu.connect?.handleType === "target"
                    ? tr("canvas.connectFrom")
                    : tr("canvas.add")}
              </p>
              {addMenu.connect && (
                <p className="px-2 pb-1 text-[10px] text-ink-500">{tr("canvas.onlyCompatible")}</p>
              )}
              <div className="max-h-[340px] overflow-y-auto">
                {menuItems.length === 0 && (
                  <p className="px-2 py-3 text-[12px] text-ink-400">{tr("canvas.noMatch")}</p>
                )}
                {menuItems.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`${item.type}-${item.label}`}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "application/atelier-node",
                          JSON.stringify({ type: item.type, data: itemData(item) }),
                        );
                        event.dataTransfer.effectAllowed = "move";
                      }}
                      onClick={() => placeFromMenu(item)}
                      className="flex w-full items-center gap-2 rounded-xl px-2 py-1.5 text-left hover:bg-white/10"
                    >
                      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/5">
                        <Icon size={14} className={item.accent} />
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[12.5px] text-ink-100">{item.label}</span>
                        <span className="block truncate text-[10.5px] text-ink-500">{item.hint}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {loaded && nodes.length === 0 && !addMenu && (
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              <div className="max-w-sm text-center">
                <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-white/10 bg-[#16161c] text-white">
                  <Plus size={20} />
                </span>
                <h3 className="mt-3 font-display text-[20px]">{tr("canvas.emptyTitle")}</h3>
                <p className="mt-1 text-[12.5px] leading-relaxed text-ink-400">{tr("canvas.emptyBody")}</p>
                <p className="mt-2 text-[12px] text-ink-500">{tr("canvas.emptyHint")}</p>
                <p className="mt-3 text-[11px] text-white/40">Một điểm vào · một điểm ra</p>
              </div>
            </div>
          )}

          {runningAll && (
            <div className="pointer-events-none absolute bottom-16 left-1/2 -translate-x-1/2 rounded-full border border-brass-700/50 bg-ink-900/90 px-3.5 py-1.5 text-[12px] text-brass-300 shadow-xl backdrop-blur">
              <span className="flex items-center gap-2">
                <Loader2 size={13} className="animate-spin" />
                {tr("node.running")}
              </span>
            </div>
          )}

          <CanvasCopilot
            isOpen={copilotOpen}
            onClose={() => setCopilotOpen(false)}
            nodes={nodes}
            selectedNode={nodes.find((n) => n.id === selectedId) ?? null}
            onAddPromptNode={handleAddPromptFromCopilot}
            onAddStoryboard={handleAddStoryboardFromCopilot}
            onUpdateSelectedNodeText={handleUpdateSelectedNodeText}
            projectName={project.name}
          />
        </div>

      <Inspector
        node={selectedNode}
        onPatch={patchNode}
        onRun={() => runSelected()}
        onClose={() => setSelectedId(null)}
      />
    </div>
  );
}

/** Kahn topological sort; falls back to input order on cycles. */
function topoSort(nodes: StudioNode[], edges: Edge[]): StudioNode[] {
  const ids = new Set(nodes.map((node) => node.id));
  const indegree = new Map<string, number>(nodes.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (ids.has(edge.source) && ids.has(edge.target)) {
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }
  }
  const queue = nodes.filter((node) => (indegree.get(node.id) ?? 0) === 0);
  const result: StudioNode[] = [];
  while (queue.length) {
    const node = queue.shift()!;
    result.push(node);
    for (const edge of edges.filter((item) => item.source === node.id)) {
      const next = indegree.get(edge.target);
      if (next === undefined) continue;
      indegree.set(edge.target, next - 1);
      if (next - 1 === 0) {
        const target = nodes.find((item) => item.id === edge.target);
        if (target) queue.push(target);
      }
    }
  }
  const seen = new Set(result.map((node) => node.id));
  return [...result, ...nodes.filter((node) => !seen.has(node.id))];
}

function ConnectHint() {
  const { tr } = useUi();
  const show = useConnection((connection) => connection.inProgress && connection.isValid === false && !!connection.toHandle);
  if (!show) return null;
  return (
    <Panel position="top-center" className="!mt-2">
      <div className="rounded-full border border-red-400/40 bg-[#1a0d0d]/95 px-3 py-1.5 text-[12px] text-red-200 shadow-lg">
        {tr("canvas.invalidLink")}
      </div>
    </Panel>
  );
}

function ZoomBar() {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const { zoom } = useViewport();
  return (
    <Panel position="bottom-left" className="!mb-3 !ml-2">
      <div className="flex items-center rounded-full border border-white/10 bg-[#16161c]/95 p-1 text-[12px] text-ink-200 shadow-lg backdrop-blur">
        <button
          type="button"
          aria-label="Thu nhỏ"
          onClick={() => zoomOut({ duration: 160 })}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10"
        >
          <Minus size={14} />
        </button>
        <span className="w-11 text-center tabular-nums text-ink-300">{Math.round(zoom * 100)}%</span>
        <button
          type="button"
          aria-label="Phóng to"
          onClick={() => zoomIn({ duration: 160 })}
          className="grid h-7 w-7 place-items-center rounded-full hover:bg-white/10"
        >
          <Plus size={14} />
        </button>
        <button
          type="button"
          onClick={() => fitView({ padding: 0.25, duration: 280 })}
          className="rounded-full px-2.5 py-1 text-ink-200 hover:bg-white/10"
        >
          Căn
        </button>
      </div>
    </Panel>
  );
}

export function StudioCanvas({ project }: { project: ProjectSummary }) {
  return (
    <ReactFlowProvider>
      <CanvasInner project={project} />
    </ReactFlowProvider>
  );
}
