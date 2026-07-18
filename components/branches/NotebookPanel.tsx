"use client";

/**
 * NotebookPanel — the parent notebook inside the branch workspace.
 *
 * Collapsed: a slim labeled rail. Open: the real notebook cells
 * (CellRenderer — same source of truth as the notebook page).
 *  • Selecting text floats an "Add highlight" pill (when picking is allowed).
 *  • The active branch's picks tint via the CSS Custom Highlight API.
 *  • Hovering a clipping pulses its text here (and scrolls it into view);
 *    when collapsed, the rail beacons instead.
 */
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { CellRenderer, type Cell } from "@/components/notebook/cells";
import { findTextRange, setHighlight, clearHighlight } from "./textRange";

export interface PulseTarget {
  cell_id: string;
  selected_text: string;
}

interface NotebookPanelProps {
  title: string;
  cells: Cell[];
  open: boolean;
  onOpen: () => void;
  onCollapse: () => void;
  /** picks of the active branch — tinted in the text */
  picks: PulseTarget[];
  /** clipping being hovered in the clips lane */
  pulse: PulseTarget | null;
  /** whether selecting text may add a highlight right now */
  canPick: boolean;
  onAddPick: (cellId: string, text: string) => void;
}

export const NotebookPanel = memo(function NotebookPanel({
  title,
  cells,
  open,
  onOpen,
  onCollapse,
  picks,
  pulse,
  canPick,
  onAddPick,
}: NotebookPanelProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const [pill, setPill] = useState<{
    x: number;
    y: number;
    cellId: string;
    text: string;
  } | null>(null);

  /* ── paint pick tints ──────────────────────────────────────────────────── */
  const paint = useCallback(() => {
    const root = surfaceRef.current;
    if (!root) return;
    const ranges: Range[] = [];
    for (const p of picks) {
      const cellEl = root.querySelector<HTMLElement>(
        `[data-cell-id="${p.cell_id}"]`,
      );
      if (!cellEl) continue;
      const range = findTextRange(cellEl, p.selected_text);
      if (range) ranges.push(range);
    }
    setHighlight("devmind-branch-picks", ranges);
  }, [picks]);

  useEffect(() => {
    paint();
    // Re-run after fonts/Monaco settle.
    const t = setTimeout(paint, 500);
    return () => clearTimeout(t);
  }, [paint, open]);

  /* ── pulse (clip hover) — scroll to it when open ───────────────────────── */
  useEffect(() => {
    const root = surfaceRef.current;
    if (!pulse || !root) {
      clearHighlight("devmind-branch-pulse");
      return;
    }
    const cellEl = root.querySelector<HTMLElement>(
      `[data-cell-id="${pulse.cell_id}"]`,
    );
    const range = cellEl ? findTextRange(cellEl, pulse.selected_text) : null;
    setHighlight("devmind-branch-pulse", range ? [range] : []);
    if (range && open) {
      const el =
        range.startContainer instanceof Element
          ? range.startContainer
          : range.startContainer.parentElement;
      el?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    return () => clearHighlight("devmind-branch-pulse");
  }, [pulse, open]);

  useEffect(
    () => () => {
      clearHighlight("devmind-branch-picks");
      clearHighlight("devmind-branch-pulse");
    },
    [],
  );

  /* ── selection → pill ──────────────────────────────────────────────────── */
  useEffect(() => {
    if (!canPick || !open) {
      setPill(null);
      return;
    }
    function onMouseUp(e: MouseEvent) {
      if ((e.target as HTMLElement | null)?.closest?.(".br-pill")) return;
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setPill(null);
          return;
        }
        const text = sel.toString().trim();
        if (text.length < 3) {
          setPill(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const anchorEl =
          range.commonAncestorContainer instanceof Element
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement;
        const cellEl = anchorEl?.closest<HTMLElement>("[data-cell-id]");
        if (!cellEl || !anchorEl?.closest("[data-branch-cells]")) {
          setPill(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        setPill({
          x: rect.left + rect.width / 2,
          y: Math.min(rect.bottom + 10, window.innerHeight - 64),
          cellId: cellEl.dataset.cellId as string,
          text,
        });
      });
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, [canPick, open]);

  const confirmPick = useCallback(() => {
    if (!pill) return;
    setPill(null);
    window.getSelection()?.removeAllRanges();
    onAddPick(pill.cellId, pill.text);
  }, [pill, onAddPick]);

  const railBeacon = !open && pulse !== null;

  return (
    <div className="br-nb">
      <button
        type="button"
        className={`br-rail${railBeacon ? " beacon" : ""}`}
        onClick={onOpen}
        aria-label="Open notebook"
      >
        <span>Notebook</span>
      </button>
      <div className="br-nb-inner">
        <div className="br-nb-bar">
          <span className="br-lane-h" style={{ padding: 0 }}>
            Notebook
          </span>
          <button type="button" className="br-collapse" onClick={onCollapse}>
            Collapse ⟨
          </button>
        </div>
        <div className="br-nb-surface" ref={surfaceRef}>
          <h1 className="br-nb-title">{title}</h1>
          <div data-branch-cells>
            {cells.map((cell) => (
              <div key={cell.id} data-cell-id={cell.id}>
                <CellRenderer cell={cell} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {pill ? (
        <div className="br-pill" style={{ left: pill.x, top: pill.y }}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={confirmPick}
          >
            ＋ Add highlight
          </button>
        </div>
      ) : null}
    </div>
  );
});
