"use client";

/**
 * NotebookNode — the parent notebook as a canvas frame.
 *
 * Renders the real notebook cells (CellRenderer — same source of truth as the
 * notebook page) inside a draggable frame. Stored highlights tint via the CSS
 * Custom Highlight API (no DOM mutation), pending picks glow in the pending
 * color, and each road gets a source Handle positioned at the vertical offset
 * of its first highlight so its wire leaves the frame at the source text.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import {
  Handle,
  Position,
  useReactFlow,
  useUpdateNodeInternals,
  type NodeProps,
  type Node,
} from "@xyflow/react";
import { FileText } from "lucide-react";
import { CellRenderer, type Cell } from "@/components/notebook/cells";
import { findTextRange, setHighlight, clearHighlight } from "./textRange";

export interface NotebookRoadAnchor {
  sessionId: string;
  color: number; // palette slot 0..3
  picks: Array<{ cell_id: string; selected_text: string }>;
}

export type NotebookNodeType = Node<
  {
    title: string;
    cellCount: number;
    branchCount: number;
    cells: Cell[];
    roads: NotebookRoadAnchor[];
    /** live picks of an in-flight road (pending color) */
    pending: Array<{ cell_id: string; selected_text: string }>;
    pendingSessionId: string | null;
    /** pick currently hovered in a road card — pulses in the text */
    pulsePick: { cell_id: string; selected_text: string } | null;
    hotRoad: string | null;
    /** Reports which roads have a measured wire anchor, so the canvas only
     *  draws highlight edges whose source handle actually exists. */
    onHandlesMeasured?: (sessionIds: string[]) => void;
  },
  "notebook"
>;

const MAX_COLORS = 4;

export const NotebookNode = memo(function NotebookNode({
  id,
  data,
}: NodeProps<NotebookNodeType>) {
  const rootRef = useRef<HTMLDivElement>(null);
  const { getZoom } = useReactFlow();
  const updateNodeInternals = useUpdateNodeInternals();
  const [handleTops, setHandleTops] = useState<Record<string, number>>({});

  /** Paint all tints + measure per-road handle positions. */
  const paint = useCallback(() => {
    const root = rootRef.current;
    if (!root) return;
    const zoom = getZoom() || 1;
    const rootTop = root.getBoundingClientRect().top;
    const tops: Record<string, number> = {};

    const byColor: Range[][] = Array.from({ length: MAX_COLORS }, () => []);
    for (const road of data.roads) {
      const dim = data.hotRoad !== null && data.hotRoad !== road.sessionId;
      let firstTop: number | null = null;
      for (const p of road.picks) {
        const cellEl = root.querySelector<HTMLElement>(
          `[data-cell-id="${p.cell_id}"]`,
        );
        if (!cellEl) continue;
        const range = findTextRange(cellEl, p.selected_text);
        if (!range) continue;
        if (!dim) byColor[road.color % MAX_COLORS].push(range);
        if (firstTop === null) {
          firstTop =
            (range.getBoundingClientRect().top - rootTop) / zoom + 10;
        }
      }
      if (firstTop !== null) tops[road.sessionId] = firstTop;
    }
    byColor.forEach((ranges, i) => setHighlight(`devmind-canvas-road-${i}`, ranges));

    // Pending (in-flight) picks.
    const pendingRanges: Range[] = [];
    let pendingTop: number | null = null;
    for (const p of data.pending) {
      const cellEl = root.querySelector<HTMLElement>(
        `[data-cell-id="${p.cell_id}"]`,
      );
      if (!cellEl) continue;
      const range = findTextRange(cellEl, p.selected_text);
      if (!range) continue;
      pendingRanges.push(range);
      if (pendingTop === null) {
        pendingTop = (range.getBoundingClientRect().top - rootTop) / zoom + 10;
      }
    }
    setHighlight("devmind-canvas-pending", pendingRanges);
    if (data.pendingSessionId && pendingTop !== null) {
      tops[data.pendingSessionId] = pendingTop;
    }

    // Pulse (row-hover cross-light).
    if (data.pulsePick) {
      const cellEl = root.querySelector<HTMLElement>(
        `[data-cell-id="${data.pulsePick.cell_id}"]`,
      );
      const range = cellEl
        ? findTextRange(cellEl, data.pulsePick.selected_text)
        : null;
      setHighlight("devmind-canvas-pulse", range ? [range] : []);
    } else {
      clearHighlight("devmind-canvas-pulse");
    }

    setHandleTops((prev) => {
      const same =
        Object.keys(prev).length === Object.keys(tops).length &&
        Object.entries(tops).every(([k, v]) => Math.abs((prev[k] ?? -1) - v) < 1);
      return same ? prev : tops;
    });
    data.onHandlesMeasured?.(Object.keys(tops));
  }, [data, getZoom]);

  useEffect(() => {
    paint();
    // Re-run after fonts/Monaco settle.
    const t = setTimeout(paint, 500);
    const t2 = setTimeout(paint, 1500);
    return () => {
      clearTimeout(t);
      clearTimeout(t2);
    };
  }, [paint]);

  useEffect(() => {
    updateNodeInternals(id);
  }, [handleTops, id, updateNodeInternals]);

  useEffect(
    () => () => {
      for (let i = 0; i < MAX_COLORS; i++) clearHighlight(`devmind-canvas-road-${i}`);
      clearHighlight("devmind-canvas-pending");
      clearHighlight("devmind-canvas-pulse");
    },
    [],
  );

  return (
    <div className="cv-frame cv-notebook" ref={rootRef}>
      <div className="cv-frame-tab canvas-frame-tab">
        <FileText size={11} strokeWidth={2} aria-hidden />
        <span>Parent notebook</span>
        <span className="cv-tag">{data.cellCount} cells</span>
      </div>
      <div className="cv-nb-inner nodrag">
        <h1 className="cv-nb-title">{data.title}</h1>
        <div className="cv-nb-meta">
          Mission notebook
          {data.branchCount > 0 ? (
            <>
              {" · "}
              <b>
                {data.branchCount} branch lesson{data.branchCount === 1 ? "" : "s"}
              </b>{" "}
              grown from this page
            </>
          ) : null}
        </div>
        <div className="cv-nb-cells" data-canvas-cells>
          {data.cells.map((cell) => (
            <div key={cell.id} data-cell-id={cell.id}>
              <CellRenderer cell={cell} />
            </div>
          ))}
        </div>
      </div>
      {Object.entries(handleTops).map(([sessionId, top]) => (
        <Handle
          key={sessionId}
          type="source"
          position={Position.Right}
          id={`road-${sessionId}`}
          style={{ top }}
          className="cv-handle"
          isConnectable={false}
        />
      ))}
    </div>
  );
});
