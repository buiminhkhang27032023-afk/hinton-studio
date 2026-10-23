"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  useReactFlow,
  type ConnectionLineComponentProps,
  type EdgeProps,
} from "@xyflow/react";
import { X } from "lucide-react";
import { useUi } from "@/lib/ui-store";

export function StudioEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  style,
  selected,
  markerEnd,
}: EdgeProps) {
  const { tr } = useUi();
  const { setEdges } = useReactFlow();
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={markerEnd}
        interactionWidth={28}
        style={{
          ...style,
          stroke: selected ? "#ffffff" : "#d4d4d4",
          strokeWidth: selected ? 2 : 1.5,
        }}
      />
      {selected && (
        <EdgeLabelRenderer>
          <button
            type="button"
            className="nodrag nopan absolute flex items-center gap-1 rounded-full border border-white/15 bg-[#1a1a20] px-2.5 py-1 text-[11px] text-red-300 shadow-lg"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              pointerEvents: "all",
            }}
            onClick={(event) => {
              event.stopPropagation();
              setEdges((edges) => edges.filter((edge) => edge.id !== id));
            }}
          >
            <X size={11} />
            {tr("canvas.deleteEdge")}
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

export function StudioConnectionLine({
  fromX,
  fromY,
  toX,
  toY,
  fromPosition,
  toPosition,
  connectionStatus,
}: ConnectionLineComponentProps) {
  const [path] = getBezierPath({
    sourceX: fromX,
    sourceY: fromY,
    sourcePosition: fromPosition,
    targetX: toX,
    targetY: toY,
    targetPosition: toPosition,
  });
  const bad = connectionStatus === "invalid";
  return (
    <path d={path} fill="none" stroke={bad ? "#f87171" : "#e6e6e6"} strokeWidth={1.6} strokeLinecap="round" />
  );
}
