"use client";

import { withBasePath } from "@/lib/base-path";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  addEdge,
  Background,
  BackgroundVariant,
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
  type Node,
  type OnConnectStartParams,
  type OnSelectionChangeParams,
} from "@xyflow/react";
import {
  BrainCircuit,
  Check,
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
} from "lucide-react";
import clsx from "clsx";
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
  PORT_STROKE,
  accepts,
  kindsCompatible,
  outputKind,
  sourceHandleFor,
  targetHandleFor,
  type PortKind,
} from "./ports";

// Stable references — inline objects here make React Flow re-subscribe every render.
const FIT_VIEW_OPTIONS = { padding: 0.3 } as const;
const PRO_OPTIONS = { hideAttribution: true } as const;
const DEFAULT_EDGE_OPTIONS = { type: "studio", animated: false, style: { strokeWidth: 2.25 } } as const;
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

function decorateEdge(edge: Edge, list: { id: string; type?: string | null; data?: { modelKind?: string } }[]): Edge {
  const source = list.find((node) => node.id === edge.source);
  const kind = outputKind(source?.type, source?.data) ?? "any";
  return {
    ...edge,
    type: "studio",
    animated: false,
    style: { stroke: PORT_STROKE[kind], strokeWidth: 2.25 },
  };
}

function minimapColor(node: Node): string {
  const kind = outputKind(node.type, node.data as { modelKind?: string });
  return kind ? PORT_STROKE[kind] : "#3a3a44";
}

const NODE_LIBRARY = [
  { type: "prompt", icon: Type, label: "Câu lệnh", hint: "Văn bản mô tả", accent: "text-violet-soft" },
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
  if (type === "image") return { ...base };
  if (type === "generate") return { ...base, prompt: "", aspect: "16:9", duration: 5 };
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
  const [loaded, setLoaded] = useState(false);
  const wrapper = useRef<HTMLDivElement>(null);
  const nodesRef = useRef(nodes);
  nodesRef.current = nodes;
  const reconnecting = useRef(false);
  const lastPaneClick = useRef(0);
  const ignorePaneClick = useRef(false);
  const { screenToFlowPosition, fitView, getViewport } = useReactFlow();

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
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
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

  const isValidConnection = useCallback((connection: Connection | Edge) => {
    if (!connection.source || !connection.target || connection.source === connection.target) return false;
    const list = nodesRef.current;
    const source = list.find((node) => node.id === connection.source);
    const target = list.find((node) => node.id === connection.target);
    if (!source || !target) return false;
    return kindsCompatible(outputKind(source.type, source.data), accepts(target.type, connection.targetHandle));
  }, []);

  const onConnect = useCallback(
    (connection: Connection) => {
      if (!isValidConnection(connection)) return;
      const source = nodesRef.current.find((node) => node.id === connection.source);
      const kind = outputKind(source?.type, source?.data) ?? "any";
      setEdges((current) =>
        addEdge(
          {
            ...connection,
            type: "studio",
            animated: false,
            style: { stroke: PORT_STROKE[kind], strokeWidth: 2.25 },
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
      const source = nodesRef.current.find((node) => node.id === connection.source);
      const kind = outputKind(source?.type, source?.data) ?? "any";
      setEdges((current) =>
        reconnectEdge(oldEdge, connection, current).map((edge) =>
          edge.source === connection.source &&
          edge.target === connection.target &&
          edge.sourceHandle === connection.sourceHandle &&
          edge.targetHandle === connection.targetHandle
            ? { ...edge, type: "studio", animated: false, style: { stroke: PORT_STROKE[kind], strokeWidth: 2.25 } }
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
      setLinkDrag({ from: "target", accepts: accepts(node?.type, params.handleId).join(" ") });
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
      data: { label: "New Group", width: groupWidth, height: groupHeight } as unknown as StudioNodeData,
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

      if (!["prompt", "image", "result"].includes(node.type ?? "")) {
        const data = node.data ?? {};
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
      setNodes((current) => current.filter((n) => n.id !== nodeId));
      setEdges((current) => current.filter((e) => e.source !== nodeId && e.target !== nodeId));
      setMenu(null);
    },
    [setNodes, setEdges],
  );

  const deleteGroupWithMembers = useCallback(
    (groupId: string) => {
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
    setEdges(templateEdges.map((edge) => decorateEdge(edge, templateNodes)));
    toast("Đã nạp quy trình phối đồ thời trang mẫu!", "success");
    setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 100);
  }, [fitView, setEdges, setNodes, toast]);

  /* -------------------------------- drop zone ----------------------------- */

  const onDrop = useCallback(
    async (event: React.DragEvent) => {
      event.preventDefault();
      const raw = event.dataTransfer.getData("application/atelier-node");
      if (raw) {
        let payload: { type: string; data?: Record<string, unknown> } = { type: raw };
        try {
          payload = JSON.parse(raw);
        } catch {
          /* legacy plain string */
        }
        addNode(payload.type, screenToFlowPosition({ x: event.clientX, y: event.clientY }), payload.data);
        return;
      }
      const file = event.dataTransfer.files?.[0];
      if (file && file.type.startsWith("image/")) {
        const position = screenToFlowPosition({ x: event.clientX, y: event.clientY });
        const id = addNode("image", position);
        try {
          const asset = await api.assets.upload(file, project.id);
          patchNode(id, { imageUrl: asset.url, result: asset });
          toast(tr("toast.uploaded"), "success");
        } catch (error) {
          toast(error instanceof Error ? error.message : "Tải lên thất bại", "error");
        }
      }
    },
    [addNode, patchNode, project.id, screenToFlowPosition, toast, tr],
  );

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
        const targetHandle = targetHandleFor(item.type, extra, kind);
        if (targetHandle) {
          setEdges((current) =>
            addEdge(
              {
                source: connect.nodeId,
                sourceHandle: connect.handleId,
                target: id,
                targetHandle,
                type: "studio",
                style: { stroke: PORT_STROKE[kind], strokeWidth: 2.25 },
              },
              current,
            ),
          );
        }
      } else if (connect?.handleType === "target") {
        const kind = outputKind(item.type, extra);
        const sourceHandle = sourceHandleFor(item.type);
        if (kind && sourceHandle) {
          setEdges((current) =>
            addEdge(
              {
                source: id,
                sourceHandle,
                target: connect.nodeId,
                targetHandle: connect.handleId,
                type: "studio",
                style: { stroke: PORT_STROKE[kind], strokeWidth: 2.25 },
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
    const accepted = accepts(node?.type, connect.handleId);
    return NODE_LIBRARY.filter((item) => kindsCompatible(outputKind(item.type, itemData(item)), accepted));
  }, [addMenu, nodes]);

  const selectedNode = useMemo(() => {
    const node = nodes.find((n) => n.id === selectedId) ?? null;
    // Group boxes are a pure visual container — nothing in them to inspect/run.
    return node?.type === "group" ? null : node;
  }, [nodes, selectedId]);

  const hasKey = useStudio((s) => s.hasKey);

  return (
    <div className="flex h-full min-h-0 bg-[#0c0c0f]">
      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="flex h-10 shrink-0 items-center gap-2 border-b border-white/[0.06] px-3">
          <h1 className="truncate font-display text-[14px] tracking-tight">{project.name}</h1>
          <span className="text-[10px] text-ink-500">
            {saveState === "saving" ? tr("common.saving") : saveState === "saved" ? tr("common.saved") : ""}
          </span>
        </header>

        {!hasKey && (
          <div className="flex items-center justify-between gap-3 border-b border-amber-900/40 bg-amber-950/25 px-4 py-2 text-[12px] text-amber-200">
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
          className={clsx("relative min-h-0 flex-1", linkDrag && "rf-connecting")}
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
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
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
            className="bg-[#0c0c0f]"
          >
            <Background variant={BackgroundVariant.Dots} gap={20} size={1.35} color="#3a3a44" />
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
                <button
                  type="button"
                  onClick={loadFashionTemplate}
                  className="flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[12px] text-amber-200 hover:bg-white/10"
                >
                  <Shirt size={13} />
                  Mẫu phối đồ
                </button>
                <span className="mx-0.5 h-4 w-px bg-white/10" />
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
                <div className="mt-3 flex items-center justify-center gap-3 text-[11px]">
                  <span className="text-violet-300">● {tr("canvas.legend.text")}</span>
                  <span className="text-sky-300">● {tr("canvas.legend.image")}</span>
                  <span className="text-amber-300">● {tr("canvas.legend.video")}</span>
                </div>
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
        </div>
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
