/**
 * floating — dynamic edge anchors tuned to our canvas.
 *
 * A wire attaches on whichever side of each card faces the other node (so
 * dragging a card left/up/down flips the exit side, not just right→right).
 * Crucially, along a horizontal run we KEEP the caller-provided Y (and along a
 * vertical run the provided X) — that preserves the notebook's "wire leaves at
 * the highlighted line" behaviour while still letting the side flip.
 */
import { Position, type InternalNode, type Node } from "@xyflow/react";

interface XY {
  x: number;
  y: number;
}
interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

const INSET = 10; // keep anchors off the very corners

function boxOf(node: InternalNode<Node>): Box {
  return {
    x: node.internals.positionAbsolute.x,
    y: node.internals.positionAbsolute.y,
    w: node.measured?.width ?? 0,
    h: node.measured?.height ?? 0,
  };
}
const clamp = (v: number, lo: number, hi: number) =>
  Math.max(lo, Math.min(hi, v));

export interface FloatingParams {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  sourcePos: Position;
  targetPos: Position;
}

/**
 * Anchor points + sides for an edge from `source` to `target`.
 * `provSource` / `provTarget` are the handle coords React Flow supplied; we
 * reuse their Y (horizontal run) or X (vertical run) so meaningful handle
 * offsets survive.
 */
export function getSmartAnchors(
  source: InternalNode<Node>,
  target: InternalNode<Node>,
  provSource: XY,
  provTarget: XY,
): FloatingParams {
  const s = boxOf(source);
  const t = boxOf(target);
  if (!s.w || !s.h || !t.w || !t.h) {
    return {
      sx: provSource.x,
      sy: provSource.y,
      tx: provTarget.x,
      ty: provTarget.y,
      sourcePos: Position.Right,
      targetPos: Position.Left,
    };
  }

  const scx = s.x + s.w / 2;
  const scy = s.y + s.h / 2;
  const tcx = t.x + t.w / 2;
  const tcy = t.y + t.h / 2;
  const dx = tcx - scx;
  const dy = tcy - scy;

  if (Math.abs(dx) >= Math.abs(dy)) {
    // horizontal run — keep provided Y, flip left/right
    const right = dx >= 0;
    return {
      sx: right ? s.x + s.w : s.x,
      sy: clamp(provSource.y, s.y + INSET, s.y + s.h - INSET),
      tx: right ? t.x : t.x + t.w,
      ty: clamp(provTarget.y, t.y + INSET, t.y + t.h - INSET),
      sourcePos: right ? Position.Right : Position.Left,
      targetPos: right ? Position.Left : Position.Right,
    };
  }

  // vertical run — keep provided X, flip top/bottom
  const down = dy >= 0;
  return {
    sx: clamp(provSource.x, s.x + INSET, s.x + s.w - INSET),
    sy: down ? s.y + s.h : s.y,
    tx: clamp(provTarget.x, t.x + INSET, t.x + t.w - INSET),
    ty: down ? t.y : t.y + t.h,
    sourcePos: down ? Position.Bottom : Position.Top,
    targetPos: down ? Position.Top : Position.Bottom,
  };
}
