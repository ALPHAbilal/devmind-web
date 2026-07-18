"use client";

/**
 * SmartEdge — an obstacle-avoiding React Flow edge.
 *
 * Instead of a bezier that cuts straight through other cards, it runs the
 * grid-A* router (smartPath) over the live node rects so the wire bends
 * AROUND every other node. Source/target nodes are excluded from the
 * obstacle set. Falls back to a smooth bezier if no orthogonal route exists.
 */
import { memo, useMemo } from "react";
import {
  BaseEdge,
  getBezierPath,
  useNodes,
  type EdgeProps,
  type Node,
  Position,
} from "@xyflow/react";
import { smartPath, type Rect, type Side } from "./smartPath";

function sideOf(p: Position): Side {
  switch (p) {
    case Position.Left:
      return "left";
    case Position.Right:
      return "right";
    case Position.Top:
      return "top";
    default:
      return "bottom";
  }
}

function rectOf(n: Node): Rect | null {
  const w = n.measured?.width ?? n.width ?? 0;
  const h = n.measured?.height ?? n.height ?? 0;
  if (!w || !h) return null;
  return { x: n.position.x, y: n.position.y, w, h };
}

export const SmartEdge = memo(function SmartEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  markerEnd,
  style,
  interactionWidth,
}: EdgeProps) {
  const nodes = useNodes();

  const path = useMemo(() => {
    const obstacles: Rect[] = [];
    for (const n of nodes) {
      if (n.id === source || n.id === target) continue;
      const r = rectOf(n);
      if (r) obstacles.push(r);
    }

    const routed = smartPath({
      source: { x: sourceX, y: sourceY },
      target: { x: targetX, y: targetY },
      sourceSide: sideOf(sourcePosition),
      targetSide: sideOf(targetPosition),
      obstacles,
    });
    if (routed) return routed;

    // fallback: smooth bezier
    const [d] = getBezierPath({
      sourceX,
      sourceY,
      sourcePosition,
      targetX,
      targetY,
      targetPosition,
    });
    return d;
  }, [
    nodes,
    source,
    target,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  ]);

  return (
    <BaseEdge
      id={id}
      path={path}
      markerEnd={markerEnd}
      style={style}
      interactionWidth={interactionWidth}
    />
  );
});
