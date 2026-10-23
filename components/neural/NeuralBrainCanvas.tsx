"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/examples/jsm/postprocessing/OutputPass.js";
import { SpiderWebResponse, WebNode3D } from "@/lib/brain-graph";

interface SpiderWebCanvasProps {
  data: SpiderWebResponse;
  selectedNode: WebNode3D | null;
  onSelectNode: (node: WebNode3D | null) => void;
  selectedModule: string | "all";
  searchQuery: string;
  autoRotate: boolean;
  autoCrawl: boolean;
  pulseTrigger: number;
}

interface PulseParticle {
  mesh: THREE.Mesh;
  curve: THREE.QuadraticBezierCurve3;
  speed: number;
  offset: number;
  sourceId: string;
  targetId: string;
}

interface WalkingLeg {
  coxa: THREE.Group;
  femur: THREE.Mesh;
  tibia: THREE.Mesh;
  baseAngle: number;
  side: number;
  idx: number;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function NeuralBrainCanvas({
  data,
  selectedNode,
  onSelectNode,
  selectedModule,
  searchQuery,
  autoRotate,
  autoCrawl,
  pulseTrigger,
}: SpiderWebCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [hoveredNode, setHoveredNode] = useState<WebNode3D | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  // Three.js instances
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);

  // Scene object registries
  const nodeMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const hubRingMeshesRef = useRef<Map<string, THREE.Mesh>>(new Map());
  const edgeLinesRef = useRef<Map<string, THREE.Line>>(new Map());
  const edgeCurvesRef = useRef<Map<string, THREE.QuadraticBezierCurve3>>(new Map());
  const pulsesRef = useRef<PulseParticle[]>([]);
  const webLinesGroupRef = useRef<THREE.Group | null>(null);

  // 3D Cyber Geometric Spider (matching user's uploaded image)
  const spiderGroupRef = useRef<THREE.Group | null>(null);
  const spiderNucleusRef = useRef<THREE.Mesh | null>(null);
  const spiderWalkingLegsRef = useRef<WalkingLeg[]>([]);
  const spiderAnchorLinesRef = useRef<THREE.Line[]>([]);
  const spiderPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 15));
  const spiderTargetPosRef = useRef<THREE.Vector3>(new THREE.Vector3(0, 0, 15));
  const spiderIsCrawlingRef = useRef<boolean>(false);
  const spiderWalkCycleRef = useRef<number>(0);
  const selectedNodeRef = useRef<WebNode3D | null>(null);

  // Solar-system orbits: small nodes revolve around the bigger neighbor
  // they're tied to. Built once per `data` change, advanced every frame.
  const orbitParamsRef = useRef<
    Map<string, { parentId: string; radius: number; angle: number; speed: number; tilt: number }>
  >(new Map());
  const orbitOrderRef = useRef<string[]>([]);
  const orbitRingMeshesRef = useRef<THREE.Mesh[]>([]);

  // Camera lerp animation targets
  const cameraTargetPos = useRef<THREE.Vector3 | null>(null);
  const controlsTargetPos = useRef<THREE.Vector3 | null>(null);

  // Sound synthesizer via Web Audio
  const playSound = useCallback((freq = 520, type: OscillatorType = "sine", duration = 0.07) => {
    try {
      const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.5, ctx.currentTime + duration);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // AudioContext unavailable or blocked
    }
  }, []);

  /**
   * The minimal "wireframe crawler" spider — a small dark body with a
   * glowing core dot, legs drawn as thin glowing line segments (not solid
   * limbs) meeting at small joint beads, one leg lit up in the brand pink.
   * This matches the reference look directly rather than a sculpted
   * creature. Forward is local +Y — the crawl logic below steers via
   * rotation.z.
   */
  const createSpider = useCallback(() => {
    const spider = new THREE.Group();

    // Body — small dark glowing block, thin cyan outline
    const bodyGeo = new THREE.BoxGeometry(1.5, 4.4, 1.5);
    const bodyMat = new THREE.MeshStandardMaterial({
      color: 0x060b16,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.4,
      roughness: 0.35,
      metalness: 0.75,
    });
    const body = new THREE.Mesh(bodyGeo, bodyMat);
    spider.add(body);

    const outline = new THREE.LineSegments(
      new THREE.EdgesGeometry(bodyGeo),
      new THREE.LineBasicMaterial({ color: 0x7dd3fc, transparent: true, opacity: 0.9 }),
    );
    spider.add(outline);

    // Glowing core dot "[ · ]" — pulses like a heartbeat
    const nucleusGeo = new THREE.SphereGeometry(0.8, 14, 14);
    const nucleusMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const nucleus = new THREE.Mesh(nucleusGeo, nucleusMat);
    spider.add(nucleus);
    spiderNucleusRef.current = nucleus;

    // A soft light the spider carries with it, lighting up the web as it crawls
    const glow = new THREE.PointLight(0x7dd3fc, 22, 90, 2);
    spider.add(glow);

    // Eight wire legs: hip (coxa, animated) → thin line to a knee bead →
    // another thin line down to a foot bead. One leg (front-left) glows
    // pink like the reference image's highlighted thread.
    const jointMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    const legLineMat = new THREE.LineBasicMaterial({
      color: 0x5eead4,
      transparent: true,
      opacity: 0.85,
      blending: THREE.AdditiveBlending,
    });
    const activeLegLineMat = new THREE.LineBasicMaterial({
      color: 0xff2e63,
      transparent: true,
      opacity: 0.95,
      blending: THREE.AdditiveBlending,
    });
    const invisibleMat = new THREE.MeshBasicMaterial({ visible: false });
    const femurLength = 6.5;
    const tibiaLength = 7.5;
    const kneeTip = new THREE.Vector3(0, femurLength, 0);
    const footTip = new THREE.Vector3(0, -tibiaLength, 0);

    const legs: WalkingLeg[] = [];
    const legAngles = [0.42, 0.95, 2.15, 2.68]; // front → back spread, 4 per side
    let legIndex = 0;

    [-1, 1].forEach((side) => {
      legAngles.forEach((baseAngle, idx) => {
        const coxa = new THREE.Group();
        coxa.position.set(side * 0.85, 1.7 - idx * 1.15, 0);
        const lineMat = legIndex === 0 ? activeLegLineMat : legLineMat;

        // Femur — invisible pivot; the visible leg is the line + knee bead
        const femur = new THREE.Mesh(new THREE.BufferGeometry(), invisibleMat);
        femur.rotation.z = side * 0.78;
        femur.rotation.y = side * (baseAngle - Math.PI / 2);
        coxa.add(femur);

        const hipLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), kneeTip]),
          lineMat,
        );
        femur.add(hipLine);

        const knee = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 10), jointMat);
        knee.position.copy(kneeTip);
        femur.add(knee);

        // Tibia — invisible pivot at the knee, animated bend to the foot
        const tibia = new THREE.Mesh(new THREE.BufferGeometry(), invisibleMat);
        tibia.position.copy(kneeTip);
        tibia.rotation.z = side * -0.92;
        femur.add(tibia);

        const kneeLine = new THREE.Line(
          new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), footTip]),
          lineMat,
        );
        tibia.add(kneeLine);

        const foot = new THREE.Mesh(new THREE.SphereGeometry(0.28, 8, 8), jointMat);
        foot.position.copy(footTip);
        tibia.add(foot);

        spider.add(coxa);
        legs.push({ coxa, femur, tibia, baseAngle, side, idx });
        legIndex++;
      });
    });

    spider.scale.set(3.4, 3.4, 3.4);
    return { spider, legs };
  }, []);

  // A quiet field of distant stars behind the web — depth without distraction.
  const createStarfield = useCallback(() => {
    const count = 700;
    const positions = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const radius = 900 + Math.random() * 900;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({
      size: 1.6,
      color: 0x9fd8ff,
      transparent: true,
      opacity: 0.55,
      sizeAttenuation: true,
    });
    return new THREE.Points(geo, mat);
  }, []);

  // Initialize Three.js scene
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const width = mount.clientWidth || 800;
    const height = mount.clientHeight || 600;

    // 1. Scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    scene.fog = new THREE.FogExp2(0x040814, 0.0009);

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 3500);
    camera.position.set(0, -190, 490);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: "high-performance",
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.45;
    mount.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.minDistance = 60;
    controls.maxDistance = 1600;
    controls.autoRotate = autoRotate;
    controls.autoRotateSpeed = 0.45;
    controlsRef.current = controls;

    // 5. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x38bdf8, 2.2);
    dirLight1.position.set(160, 260, 320);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xf43f5e, 1.8);
    dirLight2.position.set(-200, -220, -160);
    scene.add(dirLight2);

    const dirLight3 = new THREE.DirectionalLight(0x10b981, 1.0);
    dirLight3.position.set(0, -380, 220);
    scene.add(dirLight3);

    // 6. Starfield backdrop (depth, no distraction)
    scene.add(createStarfield());

    // 7. Build the Spider
    const { spider, legs } = createSpider();
    scene.add(spider);
    spiderGroupRef.current = spider;
    spiderWalkingLegsRef.current = legs;

    // 8. Post-processing: bloom gives the glowing threads & spider real glow
    // instead of flat emissive materials.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.5, 0.4, 0.4);
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());
    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width: newW, height: newH } = entry.contentRect;
        if (newW > 0 && newH > 0) {
          camera.aspect = newW / newH;
          camera.updateProjectionMatrix();
          renderer.setSize(newW, newH);
          composer.setSize(newW, newH);
          bloomPass.setSize(newW, newH);
        }
      }
    });
    resizeObserver.observe(mount);

    // 8. Animation Loop
    let animationFrameId: number;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const delta = clock.getDelta();
      const elapsed = clock.getElapsedTime();

      // Camera lerp
      if (cameraTargetPos.current && controlsTargetPos.current) {
        camera.position.lerp(cameraTargetPos.current, 0.06);
        controls.target.lerp(controlsTargetPos.current, 0.06);
        if (camera.position.distanceTo(cameraTargetPos.current) < 2) {
          cameraTargetPos.current = null;
          controlsTargetPos.current = null;
        }
      }

      controls.update();

      // Pulse nucleus of the spider
      if (spiderNucleusRef.current) {
        const pulse = 1 + 0.2 * Math.sin(elapsed * 5);
        spiderNucleusRef.current.scale.set(pulse, pulse, pulse);
      }

      // Animate Hub Rings
      hubRingMeshesRef.current.forEach((ring) => {
        ring.rotation.z += 0.018;
        ring.rotation.x += 0.009;
        const scaleWave = 1 + 0.1 * Math.sin(elapsed * 3 + ring.id);
        ring.scale.set(scaleWave, scaleWave, scaleWave);
      });

      // Animate Action Potential Pulses along connecting threads
      pulsesRef.current.forEach((pulse) => {
        const t = (elapsed * pulse.speed + pulse.offset) % 1.0;
        const pt = pulse.curve.getPoint(t);
        pulse.mesh.position.copy(pt);
      });

      // Orbit update: small bodies revolve around the bigger one they're tied to
      orbitOrderRef.current.forEach((nodeId) => {
        const params = orbitParamsRef.current.get(nodeId);
        const mesh = nodeMeshesRef.current.get(nodeId);
        const parentMesh = params && nodeMeshesRef.current.get(params.parentId);
        if (!params || !mesh || !parentMesh) return;

        params.angle += delta * params.speed;
        mesh.position.set(
          parentMesh.position.x + Math.cos(params.angle) * params.radius,
          parentMesh.position.y + Math.sin(params.angle) * params.radius * 0.88,
          parentMesh.position.z + params.tilt * 0.4 + Math.sin(params.angle * 1.3) * 2.5,
        );

        const ring = hubRingMeshesRef.current.get(nodeId);
        if (ring) ring.position.copy(mesh.position);
      });

      // Connections follow their (possibly orbiting) endpoints live
      edgeLinesRef.current.forEach((line, edgeKey) => {
        const { source, target } = line.userData as { source: string; target: string };
        const srcMesh = nodeMeshesRef.current.get(source);
        const tgtMesh = nodeMeshesRef.current.get(target);
        const curve = edgeCurvesRef.current.get(edgeKey);
        if (!srcMesh || !tgtMesh || !curve) return;

        const mid = srcMesh.position.clone().lerp(tgtMesh.position, 0.5);
        mid.z += Math.min(35, srcMesh.position.distanceTo(tgtMesh.position) * 0.22);
        curve.v0.copy(srcMesh.position);
        curve.v1.copy(mid);
        curve.v2.copy(tgtMesh.position);

        const pts = curve.getPoints(36);
        const posAttr = line.geometry.getAttribute("position") as THREE.BufferAttribute;
        for (let i = 0; i < pts.length; i++) posAttr.setXYZ(i, pts[i].x, pts[i].y, pts[i].z);
        posAttr.needsUpdate = true;
      });

      // Spider keeps chasing the selected node even while it's orbiting
      if (selectedNodeRef.current) {
        const liveMesh = nodeMeshesRef.current.get(selectedNodeRef.current.id);
        if (liveMesh) {
          spiderTargetPosRef.current.set(
            liveMesh.position.x,
            liveMesh.position.y,
            liveMesh.position.z + (selectedNodeRef.current.radius || 0) + 5,
          );
        }
      }

      // Spider Crawling Logic
      if (spiderGroupRef.current) {
        const spider = spiderGroupRef.current;
        const current = spiderPosRef.current;
        const target = spiderTargetPosRef.current;

        const deltaVec = target.clone().sub(current);
        const dist = deltaVec.length();

        if (dist > 3) {
          spiderIsCrawlingRef.current = true;
          spiderWalkCycleRef.current += delta * 16;

          // Move towards target
          deltaVec.normalize();
          const moveStep = Math.min(dist, delta * 95);
          current.addScaledVector(deltaVec, moveStep);
          spider.position.copy(current);

          // Face the direction of movement
          const angle = Math.atan2(deltaVec.x, deltaVec.y);
          spider.rotation.z = -angle;

          // Small body bounce while walking
          spider.position.z = current.z + Math.abs(Math.sin(spiderWalkCycleRef.current * 2)) * 2.2;
        } else {
          spiderIsCrawlingRef.current = false;
          spider.position.z = current.z + Math.sin(elapsed * 2) * 0.8;
        }

        // Animate 8 Walking Legs
        const walkCycle = spiderWalkCycleRef.current;
        spiderWalkingLegsRef.current.forEach((leg) => {
          if (spiderIsCrawlingRef.current) {
            const phase = (leg.idx % 2 === 0 ? 0 : Math.PI) + (leg.side === 1 ? 0 : Math.PI * 0.5);
            const step = Math.sin(walkCycle + phase);

            leg.coxa.rotation.y = leg.side * (leg.baseAngle - Math.PI / 2) + step * 0.4;
            leg.coxa.rotation.z = leg.side * (0.78 + Math.max(0, step) * 0.48);
            leg.tibia.rotation.z = leg.side * (-0.92 - Math.max(0, -step) * 0.35);
          } else {
            // Idle stance
            const breath = Math.sin(elapsed * 2 + leg.idx) * 0.05;
            leg.coxa.rotation.y = leg.side * (leg.baseAngle - Math.PI / 2) + breath;
          }
        });
      }

      composerRef.current ? composerRef.current.render() : renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      if (mount && renderer.domElement) {
        mount.removeChild(renderer.domElement);
      }
      composerRef.current?.dispose();
      renderer.dispose();
    };
  }, [createSpider, createStarfield, autoRotate]);

  // Update controls autoRotate
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = autoRotate;
    }
  }, [autoRotate]);

  // Keep a live ref so the (stable) animate loop can track whichever node is
  // currently selected without having to remount the whole scene for it.
  useEffect(() => {
    selectedNodeRef.current = selectedNode;
  }, [selectedNode]);

  // Auto Crawl Mode
  useEffect(() => {
    if (!autoCrawl || !data?.nodes || data.nodes.length === 0) return;

    const interval = setInterval(() => {
      const currentId = selectedNode?.id;
      let nextNode: WebNode3D | undefined;

      if (currentId) {
        const cur = data.nodes.find((n) => n.id === currentId);
        const neighbors = [...(cur?.outgoing || []), ...(cur?.incoming || [])];
        if (neighbors.length > 0) {
          const randId = neighbors[Math.floor(Math.random() * neighbors.length)];
          nextNode = data.nodes.find((n) => n.id === randId);
        }
      }

      if (!nextNode) {
        const sorted = [...data.nodes].sort((a, b) => b.degree - a.degree);
        nextNode = sorted[Math.floor(Math.random() * Math.min(5, sorted.length))];
      }

      if (nextNode) {
        onSelectNode(nextNode);
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [autoCrawl, data, selectedNode, onSelectNode]);

  // Rebuild 3D Spider Web, Nodes, and Connecting Silk Threads
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene || !data || !data.nodes) return;

    // 1. Clear old meshes
    nodeMeshesRef.current.forEach((m) => scene.remove(m));
    nodeMeshesRef.current.clear();

    hubRingMeshesRef.current.forEach((r) => scene.remove(r));
    hubRingMeshesRef.current.clear();

    edgeLinesRef.current.forEach((l) => scene.remove(l));
    edgeLinesRef.current.clear();

    edgeCurvesRef.current.clear();

    pulsesRef.current.forEach((p) => scene.remove(p.mesh));
    pulsesRef.current = [];

    if (webLinesGroupRef.current) {
      scene.remove(webLinesGroupRef.current);
      webLinesGroupRef.current = null;
    }

    orbitRingMeshesRef.current.forEach((r) => scene.remove(r));
    orbitRingMeshesRef.current = [];
    orbitParamsRef.current.clear();
    orbitOrderRef.current = [];

    // 2. Create Nodes as orbiting bodies: "càng nối nhiều cái cục đấy càng to"
    const nodePosMap = new Map<string, THREE.Vector3>();

    data.nodes.forEach((node) => {
      const pos = new THREE.Vector3(node.x, node.y, node.z);
      nodePosMap.set(node.id, pos);

      // Sphere radius strictly proportional to connection degree
      const sphereGeo = new THREE.SphereGeometry(node.radius, 24, 24);
      const sphereMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(node.color),
        emissive: new THREE.Color(node.color),
        emissiveIntensity: node.isHub ? 0.95 : 0.45,
        roughness: 0.2,
        metalness: 0.25,
        transparent: true,
        opacity: 0.95,
      });

      const sphereMesh = new THREE.Mesh(sphereGeo, sphereMat);
      sphereMesh.position.copy(pos);
      sphereMesh.userData = { nodeId: node.id, node };
      scene.add(sphereMesh);
      nodeMeshesRef.current.set(node.id, sphereMesh);

      // Major Hub Aura Rings
      if (node.isHub) {
        const ringGeo = new THREE.RingGeometry(node.radius * 1.35, node.radius * 1.55, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: new THREE.Color(node.color),
          transparent: true,
          opacity: 0.75,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.position.copy(pos);
        scene.add(ringMesh);
        hubRingMeshesRef.current.set(node.id, ringMesh);
      }
    });

    // 3. Solar-system orbits — every node picks the biggest connected
    // neighbor as its "sun" and revolves around it; nodes with no bigger
    // neighbor (the hubs) stay put as the suns of their own little system.
    const byId = new Map(data.nodes.map((n) => [n.id, n] as const));
    [...data.nodes].sort((a, b) => b.radius - a.radius).forEach((node) => {
      const neighborIds = [...node.incoming, ...node.outgoing];
      let parent: WebNode3D | null = null;
      for (const nid of neighborIds) {
        const cand = byId.get(nid);
        if (!cand || cand.id === node.id || cand.radius <= node.radius) continue;
        if (!parent || cand.radius > parent.radius) parent = cand;
      }
      if (parent === null) return;

      const dx = node.x - parent.x;
      const dy = node.y - parent.y;
      const dz = node.z - parent.z;
      const orbitRadius = Math.max(14, Math.hypot(dx, dy));
      const angle0 = Math.atan2(dy, dx);
      const dir = hashId(node.id) % 2 === 0 ? 1 : -1;

      orbitParamsRef.current.set(node.id, {
        parentId: parent.id,
        radius: orbitRadius,
        angle: angle0,
        speed: dir * (3.2 / Math.sqrt(orbitRadius)),
        tilt: dz,
      });
      orbitOrderRef.current.push(node.id);

      // A faint guide ring around static suns only — nested orbits would
      // drift out of sync with a moving ring, so keep this to first-level.
      if (!orbitParamsRef.current.has(parent.id)) {
        const ringGeo = new THREE.RingGeometry(orbitRadius - 0.4, orbitRadius + 0.4, 64);
        const ringMat = new THREE.MeshBasicMaterial({
          color: 0x7dd3fc,
          transparent: true,
          opacity: 0.1,
          side: THREE.DoubleSide,
          blending: THREE.AdditiveBlending,
        });
        const guideRing = new THREE.Mesh(ringGeo, ringMat);
        guideRing.position.set(parent.x, parent.y, parent.z);
        scene.add(guideRing);
        orbitRingMeshesRef.current.push(guideRing);
      }
    });

    // 4. Create Inter-Module & File Connection Threads
    const pulseMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      blending: THREE.AdditiveBlending,
    });
    const pulseGeo = new THREE.SphereGeometry(2.4, 10, 10);

    data.edges.forEach((edge, edgeIdx) => {
      const srcPos = nodePosMap.get(edge.source);
      const tgtPos = nodePosMap.get(edge.target);
      if (!srcPos || !tgtPos) return;

      const srcNode = data.nodes.find((n) => n.id === edge.source);
      const tgtNode = data.nodes.find((n) => n.id === edge.target);

      const mid = srcPos.clone().lerp(tgtPos, 0.5);
      const dist = srcPos.distanceTo(tgtPos);
      const lift = Math.min(35, dist * 0.22);
      mid.z += lift;

      const curve = new THREE.QuadraticBezierCurve3(srcPos, mid, tgtPos);
      const pts = curve.getPoints(36);

      const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);

      const colors: number[] = [];
      const cSrc = new THREE.Color(srcNode?.color || "#38bdf8");
      const cTgt = new THREE.Color(tgtNode?.color || "#f59e0b");

      for (let i = 0; i <= 36; i++) {
        const t = i / 36;
        const cInterp = cSrc.clone().lerp(cTgt, t);
        colors.push(cInterp.r, cInterp.g, cInterp.b);
      }
      lineGeo.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));

      const lineMat = new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
      });

      const line = new THREE.Line(lineGeo, lineMat);
      line.userData = { edgeKey: `${edge.source}->${edge.target}`, source: edge.source, target: edge.target };
      scene.add(line);

      const edgeKey = `${edge.source}->${edge.target}`;
      edgeLinesRef.current.set(edgeKey, line);
      edgeCurvesRef.current.set(edgeKey, curve);

      // Pulses
      for (let p = 0; p < 2; p++) {
        const pMesh = new THREE.Mesh(pulseGeo, pulseMat);
        scene.add(pMesh);
        pulsesRef.current.push({
          mesh: pMesh,
          curve,
          speed: 0.35 + (edgeIdx % 4) * 0.08,
          offset: p * 0.5 + ((edgeIdx * 23) % 100) / 100,
          sourceId: edge.source,
          targetId: edge.target,
        });
      }
    });

    // Place spider initially on the highest degree hub
    const topHub = [...data.nodes].sort((a, b) => b.degree - a.degree)[0];
    if (topHub) {
      spiderPosRef.current.set(topHub.x, topHub.y, topHub.z + topHub.radius + 5);
      spiderTargetPosRef.current.copy(spiderPosRef.current);
      if (spiderGroupRef.current) {
        spiderGroupRef.current.position.copy(spiderPosRef.current);
      }
    }
  }, [data]);

  // Dynamic Spider Anchor Tentacles:
  // When selectedNode is active, deploy laser spider legs extending directly from spider to all connected satellite nodes!
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Clear old anchor lines
    spiderAnchorLinesRef.current.forEach((l) => scene.remove(l));
    spiderAnchorLinesRef.current = [];

    if (!selectedNode) return;

    // Nodes orbit, so anchor everything to where the mesh actually is now,
    // not the static layout position the data started with.
    const selectedMesh = nodeMeshesRef.current.get(selectedNode.id);
    const selectedPos = selectedMesh?.position ?? new THREE.Vector3(selectedNode.x, selectedNode.y, selectedNode.z);

    // Send the Cyber Spider scuttling to the selected node
    const targetZ = selectedPos.z + selectedNode.radius + 5;
    spiderTargetPosRef.current.set(selectedPos.x, selectedPos.y, targetZ);
    spiderIsCrawlingRef.current = true;

    // Camera smoothly glides to frame the selected node & spider
    if (cameraRef.current && controlsRef.current) {
      controlsTargetPos.current = selectedPos.clone();
      const offset = new THREE.Vector3(35, -45, 90);
      cameraTargetPos.current = selectedPos.clone().add(offset);
    }

    // Deploy Radial Spider Anchor Lines (The exact aesthetic from user's image!)
    const neighbors = [...(selectedNode.incoming || []), ...(selectedNode.outgoing || [])];
    const spiderCenter = new THREE.Vector3(selectedPos.x, selectedPos.y, targetZ);

    neighbors.forEach((neighId) => {
      const neigh = data.nodes.find((n) => n.id === neighId);
      if (!neigh) return;

      const neighMesh = nodeMeshesRef.current.get(neighId);
      const neighPos = neighMesh?.position.clone() ?? new THREE.Vector3(neigh.x, neigh.y, neigh.z);

      // Create an articulated 3-point spider leg line from spider chassis -> knee joint -> target node
      const mid = spiderCenter.clone().lerp(neighPos, 0.45);
      mid.z += 12; // knee bends upward

      const legCurve = new THREE.QuadraticBezierCurve3(spiderCenter, mid, neighPos);
      const pts = legCurve.getPoints(24);

      const legGeo = new THREE.BufferGeometry().setFromPoints(pts);
      const legMat = new THREE.LineBasicMaterial({
        color: 0xf43f5e, // Glowing pink laser spider leg
        transparent: true,
        opacity: 0.95,
        blending: THREE.AdditiveBlending,
      });

      const legLine = new THREE.Line(legGeo, legMat);
      scene.add(legLine);
      spiderAnchorLinesRef.current.push(legLine);
    });
  }, [selectedNode, data]);

  // Highlights and opacities when selectedNode / hoveredNode / selectedModule / searchQuery changes
  useEffect(() => {
    if (!data || !data.nodes) return;

    const activeNode = selectedNode || hoveredNode;
    const incomingSet = new Set(activeNode?.incoming || []);
    const outgoingSet = new Set(activeNode?.outgoing || []);
    const activeId = activeNode?.id;

    const searchLower = searchQuery.trim().toLowerCase();

    nodeMeshesRef.current.forEach((mesh, nodeId) => {
      const node = data.nodes.find((n) => n.id === nodeId);
      if (!node) return;

      const mat = mesh.material as THREE.MeshStandardMaterial;
      const isModMatched = selectedModule === "all" || node.module === selectedModule;
      const isSearchMatched =
        !searchLower ||
        node.name.toLowerCase().includes(searchLower) ||
        node.file.toLowerCase().includes(searchLower);

      if (!isModMatched || !isSearchMatched) {
        mat.opacity = 0.08;
        mat.emissiveIntensity = 0.1;
        mesh.scale.set(0.65, 0.65, 0.65);
        return;
      }

      if (activeId) {
        if (nodeId === activeId) {
          mat.opacity = 1.0;
          mat.emissiveIntensity = 1.5;
          mesh.scale.set(1.25, 1.25, 1.25);
        } else if (incomingSet.has(nodeId)) {
          mat.opacity = 0.95;
          mat.emissiveIntensity = 1.2;
          mesh.scale.set(1.18, 1.18, 1.18);
        } else if (outgoingSet.has(nodeId)) {
          mat.opacity = 0.95;
          mat.emissiveIntensity = 1.2;
          mesh.scale.set(1.18, 1.18, 1.18);
        } else {
          mat.opacity = 0.14;
          mat.emissiveIntensity = 0.15;
          mesh.scale.set(0.85, 0.85, 0.85);
        }
      } else {
        mat.opacity = 0.95;
        mat.emissiveIntensity = node.isHub ? 0.95 : 0.45;
        mesh.scale.set(1.0, 1.0, 1.0);
      }
    });

    // Connecting Silk Threads
    edgeLinesRef.current.forEach((line, edgeKey) => {
      const mat = line.material as THREE.LineBasicMaterial;
      const [src, tgt] = edgeKey.split("->");

      if (activeId) {
        if (src === activeId || tgt === activeId) {
          mat.opacity = 1.0;
        } else {
          mat.opacity = 0.06;
        }
      } else {
        mat.opacity = 0.48;
      }
    });

    // Pulses
    pulsesRef.current.forEach((pulse) => {
      if (activeId) {
        pulse.mesh.visible = pulse.sourceId === activeId || pulse.targetId === activeId;
      } else {
        pulse.mesh.visible = true;
      }
    });
  }, [data, selectedNode, hoveredNode, selectedModule, searchQuery]);

  // Raycaster Pointer Event Handlers
  const handlePointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const mount = mountRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      if (!mount || !camera || !scene) return;

      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const meshes = Array.from(nodeMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const topHit = intersects[0].object as THREE.Mesh;
        const node = topHit.userData.node as WebNode3D;
        if (node && (!hoveredNode || hoveredNode.id !== node.id)) {
          setHoveredNode(node);
          setTooltipPos({ x: e.clientX, y: e.clientY });
          mount.style.cursor = "pointer";
          playSound(640, "sine", 0.04);
        } else {
          setTooltipPos({ x: e.clientX, y: e.clientY });
        }
      } else {
        if (hoveredNode) {
          setHoveredNode(null);
          setTooltipPos(null);
          mount.style.cursor = "default";
        }
      }
    },
    [hoveredNode, playSound]
  );

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const mount = mountRef.current;
      const camera = cameraRef.current;
      const scene = sceneRef.current;
      if (!mount || !camera || !scene) return;

      const rect = mount.getBoundingClientRect();
      const mouse = new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        -((e.clientY - rect.top) / rect.height) * 2 + 1
      );

      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);

      const meshes = Array.from(nodeMeshesRef.current.values());
      const intersects = raycaster.intersectObjects(meshes);

      if (intersects.length > 0) {
        const topHit = intersects[0].object as THREE.Mesh;
        const node = topHit.userData.node as WebNode3D;
        onSelectNode(node);
        playSound(920, "sine", 0.12);
      } else {
        onSelectNode(null);
      }
    },
    [onSelectNode, playSound]
  );

  return (
    <div
      ref={mountRef}
      className="relative h-full w-full overflow-hidden bg-[#050811] select-none"
      onPointerMove={handlePointerMove}
      onClick={handleClick}
    >
      {/* 3D Viewport Radial Background */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(244,63,94,0.06)_0%,rgba(15,23,42,0.85)_60%,rgba(2,6,23,0.98)_100%)]" />

      {/* Floating Raycaster Tooltip HUD */}
      {hoveredNode && tooltipPos && (
        <div
          className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-[125%] rounded-xl border border-pink-500/50 bg-[#0a101d]/95 p-3 shadow-[0_0_20px_rgba(244,63,94,0.25)] backdrop-blur-md transition-all duration-75"
          style={{ left: tooltipPos.x, top: tooltipPos.y }}
        >
          <div className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full shadow-[0_0_8px]"
              style={{ backgroundColor: hoveredNode.color, boxShadow: `0 0 8px ${hoveredNode.color}` }}
            />
            <span className="font-mono text-xs font-semibold text-white">
              {hoveredNode.name}
            </span>
            <span className="rounded bg-ink-800 px-1.5 py-0.5 text-[10px] font-medium text-pink-300 border border-pink-500/30">
              {data.modules[hoveredNode.module]?.title.split(" (")[0] || hoveredNode.module}
            </span>
          </div>

          <div className="mt-1 font-mono text-[11px] text-ink-400">
            {hoveredNode.file}
          </div>

          <div className="mt-2 flex items-center gap-3 border-t border-ink-800/80 pt-2 text-[11px]">
            <div className="text-ink-300">
              Tổng chân tơ:{" "}
              <span className="font-mono font-bold text-amber-400">
                {hoveredNode.degree}
              </span>
            </div>
            <div className="text-ink-400">
              Vào: <span className="font-mono text-emerald-400">{hoveredNode.inDegree}</span>
            </div>
            <div className="text-ink-400">
              Ra: <span className="font-mono text-rose-400">{hoveredNode.outDegree}</span>
            </div>
            <div className="text-ink-400">
              Bán kính: <span className="font-mono text-cyan-400">{hoveredNode.radius}px</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
