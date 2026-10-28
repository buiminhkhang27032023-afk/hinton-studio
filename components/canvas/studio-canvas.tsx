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
  AlignLeft,
  Video,
  AudioLines,
  Box,
  Film,
  FolderInput,
  LayoutGrid,
  Undo2,
  Redo2,
  Upload,
  Bot,
  PlugZap,
  ChevronDown,
  ChevronUp,
  Search,
  FolderKanban,
  Users,
  Share2,
  History,
  MessageSquare,
  LayoutTemplate,
  FolderOpen,
  HelpCircle,
  Maximize2,
  Spline,
  Zap,
  MousePointer2,
  Hand,
  X,
} from "lucide-react";
import clsx from "clsx";
import { LogoMark } from "@/components/brand/logo";
import Link from "next/link";
import { CanvasCopilot } from "@/components/canvas/canvas-copilot";
import { ApiGatewaysModal } from "@/components/canvas/api-gateways-modal";
import { ScriptDirectorModal } from "@/components/canvas/script-director-modal";
import type { ProductionPlan } from "@/app/api/script-director/route";
import { api } from "@/lib/api-client";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";
import { runStudioNode, type StudioNode, type StudioNodeData } from "@/lib/execute";
import type { ProjectSummary } from "@/lib/types";
import { Spinner } from "@/components/ui/primitives";
import { NODE_TYPES } from "./nodes";
import { Inspector } from "./inspector";
import { MediaLightbox } from "@/components/ui/media-lightbox";
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
  // 1. Nhóm cốt lõi (Core Types - chuẩn Tapnow)
  { type: "prompt", icon: AlignLeft, label: "Văn bản", hint: "Kịch bản, nội dung quảng cáo, văn bản…", section: "core" },
  { type: "generate", icon: ImageIcon, label: "Hình ảnh", hint: "Tạo ảnh từ câu lệnh, phác thảo…", section: "core", data: { modelKind: "image" } },
  { type: "generate", icon: Video, label: "Video", hint: "Tạo video AI, hoạt cảnh, catwalk…", section: "core", data: { modelKind: "video" } },
  { type: "audio", icon: AudioLines, label: "Âm thanh", hint: "Lồng tiếng, nhạc nền, âm thanh…", section: "core" },
  { type: "3d", icon: Box, label: "3D", hint: "Mô hình 3D, camera không gian…", section: "core" },

  // 2. Tiện ích (Utilities)
  { type: "group", icon: Layers, label: "Gom nhóm (Group)", hint: "Tạo khung gom nhóm các khối gọn gàng", section: "utility" },
  { type: "fashion_tryon", icon: Shirt, label: "Thử đồ thời trang", hint: "Thử đồ AI, phối trang phục", section: "utility" },
  { type: "fashion_compose", icon: SplitSquareVertical, label: "Ghép Lookbook", hint: "Video chia khung hình 60:40 (9:16)", section: "utility" },
  { type: "timeline", icon: Film, label: "Trình chỉnh sửa dòng thời gian", hint: "Ghép nối timeline video", section: "utility", badge: "Bản Beta" },
  { type: "prompt_master", icon: Clapperboard, label: "Đạo diễn Kịch bản Flova", hint: "Phân cảnh video, kịch bản tự động", section: "utility" },

  // 3. Thêm nguồn (Sources)
  { type: "upload", icon: Upload, label: "Tải lên", hint: "Tải ảnh hoặc video từ máy tính", section: "source" },
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
  if (type === "group") return { ...base, label: "New Group", width: 360, height: 260 };
  if (type === "audio") return { ...base, text: "Giọng đọc truyền cảm, âm thanh sống động…", name: "Âm thanh" };
  if (type === "3d") return { ...base, text: "3D camera orbit 360 degree, depth scene…", name: "Studio 3D" };
  return base;
}

function CanvasInner({ project }: { project: ProjectSummary }) {
  const { tr, toast, openLightbox } = useUi();
  const [nodes, setNodes, onNodesChange] = useNodesState<StudioNode>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [inspectedId, setInspectedId] = useState<string | null>(null);
  const [mouseMode, setMouseMode] = useState<"select" | "pan">("select");
  const [edgeCurve, setEdgeCurve] = useState<ConnectionLineType>(ConnectionLineType.Bezier);
  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    nodeId?: string;
    isSelection?: boolean;
    isPane?: boolean;
  } | null>(null);
  const [addMenu, setAddMenu] = useState<AddMenuState | null>(null);
  const [linkDrag, setLinkDrag] = useState<LinkDrag | null>(null);
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved">("idle");
  const [runningAll, setRunningAll] = useState(false);
  const [copilotOpen, setCopilotOpen] = useState(false);
  const [gatewaysModalOpen, setGatewaysModalOpen] = useState(false);
  const [scriptDirectorOpen, setScriptDirectorOpen] = useState(false);
  const [toolbarCollapsed, setToolbarCollapsed] = useState(true);
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
      } else if (modifier && e.key.toLowerCase() === "g" && !e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        groupSelected();
      } else if (modifier && e.key.toLowerCase() === "g" && e.shiftKey) {
        e.preventDefault();
        e.stopPropagation();
        if (selectedIds.length === 1 && nodes.find((n) => n.id === selectedIds[0])?.type === "group") {
          ungroupSelected(selectedIds[0]);
        }
      } else if (modifier && e.key.toLowerCase() === "b") {
        e.preventDefault();
        e.stopPropagation();
        setToolbarCollapsed((v) => !v);
      } else if (!modifier && !e.altKey) {
        if (e.key.toLowerCase() === "v") {
          setMouseMode("select");
        } else if (e.key.toLowerCase() === "h") {
          setMouseMode("pan");
        } else if (e.key === "Escape") {
          setSelectedIds([]);
          setSelectedId(null);
          setMenu(null);
          setAddMenu(null);
        }
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

  useEffect(() => {
    if (selectedId) {
      const node = nodesRef.current.find((n) => n.id === selectedId);
      if (node && node.type !== "group") {
        setInspectedId(selectedId);
      }
    }
  }, [selectedId]);

  const onNodeDragStart = useCallback(() => {
    pushSnapshot();
  }, [pushSnapshot]);

  const onNodeDragStop = useCallback(
    (_: any, draggedNode: StudioNode) => {
      // Don't auto-group the group container itself
      if (draggedNode.type === "group") return;

      setNodes((current) => {
        const groups = current.filter((n) => n.type === "group");
        if (groups.length === 0) return current;

        const node = current.find((n) => n.id === draggedNode.id);
        if (!node) return current;

        // 1. If node currently belongs to a group:
        if (node.parentId) {
          const parentGroup = groups.find((g) => g.id === node.parentId);
          if (parentGroup) {
            const gW = (parentGroup.data as any)?.width ?? 360;
            const gH = (parentGroup.data as any)?.height ?? 260;
            const isOutside =
              node.position.x < -30 ||
              node.position.y < -30 ||
              node.position.x > gW + 30 ||
              node.position.y > gH + 30;

            if (isOutside) {
              const absX = parentGroup.position.x + node.position.x;
              const absY = parentGroup.position.y + node.position.y;
              toast(`Đã đưa khối ra khỏi nhóm "${(parentGroup.data as any)?.label || "Group"}"`, "default");
              return current.map((n) => {
                if (n.id === node.id) {
                  const { parentId, extent, ...rest } = n;
                  return { ...rest, position: { x: absX, y: absY } };
                }
                return n;
              });
            }
          }
          return current;
        }

        // 2. If node is currently free (no parent): check if dropped inside any group
        const nodeX = node.position.x;
        const nodeY = node.position.y;
        for (const group of groups) {
          const gX = group.position.x;
          const gY = group.position.y;
          const gW = (group.data as any)?.width ?? 360;
          const gH = (group.data as any)?.height ?? 260;

          if (nodeX >= gX - 20 && nodeX <= gX + gW - 30 && nodeY >= gY - 20 && nodeY <= gY + gH - 30) {
            const localX = Math.max(16, nodeX - gX);
            const localY = Math.max(36, nodeY - gY);
            const neededW = Math.max(gW, localX + 260 + 24);
            const neededH = Math.max(gH, localY + 200 + 24);

            toast(`Đã gom khối vào "${(group.data as any)?.label || "New Group"}"!`, "success");

            return current.map((n) => {
              if (n.id === group.id) {
                return { ...n, data: { ...n.data, width: neededW, height: neededH } };
              }
              if (n.id === node.id) {
                return {
                  ...n,
                  parentId: group.id,
                  extent: "parent" as const,
                  position: { x: localX, y: localY },
                };
              }
              return n;
            });
          }
        }

        return current;
      });
    },
    [setNodes, toast],
  );



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

  const lastSavedRef = useRef<string>("");
  const persist = useCallback(() => {
    setSaveState("saving");
    const payload = {
      nodes: nodes.map((node) => ({
        id: node.id,
        type: node.type,
        position: node.position,
        data: node.data,
        parentId: node.parentId,
        extent: node.extent,
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
    const signature = JSON.stringify({ n: payload.nodes, e: payload.edges });
    if (signature === lastSavedRef.current) {
      setSaveState("idle");
      return;
    }
    lastSavedRef.current = signature;
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

  // Debounced autosave. The old cleanup flushed a save on EVERY nodes/edges
  // change (drag frame, selection, resize), firing a PUT per interaction and
  // freezing the canvas. Now: only debounce here; flush once on real unmount.
  useEffect(() => {
    if (!loaded) return;
    dirtyRef.current = true;
    const timer = setTimeout(() => {
      dirtyRef.current = false;
      persistRef.current();
    }, 1200);
    return () => clearTimeout(timer);
  }, [nodes, edges, loaded]);

  useEffect(() => {
    return () => {
      if (dirtyRef.current) {
        dirtyRef.current = false;
        persistRef.current();
      }
    };
  }, []);

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
      if (type === "group") {
        const groupId = `group_${Math.random().toString(36).slice(2, 10)}`;
        const groupNode: StudioNode = {
          id: groupId,
          type: "group",
          position: spot,
          zIndex: -1,
          selected: true,
          data: {
            label: (extra as any)?.label || "New Group",
            width: (extra as any)?.width || 360,
            height: (extra as any)?.height || 260,
            color: "#ffffff",
            ...extra,
          } as unknown as StudioNodeData,
        };
        setNodes((current) => [groupNode, ...current]);
        setSelectedId(groupId);
        setSelectedIds([groupId]);
        return groupId;
      }

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
      selected: true,
      data: { label: "New Group", width: groupWidth, height: groupHeight, color: "#ffffff" } as unknown as StudioNodeData,
    };

    setNodes((current) => [
      groupNode,
      ...current.map((n) => {
        const place = placements.get(n.id);
        if (!place) return { ...n, selected: false };
        return {
          ...n,
          parentId: groupId,
          extent: "parent" as const,
          position: place,
          selected: false,
        };
      }),
    ]);
    setSelectedId(groupId);
    setSelectedIds([groupId]);
    toast(`Đã gom ${selected.length} khối thành nhóm gọn gàng!`, "success");
  }, [nodes, selectedIds, setNodes, getViewport, toast]);

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

  const duplicateSelected = useCallback(() => {
    pushSnapshot();
    const copies: StudioNode[] = [];
    for (const id of selectedIds) {
      const source = nodes.find((n) => n.id === id);
      if (!source || source.type === "group") continue;
      copies.push({
        ...source,
        id: `${source.type}_${Math.random().toString(36).slice(2, 9)}`,
        position: { x: source.position.x + 32, y: source.position.y + 32 },
        selected: true,
        data: { ...source.data },
      });
    }
    if (copies.length > 0) {
      setNodes((current) => [...current.map((n) => ({ ...n, selected: false })), ...copies]);
      setSelectedIds(copies.map((c) => c.id));
      setSelectedId(copies[0].id);
      toast(`Đã nhân bản ${copies.length} khối`, "success");
    }
  }, [nodes, pushSnapshot, selectedIds, setNodes, toast]);

  const deleteSelected = useCallback(() => {
    if (selectedIds.length === 0) return;
    pushSnapshot();
    const idSet = new Set(selectedIds);
    setNodes((current) => current.filter((n) => !idSet.has(n.id)));
    setEdges((current) => current.filter((e) => !idSet.has(e.source) && !idSet.has(e.target)));
    const count = selectedIds.length;
    setSelectedIds([]);
    setSelectedId(null);
    setMenu(null);
    toast(`Đã xoá ${count} khối`, "default");
  }, [pushSnapshot, selectedIds, setEdges, setNodes, toast]);

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
    const ids = selectedIds.length > 0 ? selectedIds : selectedId ? [selectedId] : [];
    if (ids.length === 0) return;
    const targets = nodes.filter((n) => ids.includes(n.id) && !["prompt", "image", "result"].includes(n.type ?? ""));
    const order = topoSort(targets, edges);
    let failures = 0;
    for (const node of order) {
      try {
        await runNode(node.id);
      } catch {
        failures++;
      }
    }
    if (failures > 0) {
      toast(`Hoàn tất với ${failures} khối lỗi`, "error");
    } else if (targets.length > 0) {
      toast(tr("toast.generated"), "success");
    }
  }, [edges, nodes, runNode, selectedId, selectedIds, toast, tr]);

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

  const handleApplyProductionPlan = useCallback(
    (plan: ProductionPlan) => {
      pushSnapshot();

      const templateNodes: StudioNode[] = [];
      const templateEdges: Edge[] = [];

      // 1. Script Master Node
      templateNodes.push({
        id: "script_master_flova",
        type: "prompt",
        position: { x: 340, y: 40 },
        data: {
          text: `[KỊCH BẢN FLOVA]: ${plan.project_analysis.title}\nThể loại: ${plan.project_analysis.genre} | ${plan.project_analysis.target_duration_sec}s | ${plan.project_analysis.recommended_aspect}\nModel đề xuất: ${plan.project_analysis.recommended_model}\n\n${plan.master_prompt_unified}`,
        },
      });

      // 2. Character / Asset Image nodes
      const charAssets = (plan.entities.characters || []).filter((c) => c.matched_asset_url);
      const outfitAssets = (plan.entities.outfits || []).filter((o) => o.matched_asset_url);
      const combinedAssets = [...charAssets, ...outfitAssets];

      if (combinedAssets.length === 0) {
        templateNodes.push({
          id: "char_anchor_ref",
          type: "image",
          position: { x: 40, y: 220 },
          data: { name: plan.entities.characters?.[0]?.name || "Nhân vật chính", status: "idle" },
        });
      } else {
        combinedAssets.forEach((asset, idx) => {
          templateNodes.push({
            id: `char_ref_${idx + 1}`,
            type: "image",
            position: { x: 40, y: 160 + idx * 240 },
            data: {
              name: asset.name,
              imageUrl: (asset as any).matched_asset_url,
              status: "idle",
            },
          });
        });
      }

      // 3. Shots & Video Nodes
      const shots = plan.shots && plan.shots.length > 0 ? plan.shots : [];
      const primaryCharId = templateNodes.find((n) => n.type === "image")?.id || "char_anchor_ref";

      shots.forEach((shot, idx) => {
        const promptNodeId = `shot_${shot.shot_index}_prompt`;
        const genNodeId = `shot_${shot.shot_index}_video`;
        const yPos = 180 + idx * 240;

        // Prompt Node for this shot
        templateNodes.push({
          id: promptNodeId,
          type: "prompt",
          position: { x: 340, y: yPos },
          data: {
            text: `[Cảnh ${shot.shot_index} (${shot.time_range})]: ${shot.title || shot.character_action}\nBố cục: ${shot.framing} | Camera: ${shot.camera_movement} | Chuyển cảnh: ${shot.transition_out}\n\n${shot.prompt_en}`,
          },
        });

        // Generate Node for this shot
        templateNodes.push({
          id: genNodeId,
          type: "generate",
          position: { x: 680, y: yPos },
          data: {
            modelKind: "video",
            modelId: plan.project_analysis.recommended_model || "iooai:omni_flash_10s",
            aspect: plan.project_analysis.recommended_aspect || "9:16",
            duration: shot.duration_sec || 5,
            resolution: "720p",
            prompt: shot.prompt_en,
            status: "idle",
          },
        });

        // Edges: image -> video, prompt -> video
        templateEdges.push({
          id: `e-ref-${shot.shot_index}`,
          source: primaryCharId,
          target: genNodeId,
        });
        templateEdges.push({
          id: `e-prompt-${shot.shot_index}`,
          source: promptNodeId,
          target: genNodeId,
        });
        // Connect video -> master output
        templateEdges.push({
          id: `e-video-${shot.shot_index}-out`,
          source: genNodeId,
          target: "flova_final_output",
        });
      });

      // 4. Final Output Result Node
      templateNodes.push({
        id: "flova_final_output",
        type: "result",
        position: { x: 1020, y: 300 },
        data: { status: "idle" },
      });

      setNodes(templateNodes);
      setEdges(templateEdges.map((edge) => decorateEdge(edge, templateNodes)));
      toast(`Đã đưa kế hoạch phân cảnh "${plan.project_analysis.title}" vào Canvas!`, "success");
      setTimeout(() => fitView({ padding: 0.25, duration: 400 }), 100);
    },
    [pushSnapshot, setNodes, setEdges, toast, fitView],
  );


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

      // Always create a new node when pasting or uploading (never overwrite existing selected node)
      const selNode = selectedId ? nodesRef.current.find((n) => n.id === selectedId) : null;
      const basePos = customPosition ?? (selNode ? { x: selNode.position.x + 30, y: selNode.position.y + 30 } : getCenterFlowPosition());
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

  const handleReuseMedia = useCallback(
    (url: string, kind?: "image" | "video") => {
      const isVid = kind === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(url);
      const name = isVid ? "Video dùng lại" : "Ảnh dùng lại";
      const targetId = inspectedId || selectedId;
      const activeNode = targetId ? nodes.find((n) => n.id === targetId) : null;
      let spot: { x: number; y: number } | undefined;
      if (activeNode) {
        spot = {
          x: activeNode.position.x + 280,
          y: activeNode.position.y,
        };
      }
      const newId = addNode("image", spot, {
        imageUrl: isVid ? undefined : url,
        videoUrl: isVid ? url : undefined,
        name,
        status: "done",
        result: {
          id: `reused_${Date.now()}`,
          kind: isVid ? "video" : "image",
          url,
          name,
          createdAt: new Date().toISOString(),
        },
      });
      toast(`Đã tạo khối nguồn mới từ ${isVid ? "video" : "ảnh"}!`, "success");
      return newId;
    },
    [addNode, inspectedId, selectedId, nodes, toast],
  );

  const reuseNode = useCallback(
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
      const isVid = kind === "video" || /\.(mp4|webm|mov)(\?|$)/i.test(url);
      const spot = {
        x: target.position.x + 280,
        y: target.position.y,
      };
      const name = `Dùng lại: ${target.data?.name || (isVid ? "Video" : "Ảnh")}`;
      addNode("image", spot, {
        imageUrl: isVid ? undefined : url,
        videoUrl: isVid ? url : undefined,
        name,
        status: "done",
        result: {
          id: `reused_${Date.now()}`,
          kind: isVid ? "video" : "image",
          url,
          name,
          createdAt: new Date().toISOString(),
        },
      });
      toast(`Đã tạo khối nguồn mới từ ${isVid ? "video" : "ảnh"}!`, "success");
    },
    [addNode, nodes, toast],
  );

  const nodeMenu = useMemo(
    () => ({ duplicate: duplicateNode, remove: deleteNode, reuse: reuseNode }),
    [duplicateNode, deleteNode, reuseNode],
  );

  const placeFromMenu = useCallback(
    (item: LibItem) => {
      if (!addMenu) return;
      if (item.type === "upload") {
        setAddMenu(null);
        const input = document.createElement("input");
        input.type = "file";
        input.multiple = true;
        input.accept = "image/*,video/*";
        input.onchange = (e) => {
          const files = (e.target as HTMLInputElement).files;
          if (files && files.length > 0) handleUploadFiles(Array.from(files), addMenu.flow);
        };
        input.click();
        return;
      }
      if (item.type === "timeline") {
        setAddMenu(null);
        setScriptDirectorOpen(true);
        return;
      }
      if (item.type === "group") {
        addNode("group", addMenu.flow, { label: "New Group", width: 360, height: 260 });
        setAddMenu(null);
        return;
      }
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

  const inspectedNode = useMemo(() => {
    const targetId = inspectedId || selectedId;
    if (!targetId) return null;
    const node = nodes.find((n) => n.id === targetId) ?? null;
    // Group boxes are a pure visual container — nothing in them to inspect/run.
    return node?.type === "group" ? null : node;
  }, [nodes, inspectedId, selectedId]);

  const selectedNode = inspectedNode;

  const hasKey = useStudio((s) => s.hasKey);

  return (
    <div className="relative h-full min-h-0 bg-black">
{/* Top floating header panels rendered inside ReactFlow */}

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
            onNodeDragStop={onNodeDragStop}
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
            connectionLineType={edgeCurve}
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
            elevateNodesOnSelect={false}
            zoomOnDoubleClick={false}
            onNodeDoubleClick={(_event, node) => runNode(node.id).catch(() => {})}
            onNodeContextMenu={(event, node) => {
              event.preventDefault();
              setAddMenu(null);
              if (selectedIds.length >= 2 && selectedIds.includes(node.id)) {
                setMenu({ x: event.clientX, y: event.clientY, isSelection: true });
              } else {
                setMenu({ x: event.clientX, y: event.clientY, nodeId: node.id });
              }
            }}
            onSelectionContextMenu={(event) => {
              event.preventDefault();
              setAddMenu(null);
              setMenu({ x: event.clientX, y: event.clientY, isSelection: true });
            }}
            onPaneContextMenu={(event) => {
              event.preventDefault();
              setAddMenu(null);
              if (selectedIds.length >= 2) {
                setMenu({ x: event.clientX, y: event.clientY, isSelection: true });
              } else {
                setMenu({ x: event.clientX, y: event.clientY, isPane: true });
              }
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
            onMoveStart={() => setMenu(null)}
            deleteKeyCode={["Backspace", "Delete"]}
            panOnDrag={mouseMode === "select" ? [1, 2] : true}
            selectionOnDrag={mouseMode === "select"}
            selectionMode={SelectionMode.Partial}
            selectionKeyCode={mouseMode === "select" ? null : "Shift"}
            panActivationKeyCode="Space"
            paneClickDistance={6}
            className={clsx("bg-black", mouseMode === "pan" ? "cursor-grab active:cursor-grabbing" : "")}
          >
            <ConnectHint />

            {/* 1. Top-Left Floating Project Pill (Image 1 & 2) */}
            <Panel position="top-left" className="!top-3 !left-3 z-30">
              <Link
                href="/"
                className="flex items-center gap-2 rounded-full border border-white/15 bg-[#121217]/95 px-3 py-1.5 text-[12.5px] font-semibold text-white shadow-2xl backdrop-blur-md hover:bg-white/10 transition"
                title="Quay về Trang chủ Dashboard"
              >
                <LogoMark size={20} animated={false} />
                <span className="max-w-[220px] truncate">{project.name || "HINTON Studio"}</span>
                <ChevronDown size={13} className="text-neutral-400" />
              </Link>
            </Panel>

            {/* 2. Top-Right Floating Controls (Image 1 & 2) */}
            <Panel position="top-right" className="!top-3 !right-3 z-30">
              <div className="flex items-center gap-2">
                {/* API Gateways */}
                <button
                  type="button"
                  onClick={() => setGatewaysModalOpen(true)}
                  title="Cổng API (IOOAI / Seedance / Kling / Flux)"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#121217]/95 text-neutral-300 hover:text-white hover:bg-white/10 shadow-xl backdrop-blur-md transition"
                >
                  <PlugZap size={14} />
                </button>

                {/* Credits */}
                <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121217]/95 px-3 py-1.5 text-[12px] font-semibold text-amber-300 shadow-xl backdrop-blur-md">
                  <span>🪙</span>
                  <span>1.250</span>
                </div>

                {/* Community */}
                <Link
                  href="/"
                  className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121217]/95 px-3 py-1.5 text-[12px] font-medium text-neutral-200 hover:text-white hover:bg-white/10 shadow-xl backdrop-blur-md transition"
                >
                  <Users size={13} />
                  <span>Community</span>
                </Link>

                {/* Share */}
                <button
                  type="button"
                  onClick={() => toast("Đã sao chép liên kết chia sẻ dự án!", "success")}
                  title="Chia sẻ dự án"
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#121217]/95 text-neutral-300 hover:text-white hover:bg-white/10 shadow-xl backdrop-blur-md transition"
                >
                  <Share2 size={13} />
                </button>
              </div>
            </Panel>

            {/* 3. Left Vertical Floating Pill Dock (Image 1 & 2) */}
            <Panel position="top-left" className="!top-14 !left-3 z-20">
              <div className="flex flex-col items-center gap-2 rounded-full border border-white/15 bg-[#121217]/95 p-1.5 shadow-2xl backdrop-blur-md">
                {/* Quick Add Node: White Circle Button */}
                <button
                  type="button"
                  onClick={(event) => {
                    const rect = event.currentTarget.getBoundingClientRect();
                    openAddAt(rect.right + 12, rect.top);
                  }}
                  title="Thêm khối mới (+)"
                  className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-black hover:bg-neutral-200 transition shadow-md"
                >
                  <Plus size={16} strokeWidth={2.4} />
                </button>

                {/* Search */}
                <button
                  type="button"
                  onClick={() => fitView({ padding: 0.25, duration: 400 })}
                  title="Tìm kiếm & Căn chỉnh màn hình"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white transition"
                >
                  <Search size={14} />
                </button>

                {/* Asset Folder Upload */}
                <label
                  title="Tài nguyên & Tải lên tệp"
                  className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white transition"
                >
                  <FolderOpen size={14} />
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

                {/* Templates / Flova Director */}
                <button
                  type="button"
                  onClick={() => setScriptDirectorOpen(true)}
                  title="Mẫu & Đạo diễn Kịch bản Flova"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white transition"
                >
                  <LayoutTemplate size={14} />
                </button>

                {/* AI Copilot */}
                <button
                  type="button"
                  onClick={() => setCopilotOpen((v) => !v)}
                  title="Trợ lý AI Copilot"
                  className={clsx(
                    "flex h-7 w-7 items-center justify-center rounded-full transition",
                    copilotOpen ? "bg-violet-600 text-white" : "text-neutral-400 hover:bg-white/10 hover:text-white",
                  )}
                >
                  <MessageSquare size={14} />
                </button>

                {/* History / Undo */}
                <button
                  type="button"
                  onClick={undo}
                  title="Lịch sử thay đổi / Hoàn tác (Ctrl+Z)"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-neutral-400 hover:bg-white/10 hover:text-white transition"
                >
                  <History size={14} />
                </button>

                <span className="h-px w-4 bg-white/10 my-0.5" />

                {/* User Avatar Circle */}
                <Link
                  href="/"
                  title="Quay về Trang chủ Dashboard"
                  className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-amber-400 to-amber-200 text-black font-bold text-[11px] hover:scale-105 transition shadow-sm overflow-hidden"
                >
                  <span>H</span>
                </Link>
              </div>
            </Panel>

            {/* 4. Bottom-Left Control Suite (Image 1 & 2) */}
            <BottomControlBar
              mouseMode={mouseMode}
              onToggleMode={setMouseMode}
              edgeCurve={edgeCurve}
              onToggleCurve={() => {
                setEdgeCurve((prev) =>
                  prev === ConnectionLineType.Bezier ? ConnectionLineType.SmoothStep : ConnectionLineType.Bezier,
                );
              }}
            />

            <MiniMap
              pannable
              zoomable
              position="bottom-right"
              className="!overflow-hidden !rounded-xl !border !border-white/10 !bg-[#101014]/95 !shadow-xl"
              style={{ width: 148, height: 96 }}
              nodeColor={minimapColor}
              maskColor="rgba(8,8,10,.62)"
            />

            {/* Sleek Floating Selection Pill Dock (Only shown when multiple nodes are selected) */}
            {selectedIds.length >= 2 && (
              <Panel position="bottom-center" className="!mb-6 z-40">
                <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121217]/95 px-3 py-1.5 shadow-2xl backdrop-blur-md text-[12px] text-white">
                  <span className="text-neutral-400 font-medium px-1">Đã chọn {selectedIds.length} khối</span>
                  <span className="h-3.5 w-px bg-white/15 mx-0.5" />
                  <button
                    type="button"
                    onClick={groupSelected}
                    className="flex items-center gap-1 rounded-full bg-white/10 hover:bg-white/20 px-2.5 py-1 text-white font-medium transition"
                    title="Gom thành nhóm (Ctrl+G)"
                  >
                    <Layers size={13} className="text-amber-300" />
                    Gom nhóm
                  </button>
                  <button
                    type="button"
                    onClick={runSelected}
                    disabled={runningAll}
                    className="flex items-center gap-1 rounded-full hover:bg-white/10 px-2 py-1 text-neutral-200 hover:text-white transition disabled:opacity-40"
                    title="Chạy các khối đã chọn"
                  >
                    <Play size={12} fill="currentColor" />
                    Chạy
                  </button>
                  <button
                    type="button"
                    onClick={duplicateSelected}
                    className="flex items-center gap-1 rounded-full hover:bg-white/10 px-2 py-1 text-neutral-200 hover:text-white transition"
                    title="Nhân bản (Ctrl+D)"
                  >
                    <Copy size={12} />
                    Nhân bản
                  </button>
                  <button
                    type="button"
                    onClick={deleteSelected}
                    className="flex items-center gap-1 rounded-full hover:bg-rose-500/20 px-2 py-1 text-rose-300 transition"
                    title="Xoá (Del)"
                  >
                    <Trash2 size={12} />
                    Xoá
                  </button>
                  <span className="h-3.5 w-px bg-white/15 mx-0.5" />
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedIds([]);
                      setSelectedId(null);
                    }}
                    className="rounded-full p-1 text-neutral-400 hover:bg-white/10 hover:text-white transition"
                    title="Bỏ chọn (Esc)"
                  >
                    <X size={12} />
                  </button>
                </div>
              </Panel>
            )}
{/* Floating toolbar is now attached directly to GroupNode via NodeToolbar */}
          </ReactFlow>
          </NodeMenuContext.Provider>
          </RunNodeContext.Provider>

          {menu && (() => {
            const isSelection = menu.isSelection || (selectedIds.length >= 2 && menu.nodeId && selectedIds.includes(menu.nodeId));
            const target = menu.nodeId ? nodes.find((n) => n.id === menu.nodeId) : null;
            const isGroup = target?.type === "group";

            const item = (label: string, icon: ReactNode, onClick: () => void, danger?: boolean, badge?: string) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  onClick();
                  setMenu(null);
                }}
                className={clsx(
                  "flex w-full items-center justify-between px-3 py-2 text-left text-[12px] transition hover:bg-white/10",
                  danger ? "text-red-400 hover:text-red-300" : "text-ink-200 hover:text-white",
                )}
              >
                <span className="flex items-center gap-2">
                  {icon}
                  {label}
                </span>
                {badge && (
                  <span className="text-[10px] font-mono text-ink-500 bg-white/5 px-1.5 py-0.5 rounded">
                    {badge}
                  </span>
                )}
              </button>
            );

            return (
              <div
                className="fixed z-50 min-w-[200px] overflow-hidden rounded-xl border border-white/10 bg-[#16161f]/95 py-1.5 shadow-2xl backdrop-blur-md"
                style={{
                  left: Math.min(menu.x, typeof window !== "undefined" ? window.innerWidth - 220 : menu.x),
                  top: Math.min(menu.y, typeof window !== "undefined" ? window.innerHeight - 280 : menu.y),
                }}
                onClick={(e) => e.stopPropagation()}
              >
                {isSelection ? (
                  <>
                    <div className="px-3 py-1.5 border-b border-white/10 text-[11px] font-semibold text-amber-400 flex items-center gap-1.5">
                      <FolderKanban size={13} />
                      Đã chọn {selectedIds.length} khối
                    </div>
                    {item("Gom nhóm các khối", <FolderKanban size={13} className="text-amber-400" />, groupSelected, false, "Ctrl+G")}
                    {item("Chạy các khối đã chọn", <Play size={13} className="text-brass-300" />, runSelected)}
                    {item("Nhân bản", <Copy size={13} />, duplicateSelected)}
                    {item("Xoá các khối đã chọn", <Trash2 size={13} />, deleteSelected, true, "Del")}
                    <div className="my-1 border-t border-white/10" />
                    {item("Bỏ chọn tất cả", <X size={13} />, () => { setSelectedIds([]); setSelectedId(null); })}
                  </>
                ) : isGroup ? (
                  <>
                    <div className="px-3 py-1.5 border-b border-white/10 text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                      <FolderKanban size={13} />
                      {target?.data?.label ? String(target.data.label) : "Khung nhóm"}
                    </div>
                    {item("Chạy toàn bộ nhóm", <Play size={13} className="text-brass-300" />, () => runGroup(target!.id))}
                    {item("Rã nhóm (Tách khối)", <Layers size={13} />, () => ungroupSelected(target!.id), false, "Ctrl+Shift+G")}
                    {item("Xoá cả nhóm", <Trash2 size={13} />, () => deleteGroupWithMembers(target!.id), true)}
                  </>
                ) : target ? (
                  <>
                    <div className="px-3 py-1.5 border-b border-white/10 text-[11px] font-semibold text-ink-300 truncate">
                      Khối: {String(target.data?.name ?? target.data?.label ?? target.type ?? "")}
                    </div>
                    {item("Chạy khối này", <Play size={13} className="text-brass-300" />, () => runNode(target.id).catch(() => {}))}
                    {(target.data?.result?.url || target.data?.imageUrl || target.data?.videoUrl) && (
                      <>
                        {item("🔍 Phóng to xem chi tiết", <ZoomIn size={13} className="text-sky-300" />, () => {
                          const u = target.data?.result?.url || target.data?.imageUrl || target.data?.videoUrl;
                          const k: "image" | "video" = target.data?.result?.kind === "video" || target.data?.videoUrl ? "video" : "image";
                          if (u) openLightbox({ url: u, kind: k, title: String(target.data?.name ?? "Chi tiết") });
                        })}
                        {item("✨ Dùng lại trên Canvas", <Sparkles size={13} className="text-amber-300" />, () => reuseNode(target.id))}
                      </>
                    )}
                    {item("Nhân bản", <Copy size={13} />, () => duplicateNode(target.id))}
                    {item("Xoá khối", <Trash2 size={13} />, () => deleteNode(target.id), true, "Del")}
                  </>
                ) : (
                  <>
                    <div className="px-3 py-1.5 border-b border-white/10 text-[11px] font-semibold text-ink-400">
                      Thao tác Canvas
                    </div>
                    {item("Thêm khối mới...", <Plus size={13} />, () => openAddAt(menu.x, menu.y))}
                    {item("Căn vừa màn hình", <Search size={13} />, () => fitView({ padding: 0.25, duration: 400 }))}
                    {item("Đạo diễn Flova", <Clapperboard size={13} className="text-amber-400" />, () => setScriptDirectorOpen(true))}
                    {item("Trợ lý Copilot AI", <Bot size={13} className="text-blue-400" />, () => setCopilotOpen((v) => !v))}
                    {item("Chạy toàn bộ luồng", <Sparkles size={13} className="text-brass-400" />, runAll)}
                  </>
                )}
              </div>
            );
          })()}

          {addMenu && (
            <div
              className="fixed z-50 w-[280px] overflow-hidden rounded-2xl border border-white/10 bg-[#16161c]/98 p-2 shadow-2xl backdrop-blur-xl select-none"
              style={{
                left: Math.max(8, Math.min(addMenu.x, window.innerWidth - 300)),
                top: Math.max(8, Math.min(addMenu.y, window.innerHeight - 480)),
              }}
            >
              <div className="flex items-center justify-between px-2.5 pb-2 pt-1 border-b border-white/10">
                <p className="text-[13px] font-semibold text-white">
                  {addMenu.connect?.handleType === "source"
                    ? tr("canvas.connectTo")
                    : addMenu.connect?.handleType === "target"
                      ? tr("canvas.connectFrom")
                      : "Thêm các nút"}
                </p>
                <button
                  type="button"
                  onClick={() => setAddMenu(null)}
                  className="rounded-full p-1 text-neutral-400 hover:text-white hover:bg-white/10 transition"
                >
                  <X size={13} />
                </button>
              </div>

              {addMenu.connect && (
                <p className="px-2.5 pt-1.5 text-[10.5px] text-ink-500">{tr("canvas.onlyCompatible")}</p>
              )}

              <div className="max-h-[380px] overflow-y-auto pt-1 space-y-1">
                {menuItems.length === 0 && (
                  <p className="px-2.5 py-3 text-[12px] text-ink-400">{tr("canvas.noMatch")}</p>
                )}

                {/* Core Items */}
                {menuItems.filter((i: any) => !i.section || i.section === "core").map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={`${item.type}-${item.label}`}
                      type="button"
                      onClick={() => placeFromMenu(item)}
                      className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-white/10 transition"
                    >
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 group-hover:bg-white/10 group-hover:text-white text-neutral-300 transition">
                        <Icon size={16} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-white">{item.label}</span>
                        <span className="block truncate text-[11px] text-neutral-400">{item.hint}</span>
                      </span>
                    </button>
                  );
                })}

                {/* Utilities Section */}
                {menuItems.some((i: any) => i.section === "utility") && (
                  <>
                    <div className="pt-2 pb-1 px-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                      Tiện ích
                    </div>
                    {menuItems.filter((i: any) => i.section === "utility").map((item: any) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={`${item.type}-${item.label}`}
                          type="button"
                          onClick={() => placeFromMenu(item)}
                          className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-white/10 transition"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 group-hover:bg-white/10 group-hover:text-white text-neutral-300 transition">
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center justify-between">
                              <span className="block truncate text-[13px] font-medium text-white">{item.label}</span>
                              {item.badge && (
                                <span className="rounded-full bg-amber-400/20 px-1.5 py-0.5 text-[9.5px] font-semibold text-amber-300">
                                  {item.badge}
                                </span>
                              )}
                            </span>
                            <span className="block truncate text-[11px] text-neutral-400">{item.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}

                {/* Sources Section */}
                {menuItems.some((i: any) => i.section === "source") && (
                  <>
                    <div className="pt-2 pb-1 px-2.5 text-[11px] font-medium text-neutral-500 uppercase tracking-wider">
                      Thêm nguồn
                    </div>
                    {menuItems.filter((i: any) => i.section === "source").map((item: any) => {
                      const Icon = item.icon;
                      return (
                        <button
                          key={`${item.type}-${item.label}`}
                          type="button"
                          onClick={() => placeFromMenu(item)}
                          className="group flex w-full items-center gap-2.5 rounded-xl px-2.5 py-1.5 text-left hover:bg-white/10 transition"
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/5 group-hover:bg-white/10 group-hover:text-white text-neutral-300 transition">
                            <Icon size={16} />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-white">{item.label}</span>
                            <span className="block truncate text-[11px] text-neutral-400">{item.hint}</span>
                          </span>
                        </button>
                      );
                    })}
                  </>
                )}
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
            onOpenScriptDirector={() => setScriptDirectorOpen(true)}
            projectName={project.name}
          />

          <ApiGatewaysModal
            isOpen={gatewaysModalOpen}
            onClose={() => setGatewaysModalOpen(false)}
          />

          <ScriptDirectorModal
            isOpen={scriptDirectorOpen}
            onClose={() => setScriptDirectorOpen(false)}
            projectId={project?.id}
            onApplyPlan={handleApplyProductionPlan}
          />
        </div>

      <Inspector
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
      />

      <MediaLightbox onReuse={handleReuseMedia} />
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

function BottomControlBar({
  mouseMode,
  onToggleMode,
  edgeCurve,
  onToggleCurve,
  onUndo,
  onRedo,
}: {
  mouseMode: "select" | "pan";
  onToggleMode: (mode: "select" | "pan") => void;
  edgeCurve: ConnectionLineType;
  onToggleCurve: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}) {
  const { zoomIn, zoomOut, fitView, zoomTo } = useReactFlow();
  const { zoom } = useViewport();
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <Panel position="bottom-left" className="!mb-4 !ml-3 flex items-center gap-2 z-20">
      <div className="flex items-center gap-1.5 rounded-full border border-white/15 bg-[#121217]/95 px-2.5 py-1.5 text-neutral-300 shadow-2xl backdrop-blur-md">
        {/* 0. Undo & Redo (Tapnow style) */}
        <button
          type="button"
          onClick={onUndo}
          title="Hoàn tác (Ctrl+Z)"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
        >
          <Undo2 size={13} />
        </button>
        <button
          type="button"
          onClick={onRedo}
          title="Làm lại (Ctrl+Y)"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
        >
          <Redo2 size={13} />
        </button>

        <span className="h-3.5 w-px bg-white/15 mx-0.5" />

        {/* 1. Box Select Tool (⬚) */}
        <button
          type="button"
          onClick={() => onToggleMode(mouseMode === "select" ? "pan" : "select")}
          title={mouseMode === "select" ? "Đang ở chế độ Quét chọn (V) - Click để chuyển sang Bàn tay kéo (H)" : "Đang ở chế độ Bàn tay kéo (H) - Click để chuyển sang Quét chọn (V)"}
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-lg transition",
            mouseMode === "select" ? "bg-white/20 text-white font-bold" : "text-neutral-400 hover:text-white hover:bg-white/10"
          )}
        >
          <MousePointer2 size={13} />
        </button>

        {/* 2. Curve Line Toggle (〰️) */}
        <button
          type="button"
          onClick={onToggleCurve}
          title={edgeCurve === ConnectionLineType.Bezier ? "Kiểu dây nối: Cong mềm (Bezier) - Click để chuyển sang Thẳng" : "Kiểu dây nối: Góc vuông (SmoothStep) - Click để chuyển sang Cong"}
          className={clsx(
            "flex h-7 w-7 items-center justify-center rounded-lg transition",
            edgeCurve === ConnectionLineType.Bezier ? "text-amber-400 hover:bg-white/10" : "text-neutral-400 hover:text-white hover:bg-white/10"
          )}
        >
          <Spline size={13} />
        </button>

        {/* 3. Snap / Auto Layout (⚡) */}
        <button
          type="button"
          onClick={() => fitView({ padding: 0.25, duration: 300 })}
          title="Tự động căn chỉnh màn hình"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
        >
          <Zap size={13} />
        </button>

        {/* 4. Fit View (⛶) */}
        <button
          type="button"
          onClick={() => fitView({ padding: 0.25, duration: 300 })}
          title="Căn vừa màn hình (Fit View)"
          className="flex h-7 w-7 items-center justify-center rounded-lg text-neutral-400 hover:text-white hover:bg-white/10 transition"
        >
          <Maximize2 size={13} />
        </button>

        <span className="h-3.5 w-px bg-white/15 mx-0.5" />

        {/* 5. Zoom Slider (──⚪──) */}
        <div className="flex items-center gap-1.5 px-1">
          <input
            type="range"
            min={0.15}
            max={2}
            step={0.05}
            value={zoom}
            onChange={(e) => zoomTo(parseFloat(e.target.value), { duration: 80 })}
            className="w-16 accent-amber-400 cursor-pointer h-1 bg-white/20 rounded-lg appearance-none"
            title={`Thu phóng: ${Math.round(zoom * 100)}%`}
          />
          <span className="font-mono text-[11px] tabular-nums text-neutral-300 w-8 text-right">
            {Math.round(zoom * 100)}%
          </span>
        </div>
      </div>

      {/* Help Circle (?) */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setHelpOpen((v) => !v)}
          title="Trợ giúp & Phím tắt chuột/bàn phím"
          className="flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#121217]/95 text-neutral-400 hover:text-white hover:border-white/30 shadow-xl backdrop-blur-md transition"
        >
          <HelpCircle size={14} />
        </button>

        {helpOpen && (
          <div className="absolute bottom-10 left-0 w-64 rounded-2xl border border-white/15 bg-[#161622]/98 p-3 shadow-2xl backdrop-blur-xl text-white text-[12px] space-y-2 z-50">
            <div className="font-semibold text-amber-300 flex items-center justify-between">
              <span>Phím tắt & Thao tác chuột</span>
              <button type="button" onClick={() => setHelpOpen(false)} className="text-neutral-400 hover:text-white">✕</button>
            </div>
            <div className="space-y-1 text-[11px] text-neutral-300">
              <div className="flex justify-between"><span>Kéo chuột trái</span><span className="font-mono text-amber-200">Quét chọn nhiều khối</span></div>
              <div className="flex justify-between"><span>Chuột phải</span><span className="font-mono text-amber-200">Menu ngữ cảnh / Gom nhóm</span></div>
              <div className="flex justify-between"><span>Chọn nhóm</span><span className="font-mono text-amber-200">Thanh lệnh nổi trên nhóm</span></div>
              <div className="flex justify-between"><span>Chế độ chọn / kéo</span><span className="font-mono text-amber-200">Phím V / Phím H</span></div>
              <div className="flex justify-between"><span>Gom nhóm nhanh</span><span className="font-mono text-amber-200">Ctrl + G</span></div>
              <div className="flex justify-between"><span>Rã nhóm</span><span className="font-mono text-amber-200">Ctrl + Shift + G</span></div>
              <div className="flex justify-between"><span>Thu gọn thanh dưới</span><span className="font-mono text-amber-200">Ctrl + B</span></div>
            </div>
          </div>
        )}
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
