import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import {
  ModuleMeta,
  SpiderWebResponse,
  WebEdge3D,
  WebNode3D,
  assignWebNodePosition,
  calculateNodeRadius,
  generateSpiderWebGeometry,
} from "@/lib/brain-graph";

const SEECUT_DIR = "c:\\Users\\Chen Qianyu\\SeeCut";
const SEECUT_GRAPH_JSON = path.join(SEECUT_DIR, "codebase_brain_graph.json");
const STUDIO_ROOT = process.cwd();

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const target = (searchParams.get("target") || "seecut").toLowerCase();
    const customDir = searchParams.get("dir");
    const nodeId = searchParams.get("nodeId");

    let nodes: WebNode3D[] = [];
    let edges: WebEdge3D[] = [];
    let modules: Record<string, ModuleMeta> = {};
    let activeTarget: "seecut" | "studio" | "custom" = "seecut";

    if (target === "studio") {
      activeTarget = "studio";
      const scanned = scanStudioCodebase(STUDIO_ROOT);
      nodes = scanned.nodes;
      edges = scanned.edges;
      modules = scanned.modules;
    } else if (target === "custom" && customDir && fs.existsSync(customDir)) {
      activeTarget = "custom";
      const scanned = scanCustomCodebase(customDir);
      nodes = scanned.nodes;
      edges = scanned.edges;
      modules = scanned.modules;
    } else {
      activeTarget = "seecut";
      const scanned = scanSeeCutCodebase();
      nodes = scanned.nodes;
      edges = scanned.edges;
      modules = scanned.modules;
    }

    // Build degree maps & incoming/outgoing lists
    const inDegreeMap = new Map<string, number>();
    const outDegreeMap = new Map<string, number>();
    const incomingMap = new Map<string, string[]>();
    const outgoingMap = new Map<string, string[]>();

    nodes.forEach((n) => {
      inDegreeMap.set(n.id, 0);
      outDegreeMap.set(n.id, 0);
      incomingMap.set(n.id, []);
      outgoingMap.set(n.id, []);
    });

    edges.forEach((e) => {
      if (outDegreeMap.has(e.source)) {
        outDegreeMap.set(e.source, (outDegreeMap.get(e.source) || 0) + 1);
        outgoingMap.get(e.source)?.push(e.target);
      }
      if (inDegreeMap.has(e.target)) {
        inDegreeMap.set(e.target, (inDegreeMap.get(e.target) || 0) + 1);
        incomingMap.get(e.target)?.push(e.source);
      }
    });

    // Group nodes by module
    const moduleKeys = Object.keys(modules);
    const nodesByModule = new Map<string, WebNode3D[]>();
    nodes.forEach((n) => {
      const list = nodesByModule.get(n.module) || [];
      list.push(n);
      nodesByModule.set(n.module, list);
    });

    let maxDegree = 0;
    let topHubName = "";
    let topHubDegree = 0;

    moduleKeys.forEach((modKey, modIdx) => {
      const modNodes = nodesByModule.get(modKey) || [];
      modNodes.forEach((node, nodeIdx) => {
        const inDeg = inDegreeMap.get(node.id) || 0;
        const outDeg = outDegreeMap.get(node.id) || 0;
        const total = inDeg + outDeg;

        node.inDegree = inDeg;
        node.outDegree = outDeg;
        node.degree = total;
        // Strict proportionality: "càng nối nhiều cái cục đấy càng to"
        node.radius = calculateNodeRadius(total);
        node.isHub = total >= 4;
        node.incoming = incomingMap.get(node.id) || [];
        node.outgoing = outgoingMap.get(node.id) || [];

        // Assign 3D position on the spider web
        const pos = assignWebNodePosition(
          modIdx,
          moduleKeys.length,
          nodeIdx,
          modNodes.length,
          node.isHub,
          total
        );
        node.x = pos.x;
        node.y = pos.y;
        node.z = pos.z;

        if (total > maxDegree) {
          maxDegree = total;
          topHubName = node.name || node.id;
          topHubDegree = total;
        }
      });
    });

    if (nodeId) {
      const found = nodes.find((n) => n.id === nodeId);
      if (found) {
        return NextResponse.json({ success: true, node: found });
      }
    }

    // Generate 3D Spider Web silk geometry
    const { webLines } = generateSpiderWebGeometry(7, 16, 260);

    const response: SpiderWebResponse = {
      success: true,
      target: activeTarget,
      modules,
      nodes,
      edges,
      webLines,
      stats: {
        totalNodes: nodes.length,
        totalEdges: edges.length,
        maxDegree,
        topHubName,
        topHubDegree,
      },
    };

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: (error as Error).message },
      { status: 500 }
    );
  }
}

/**
 * Scans SeeCut codebase organized by functional modules
 */
function scanSeeCutCodebase(): {
  nodes: WebNode3D[];
  edges: WebEdge3D[];
  modules: Record<string, ModuleMeta>;
} {
  const modules: Record<string, ModuleMeta> = {
    pipeline: {
      key: "pipeline",
      title: "Pipeline & Lập Lịch",
      subtitle: "Điều phối trung tâm & luồng xử lý AI",
      color: "#38BDF8", // Cyan
      bgGlow: "rgba(56, 189, 248, 0.16)",
    },
    cuts: {
      key: "cuts",
      title: "Cắt Ghép & Silence",
      subtitle: "Phát hiện khoảng lặng, cảnh lỗi & nhịp điệu",
      color: "#10B981", // Emerald
      bgGlow: "rgba(16, 185, 129, 0.16)",
    },
    audio: {
      key: "audio",
      title: "Âm Thanh & Whisper AI",
      subtitle: "Nhận diện giọng nói, tách từ & phụ đề",
      color: "#A855F7", // Violet
      bgGlow: "rgba(168, 85, 247, 0.16)",
    },
    visual: {
      key: "visual",
      title: "Thị Giác & B-Roll",
      subtitle: "Đồ họa Bento, sticker, CapCut & hình ảnh",
      color: "#F43F5E", // Rose
      bgGlow: "rgba(244, 63, 94, 0.16)",
    },
    render: {
      key: "render",
      title: "GPU & Render FFmpeg",
      subtitle: "Filtergraph, phần cứng & xuất video",
      color: "#F59E0B", // Amber
      bgGlow: "rgba(245, 158, 11, 0.16)",
    },
    cli: {
      key: "cli",
      title: "CLI & Khởi Động",
      subtitle: "Tham số dòng lệnh & thiết lập",
      color: "#06B6D4", // Sky
      bgGlow: "rgba(6, 182, 212, 0.16)",
    },
  };

  let nodes: WebNode3D[] = [];
  let edges: WebEdge3D[] = [];

  if (fs.existsSync(SEECUT_GRAPH_JSON)) {
    try {
      let content = fs.readFileSync(SEECUT_GRAPH_JSON, "utf-8");
      if (content.charCodeAt(0) === 0xfeff) content = content.slice(1);
      const parsed = JSON.parse(content);

      nodes = (parsed.nodes || []).map((n: any) => {
        let mod = "pipeline";
        const f = (n.file || "").toLowerCase();
        if (f.includes("cuts") || f.includes("ff") || f.includes("scenes")) mod = "cuts";
        else if (f.includes("transcribe") || f.includes("subtitles") || f.includes("sfx")) mod = "audio";
        else if (f.includes("broll") || f.includes("stickers") || f.includes("capcut")) mod = "visual";
        else if (f.includes("render") || f.includes("viral")) mod = "render";
        else if (f.includes("cli")) mod = "cli";

        return {
          id: n.id,
          name: n.name || n.id.split("::").pop() || "unknown",
          file: n.file || "unknown.py",
          module: mod,
          dir: path.dirname(n.file || "seecut"),
          x: 0,
          y: 0,
          z: 0,
          inDegree: 0,
          outDegree: 0,
          degree: 0,
          radius: 12,
          color: modules[mod]?.color || "#38BDF8",
          doc: n.doc || "",
          args: n.args || "",
          snippet: n.snippet || "",
          line: n.line || 1,
          endLine: n.endLine || 50,
          incoming: [],
          outgoing: [],
          complexity: n.complexity || 0.5,
        };
      });

      edges = (parsed.edges || []).map((e: any) => ({
        source: e.source,
        target: e.target,
        color: "#38BDF8",
      }));
    } catch (err) {
      console.error("Error reading SeeCut JSON:", err);
    }
  }

  // Add rich interconnecting edges between modules
  const extraEdges: Array<[string, string]> = [
    ["pipeline.py::edit", "subtitles.py::build_ass"],
    ["pipeline.py::edit", "render.py::render"],
    ["pipeline.py::edit", "viral.py::resolve_artistic_font"],
    ["ai_plan.py::plan", "llm.py::rule_plan"],
    ["transcribe.py::transcribe", "subtitles.py::map_words"],
    ["cuts.py::plan_segments", "scenes.py::find_redundant"],
    ["ff.py::detect_silences", "ff.py::run"],
    ["broll.py::make_spider_brain_card", "stickers.py::auto_generate_infographics"],
    ["render.py::render", "viral.py::resolve_artistic_font"],
    ["cli.py::main", "cuts.py::plan_segments"],
    ["pipeline.py::edit", "stickers.py::build_bento_comparison_card"],
    ["subtitles.py::build_ass", "transcribe.py::split_sentences"],
  ];

  const nodeIds = new Set(nodes.map((n) => n.id));
  extraEdges.forEach(([src, tgt]) => {
    if (nodeIds.has(src) && nodeIds.has(tgt)) {
      if (!edges.some((e) => e.source === src && e.target === tgt)) {
        edges.push({ source: src, target: tgt, color: "#38BDF8" });
      }
    }
  });

  return { nodes, edges, modules };
}

/**
 * Scans Hinton Studio Next.js Codebase organized by folders
 */
function scanStudioCodebase(root: string): {
  nodes: WebNode3D[];
  edges: WebEdge3D[];
  modules: Record<string, ModuleMeta>;
} {
  const modules: Record<string, ModuleMeta> = {
    app: {
      key: "app",
      title: "app/ (Trang & Giao Diện)",
      subtitle: "Studio routes, pages & layout",
      color: "#38BDF8", // Cyan
      bgGlow: "rgba(56, 189, 248, 0.16)",
    },
    api: {
      key: "api",
      title: "app/api/ (Máy Chủ & Backend)",
      subtitle: "API endpoints xử lý tác vụ",
      color: "#10B981", // Emerald
      bgGlow: "rgba(16, 185, 129, 0.16)",
    },
    components: {
      key: "components",
      title: "components/ (Thành Phần UI)",
      subtitle: "Canvas, inspector, visual controls",
      color: "#F43F5E", // Rose
      bgGlow: "rgba(244, 63, 94, 0.16)",
    },
    lib: {
      key: "lib",
      title: "lib/ (Động Cơ & Xử Lý)",
      subtitle: "Jobs, scene planning, render engine",
      color: "#F59E0B", // Amber
      bgGlow: "rgba(245, 158, 11, 0.16)",
    },
    store: {
      key: "store",
      title: "store/ (Bộ Nhớ & Trạng Thái)",
      subtitle: "Zustand stores, memory, storage",
      color: "#A855F7", // Violet
      bgGlow: "rgba(168, 85, 247, 0.16)",
    },
  };

  const dirs = ["app", "components", "lib", "types"];
  const files: string[] = [];

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir)) {
      if (f === "node_modules" || f === ".next" || f === ".git" || f === "dist") continue;
      const full = path.join(dir, f);
      const st = fs.statSync(full);
      if (st.isDirectory()) walk(full);
      else if (/\.(ts|tsx)$/.test(f)) {
        files.push(full.replace(/\\/g, "/"));
      }
    }
  }

  dirs.forEach((d) => walk(path.join(root, d)));

  const normalizedRoot = root.replace(/\\/g, "/") + "/";
  const normalizedFiles = files.map((f) => f.replace(normalizedRoot, ""));
  const fileSet = new Set(normalizedFiles);

  const edges: WebEdge3D[] = [];

  normalizedFiles.forEach((f) => {
    const full = path.join(root, f);
    const code = fs.readFileSync(full, "utf-8");
    const importRegex = /(?:import|from)\s+['"](@\/[^'"]+|\.[^'"]+)['"]/g;
    let m;
    while ((m = importRegex.exec(code)) !== null) {
      const imp = m[1];
      let target: string | null = null;
      if (imp.startsWith("@/")) {
        const raw = imp.slice(2);
        for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx", "/route.ts", "/page.tsx"]) {
          const test = raw + ext;
          if (fileSet.has(test)) {
            target = test;
            break;
          }
        }
      } else if (imp.startsWith(".")) {
        const dir = path.dirname(f);
        const resolved = path.join(dir, imp).replace(/\\/g, "/");
        for (const ext of ["", ".ts", ".tsx", "/index.ts", "/index.tsx", "/route.ts", "/page.tsx"]) {
          const test = resolved + ext;
          if (fileSet.has(test)) {
            target = test;
            break;
          }
        }
      }
      if (target && target !== f) {
        if (!edges.some((e) => e.source === f && e.target === target)) {
          edges.push({ source: f, target });
        }
      }
    }
  });

  const nodes: WebNode3D[] = normalizedFiles.map((f) => {
    let mod = "lib";
    if (f.startsWith("app/api")) mod = "api";
    else if (f.startsWith("app")) mod = "app";
    else if (f.startsWith("components")) mod = "components";
    else if (f.includes("store") || f.includes("memory") || f.includes("storage") || f.includes("db")) mod = "store";
    else mod = "lib";

    const full = path.join(root, f);
    let snippet = "";
    let lineCount = 0;
    try {
      const src = fs.readFileSync(full, "utf-8");
      const lines = src.split("\n");
      lineCount = lines.length;
      snippet = lines.slice(0, 18).join("\n");
    } catch {
      // ignore
    }

    const name = path.basename(f);

    return {
      id: f,
      name,
      file: f,
      module: mod,
      dir: path.dirname(f),
      x: 0,
      y: 0,
      z: 0,
      inDegree: 0,
      outDegree: 0,
      degree: 0,
      radius: 10,
      color: modules[mod].color,
      doc: `Tập tin [${f}] (${lineCount} dòng mã)`,
      args: "export *",
      snippet,
      line: 1,
      endLine: lineCount,
      incoming: [],
      outgoing: [],
      complexity: Math.min(1, lineCount / 200),
    };
  });

  return { nodes, edges, modules };
}

function scanCustomCodebase(root: string) {
  return scanStudioCodebase(root);
}
