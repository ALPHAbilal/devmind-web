"use client";

/**
 * BranchController — the "branch lessons" surface on a parent notebook.
 *
 * Three pieces, all driven by text selection over the rendered cells:
 *   1. Selection pill — floats near a selection; "⑂ Branch lesson" starts
 *      collect mode, "+ Add highlight" appends while collecting.
 *   2. Collect tray — bottom bar listing picked highlights (scattered picks
 *      are fine — each chip can jump to its cell), an intent note, Generate.
 *   3. Branch tints — when `branchesOn` (top-bar toggle), every stored
 *      highlight is tinted like a transparent highlighter directly over the
 *      text (CSS Custom Highlight API — no DOM mutation). One mini notebook =
 *      one unified color; overlaps blend. A small legend lists the mini
 *      notebooks; clicking a legend chip filters the tints to that one child.
 *      Clicking tinted text opens its mini notebook.
 *
 * Anchoring: highlights are stored as (cell_id, selected_text) and re-found
 * in the cell's DOM at render time (single text node — covers typical short
 * highlights). Text that can't be re-found (edited cell, Monaco
 * virtualization) simply doesn't tint; it still shows in the legend.
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

const MAX_COLORS = 4; // ::highlight(devmind-branch-0…3) + .legend-c0…c3

/* Minimal typings for the CSS Custom Highlight API (not yet in TS lib.dom). */
interface HighlightRegistry {
  set(name: string, highlight: unknown): void;
  delete(name: string): boolean;
}
declare const Highlight: { new (...ranges: Range[]): unknown };
function highlightRegistry(): HighlightRegistry | null {
  const css = globalThis.CSS as unknown as
    | { highlights?: HighlightRegistry }
    | undefined;
  return css?.highlights ?? null;
}

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
  const { missionId, branchesOn, toggleBranches } = useNotebook();

  const layerRef = useRef<HTMLDivElement>(null);

  // ── 1. Selection pill ────────────────────────────────────────────────────
  const [pill, setPill] = useState<{
    top: number;
    left: number;
    cellId: string;
    text: string;
  } | null>(null);
  const [collecting, setCollecting] = useState(false);

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
      const child = data.child_mission as {
        id: string;
        title: string;
        status: string;
      };
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

  // ── 3. Branch tints ──────────────────────────────────────────────────────
  const anchored = useMemo(
    () => highlights.filter((h) => h.child_mission_id),
    [highlights],
  );
  const childIds = useMemo(() => {
    const seen: string[] = [];
    for (const h of anchored) {
      const cid = h.child_mission_id as string;
      if (!seen.includes(cid)) seen.push(cid);
    }
    return seen;
  }, [anchored]);
  const colorByChild = useMemo(
    () =>
      Object.fromEntries(childIds.map((cid, i) => [cid, i % MAX_COLORS])),
    [childIds],
  );

  /** null = show all mini notebooks; otherwise only that child's tints. */
  const [filterChild, setFilterChild] = useState<string | null>(null);

  // Live ranges currently painted, so clicks can be resolved to a child.
  const paintedRef = useRef<Array<{ range: Range; childId: string }>>([]);

  const paintTints = useCallback(() => {
    const registry = highlightRegistry();
    if (!registry) return; // very old browser — legend still works
    for (let i = 0; i < MAX_COLORS; i++) registry.delete(`devmind-branch-${i}`);
    paintedRef.current = [];
    if (!branchesOn) return;

    const host = layerRef.current?.parentElement;
    if (!host) return;
    const byColor: Range[][] = Array.from({ length: MAX_COLORS }, () => []);
    for (const h of anchored) {
      const cid = h.child_mission_id as string;
      if (filterChild && cid !== filterChild) continue;
      const cellEl = host.querySelector<HTMLElement>(
        `[data-cell-id="${h.cell_id}"]`,
      );
      if (!cellEl) continue;
      const range = findTextRange(cellEl, h.selected_text);
      if (!range) continue;
      byColor[colorByChild[cid] ?? 0].push(range);
      paintedRef.current.push({ range, childId: cid });
    }
    byColor.forEach((ranges, i) => {
      if (ranges.length) {
        registry.set(`devmind-branch-${i}`, new Highlight(...ranges));
      }
    });
  }, [anchored, branchesOn, filterChild, colorByChild]);

  useEffect(() => {
    paintTints();
    // Re-paint after fonts/Monaco settle; ranges are live but cells re-render.
    const t = setTimeout(paintTints, 400);
    return () => clearTimeout(t);
  }, [paintTints]);

  // Cleanup on unmount.
  useEffect(
    () => () => {
      const registry = highlightRegistry();
      if (registry) {
        for (let i = 0; i < MAX_COLORS; i++) {
          registry.delete(`devmind-branch-${i}`);
        }
      }
    },
    [],
  );

  // Clicking tinted text opens its mini notebook.
  useEffect(() => {
    if (!branchesOn) return;
    function onClick(e: MouseEvent) {
      if (paintedRef.current.length === 0) return;
      const doc = document as Document & {
        caretRangeFromPoint?: (x: number, y: number) => Range | null;
      };
      const caret = doc.caretRangeFromPoint?.(e.clientX, e.clientY);
      if (!caret) return;
      for (const p of paintedRef.current) {
        if (p.range.isPointInRange(caret.startContainer, caret.startOffset)) {
          router.push(`/missions/${p.childId}`);
          return;
        }
      }
    }
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, [branchesOn, router]);

  return (
    <div className="branch-layer" ref={layerRef}>
      {/* Selection pill */}
      {pill ? (
        <div className="branch-pill" style={{ top: pill.top, left: pill.left }}>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={addPick}
          >
            {collecting ? "+ Add highlight" : "⑂ Branch lesson"}
          </button>
        </div>
      ) : null}

      {/* Branch panel — right-side surface (same family as the build stage).
          Open while browsing lessons (branchesOn) or while collecting. */}
      {branchesOn || collecting ? (
        <aside
          className="branch-panel"
          role="complementary"
          aria-label="Branch lessons"
        >
          <div className="branch-panel-bar">
            <span className="branch-panel-title">⑂ Branch lessons</span>
            <button
              type="button"
              className="branch-panel-close"
              onClick={() => {
                if (collecting) cancelCollect();
                if (branchesOn) toggleBranches();
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          <div className="branch-panel-body">
            {/* New branch lesson (collect mode) */}
            {collecting ? (
              <section className="branch-new">
                <div className="branch-section-head">New branch lesson</div>
                <p className="branch-new-hint">
                  Highlight more text anywhere in the notebook — every pick is
                  added here.
                </p>
                <div className="branch-picks">
                  {picks.map((p, i) => (
                    <div className="branch-pick" key={`${p.cellId}-${i}`}>
                      <button
                        type="button"
                        className="branch-pick-jump"
                        onClick={() => jumpToCell(p.cellId)}
                        title="Jump to highlight"
                      >
                        “{truncate(p.text, 60)}”
                      </button>
                      <button
                        type="button"
                        className="branch-pick-x"
                        onClick={() =>
                          setPicks((prev) => prev.filter((_, j) => j !== i))
                        }
                        aria-label="Remove highlight"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <textarea
                  className="branch-note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="What do you want to understand about these? (optional)"
                />
                <div className="branch-new-actions">
                  <button
                    type="button"
                    className="branch-cancel"
                    onClick={cancelCollect}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="branch-generate"
                    onClick={() => void generate()}
                    disabled={picks.length === 0 || generating}
                  >
                    {generating ? "Creating…" : "Generate lesson"}
                  </button>
                </div>
                {genError ? (
                  <div className="branch-error">{genError}</div>
                ) : null}
              </section>
            ) : null}

            {/* Existing mini notebooks */}
            {childIds.length > 0 ? (
              <section className="branch-list">
                <div className="branch-section-head">
                  In this notebook
                  {filterChild ? (
                    <button
                      type="button"
                      className="branch-showall"
                      onClick={() => setFilterChild(null)}
                    >
                      show all
                    </button>
                  ) : null}
                </div>
                {childIds.map((cid) => {
                  const child = childrenById[cid];
                  const active = filterChild === cid;
                  return (
                    <div
                      key={cid}
                      className={`branch-row legend-c${colorByChild[cid]}${
                        active ? " active" : ""
                      }${filterChild && !active ? " dim" : ""}`}
                    >
                      <button
                        type="button"
                        className="branch-row-main"
                        onClick={() => setFilterChild(active ? null : cid)}
                        title={
                          active
                            ? "Show all highlights"
                            : "Show only this lesson's highlights"
                        }
                      >
                        <span className="legend-dot" aria-hidden="true" />
                        <span className="branch-row-title">
                          {child?.title ?? "Branch lesson"}
                        </span>
                        {child?.status === "draft" ? (
                          <span className="legend-draft" title="Not written yet">
                            ✍️
                          </span>
                        ) : null}
                      </button>
                      <button
                        type="button"
                        className="legend-open"
                        onClick={() => router.push(`/missions/${cid}`)}
                        title="Open lesson"
                      >
                        →
                      </button>
                    </div>
                  );
                })}
                <p className="branch-list-hint">
                  Click a lesson to spotlight its highlights; click tinted text
                  to open its lesson.
                </p>
              </section>
            ) : !collecting ? (
              <p className="branch-empty">
                No branch lessons yet. Highlight any text in the notebook and
                choose “⑂ Branch lesson” to grow one.
              </p>
            ) : null}
          </div>
        </aside>
      ) : null}
    </div>
  );
}

/** Find a live Range for `needle` inside `root`'s text nodes. Single-node
 * matches only — text that can't be re-found simply doesn't tint. */
function findTextRange(root: HTMLElement, needle: string): Range | null {
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
      return range;
    }
  }
  return null;
}

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}
