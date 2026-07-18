"use client";

/**
 * SmartEdge — a floating, obstacle-avoiding React Flow edge.
 *
 *  • Floating anchors: the wire attaches on whichever side of each card faces
 *    the other (via getSmartAnchors), so it stays sensible when you drag a
 *    node to the left, above, below — not just to the right.
 *  • Obstacle avoidance: the grid-A* router (smartPath) bends the wire AROUND
 *    other nodes. Only obstacles near the wire's corridor are considered.
 *  • Signature cache: the expensive A* only re-runs when the corridor
 *    actually changed (anchors or a nearby card moved) — dragging an
 *    unrelated node far away is a cache hit, not a re-route.
 *  • Falls back to a smoothstep (orthogonal, still card-shaped) — never a
 *    through-cutting bezier.
 */
import { memo, useMemo, useRef } from "react";
import {
  BaseEdge,
  getSmoothStepPath,
  useInternalNode,
  useNodes,
  type EdgeProps,
  type Node,
  Position,
} from "@xyflow/react";
import { smartPath, type Rect, type Side } from "./smartPath";
import { getSmartAnchors } from "./floating";

const CORRIDOR = 320; // how far around the endpoints obstacles still matter

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
  const sourceNode = useInternalNode(source);
  const targetNode = useInternalNode(target);
  const cacheRef = useRef<{ sig: string; path: string } | null>(null);

  const path = useMemo(() => {
    // Floating anchors when we can measure both nodes; else the handle coords
    // React Flow gave us.
    let sx = sourceX;
    let sy = sourceY;
    let tx = targetX;
    let ty = targetY;
    let sPos = sourcePosition;
    let tPos = targetPosition;
    if (sourceNode && targetNode) {
      const f = getSmartAnchors(
        sourceNode,
        targetNode,
        { x: sourceX, y: sourceY },
        { x: targetX, y: targetY },
      );
      sx = f.sx;
      sy = f.sy;
      tx = f.tx;
      ty = f.ty;
      sPos = f.sourcePos;
      tPos = f.targetPos;
    }

    // Corridor: only cards near the wire can block it.
    const minX = Math.min(sx, tx) - CORRIDOR;
    const maxX = Math.max(sx, tx) + CORRIDOR;
    const minY = Math.min(sy, ty) - CORRIDOR;
    const maxY = Math.max(sy, ty) + CORRIDOR;
    const obstacles: Rect[] = [];
    for (const n of nodes) {
      if (n.id === source || n.id === target) continue;
      const r = rectOf(n);
      if (!r) continue;
      if (r.x + r.w < minX || r.x > maxX || r.y + r.h < minY || r.y > maxY)
        continue;
      obstacles.push(r);
    }

    // Re-route only when the corridor actually changed.
    const sig =
      `${sx.toFixed(1)},${sy.toFixed(1)},${tx.toFixed(1)},${ty.toFixed(1)},${sPos},${tPos}|` +
      obstacles
        .map((r) => `${r.x | 0},${r.y | 0},${r.w | 0},${r.h | 0}`)
        .join(";");
    if (cacheRef.current?.sig === sig) return cacheRef.current.path;

    const routed = smartPath({
      source: { x: sx, y: sy },
      target: { x: tx, y: ty },
      sourceSide: sideOf(sPos),
      targetSide: sideOf(tPos),
      obstacles,
    });
    const d =
      routed ??
      getSmoothStepPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition: sPos,
        targetX: tx,
        targetY: ty,
        targetPosition: tPos,
        borderRadius: 12,
      })[0];
    cacheRef.current = { sig, path: d };
    return d;
  }, [
    nodes,
    sourceNode,
    targetNode,
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
