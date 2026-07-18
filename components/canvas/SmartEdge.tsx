"use client";

/**
 * SmartEdge — a floating, obstacle-avoiding React Flow edge.
 *
 *  • Floating anchors: the wire attaches on whichever side of each card faces
 *    the other (via getFloatingParams), so it stays sensible when you drag a
 *    node to the left, above, below — not just to the right.
 *  • Obstacle avoidance: the grid-A* router (smartPath) bends the wire AROUND
 *    every other node instead of cutting through them.
 *  • Falls back to a smooth bezier if no orthogonal route exists.
 */
import { memo, useMemo } from "react";
import {
  BaseEdge,
  getBezierPath,
  useInternalNode,
  useNodes,
  type EdgeProps,
  type Node,
  Position,
} from "@xyflow/react";
import { smartPath, type Rect, type Side } from "./smartPath";
import { getSmartAnchors } from "./floating";

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

  const path = useMemo(() => {
    // Floating anchors when we can measure both nodes; else fall back to the
    // handle coords React Flow gave us.
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

    const obstacles: Rect[] = [];
    for (const n of nodes) {
      if (n.id === source || n.id === target) continue;
      const r = rectOf(n);
      if (r) obstacles.push(r);
    }

    const routed = smartPath({
      source: { x: sx, y: sy },
      target: { x: tx, y: ty },
      sourceSide: sideOf(sPos),
      targetSide: sideOf(tPos),
      obstacles,
    });
    if (routed) return routed;

    const [d] = getBezierPath({
      sourceX: sx,
      sourceY: sy,
      sourcePosition: sPos,
      targetX: tx,
      targetY: ty,
      targetPosition: tPos,
    });
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
