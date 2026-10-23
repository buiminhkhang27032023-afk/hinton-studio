"use client";

import React, { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Compass,
  Zap,
  ArrowRight,
  ExternalLink,
  Volume2,
  VolumeX,
  Sparkles,
  RotateCcw,
  Maximize2,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/primitives";
import { useUi } from "@/lib/ui-store";

export interface ProjectNeuron3D {
  id: string;
  name: string;
  category: string;
  lobe: "frontal" | "temporal" | "parietal" | "occipital" | "cerebellum";
  href: string;
  x: number;
  y: number;
  z: number;
  description: string;
  color: string;
  badge: string;
  metrics: string;
}

export interface NeuronEdge3D {
  source: string;
  target: string;
}

const NEURONS_3D: ProjectNeuron3D[] = [
  // 1. Thùy Trán (Frontal Lobe) - Front / Top (Z > 60, Y < 20)
  {
    id: "nav-dash",
    name: "Tổng Quan Dự Án",
    category: "Dashboard & Quản Lý",
    lobe: "frontal",
    href: "/",
    x: -80,
    y: -40,
    z: 180,
    description: "Trung tâm quản trị toàn bộ các dự án video, thống kê và không gian sáng tạo",
    color: "#38BDF8", // Sky blue
    badge: "ROOT",
    metrics: "Quản lý 100% tài nguyên",
  },
  {
    id: "nav-quick",
    name: "Tạo Video Nhanh (AI Prompt)",
    category: "AI Script & Production",
    lobe: "frontal",
    href: "/quick",
    x: 80,
    y: -45,
    z: 175,
    description: "Nhập kịch bản văn bản hoặc URL bài báo để tạo video tự động trong 60 giây",
    color: "#38BDF8",
    badge: "PROMPT ENGINE",
    metrics: "Hỗ trợ GPT-4o & Gemini 2.5",
  },
  {
    id: "nav-seecut",
    name: "SeeCut Biên Tập Tự Động",
    category: "Auto-Editing Suite",
    lobe: "frontal",
    href: "/seecut",
    x: 0,
    y: 20,
    z: 210,
    description: "Dây chuyền cắt khoảng lặng thừa, chèn B-Roll, phụ đề karaoke và hiệu ứng CapCut",
    color: "#38BDF8",
    badge: "SEECUT v2.5",
    metrics: "Cắt ghép siêu tốc 0.2s",
  },

  // 2. Thùy Thái Dương (Temporal Lobe) - Lateral Lower (Abs(X) > 140, Y > 20, Z > -40)
  {
    id: "nav-whisper",
    name: "Whisper AI Nhận Diện Giọng Nói",
    category: "Speech to Text",
    lobe: "temporal",
    href: "/seecut",
    x: -180,
    y: 40,
    z: 60,
    description: "Trích xuất văn bản từng từ (word-level timestamps) từ video gốc với Whisper Large-v3",
    color: "#A855F7", // Purple
    badge: "WHISPER AI",
    metrics: "Chính xác 99.4% tiếng Việt",
  },
  {
    id: "nav-subtitles",
    name: "Karaoke Subtitles Generator",
    category: "Phụ Đề & Hiệu Ứng Chữ",
    lobe: "temporal",
    href: "/seecut",
    x: -190,
    y: 80,
    z: -30,
    description: "Tạo file ASS Karaoke nảy chữ vàng theo nhịp giọng nói phong cách Hinton Media",
    color: "#A855F7",
    badge: "ASS KARAOKE",
    metrics: "Font Montserrat / Art",
  },
  {
    id: "nav-voice",
    name: "Edge-TTS Bộ Giọng Đọc AI",
    category: "Voice Synthesis",
    lobe: "temporal",
    href: "/models",
    x: -140,
    y: 110,
    z: 40,
    description: "Giọng đọc truyền cảm Nam/Nữ tiếng Việt tốc độ cao (+20%) cho video ngắn",
    color: "#A855F7",
    badge: "VI-VN VOICES",
    metrics: "Hoài My, Nam Minh, v.v.",
  },

  // 3. Thùy Đỉnh (Parietal Lobe) - Superior / Top (Y < -110, Z between -80 and 80)
  {
    id: "nav-canvas",
    name: "Canvas Timeline Dựng Phim",
    category: "Multi-track Studio",
    lobe: "parietal",
    href: "/canvas",
    x: -60,
    y: -140,
    z: 20,
    description: "Bàn dựng video đa kênh, phân lớp đồ họa, đồng bộ âm thanh và khung hình trực quan",
    color: "#10B981", // Emerald
    badge: "CANVAS EDITOR",
    metrics: "Độ trễ thời gian thực < 16ms",
  },
  {
    id: "nav-jumpcuts",
    name: "Smart Jump-Cuts Detector",
    category: "Silence & Retakes",
    lobe: "parietal",
    href: "/seecut",
    x: 60,
    y: -140,
    z: 10,
    description: "Tự động phát hiện các đoạn im lặng và câu nói vấp, loại bỏ chỉ giữ lại đúp chuẩn nhất",
    color: "#10B981",
    badge: "JUMP CUT ENGINE",
    metrics: "Loại bỏ 35% thời lượng rác",
  },
  {
    id: "nav-memory",
    name: "Brand Memory (Bộ Nhớ AI)",
    category: "AI Context & Styles",
    lobe: "parietal",
    href: "/memory",
    x: 0,
    y: -160,
    z: -50,
    description: "Lưu giữ phong cách thương hiệu, prompt mẫu và profile nhân vật nhất quán",
    color: "#10B981",
    badge: "MEMORY STORE",
    metrics: "Nhớ vĩnh viễn trên SQLite",
  },

  // 4. Thùy Chẩm (Occipital Lobe) - Posterior / Rear (Z < -140, Y between -60 and 40)
  {
    id: "nav-spider",
    name: "Phòng Thí Nghiệm Nhện AI",
    category: "Neural Code Simulation",
    lobe: "occipital",
    href: "/spider-brain",
    x: 70,
    y: -30,
    z: -180,
    description: "Không gian mô phỏng nhện Cyberpunk thao tác vi phẫu trên bộ não mã nguồn SeeCut",
    color: "#F43F5E", // Rose Coral
    badge: "SPIDER LAB",
    metrics: "Mô phỏng 3D 60 FPS",
  },
  {
    id: "nav-library",
    name: "Thư Viện Tài Sản (Media Assets)",
    category: "B-Roll & Storage",
    lobe: "occipital",
    href: "/library",
    x: 170,
    y: 30,
    z: -70,
    description: "Kho lưu trữ video B-Roll chất lượng cao, hình ảnh poster và video đã xuất bản",
    color: "#F43F5E",
    badge: "ASSET VAULT",
    metrics: "Tích hợp Pexels & Local",
  },
  {
    id: "nav-capcut",
    name: "Hiệu Ứng Đồ Họa CapCut & Bento",
    category: "Visual FX Library",
    lobe: "occipital",
    href: "/seecut",
    x: 180,
    y: 70,
    z: -20,
    description: "Card dẫn chứng khoa học, khung Bento so sánh sản phẩm và hiệu ứng chữ nhảy đàn hồi",
    color: "#F43F5E",
    badge: "CAPCUT FX",
    metrics: "20+ Mẫu Template",
  },
  {
    id: "nav-models",
    name: "Catalog Người Mẫu & Thời Trang",
    category: "Fashion AI Models",
    lobe: "occipital",
    href: "/models",
    x: 130,
    y: 90,
    z: 50,
    description: "Người mẫu AI runway, tạo dáng studio, bộ sưu tập lookbook thời trang đỉnh cao",
    color: "#F43F5E",
    badge: "MODELS HUB",
    metrics: "Đa dạng phong cách",
  },

  // 5. Tiểu Não (Cerebellum) - Postero-inferior (Z < -130, Y > 90)
  {
    id: "nav-render",
    name: "Bộ Render Tăng Tốc GPU",
    category: "Hardware Acceleration",
    lobe: "cerebellum",
    href: "/seecut",
    x: -60,
    y: 140,
    z: -140,
    description: "Tận dụng card đồ họa NVIDIA NVENC hoặc Intel QSV để kết xuất video 4K siêu tốc",
    color: "#F59E0B", // Amber
    badge: "GPU NVENC / QSV",
    metrics: "Tốc độ render gấp 8x",
  },
  {
    id: "nav-settings",
    name: "Cấu Hình & Cài Đặt Hệ Thống",
    category: "System Settings",
    lobe: "cerebellum",
    href: "/settings",
    x: 60,
    y: 145,
    z: -135,
    description: "Quản lý khóa API (Gemini, Claude, Pexels), cấu hình độ phân giải và font chữ nghệ thuật",
    color: "#F59E0B",
    badge: "SETTINGS",
    metrics: "Bảo mật cục bộ",
  },
];

const EDGES_3D: NeuronEdge3D[] = [
  { source: "nav-dash", target: "nav-quick" },
  { source: "nav-dash", target: "nav-seecut" },
  { source: "nav-quick", target: "nav-seecut" },
  { source: "nav-seecut", target: "nav-whisper" },
  { source: "nav-whisper", target: "nav-subtitles" },
  { source: "nav-whisper", target: "nav-voice" },
  { source: "nav-seecut", target: "nav-canvas" },
  { source: "nav-canvas", target: "nav-jumpcuts" },
  { source: "nav-jumpcuts", target: "nav-memory" },
  { source: "nav-seecut", target: "nav-spider" },
  { source: "nav-spider", target: "nav-library" },
  { source: "nav-library", target: "nav-capcut" },
  { source: "nav-capcut", target: "nav-models" },
  { source: "nav-canvas", target: "nav-render" },
  { source: "nav-render", target: "nav-settings" },
  { source: "nav-subtitles", target: "nav-render" },
  { source: "nav-capcut", target: "nav-render" },
];

export function BrainNavigator({
  onSelectRoute,
}: {
  onSelectRoute?: (href: string) => void;
}) {
  const router = useRouter();
  const { toast } = useUi();

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const [activeId, setActiveId] = useState<string>("nav-dash");
  const [muted, setMuted] = useState(false);
  const [autoRotate, setAutoRotate] = useState(true);

  // 3D Camera Orbit State
  const cameraRef = useRef({
    rotX: 0.35,
    rotY: -0.4,
    zoom: 1.05,
    distance: 520,
    fov: 460,
  });

  const isDraggingRef = useRef(false);
  const lastMousePosRef = useRef({ x: 0, y: 0 });

  // 3D Spider Kinematics State
  const spiderRef = useRef({
    x: -80,
    y: -40,
    z: 180,
    targetX: -80,
    targetY: -40,
    targetZ: 180,
    startX: -80,
    startY: -40,
    startZ: 180,
    progress: 1.0,
    heading: 0,
    targetHeading: 0,
    stepCycle: 0,
    isCrawling: false,
    speed: 0.018,
    // 8 legs kinematics: position of feet in relative 3D space
    legs: Array(8)
      .fill(0)
      .map((_, i) => ({
        currentX: 0,
        currentY: 0,
        currentZ: 0,
        targetX: 0,
        targetY: 0,
        targetZ: 0,
        lift: 0,
        phaseOffset: (i * 0.25) % 1.0,
      })),
  });

  const activeNeuron = useMemo(
    () => NEURONS_3D.find((n) => n.id === activeId) || NEURONS_3D[0],
    [activeId]
  );

  // Audio Synthesizer
  const playSfx = useCallback(
    (type: "crawl" | "zap" | "hum" | "warp") => {
      if (muted) return;
      try {
        const AudioContextClass =
          window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!audioCtxRef.current) {
          audioCtxRef.current = new AudioContextClass();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === "suspended") ctx.resume();

        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);

        if (type === "crawl") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(120, now + 0.05);
          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.05);
          osc.start(now);
          osc.stop(now + 0.05);
        } else if (type === "zap") {
          osc.type = "sawtooth";
          osc.frequency.setValueAtTime(1400, now);
          osc.frequency.exponentialRampToValueAtTime(260, now + 0.16);
          gain.gain.setValueAtTime(0.12, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.16);
          osc.start(now);
          osc.stop(now + 0.16);
        } else if (type === "hum") {
          osc.type = "triangle";
          osc.frequency.setValueAtTime(360, now);
          osc.frequency.exponentialRampToValueAtTime(720, now + 0.24);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.24);
          osc.start(now);
          osc.stop(now + 0.24);
        } else if (type === "warp") {
          osc.type = "sine";
          osc.frequency.setValueAtTime(520, now);
          osc.frequency.exponentialRampToValueAtTime(2200, now + 0.35);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.linearRampToValueAtTime(0.001, now + 0.35);
          osc.start(now);
          osc.stop(now + 0.35);
        }
      } catch {
        // audio context blocked
      }
    },
    [muted]
  );

  // Steer Spider to 3D Neuron
  const steerSpiderToNeuron = useCallback(
    (target: ProjectNeuron3D) => {
      const s = spiderRef.current;
      if (target.id === activeId && !s.isCrawling) return;

      s.startX = s.x;
      s.startY = s.y;
      s.startZ = s.z;
      s.targetX = target.x;
      s.targetY = target.y;
      s.targetZ = target.z;
      s.progress = 0;
      s.isCrawling = true;

      // Calculate 3D target heading
      const dx = target.x - s.x;
      const dz = target.z - s.z;
      s.targetHeading = Math.atan2(dx, dz);

      playSfx("crawl");
      setActiveId(target.id);
    },
    [activeId, playSfx]
  );

  // Keyboard navigation listener (Arrow keys & WASD to steer the spider)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      const s = spiderRef.current;
      const curX = s.x;
      const curY = s.y;
      const curZ = s.z;

      let bestNext: ProjectNeuron3D | null = null;
      let minDistance = Infinity;

      const key = e.key.toLowerCase();

      if (key === "arrowright" || key === "d") {
        e.preventDefault();
        NEURONS_3D.forEach((n) => {
          if (n.x > curX + 15) {
            const dist = Math.hypot(n.x - curX, n.y - curY, n.z - curZ);
            if (dist < minDistance) {
              minDistance = dist;
              bestNext = n;
            }
          }
        });
      } else if (key === "arrowleft" || key === "a") {
        e.preventDefault();
        NEURONS_3D.forEach((n) => {
          if (n.x < curX - 15) {
            const dist = Math.hypot(n.x - curX, n.y - curY, n.z - curZ);
            if (dist < minDistance) {
              minDistance = dist;
              bestNext = n;
            }
          }
        });
      } else if (key === "arrowup" || key === "w") {
        e.preventDefault();
        NEURONS_3D.forEach((n) => {
          if (n.y < curY - 15 || n.z > curZ + 15) {
            const dist = Math.hypot(n.x - curX, n.y - curY, n.z - curZ);
            if (dist < minDistance) {
              minDistance = dist;
              bestNext = n;
            }
          }
        });
      } else if (key === "arrowdown" || key === "s") {
        e.preventDefault();
        NEURONS_3D.forEach((n) => {
          if (n.y > curY + 15 || n.z < curZ - 15) {
            const dist = Math.hypot(n.x - curX, n.y - curY, n.z - curZ);
            if (dist < minDistance) {
              minDistance = dist;
              bestNext = n;
            }
          }
        });
      } else if (key === "enter") {
        e.preventDefault();
        handleLaunchRoute(activeNeuron.href);
      } else if (key === " ") {
        e.preventDefault();
        playSfx("zap");
      }

      if (bestNext) {
        steerSpiderToNeuron(bestNext);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeNeuron, steerSpiderToNeuron, playSfx]);

  // Launch Route
  const handleLaunchRoute = (href: string) => {
    playSfx("warp");
    toast(`⚡ Nhện Cyber đang mở không gian: ${activeNeuron.name}` + " · " + `Điều hướng tới ${href}...`);
    if (onSelectRoute) {
      onSelectRoute(href);
    } else {
      router.push(href);
    }
  };

  // Main 3D Rendering & Animation Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let lastTime = performance.now();

    // 3D Point Projection Helper
    const project = (x: number, y: number, z: number, w: number, h: number) => {
      const cam = cameraRef.current;
      // 1. Yaw rotation (around Y axis)
      const cosY = Math.cos(cam.rotY);
      const sinY = Math.sin(cam.rotY);
      const x1 = x * cosY - z * sinY;
      const z1 = x * sinY + z * cosY;

      // 2. Pitch rotation (around X axis)
      const cosX = Math.cos(cam.rotX);
      const sinX = Math.sin(cam.rotX);
      const y2 = y * cosX - z1 * sinX;
      const z2 = y * sinX + z1 * cosX;

      // Perspective divide
      const dist = cam.distance + z2;
      const scale = dist > 10 ? (cam.fov / dist) * cam.zoom : 0.001;

      return {
        screenX: w / 2 + x1 * scale,
        screenY: h / 2 + y2 * scale,
        scale,
        depth: z2,
        visible: dist > 10,
      };
    };

    // Render loop
    const render = (now: number) => {
      const dt = (now - lastTime) / 1000;
      lastTime = now;

      // Resize canvas to client size
      const rect = canvas.getBoundingClientRect();
      if (canvas.width !== rect.width || canvas.height !== rect.height) {
        canvas.width = rect.width;
        canvas.height = rect.height;
      }
      const W = canvas.width;
      const H = canvas.height;

      // Auto camera rotation when idle
      if (autoRotate && !isDraggingRef.current) {
        cameraRef.current.rotY += 0.003;
      }

      // Update Spider Physics & Crawling Kinematics
      const s = spiderRef.current;
      if (s.isCrawling) {
        s.progress += s.speed * (dt * 60);
        s.stepCycle += dt * 8; // leg cycle frequency

        // Play crawling step sound at gait frequency
        if (Math.floor(s.stepCycle) % 4 === 0 && Math.random() < 0.15) {
          playSfx("crawl");
        }

        if (s.progress >= 1.0) {
          s.progress = 1.0;
          s.isCrawling = false;
          s.x = s.targetX;
          s.y = s.targetY;
          s.z = s.targetZ;
          playSfx("zap");
          setTimeout(() => playSfx("hum"), 120);
        } else {
          // Smooth 3D Bezier arc: arch outwards from brain center
          const t = s.progress;
          // Midpoint pushed outward for spherical terrain crawling
          const midX = (s.startX + s.targetX) * 0.5 * 1.35;
          const midY = (s.startY + s.targetY) * 0.5 * 1.35;
          const midZ = (s.startZ + s.targetZ) * 0.5 * 1.35;

          const invT = 1 - t;
          s.x = invT * invT * s.startX + 2 * invT * t * midX + t * t * s.targetX;
          s.y = invT * invT * s.startY + 2 * invT * t * midY + t * t * s.targetY;
          s.z = invT * invT * s.startZ + 2 * invT * t * midZ + t * t * s.targetZ;

          // Smooth heading slerp
          let diffHeading = s.targetHeading - s.heading;
          while (diffHeading > Math.PI) diffHeading -= Math.PI * 2;
          while (diffHeading < -Math.PI) diffHeading += Math.PI * 2;
          s.heading += diffHeading * 0.15;
        }
      } else {
        // Idle breathing & micro-movements
        s.stepCycle += dt * 1.5;
      }

      // Clear Canvas (Dark navy cyberpunk background)
      ctx.fillStyle = "#070B14";
      ctx.fillRect(0, 0, W, H);

      // Draw Background 3D Depth Grid
      ctx.strokeStyle = "rgba(6, 182, 212, 0.06)";
      ctx.lineWidth = 1;
      const gridSize = 400;
      for (let gx = -gridSize; gx <= gridSize; gx += 80) {
        const p1 = project(gx, 200, -gridSize, W, H);
        const p2 = project(gx, 200, gridSize, W, H);
        if (p1.visible && p2.visible) {
          ctx.beginPath();
          ctx.moveTo(p1.screenX, p1.screenY);
          ctx.lineTo(p2.screenX, p2.screenY);
          ctx.stroke();
        }
      }
      for (let gz = -gridSize; gz <= gridSize; gz += 80) {
        const p1 = project(-gridSize, 200, gz, W, H);
        const p2 = project(gridSize, 200, gz, W, H);
        if (p1.visible && p2.visible) {
          ctx.beginPath();
          ctx.moveTo(p1.screenX, p1.screenY);
          ctx.lineTo(p2.screenX, p2.screenY);
          ctx.stroke();
        }
      }

      // Draw 3D Brain Gyri Silhouette & Wireframe Contours
      ctx.strokeStyle = "rgba(0, 255, 240, 0.14)";
      ctx.lineWidth = 1.4;
      const numRings = 16;
      for (let r = 0; r < numRings; r++) {
        const phi = (r / numRings) * Math.PI;
        const ringY = -120 + Math.cos(phi) * 160;
        const radius = Math.sin(phi) * 200;
        ctx.beginPath();
        for (let th = 0; th <= Math.PI * 2 + 0.2; th += 0.35) {
          const rx = Math.cos(th) * radius * 1.15;
          const rz = Math.sin(th) * radius;
          const pt = project(rx, ringY, rz, W, H);
          if (pt.visible) {
            if (th === 0) ctx.moveTo(pt.screenX, pt.screenY);
            else ctx.lineTo(pt.screenX, pt.screenY);
          }
        }
        ctx.stroke();
      }

      // Draw 3D Synaptic Axons (Edges)
      EDGES_3D.forEach((edge) => {
        const src = NEURONS_3D.find((n) => n.id === edge.source);
        const tgt = NEURONS_3D.find((n) => n.id === edge.target);
        if (!src || !tgt) return;

        const isCurrentActive = src.id === activeId || tgt.id === activeId;

        // Subdivide arc into 3D points
        const points = [];
        const steps = 14;
        for (let i = 0; i <= steps; i++) {
          const t = i / steps;
          const invT = 1 - t;
          // Arch outwards
          const midX = (src.x + tgt.x) * 0.5 * 1.25;
          const midY = (src.y + tgt.y) * 0.5 * 1.25;
          const midZ = (src.z + tgt.z) * 0.5 * 1.25;

          const px = invT * invT * src.x + 2 * invT * t * midX + t * t * tgt.x;
          const py = invT * invT * src.y + 2 * invT * t * midY + t * t * tgt.y;
          const pz = invT * invT * src.z + 2 * invT * t * midZ + t * t * tgt.z;
          points.push(project(px, py, pz, W, H));
        }

        ctx.beginPath();
        let started = false;
        points.forEach((p) => {
          if (p.visible) {
            if (!started) {
              ctx.moveTo(p.screenX, p.screenY);
              started = true;
            } else {
              ctx.lineTo(p.screenX, p.screenY);
            }
          }
        });

        if (isCurrentActive) {
          ctx.strokeStyle = "rgba(0, 255, 240, 0.85)";
          ctx.lineWidth = 2.5;
          ctx.stroke();

          // Flowing 3D photon particle along active axon
          const photonT = (now * 0.0012) % 1.0;
          const photonIdx = Math.floor(photonT * (steps - 1));
          const pNear = points[photonIdx];
          if (pNear && pNear.visible) {
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.arc(pNear.screenX, pNear.screenY, 4 * pNear.scale, 0, Math.PI * 2);
            ctx.fill();
          }
        } else {
          ctx.strokeStyle = "rgba(100, 116, 139, 0.22)";
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // Depth Sort Items (Neurons + Spider) for painter's algorithm
      const renderItems: Array<{
        type: "neuron" | "spider";
        depth: number;
        neuron?: ProjectNeuron3D;
      }> = NEURONS_3D.map((n) => {
        const pr = project(n.x, n.y, n.z, W, H);
        return { type: "neuron", depth: pr.depth, neuron: n };
      });

      const spProj = project(s.x, s.y, s.z, W, H);
      renderItems.push({ type: "spider", depth: spProj.depth });

      // Sort from back to front (largest depth first)
      renderItems.sort((a, b) => b.depth - a.depth);

      // Render sorted 3D items
      renderItems.forEach((item) => {
        if (item.type === "neuron" && item.neuron) {
          const n = item.neuron;
          const pr = project(n.x, n.y, n.z, W, H);
          if (!pr.visible) return;

          const isActive = n.id === activeId;
          const baseRadius = (isActive ? 16 : 10) * pr.scale;

          // Glowing Outer Pulse on Active
          if (isActive) {
            ctx.beginPath();
            ctx.arc(pr.screenX, pr.screenY, baseRadius + 10 * pr.scale, 0, Math.PI * 2);
            ctx.strokeStyle = n.color;
            ctx.lineWidth = 2;
            ctx.setLineDash([4, 4]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // Node Sphere Core
          ctx.beginPath();
          ctx.arc(pr.screenX, pr.screenY, baseRadius, 0, Math.PI * 2);
          ctx.fillStyle = isActive ? n.color : "rgba(15, 23, 42, 0.95)";
          ctx.fill();
          ctx.strokeStyle = n.color;
          ctx.lineWidth = isActive ? 3 : 1.8;
          ctx.stroke();

          // Inner glowing highlight
          ctx.beginPath();
          ctx.arc(pr.screenX, pr.screenY, baseRadius * 0.45, 0, Math.PI * 2);
          ctx.fillStyle = isActive ? "#FFFFFF" : n.color;
          ctx.fill();

          // Label
          ctx.font = `${isActive ? "bold 13px" : "11px"} monospace`;
          ctx.fillStyle = isActive ? "#FFFFFF" : "rgba(203, 213, 225, 0.75)";
          ctx.textAlign = "center";
          ctx.fillText(n.name, pr.screenX, pr.screenY - baseRadius - 6);

          ctx.font = "9px monospace";
          ctx.fillStyle = isActive ? n.color : "rgba(100, 116, 139, 0.8)";
          ctx.fillText(n.badge, pr.screenX, pr.screenY + baseRadius + 12);
        } else if (item.type === "spider") {
          // RENDER 3D ARTICULATED CYBER SPIDER
          if (!spProj.visible) return;

          // Thorax Bobbing & Tilting
          const bob = s.isCrawling ? Math.sin(s.stepCycle * Math.PI * 2) * 3 : Math.sin(s.stepCycle) * 1.5;
          const spiderBodyY = s.y + bob;

          // Draw Laser connection to target neuron
          const tgtProj = project(s.targetX, s.targetY, s.targetZ, W, H);
          if (tgtProj.visible) {
            ctx.beginPath();
            ctx.moveTo(spProj.screenX, spProj.screenY);
            ctx.lineTo(tgtProj.screenX, tgtProj.screenY);
            ctx.strokeStyle = "rgba(0, 255, 240, 0.85)";
            ctx.lineWidth = 2.5 * spProj.scale;
            ctx.setLineDash([6, 3]);
            ctx.stroke();
            ctx.setLineDash([]);
          }

          // 8 Leg Kinematics Calculation
          // Leg Angles around body
          const legAngles = [
            -0.85, -0.4, 0.4, 0.85, // Left legs: front to back
            -2.29, -2.74, 2.74, 2.29, // Right legs: front to back
          ];

          ctx.save();
          ctx.translate(spProj.screenX, spProj.screenY);
          ctx.scale(spProj.scale, spProj.scale);

          // Apply heading angle relative to camera view
          const camRotY = cameraRef.current.rotY;
          const screenHeading = s.heading - camRotY;
          ctx.rotate(screenHeading);

          // Render 8 Articulated 3D Legs
          ctx.lineWidth = 2.4;
          ctx.lineCap = "round";
          ctx.lineJoin = "round";

          for (let i = 0; i < 8; i++) {
            const angle = legAngles[i];
            const isLeft = i < 4;

            // Gait Phase (Tetrapod alternating pairs)
            // Left 0, 2 & Right 1, 3 vs Left 1, 3 & Right 0, 2
            const group = (i % 2 === 0 ? 0 : 0.5) + (isLeft ? 0 : 0.5);
            const legPhase = (s.stepCycle + group) % 1.0;

            // Swing phase: foot lifts up and reaches forward
            // Stance phase: foot grips ground
            const isSwing = s.isCrawling && legPhase < 0.5;
            const swingT = legPhase * 2; // 0 to 1
            const footLift = isSwing ? Math.sin(swingT * Math.PI) * 14 : 0;
            const strideForward = isSwing ? (swingT - 0.5) * 22 : -(legPhase - 0.75) * 22;

            // Base joint at thorax
            const rootX = Math.sin(angle) * 12;
            const rootY = Math.cos(angle) * 12;

            // Knee (high arch)
            const kneeDist = 26;
            const kneeX = Math.sin(angle) * kneeDist + strideForward * 0.4;
            const kneeY = Math.cos(angle) * kneeDist - footLift * 0.5;

            // Foot tip (touches ground)
            const footDist = 42;
            const footX = Math.sin(angle) * footDist + strideForward;
            const footY = Math.cos(angle) * footDist + footLift;

            // Draw Leg: Root -> Knee -> Foot
            ctx.beginPath();
            ctx.moveTo(rootX, rootY);
            ctx.lineTo(kneeX, kneeY);
            ctx.lineTo(footX, footY);
            ctx.strokeStyle = "#FF2E63";
            ctx.stroke();

            // Glowing Knee Joint
            ctx.fillStyle = "#00FFF0";
            ctx.beginPath();
            ctx.arc(kneeX, kneeY, 2.2, 0, Math.PI * 2);
            ctx.fill();

            // Foot claw
            ctx.fillStyle = "#FFFFFF";
            ctx.beginPath();
            ctx.arc(footX, footY, 1.8, 0, Math.PI * 2);
            ctx.fill();
          }

          // Spider Abdomen (Posterior body)
          ctx.beginPath();
          ctx.ellipse(0, -14, 15, 18, 0, 0, Math.PI * 2);
          ctx.fillStyle = "#160824";
          ctx.fill();
          ctx.strokeStyle = "#FF2E63";
          ctx.lineWidth = 2.4;
          ctx.stroke();

          // Cyber Luminescent Stripes on Abdomen
          ctx.strokeStyle = "#00FFF0";
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, -18, 9, 0.4, Math.PI - 0.4);
          ctx.stroke();
          ctx.beginPath();
          ctx.arc(0, -11, 11, 0.3, Math.PI - 0.3);
          ctx.stroke();

          // Cephalothorax (Head / Front)
          ctx.beginPath();
          ctx.ellipse(0, 10, 11, 11, 0, 0, Math.PI * 2);
          ctx.fillStyle = "#0C1322";
          ctx.fill();
          ctx.strokeStyle = "#00FFF0";
          ctx.lineWidth = 2.2;
          ctx.stroke();

          // Glowing Cyber Eyes (White & Cyan Slits)
          ctx.fillStyle = "#FFFFFF";
          ctx.beginPath();
          ctx.arc(-3.5, 14, 2, 0, Math.PI * 2);
          ctx.arc(3.5, 14, 2, 0, Math.PI * 2);
          ctx.fill();

          ctx.fillStyle = "#00FFF0";
          ctx.beginPath();
          ctx.arc(-6.5, 11, 1.5, 0, Math.PI * 2);
          ctx.arc(6.5, 11, 1.5, 0, Math.PI * 2);
          ctx.fill();

          // Chelicerae (Front Mandibles / Laser Emitters)
          ctx.strokeStyle = "#00FFF0";
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(-4, 19);
          ctx.lineTo(-2, 24);
          ctx.lineTo(0, 22);
          ctx.lineTo(2, 24);
          ctx.lineTo(4, 19);
          ctx.stroke();

          ctx.restore();
        }
      });

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, [activeId, autoRotate, playSfx]);

  // Mouse Orbit Drag Controls
  const handleMouseDown = (e: React.MouseEvent) => {
    isDraggingRef.current = true;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };
    setAutoRotate(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current) return;
    const dx = e.clientX - lastMousePosRef.current.x;
    const dy = e.clientY - lastMousePosRef.current.y;
    lastMousePosRef.current = { x: e.clientX, y: e.clientY };

    cameraRef.current.rotY += dx * 0.007;
    cameraRef.current.rotX = Math.max(-1.2, Math.min(1.2, cameraRef.current.rotX + dy * 0.007));
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.08 : 0.92;
    cameraRef.current.zoom = Math.max(0.6, Math.min(2.5, cameraRef.current.zoom * zoomFactor));
  };

  // Canvas Click -> Raycast closest 3D neuron
  const handleCanvasClick = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const W = canvas.width;
    const H = canvas.height;
    const cam = cameraRef.current;

    // Find closest neuron in screen space
    let closestNeuron: ProjectNeuron3D | null = null;
    let minD = 35; // click radius threshold in px

    NEURONS_3D.forEach((n) => {
      const cosY = Math.cos(cam.rotY);
      const sinY = Math.sin(cam.rotY);
      const x1 = n.x * cosY - n.z * sinY;
      const z1 = n.x * sinY + n.z * cosY;

      const cosX = Math.cos(cam.rotX);
      const sinX = Math.sin(cam.rotX);
      const y2 = n.y * cosX - z1 * sinX;
      const z2 = n.y * sinX + z1 * cosX;

      const dist = cam.distance + z2;
      if (dist > 10) {
        const scale = (cam.fov / dist) * cam.zoom;
        const sx = W / 2 + x1 * scale;
        const sy = H / 2 + y2 * scale;
        const d = Math.hypot(sx - mouseX, sy - mouseY);
        if (d < minD) {
          minD = d;
          closestNeuron = n;
        }
      }
    });

    if (closestNeuron) {
      steerSpiderToNeuron(closestNeuron);
    }
  };

  return (
    <div className="relative w-full rounded-2xl bg-gradient-to-b from-[#090E1A] to-[#04060C] border border-cyan-500/30 shadow-[0_0_35px_rgba(6,182,212,0.15)] overflow-hidden flex flex-col">
      {/* Top 3D Navigator Bar */}
      <div className="flex items-center justify-between px-6 py-3.5 border-b border-cyan-950/80 bg-[#0B101E]/90 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]">
            <Compass className="w-5 h-5 text-cyan-400 animate-[spin_12s_linear_infinite]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold tracking-wide text-white uppercase flex items-center gap-1.5">
                BỘ NÃO ĐIỀU HƯỚNG 3D · CYBER SPIDER 3D KINEMATICS
              </h2>
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cyan-950 text-cyan-300 border border-cyan-500/40">
                XOAY 360° & ĐIỀU HƯỚNG WASD
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Kéo chuột để xoay bộ não 3D, cuộn để zoom, dùng phím <kbd className="px-1 py-0.5 rounded bg-slate-800 text-cyan-300 font-mono text-[10px]">WASD</kbd> để nhện chuyển động 8 chân theo động học thực
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRotate(!autoRotate)}
            className={`border-cyan-500/40 text-xs flex items-center gap-1 ${autoRotate ? "text-cyan-300 bg-cyan-950/40" : "text-slate-400"}`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>{autoRotate ? "Tự Xoay: BẬT" : "Tự Xoay: TẮT"}</span>
          </Button>

          <button
            onClick={() => setMuted(!muted)}
            className="p-1.5 rounded-lg border border-slate-800 text-slate-400 hover:text-white transition"
          >
            {muted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          <Button
            variant="primary"
            size="sm"
            onClick={() => handleLaunchRoute(activeNeuron.href)}
            className="bg-gradient-to-r from-cyan-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-medium flex items-center gap-1.5 shadow-[0_0_15px_rgba(6,182,212,0.35)]"
          >
            <span>Truy cập</span>
            <span className="font-bold">{activeNeuron.name}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Main 3D Canvas Stage */}
      <div className="relative flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-[540px]">
        {/* 3D WebGL / Canvas Container (8 Cols) */}
        <div className="relative lg:col-span-8 flex items-center justify-center p-0 overflow-hidden cursor-grab active:cursor-grabbing">
          <canvas
            ref={canvasRef}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onWheel={handleWheel}
            onClick={handleCanvasClick}
            className="w-full h-full min-h-[500px]"
          />

          {/* 3D Status Overlay Tag */}
          <div className="absolute top-4 left-5 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950/80 border border-cyan-500/30 text-xs pointer-events-none backdrop-blur-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
            <span className="text-slate-300">Nhện 3D tại:</span>
            <span className="font-bold text-cyan-300 font-mono">{activeNeuron.name}</span>
          </div>

          <div className="absolute bottom-4 left-5 px-3 py-1 rounded bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 pointer-events-none font-mono">
            Click hoặc dùng phím WASD để nhện chuyển động bò trên địa hình 3D
          </div>
        </div>

        {/* Right Inspection HUD & Quick Launch (4 Cols) */}
        <div className="lg:col-span-4 p-5 flex flex-col justify-between border-t lg:border-t-0 lg:border-l border-cyan-950/80 bg-[#070B14]/85 backdrop-blur-md">
          <div className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between">
                <span
                  className="px-2 py-0.5 text-[10px] font-bold rounded uppercase tracking-wider"
                  style={{
                    backgroundColor: `${activeNeuron.color}25`,
                    color: activeNeuron.color,
                    border: `1px solid ${activeNeuron.color}60`,
                  }}
                >
                  {activeNeuron.lobe.toUpperCase()} LOBE
                </span>
                <span className="text-[11px] font-mono text-cyan-400 font-semibold">{activeNeuron.badge}</span>
              </div>
              <h3 className="mt-2 text-xl font-bold text-white tracking-tight">{activeNeuron.name}</h3>
              <p className="text-xs text-slate-400 mt-0.5">{activeNeuron.category}</p>
            </div>

            {/* Description */}
            <div className="p-3.5 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-200 leading-relaxed">
              {activeNeuron.description}
            </div>

            {/* 3D Telemetry */}
            <div className="flex flex-col gap-2 font-mono text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#05070D] border border-slate-800/80">
                <span className="text-slate-400">Đường dẫn Route:</span>
                <span className="text-cyan-300 font-semibold">{activeNeuron.href}</span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#05070D] border border-slate-800/80">
                <span className="text-slate-400">Tọa độ 3D Nơ-ron:</span>
                <span className="text-purple-300">
                  X:{activeNeuron.x} Y:{activeNeuron.y} Z:{activeNeuron.z}
                </span>
              </div>
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#05070D] border border-slate-800/80">
                <span className="text-slate-400">Hiệu năng / Tối ưu:</span>
                <span className="text-emerald-400">{activeNeuron.metrics}</span>
              </div>
            </div>

            {/* Guide */}
            <div className="p-2.5 rounded-lg bg-cyan-950/30 border border-cyan-500/20 text-[11px] text-cyan-200 flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span>
                Nhấn <strong className="text-white">Enter</strong> để vào ngay trang này, hoặc bấm <strong className="text-white">Space</strong> để phóng tia laser plasma!
              </span>
            </div>
          </div>

          {/* Action Launcher Button */}
          <div className="pt-4 flex flex-col gap-2">
            <Button
              variant="primary"
              size="md"
              onClick={() => handleLaunchRoute(activeNeuron.href)}
              className="w-full bg-gradient-to-r from-cyan-500 via-sky-500 to-purple-600 hover:from-cyan-600 hover:to-purple-700 text-white font-bold py-3 flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(6,182,212,0.4)] text-sm"
            >
              <span>MỞ KHÔNG GIAN LÀM VIỆC</span>
              <ExternalLink className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                playSfx("zap");
                toast(`⚡ Kích hoạt xung nơ-ron: ${activeNeuron.name}` + " · " + "Tín hiệu 3D đã được truyền tải qua các sợi trục thần kinh!");
              }}
              className="w-full border-slate-800 text-slate-300 hover:bg-slate-900 text-xs flex items-center justify-center gap-1.5"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>Phóng Xung Laser Plasma</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
