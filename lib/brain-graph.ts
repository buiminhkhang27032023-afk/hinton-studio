import fs from "fs";
import path from "path";

export interface ModuleMeta {
  key: string;
  title: string;
  subtitle: string;
  color: string;
  bgGlow: string;
}

export interface WebNode3D {
  id: string;
  name: string;
  file: string;
  module: string;
  dir: string;
  x: number;
  y: number;
  z: number;
  inDegree: number;
  outDegree: number;
  degree: number;
  radius: number;
  color: string;
  doc?: string;
  args?: string;
  snippet?: string;
  line?: number;
  endLine?: number;
  incoming: string[];
  outgoing: string[];
  complexity?: number;
  isHub?: boolean;
}

export interface WebEdge3D {
  source: string;
  target: string;
  color?: string;
}

export interface SpiderWebPoint {
  x: number;
  y: number;
  z: number;
}

export interface SpiderWebLine {
  from: SpiderWebPoint;
  to: SpiderWebPoint;
}

export interface SpiderWebResponse {
  success: boolean;
  target: "seecut" | "studio" | "custom";
  modules: Record<string, ModuleMeta>;
  nodes: WebNode3D[];
  edges: WebEdge3D[];
  webLines: SpiderWebLine[];
  stats: {
    totalNodes: number;
    totalEdges: number;
    maxDegree: number;
    topHubName: string;
    topHubDegree: number;
  };
}

/**
 * Calculates node radius strictly proportional to connection degree
 * "càng nối nhiều cái cục đấy càng to"
 */
export function calculateNodeRadius(totalDegree: number): number {
  if (totalDegree <= 0) return 9;
  if (totalDegree === 1) return 13;
  if (totalDegree === 2) return 17;
  if (totalDegree === 3) return 21;
  if (totalDegree === 4) return 25;
  if (totalDegree === 5) return 28;
  // Scaled for large hubs up to 36
  return Math.round(Math.min(36, 12 + Math.pow(totalDegree, 0.82) * 4.6));
}

/**
 * Generates concentric rings and radial anchor silk threads of a 3D Spider Web
 */
export function generateSpiderWebGeometry(
  rings = 7,
  radials = 16,
  maxRadius = 260
): { points: SpiderWebPoint[]; webLines: SpiderWebLine[] } {
  const points: SpiderWebPoint[] = [];
  const webLines: SpiderWebLine[] = [];

  // Concentric spiral rings with 3D gravitational sag
  for (let r = 1; r <= rings; r++) {
    const radius = (r / rings) * maxRadius;
    const zSag = -Math.pow(r / rings, 1.4) * 35; // bowl-shaped sag

    const ringPoints: SpiderWebPoint[] = [];
    for (let i = 0; i < radials; i++) {
      const angle = (i / radials) * Math.PI * 2;
      // natural silk jitter
      const jitter = 1 + Math.sin(angle * 4 + r) * 0.04;
      const x = Math.round(Math.cos(angle) * radius * jitter);
      const y = Math.round(Math.sin(angle) * radius * jitter);
      const z = Math.round(zSag + Math.sin(angle * 3) * 6);
      ringPoints.push({ x, y, z });
      points.push({ x, y, z });
    }

    // Connect ring perimeter
    for (let i = 0; i < radials; i++) {
      webLines.push({
        from: ringPoints[i],
        to: ringPoints[(i + 1) % radials],
      });
    }
  }

  // Radial anchor threads radiating from center (0,0,0) outward
  const centerPoint: SpiderWebPoint = { x: 0, y: 0, z: 0 };
  for (let i = 0; i < radials; i++) {
    // line from center to first ring
    webLines.push({
      from: centerPoint,
      to: points[i],
    });
    // lines connecting consecutive rings along radial spoke
    for (let r = 0; r < rings - 1; r++) {
      const p1 = points[r * radials + i];
      const p2 = points[(r + 1) * radials + i];
      webLines.push({ from: p1, to: p2 });
    }
  }

  return { points, webLines };
}

/**
 * Assigns 3D coordinates for a node on the spider web based on its module group and connection density.
 * Major hubs sit closer to the core or along strong anchor radial spokes!
 */
export function assignWebNodePosition(
  moduleIndex: number,
  totalModules: number,
  indexInModule: number,
  totalInModule: number,
  isHub: boolean,
  degree: number
): { x: number; y: number; z: number } {
  // Each module occupies an angular sector of the spider web
  const sectorAngle = (Math.PI * 2) / Math.max(1, totalModules);
  const baseAngle = moduleIndex * sectorAngle;

  const fraction = totalInModule > 1 ? indexInModule / totalInModule : 0.5;
  const spreadAngle = baseAngle + (fraction - 0.5) * sectorAngle * 0.85;

  // Major hubs sit closer to the center of the web where threads converge
  // Leaf nodes radiate outward
  let distance = 0;
  if (isHub || degree >= 6) {
    distance = 45 + fraction * 35; // Core web hub
  } else if (degree >= 3) {
    distance = 95 + fraction * 55; // Middle web zone
  } else {
    distance = 160 + fraction * 75; // Outer web silk edge
  }

  const zSag = -Math.pow(distance / 240, 1.4) * 30;

  // Deterministic subtle jitter
  const seed = (moduleIndex * 17 + indexInModule * 31) % 100;
  const jitterAngle = (seed / 100 - 0.5) * 0.12;
  const finalAngle = spreadAngle + jitterAngle;

  const x = Math.round(Math.cos(finalAngle) * distance);
  const y = Math.round(Math.sin(finalAngle) * distance);
  const z = Math.round(zSag + ((seed % 10) - 5) * 2);

  return { x, y, z };
}
