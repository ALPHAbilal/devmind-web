"use client";

/**
 * BranchController — the "branch lessons" surface on a parent notebook.
 *
 * Three pieces, all driven by text selection over the rendered cells:
 *   1. Selection pill — floats near a selection; "⑂ Branch lesson" starts
 *      collect mode, "+ Add highlight" appends while collecting.
 *   2. Collect tray — bottom bar listing picked highlights (scattered picks
 *      are fine — each chip can jump to its cell), an intent note, Generate.
 *   3. Vein markers — when `branchesOn` (top-bar toggle), a ⑂ anchor appears
 *      at every stored highlight. Anchors of the same child share a color;
 *      hovering shows the child + ALL its sibling anchors with jump links.
 *
 * Anchoring strategy: highlights are stored as (cell_id, selected_text). At
 * render time we re-find the text inside the cell's DOM (single text node —
 * covers typical short highlights); if not found (edited cell, Monaco
 * virtualization) the marker falls back to the cell's top-right corner.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { useNotebook } from "../NotebookProvider";
import "./branch.css";

export interface BranchHighlight {
  id: string;
  cell_id: string;
  selected_text: string;
  child_mission_id: string | null;
}

export interface BranchChild {
  id: string;
  title: string;
  status: string;
}

interface Pick {
  cellId: string;
  text: string;
}

interface Marker {
  highlightId: string;
  childId: string;
  top: number;
  left: number;
  colorIdx: number;
}

const MAX_COLORS = 4; // .vein-c0 … .vein-c3 in branch.css

export function BranchController({
  highlights,
  childrenById,
  onCreated,
}: {
  highlights: BranchHighlight[];
  childrenById: Record<string, BranchChild>;
  onCreated: (child: BranchChild, created: BranchHighlight[]) => void;
}) {
  const router = useRouter();
  const { missionId, branchesOn } = useNotebook();

  const layerRef = useRef<HTMLDivElement>(null);

  // ── 1. Selection pill ────────────────────────────────────────────────────
  const [pill, setPill] = useState<{
    top: number;
    left: number;
    cellId: string;
    text: string;
  } | null>(null);
  const [collecting, setCollecting] = useState(false);
  const collectingRef = useRef(collecting);
  collectingRef.current = collecting;

  useEffect(() => {
    function onMouseUp() {
      // Defer so the browser has settled the selection.
      requestAnimationFrame(() => {
        const layer = layerRef.current;
        const sel = window.getSelection();
        if (!layer || !sel || sel.isCollapsed || sel.rangeCount === 0) {
          setPill(null);
          return;
        }
        const text = sel.toString().trim();
        if (!text || text.length < 2) {
          setPill(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const anchorEl =
          range.commonAncestorContainer instanceof Element
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement;
        const cellEl = anchorEl?.closest<HTMLElement>("[data-cell-id]");
        // Only cells in THIS notebook column (not the build stage / puzzle).
        if (!cellEl || !layer.parentElement?.contains(cellEl)) {
          setPill(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        const layerRect = layer.getBoundingClientRect();
        setPill({
          top: rect.bottom - layerRect.top + 6,
          left: Math.max(
            0,
            Math.min(
              rect.left + rect.width / 2 - layerRect.left,
              layerRect.width - 40,
            ),
          ),
          cellId: cellEl.dataset.cellId as string,
          text,
        });
      });
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  // ── 2. Collect mode ──────────────────────────────────────────────────────
  const [picks, setPicks] = useState<Pick[]>([]);
  const [note, setNote] = useState("");
  const [generating, setGenerating] = useState(false);
  const [genError, setGenError] = useState<string | null>(null);

  const addPick = useCallback(() => {
    if (!pill) return;
    setPicks((prev) =>
      prev.some((p) => p.cellId === pill.cellId && p.text === pill.text)
        ? prev
        : [...prev, { cellId: pill.cellId, text: pill.text }],
    );
    setCollecting(true);
    setPill(null);
    window.getSelection()?.removeAllRanges();
  }, [pill]);

  const cancelCollect = useCallback(() => {
    setCollecting(false);
    setPicks([]);
    setNote("");
    setGenError(null);
  }, []);

  const jumpToCell = useCallback((cellId: string) => {
    document
      .querySelector(`[data-cell-id="${cellId}"]`)
      ?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, []);

  const generate = useCallback(async () => {
    if (picks.length === 0 || generating) return;
    setGenerating(true);
    setGenError(null);
    try {
      const res = await fetch("/api/branches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_mission_id: missionId,
          note,
          highlights: picks.map((p) => ({ cell_id: p.cellId, text: p.text })),
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setGenError(data?.error?.message ?? `Failed (${res.status})`);
        return;
      }
      const child = data.child_mission as { id: string; title: string; status: string };
      onCreated(
        { id: child.id, title: child.title, status: child.status },
        (data.highlights as BranchHighlight[]) ?? [],
      );
      cancelCollect();
    } catch (err) {
      setGenError(err instanceof Error ? err.message : "Network error");
    } finally {
      setGenerating(false);
    }
  }, [picks, note, generating, missionId, onCreated, cancelCollect]);

  // ── 3. Vein markers ──────────────────────────────────────────────────────
  const anchored = useMemo(
    () => highlights.filter((h) => h.child_mission_id),
    [highlights],
  );
  const colorByChild = useMemo(() => {
    const map: Record<string, number> = {};
    let i = 0;
    for (const h of anchored) {
      const cid = h.child_mission_id as string;
      if (!(cid in map)) map[cid] = i++ % MAX_COLORS;
    }
    return map;
  }, [anchored]);

  const [markers, setMarkers] = useState<Marker[]>([]);
  const [hovered, setHovered] = useState<string | null>(null); // child id

  const layoutMarkers = useCallback(() => {
    const layer = layerRef.current;
    if (!layer || !branchesOn) {
      setMarkers([]);
      return;
    }
    const layerRect = layer.getBoundingClientRect();
    const host = layer.parentElement as HTMLElement;
    const next: Marker[] = [];
    for (const h of anchored) {
      const cellEl = host.querySelector<HTMLElement>(
        `[data-cell-id="${h.cell_id}"]`,
      );
      if (!cellEl) continue;
      const rect = findTextRect(cellEl, h.selected_text) ?? cellEl.getBoundingClientRect();
      next.push({
        highlightId: h.id,
        childId: h.child_mission_id as string,
        top: rect.top - layerRect.top,
        left: rect.right - layerRect.left + 6,
        colorIdx: colorByChild[h.child_mission_id as string] ?? 0,
      });
    }
    setMarkers(next);
  }, [anchored, branchesOn, colorByChild]);

  useEffect(() => {
    layoutMarkers();
    if (!branchesOn) return;
    // Re-measure after fonts/Monaco settle, and on resize.
    const t = setTimeout(layoutMarkers, 400);
    window.addEventListener("resize", layoutMarkers);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", layoutMarkers);
    };
  }, [layoutMarkers, branchesOn]);

  const hoveredChild = hovered ? childrenById[hovered] : null;
  const hoveredSiblings = useMemo(
    () => (hovered ? anchored.filter((h) => h.child_mission_id === hovered) : []),
    [hovered, anchored],
  );
  const hoveredMarker = useMemo(
    () => markers.find((m) => m.childId === hovered) ?? null,
    [markers, hovered],
  );

  return (
    <div className="branch-layer" ref={layerRef} aria-hidden={false}>
      {/* Selection pill */}
      {pill ? (
        <div className="branch-pill" style={{ top: pill.top, left: pill.left }}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={addPick}>
            {collecting ? "+ Add highlight" : "⑂ Branch lesson"}
          </button>
        </div>
      ) : null}

      {/* Vein markers */}
      {markers.map((m) => (
        <button
          key={m.highlightId}
          type="button"
          className={`vein-marker vein-c${m.colorIdx}${
            hovered === m.childId ? " lit" : ""
          }`}
          style={{ top: m.top, left: m.left }}
          onMouseEnter={() => setHovered(m.childId)}
          onMouseLeave={() => setHovered(null)}
          onClick={() => router.push(`/missions/${m.childId}`)}
          aria-label="Open branch lesson"
        >
          ⑂
        </button>
      ))}

      {/* Marker tooltip — one per hovered child, near its first marker */}
      {hoveredChild && hoveredMarker ? (
        <div
          className="vein-tip"
          style={{ top: hoveredMarker.top + 24, left: hoveredMarker.left }}
          onMouseEnter={() => setHovered(hoveredChild.id)}
          onMouseLeave={() => setHovered(null)}
        >
          <div className="vein-tip-title">
            ⑂ {hoveredChild.title}
            {hoveredChild.status === "draft" ? (
              <span className="vein-tip-status">✍️ not written yet</span>
            ) : null}
          </div>
          <div className="vein-tip-sub">
            {hoveredSiblings.length} highlight
            {hoveredSiblings.length > 1 ? "s" : ""} feed this lesson:
          </div>
          <ul className="vein-tip-list">
            {hoveredSiblings.map((h) => (
              <li key={h.id}>
                <button type="button" onClick={() => jumpToCell(h.cell_id)}>
                  “{truncate(h.selected_text, 40)}”
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="vein-tip-open"
            onClick={() => router.push(`/missions/${hoveredChild.id}`)}
          >
            Open lesson →
          </button>
        </div>
      ) : null}

      {/* Collect tray */}
      {collecting ? (
        <div className="branch-tray" role="dialog" aria-label="New branch lesson">
          <div className="branch-tray-head">
            <span className="branch-tray-title">⑂ New branch lesson</span>
            <span className="branch-tray-hint">
              highlight more text anywhere to add it
            </span>
            <button
              type="button"
              className="branch-tray-close"
              onClick={cancelCollect}
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
          <div className="branch-chips">
            {picks.map((p, i) => (
              <span className="branch-chip" key={`${p.cellId}-${i}`}>
                <button
                  type="button"
                  className="branch-chip-jump"
                  onClick={() => jumpToCell(p.cellId)}
                  title="Jump to highlight"
                >
                  “{truncate(p.text, 32)}”
                </button>
                <button
                  type="button"
                  className="branch-chip-x"
                  onClick={() =>
                    setPicks((prev) => prev.filter((_, j) => j !== i))
                  }
                  aria-label="Remove highlight"
                >
                  ✕
                </button>
              </span>
            ))}
          </div>
          <div className="branch-tray-row">
            <input
              type="text"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What do you want to understand about these? (optional)"
            />
            <button
              type="button"
              className="branch-generate"
              onClick={() => void generate()}
              disabled={picks.length === 0 || generating}
            >
              {generating ? "Creating…" : "Generate"}
            </button>
          </div>
          {genError ? <div className="branch-error">{genError}</div> : null}
        </div>
      ) : null}
    </div>
  );
}

/** Find the bounding rect of `needle` inside `root`'s text nodes. Single-node
 * matches only — multi-node spans fall back to the cell rect upstream. */
function findTextRect(root: HTMLElement, needle: string): DOMRect | null {
  const target = needle.trim();
  if (!target) return null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const idx = node.textContent?.indexOf(target) ?? -1;
    if (idx >= 0) {
      const range = document.createRange();
      range.setStart(node, idx);
      range.setEnd(node, idx + target.length);
      return range.getBoundingClientRect();
    }
  }
  return null;
}

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}
