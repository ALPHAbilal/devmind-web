/**
 * smartPath — grid A* connector routing in React Flow coordinate space.
 *
 * Ported from the canvas_inspirations demo (the react-flow-smart-edge
 * algorithm): wires bend AROUND node rects instead of cutting through them.
 * Pure + framework-free so it can be memoised inside the custom edge.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Side = "left" | "right" | "top" | "bottom";

const CELL = 20; // routing-grid resolution, flow px
const PAD = 22; // clearance kept from every card
const RADIUS = 12; // corner rounding
const TURN = 0.8; // per-turn cost — favours long straight runs
const MAX_NODES_EXPANDED = 40000;

const DIRS: ReadonlyArray<readonly [number, number]> = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];
const SIDE_VEC: Record<Side, readonly [number, number]> = {
  right: [1, 0],
  left: [-1, 0],
  top: [0, -1],
  bottom: [0, 1],
};

/** Tiny binary heap keyed by the first tuple element (f-score). */
class Heap {
  private a: Array<[number, number]> = [];
  get size(): number {
    return this.a.length;
  }
  push(x: [number, number]): void {
    const a = this.a;
    a.push(x);
    let i = a.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (a[p][0] <= a[i][0]) break;
      [a[p], a[i]] = [a[i], a[p]];
      i = p;
    }
  }
  pop(): [number, number] {
    const a = this.a;
    const top = a[0];
    const last = a.pop() as [number, number];
    if (a.length) {
      a[0] = last;
      let i = 0;
      for (;;) {
        let m = i;
        const l = 2 * i + 1;
        const r = l + 1;
        if (l < a.length && a[l][0] < a[m][0]) m = l;
        if (r < a.length && a[r][0] < a[m][0]) m = r;
        if (m === i) break;
        [a[i], a[m]] = [a[m], a[i]];
        i = m;
      }
    }
    return top;
  }
}

interface GridCell {
  c: number;
  r: number;
}

/* A* over the grid; a state is (cell, incoming-direction) so turns cost extra
   and the route prefers long straight runs. */
function astar(
  blocked: Uint8Array,
  cols: number,
  rows: number,
  s: GridCell,
  e: GridCell,
): GridCell[] | null {
  const key = (c: number, r: number, d: number) => ((r * cols + c) << 2) | d;
  const gs = new Map<number, number>();
  const prev = new Map<number, number | null>();
  const open = new Heap();
  const hx = (c: number, r: number) => Math.abs(c - e.c) + Math.abs(r - e.r);

  for (let d = 0; d < 4; d++) {
    const c = s.c + DIRS[d][0];
    const r = s.r + DIRS[d][1];
    if (c < 0 || c >= cols || r < 0 || r >= rows || blocked[r * cols + c]) continue;
    const k = key(c, r, d);
    gs.set(k, 1);
    prev.set(k, null);
    open.push([1 + hx(c, r), k]);
  }

  let goal: number | null = null;
  let guard = 0;
  while (open.size && guard++ < MAX_NODES_EXPANDED) {
    const [f, k] = open.pop();
    const d = k & 3;
    const cell = k >> 2;
    const c = cell % cols;
    const r = (cell - c) / cols;
    const g = gs.get(k) as number;
    if (f > g + hx(c, r) + 1e-6) continue; // stale heap entry
    if (c === e.c && r === e.r) {
      goal = k;
      break;
    }
    for (let nd = 0; nd < 4; nd++) {
      const nc = c + DIRS[nd][0];
      const nr = r + DIRS[nd][1];
      if (nc < 0 || nc >= cols || nr < 0 || nr >= rows || blocked[nr * cols + nc])
        continue;
      const nk = key(nc, nr, nd);
      const ng = g + 1 + (nd === d ? 0 : TURN);
      if (ng < (gs.get(nk) ?? Infinity) - 1e-9) {
        gs.set(nk, ng);
        prev.set(nk, k);
        open.push([ng + hx(nc, nr), nk]);
      }
    }
  }

  if (goal == null) return null;
  const out: GridCell[] = [];
  for (let k: number | null = goal; k != null; k = prev.get(k) ?? null) {
    const cell = k >> 2;
    const c = cell % cols;
    out.push({ c, r: (cell - c) / cols });
  }
  out.push(s);
  return out.reverse();
}

/** keep only the corners of an orthogonal grid path */
function corners(pts: GridCell[]): GridCell[] {
  if (pts.length < 3) return pts;
  const out = [pts[0]];
  for (let i = 1; i < pts.length - 1; i++) {
    const a = pts[i - 1];
    const b = pts[i];
    const c = pts[i + 1];
    if (b.c - a.c !== c.c - b.c || b.r - a.r !== c.r - b.r) out.push(b);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

interface Pt {
  x: number;
  y: number;
}

/** orthogonal polyline → SVG path with rounded corners */
function roundedPath(pts: Pt[]): string {
  let d = `M ${pts[0].x} ${pts[0].y}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i];
    const a = pts[i - 1];
    const b = pts[i + 1];
    const da = Math.hypot(p.x - a.x, p.y - a.y);
    const db = Math.hypot(b.x - p.x, b.y - p.y);
    if (da < 0.5 || db < 0.5) continue;
    const r = Math.min(RADIUS, da / 2, db / 2);
    const p1 = { x: p.x - ((p.x - a.x) / da) * r, y: p.y - ((p.y - a.y) / da) * r };
    const p2 = { x: p.x + ((b.x - p.x) / db) * r, y: p.y + ((b.y - p.y) / db) * r };
    d += ` L ${p1.x.toFixed(1)} ${p1.y.toFixed(1)} Q ${p.x.toFixed(1)} ${p.y.toFixed(
      1,
    )} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
  }
  const l = pts[pts.length - 1];
  d += ` L ${l.x} ${l.y}`;
  return d;
}

/** step outward from an anchor until we exit the inflated card rects */
function freeCell(
  p: Pt,
  side: Side,
  blocked: Uint8Array,
  cols: number,
  rows: number,
  originX: number,
  originY: number,
): GridCell | null {
  const v = SIDE_VEC[side];
  let c = Math.round((p.x - originX) / CELL);
  let r = Math.round((p.y - originY) / CELL);
  for (let i = 0; i < 60; i++) {
    if (c >= 0 && c < cols && r >= 0 && r < rows && !blocked[r * cols + c])
      return { c, r };
    c += v[0];
    r += v[1];
  }
  return null;
}

export interface SmartPathInput {
  source: Pt;
  target: Pt;
  sourceSide: Side;
  targetSide: Side;
  /** obstacle rects — source & target nodes must already be excluded */
  obstacles: Rect[];
}

/**
 * Route an orthogonal, obstacle-avoiding path from source to target.
 * Returns an SVG path string, or null when no route exists (caller should
 * fall back to a bezier).
 */
export function smartPath({
  source,
  target,
  sourceSide,
  targetSide,
  obstacles,
}: SmartPathInput): string | null {
  // grid bounds: union of endpoints + inflated obstacles, with margin
  let minX = Math.min(source.x, target.x);
  let minY = Math.min(source.y, target.y);
  let maxX = Math.max(source.x, target.x);
  let maxY = Math.max(source.y, target.y);
  for (const o of obstacles) {
    minX = Math.min(minX, o.x - PAD);
    minY = Math.min(minY, o.y - PAD);
    maxX = Math.max(maxX, o.x + o.w + PAD);
    maxY = Math.max(maxY, o.y + o.h + PAD);
  }
  const margin = CELL * 4;
  const originX = minX - margin;
  const originY = minY - margin;
  const cols = Math.ceil((maxX - minX + margin * 2) / CELL) + 1;
  const rows = Math.ceil((maxY - minY + margin * 2) / CELL) + 1;
  if (cols <= 0 || rows <= 0 || cols * rows > 1_500_000) return null;

  const blocked = new Uint8Array(cols * rows);
  for (const o of obstacles) {
    const c0 = Math.max(0, Math.floor((o.x - PAD - originX) / CELL));
    const c1 = Math.min(cols - 1, Math.ceil((o.x + o.w + PAD - originX) / CELL));
    const r0 = Math.max(0, Math.floor((o.y - PAD - originY) / CELL));
    const r1 = Math.min(rows - 1, Math.ceil((o.y + o.h + PAD - originY) / CELL));
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) blocked[r * cols + c] = 1;
  }

  const s = freeCell(source, sourceSide, blocked, cols, rows, originX, originY);
  const e = freeCell(target, targetSide, blocked, cols, rows, originX, originY);
  if (!s || !e) return null;

  const grid = astar(blocked, cols, rows, s, e);
  if (!grid) return null;

  const pts: Pt[] = [
    source,
    ...corners(grid).map((p) => ({
      x: originX + p.c * CELL,
      y: originY + p.r * CELL,
    })),
    target,
  ];
  return roundedPath(pts);
}
