"use client";

import React, { memo, useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { Box, Camera, Sparkles, Upload, RotateCw, RefreshCw, ZoomIn } from "lucide-react";
import { Handle, Position } from "@xyflow/react";
import { HANDLE_IN, HANDLE_OUT } from "./ports";
import { withBasePath } from "@/lib/base-path";
import { useStudio } from "@/lib/studio-store";
import { useUi } from "@/lib/ui-store";

export const Model3DNode = memo(function Model3DNode({ id, data, selected }: { id: string; data: any; selected?: boolean }) {
  const { toast } = useUi();
  const project = useStudio((s) => s.project);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const meshGroupRef = useRef<THREE.Group | null>(null);

  const [preset, setPreset] = useState<string>(data.preset || "mannequin");
  const [snapshotUrl, setSnapshotUrl] = useState<string | undefined>(data.imageUrl || data.snapshotUrl);
  const [wireframe, setWireframe] = useState<boolean>(false);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Initialize Three.js scene
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = 210;
    const height = 240;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x141419);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 1.2, 3.5);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, preserveDrawingBuffer: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xd4af37, 1.2); // Warm brass light
    dirLight1.position.set(2, 4, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x4a90e2, 0.8); // Cool rim light
    dirLight2.position.set(-2, 2, -2);
    scene.add(dirLight2);

    // Grid floor
    const grid = new THREE.GridHelper(5, 10, 0x333344, 0x22222a);
    grid.position.y = -1;
    scene.add(grid);

    // Group for the 3D model
    const group = new THREE.Group();
    meshGroupRef.current = group;
    scene.add(group);

    // Build geometry based on preset
    buildPresetGeometry(group, preset, wireframe);

    // Animation & rendering loop
    let animId: number;
    let autoRotate = true;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      if (autoRotate && group) {
        group.rotation.y += 0.008;
      }
      renderer.render(scene, camera);
    };
    animate();

    // Mouse drag interaction for rotating 3D model
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      autoRotate = false;
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !group) return;
      const dx = e.clientX - prevX;
      const dy = e.clientY - prevY;
      group.rotation.y += dx * 0.015;
      group.rotation.x = Math.max(-0.6, Math.min(0.6, group.rotation.x + dy * 0.015));
      prevX = e.clientX;
      prevY = e.clientY;
    };

    const onMouseUp = () => {
      isDragging = false;
    };

    canvas.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);

    return () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
      renderer.dispose();
    };
  }, [preset, wireframe]);

  // Helper to build 3D mesh representations
  function buildPresetGeometry(group: THREE.Group, type: string, isWire: boolean) {
    while (group.children.length > 0) {
      const obj = group.children[0];
      group.remove(obj);
    }

    const material = new THREE.MeshStandardMaterial({
      color: type === "dress" ? 0x9b59b6 : type === "camera" ? 0x34495e : 0xd1b072,
      roughness: 0.35,
      metalness: 0.2,
      wireframe: isWire,
    });

    if (type === "dress") {
      // Stylized mannequin torso + dress
      const torsoGeo = new THREE.CylinderGeometry(0.3, 0.45, 0.8, 24);
      const torso = new THREE.Mesh(torsoGeo, material);
      torso.position.y = 0.4;
      group.add(torso);

      const skirtGeo = new THREE.ConeGeometry(0.85, 1.2, 32);
      const skirt = new THREE.Mesh(skirtGeo, material);
      skirt.position.y = -0.4;
      group.add(skirt);
    } else if (type === "camera") {
      // 3D Camera / Perspective Rig
      const bodyGeo = new THREE.BoxGeometry(0.7, 0.5, 0.9);
      const body = new THREE.Mesh(bodyGeo, material);
      group.add(body);

      const lensGeo = new THREE.CylinderGeometry(0.28, 0.32, 0.4, 32);
      const lens = new THREE.Mesh(lensGeo, new THREE.MeshStandardMaterial({ color: 0x111111, metalness: 0.8 }));
      lens.rotation.x = Math.PI / 2;
      lens.position.z = 0.55;
      group.add(lens);
    } else {
      // Default: Human / Mannequin silhouette
      // Head
      const headGeo = new THREE.SphereGeometry(0.28, 24, 24);
      const head = new THREE.Mesh(headGeo, material);
      head.position.y = 1.05;
      group.add(head);

      // Torso
      const chestGeo = new THREE.BoxGeometry(0.75, 0.95, 0.38);
      const chest = new THREE.Mesh(chestGeo, material);
      chest.position.y = 0.35;
      group.add(chest);

      // Limbs
      const armLGeo = new THREE.CylinderGeometry(0.1, 0.08, 0.9, 16);
      const armL = new THREE.Mesh(armLGeo, material);
      armL.position.set(-0.52, 0.3, 0);
      armL.rotation.z = 0.15;
      group.add(armL);

      const armR = new THREE.Mesh(armLGeo, material);
      armR.position.set(0.52, 0.3, 0);
      armR.rotation.z = -0.15;
      group.add(armR);

      // Stand pole
      const standGeo = new THREE.CylinderGeometry(0.04, 0.04, 1.1, 12);
      const standMat = new THREE.MeshStandardMaterial({ color: 0x444444, metalness: 0.9 });
      const stand = new THREE.Mesh(standGeo, standMat);
      stand.position.y = -0.6;
      group.add(stand);
    }
  }

  // Capture current 3D viewport angle as high-res reference image
  const captureSnapshot = useCallback(async () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setIsCapturing(true);

    try {
      const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
      // Convert to blob and upload to assets
      const res = await fetch(dataUrl);
      const blob = await res.blob();
      const file = new File([blob], `3d-snapshot-${preset}-${Date.now()}.jpg`, { type: "image/jpeg" });

      const { api } = await import("@/lib/api-client");
      const asset = await api.assets.upload(file, project?.id ?? null);

      setSnapshotUrl(asset.url);
      data.imageUrl = asset.url;
      data.snapshotUrl = asset.url;
      data.result = asset;

      toast("Đã chụp góc quay 3D làm ảnh tham chiếu thành công!", "success");
    } catch (e: any) {
      toast("Lỗi chụp 3D: " + (e.message || String(e)), "error");
    } finally {
      setIsCapturing(false);
    }
  }, [preset, project?.id, data, toast]);

  return (
    <div
      ref={containerRef}
      className={`group relative rounded-2xl bg-[#121216] border transition-all duration-150 ${
        selected ? "ring-1 ring-white/90 border-white/40 shadow-xl" : "border-white/10 hover:border-white/20"
      }`}
      style={{ width: 210 }}
    >
      {/* Top Header Label */}
      <div className="pointer-events-none absolute -top-[24px] left-0 right-0 flex items-center justify-between text-[11.5px] font-medium text-neutral-400 select-none">
        <div className="flex items-center gap-1.5 truncate">
          <Box size={12} className="text-amber-400 shrink-0" strokeWidth={2} />
          <span className="truncate">{data.name || "Mô hình 3D Tham Chiếu"}</span>
        </div>
        <span className="text-[10px] text-neutral-500 font-mono">3D Mesh</span>
      </div>

      {/* 3D WebGL Canvas */}
      <div className="relative overflow-hidden rounded-t-2xl cursor-grab active:cursor-grabbing bg-neutral-950">
        <canvas ref={canvasRef} className="block w-full h-[240px]" />
        
        {/* Helper overlay on 3D viewport */}
        <div className="pointer-events-none absolute bottom-2 left-2 right-2 flex items-center justify-between text-[10px] text-white/50 backdrop-blur-md bg-black/40 rounded px-2 py-0.5">
          <span>Kéo chuột xoay 360°</span>
          <span className="text-amber-300 font-medium capitalize">{preset}</span>
        </div>
      </div>

      {/* Control Toolbar */}
      <div className="p-2.5 flex flex-col gap-2 border-t border-white/10 bg-[#16161c] rounded-b-2xl">
        <div className="flex items-center justify-between gap-1">
          <select
            value={preset}
            onChange={(e) => setPreset(e.target.value)}
            className="nodrag flex-1 rounded-lg border border-white/10 bg-white/5 px-2 py-1 text-[11px] text-white/90 outline-none hover:bg-white/10"
          >
            <option value="mannequin" className="bg-neutral-900">Mannequin người</option>
            <option value="dress" className="bg-neutral-900">Váy đầm 3D</option>
            <option value="camera" className="bg-neutral-900">Camera / Góc máy</option>
          </select>

          <button
            type="button"
            onClick={() => setWireframe(!wireframe)}
            className={`nodrag flex h-7 w-7 items-center justify-center rounded-lg border text-[11px] transition ${
              wireframe ? "border-amber-400 bg-amber-500/20 text-amber-300" : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10"
            }`}
            title="Bật/Tắt lưới khung dây 3D (Wireframe)"
          >
            <RefreshCw size={11} />
          </button>
        </div>

        {/* Snapshot / Capture button */}
        <button
          type="button"
          onClick={captureSnapshot}
          disabled={isCapturing}
          className="nodrag flex w-full items-center justify-center gap-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-400/40 py-1.5 text-[11.5px] font-medium text-amber-200 transition shadow-sm"
        >
          <Camera size={12} />
          <span>{isCapturing ? "Đang chụp…" : "Chụp góc quay làm ảnh mẫu"}</span>
        </button>

        {snapshotUrl && (
          <div className="flex items-center gap-2 pt-1 border-t border-white/5">
            <img src={withBasePath(snapshotUrl)} alt="Snapshot" className="h-8 w-8 rounded object-cover border border-white/20" />
            <span className="text-[10.5px] text-emerald-400 truncate">Ảnh góc chụp sẵn sàng</span>
          </div>
        )}
      </div>

      {/* Connection Ports */}
      <Handle
        type="target"
        position={Position.Left}
        id={HANDLE_IN}
        className="!h-3 !w-3 !rounded-full !border-2 !border-neutral-900 !bg-amber-400"
      />
      <Handle
        type="source"
        position={Position.Right}
        id={HANDLE_OUT}
        className="!h-3 !w-3 !rounded-full !border-2 !border-neutral-900 !bg-amber-400"
      />
    </div>
  );
});
