"use client";

import { useMemo } from "react";
import "./concept-graph.css";

/* ─── Shapes (subset of notebook.spec_json) ──────────────────────────────── */

export interface ConceptNode {
  id: string;
  label: string;
}

/** Edges come as {from,to} per FILE_SCHEMAS, but tolerate {source,target}. */
export type ConceptEdge =
  | { from: string; to: string }
  | { source: string; target: string };

export interface ConceptGraphSpec {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
}

export interface CheckpointLite {
  id: string;
  n: number;
  concept_nodes: string[];
}

interface ConceptGraphProps {
  graph: ConceptGraphSpec;
  checkpoints: CheckpointLite[];
  /** Live current checkpoint id (from the session subscription in NotebookContent). */
  currentCheckpointId: string | null;
}

type NodeState = "current" | "mastered" | "locked";

/* ─── Layout constants (compact minimap) ────────────────────────────────── */
const PAD = 18;
const COL_GAP = 64;
const ROW_GAP = 52;
const R = 7;
const LABEL_H = 14;

function edgeEnds(e: ConceptEdge): [string, string] {
  return "from" in e ? [e.from, e.to] : [e.source, e.target];
}

/**
 * Assign each node a layer via longest-path layering (Kahn's algorithm). Nodes
 * caught in a cycle (shouldn't happen — spec guarantees a DAG) keep layer 0.
 */
function computeLayers(
  nodes: ConceptNode[],
  edges: ConceptEdge[],
): Map<string, number> {
  const ids = new Set(nodes.map((n) => n.id));
  const indeg = new Map<string, number>();
  const adj = new Map<string, string[]>();
  for (const n of nodes) {
    indeg.set(n.id, 0);
    adj.set(n.id, []);
  }
  for (const e of edges) {
    const [from, to] = edgeEnds(e);
    if (!ids.has(from) || !ids.has(to)) continue;
    adj.get(from)!.push(to);
    indeg.set(to, (indeg.get(to) ?? 0) + 1);
  }
  const layer = new Map<string, number>(nodes.map((n) => [n.id, 0]));
  const queue = nodes.filter((n) => (indeg.get(n.id) ?? 0) === 0).map((n) => n.id);
  while (queue.length) {
    const u = queue.shift()!;
    for (const v of adj.get(u) ?? []) {
      layer.set(v, Math.max(layer.get(v) ?? 0, (layer.get(u) ?? 0) + 1));
      const d = (indeg.get(v) ?? 0) - 1;
      indeg.set(v, d);
      if (d === 0) queue.push(v);
    }
  }
  return layer;
}

export function ConceptGraph({
  graph,
  checkpoints,
  currentCheckpointId,
}: ConceptGraphProps) {
  const { nodes, edges } = graph;

  const stateById = useMemo(() => {
    const current = checkpoints.find((c) => c.id === currentCheckpointId) ?? null;
    const currentN = current?.n ?? null;
    const currentSet = new Set(current?.concept_nodes ?? []);
    // Nodes belonging to any checkpoint that comes before the current one.
    const masteredSet = new Set<string>();
    if (currentN !== null) {
      for (const c of checkpoints) {
        if (c.n < currentN) c.concept_nodes.forEach((id) => masteredSet.add(id));
      }
    }
    const map = new Map<string, NodeState>();
    for (const n of nodes) {
      map.set(
        n.id,
        currentSet.has(n.id)
          ? "current"
          : masteredSet.has(n.id)
            ? "mastered"
            : "locked",
      );
    }
    return map;
  }, [nodes, checkpoints, currentCheckpointId]);

  const layout = useMemo(() => {
    const layer = computeLayers(nodes, edges);
    // Group node ids by layer, preserving spec order within a layer.
    const byLayer = new Map<number, string[]>();
    for (const n of nodes) {
      const l = layer.get(n.id) ?? 0;
      if (!byLayer.has(l)) byLayer.set(l, []);
      byLayer.get(l)!.push(n.id);
    }
    const layers = [...byLayer.keys()].sort((a, b) => a - b);
    const maxCols = Math.max(1, ...layers.map((l) => byLayer.get(l)!.length));
    const contentW = (maxCols - 1) * COL_GAP;
    const pos = new Map<string, { x: number; y: number }>();
    layers.forEach((l, rowIdx) => {
      const row = byLayer.get(l)!;
      const rowW = (row.length - 1) * COL_GAP;
      const startX = PAD + R + (contentW - rowW) / 2;
      row.forEach((id, i) => {
        pos.set(id, { x: startX + i * COL_GAP, y: PAD + R + rowIdx * ROW_GAP });
      });
    });
    const width = PAD * 2 + 2 * R + contentW;
    const height = PAD * 2 + 2 * R + (layers.length - 1) * ROW_GAP + LABEL_H;
    return { pos, width, height };
  }, [nodes, edges]);

  if (!nodes.length) return null;

  const labelById = new Map(nodes.map((n) => [n.id, n.label]));

  return (
    <aside className="concept-graph" aria-label="Concept map">
      <div className="cg-title">Concept map</div>
      <svg
        className="cg-svg"
        viewBox={`0 0 ${layout.width} ${layout.height}`}
        width={layout.width}
        height={layout.height}
        role="img"
      >
        {/* edges */}
        {edges.map((e, i) => {
          const [from, to] = edgeEnds(e);
          const a = layout.pos.get(from);
          const b = layout.pos.get(to);
          if (!a || !b) return null;
          return (
            <line
              key={`e${i}`}
              className="cg-edge"
              x1={a.x}
              y1={a.y}
              x2={b.x}
              y2={b.y}
            />
          );
        })}
        {/* nodes */}
        {nodes.map((n) => {
          const p = layout.pos.get(n.id);
          if (!p) return null;
          const state = stateById.get(n.id) ?? "locked";
          const short =
            n.label.length > 9 ? `${n.label.slice(0, 8)}…` : n.label;
          return (
            <g key={n.id} className={`cg-node cg-${state}`}>
              <title>{n.label}</title>
              <circle cx={p.x} cy={p.y} r={R} />
              <text className="cg-label" x={p.x} y={p.y + R + 11}>
                {short}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="cg-legend">
        <span className="cg-legend-item">
          <span className="cg-dot cg-current" /> Current
        </span>
        <span className="cg-legend-item">
          <span className="cg-dot cg-mastered" /> Mastered
        </span>
        <span className="cg-legend-item">
          <span className="cg-dot cg-locked" /> Upcoming
        </span>
      </div>
    </aside>
  );
}
