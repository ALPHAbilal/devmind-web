"use client";

import {
  Fragment,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  useRealtimeChannel,
  type RealtimeChangePayload,
} from "@/lib/realtime";
import { CellRenderer, type CellMeta } from "./cells";
import type { Cell } from "./cells";
import { outputIsFailure } from "./cells/OutputCell";
import { createClient } from "@/lib/supabase/client";
import { SeamAsk } from "./SeamAsk";
import { Thread } from "./Thread";
import { useNotebook, type Puzzle } from "./NotebookProvider";
import { PuzzlePane } from "@/components/puzzle/PuzzlePane";
import { BuildStage } from "./build/BuildStage";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { SessionControl } from "./SessionControl";
import type {
  ConceptGraphSpec,
  CheckpointLite,
} from "@/components/sidebar/ConceptGraph";
import type { Tables } from "@/lib/supabase/types";
import "./notebook-content.css";

/** Parked shape — the learning_sessions table is dropped until the real
 * backend lands. Local type keeps the session-driven UI paths compiling;
 * `session` stays null at runtime for now. */
type LearningSession = {
  status: "active" | "paused" | "completed";
  state_json: Tables<"notebooks">["spec_json"];
};

interface NotebookContentProps {
  notebookId: string;
  currentCheckpointId: string | null;
  initialCells: Cell[];
  initialState: LearningSession | null;
  /** notebook.spec_json.concept_graph — null when the spec has none. */
  conceptGraph: ConceptGraphSpec | null;
  /** Trimmed notebook.spec_json.checkpoints, for node mastery coloring. */
  checkpoints: CheckpointLite[];
  /** notebook.spec_json.title — shown in the warm opening state. */
  notebookTitle?: string | null;
  /** Set when THIS notebook is a child — renders the back-crumb and disables
   *  further branching (one depth only). */
  parentNotebook?: { id: string; title: string } | null;
  /** Active puzzle at SSR time — reopens the pane after a reload. */
  initialPuzzle?: Puzzle | null;
}

/**
 * Live notebook renderer. SSR seeds initial cells + session; client subscribes
 * to Realtime on cells + learning_sessions. New rows merge into local
 * state (INSERT may arrive out of order so we re-sort by `ord`).
 *
 * Beyond rendering, this component:
 *   - Forwards session activity to NotebookContext so ChatBar can enable.
 *   - Mounts <SeamAsk /> between cells; when SeamAsk opens a thread,
 *     <Thread /> is rendered inline below the anchor cell.
 *   - Derives `hintPending` for output cells from the session's failure-streak
 *     counters in state_json (best-effort — Lane L owns the canonical shape).
 *   - Auto-scrolls on cell append, but only when the user is already near the
 *     bottom — so reading earlier cells isn't disrupted.
 */
export function NotebookContent({
  notebookId,
  currentCheckpointId,
  initialCells,
  initialState,
  notebookTitle,
  parentNotebook = null,
  initialPuzzle = null,
}: NotebookContentProps) {
  const {
    setSessionActive,
    notifyAgentReply,
    puzzle,
    setPuzzle,
    setCurrentMicroChallengeId,
    stageOpen,
    stageExpanded,
    openStage,
    closeStage,
  } = useNotebook();

  const [cells, setCells] = useState<Cell[]>(initialCells);
  const [session] = useState<LearningSession | null>(initialState);
  /** thread_id -> anchor cell_id, for inline thread mounts opened via SeamAsk. */
  const [openThreadsByCell, setOpenThreadsByCell] = useState<
    Record<string, string[]>
  >({});

  const cellsContainerRef = useRef<HTMLDivElement>(null);

  // Cells present at first render (SSR-seeded). Only cells whose ids are NOT in
  // this set get the reveal animation — a returning, already-written notebook
  // renders instantly with no re-animation.
  const initialCellIdsRef = useRef<Set<string>>(
    new Set(initialCells.map((c) => c.id)),
  );

  // Push initial session-active state into context once on mount + whenever it changes.
  useEffect(() => {
    setSessionActive(Boolean(session && session.status === "active"));
  }, [session, setSessionActive]);

  // Seed the SSR-loaded active puzzle once; Realtime takes over from there.
  useEffect(() => {
    if (initialPuzzle) setPuzzle(initialPuzzle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Puzzle mode trigger ──────────────────────────────────────────────────
  // Puzzle mode activates itself: three failed runs of the same code cell in
  // a row open a puzzle anchored to it. From there the flow is agent-driven.
  // Streaks are per-visit; a passing run resets its cell's streak.
  const failStreaks = useRef<Map<string, number>>(new Map());
  const puzzleOpening = useRef(false);
  const supabaseRef = useRef(createClient());

  const maybeOpenPuzzle = useCallback(
    async (codeCellId: string, outputCellId: string) => {
      if (puzzle || puzzleOpening.current) return;
      puzzleOpening.current = true;
      try {
        const supabase = supabaseRef.current;
        const { data: userData } = await supabase.auth.getUser();
        const uid = userData.user?.id;
        if (!uid) return;
        const { data } = await supabase
          .from("puzzles")
          .insert({
            notebook_id: notebookId,
            user_id: uid,
            // stand-in id until the agent layer names real challenges
            micro_challenge_id: codeCellId,
            anchor: { cell_id: codeCellId, output_cell_id: outputCellId },
            framing_text:
              "Three runs in a row failed here. Time to debug it properly — step by step.",
          } as never)
          .select("*")
          .single();
        if (data) setPuzzle(data as Puzzle);
      } finally {
        puzzleOpening.current = false;
      }
    },
    [puzzle, notebookId, setPuzzle],
  );

  const trackRunResult = useCallback(
    (cell: Cell) => {
      if (cell.kind !== "output" || !cell.attached_to) return;
      const key = cell.attached_to;
      if (outputIsFailure(cell.content, cell.exit_code)) {
        const n = (failStreaks.current.get(key) ?? 0) + 1;
        failStreaks.current.set(key, n);
        if (n >= 3) {
          failStreaks.current.set(key, 0);
          void maybeOpenPuzzle(key, cell.id);
        }
      } else {
        failStreaks.current.set(key, 0);
      }
    },
    [maybeOpenPuzzle],
  );

  const onCellChange = useCallback(
    (payload: RealtimeChangePayload<Cell>) => {
      setCells((prev) => {
        switch (payload.eventType) {
          case "INSERT": {
            const next = prev.some((c) => c.id === payload.new.id)
              ? prev
              : [...prev, payload.new];
            return [...next].sort((a, b) => a.ord - b.ord);
          }
          case "UPDATE":
            return prev
              .map((c) => (c.id === payload.new.id ? payload.new : c))
              .sort((a, b) => a.ord - b.ord);
          case "DELETE":
            return prev.filter((c) => c.id !== payload.old.id);
          default:
            return prev;
        }
      });
      if (payload.eventType === "INSERT") {
        notifyAgentReply();
        trackRunResult(payload.new);
      }
    },
    [notifyAgentReply, trackRunResult],
  );

  useRealtimeChannel<Cell>(
    "cells",
    { filter: { column: "notebook_id", value: notebookId } },
    onCellChange,
    [notebookId],
  );

  const onPuzzleChange = useCallback(
    (payload: RealtimeChangePayload<Puzzle>) => {
      if (payload.eventType === "DELETE") {
        setPuzzle(null);
        return;
      }
      setPuzzle(payload.new);
    },
    [setPuzzle],
  );

  useRealtimeChannel<Puzzle>(
    "puzzles",
    { filter: { column: "notebook_id", value: notebookId } },
    onPuzzleChange,
    [notebookId],
  );

  // Derive current micro-challenge id from session.state_json so StuckButton
  // can pass it to /api/puzzle/open without an extra round-trip. Picks the
  // first non-passed micro within the active checkpoint.
  useEffect(() => {
    const state = session?.state_json as
      | {
          current_checkpoint_id?: string | null;
          checkpoints?: Record<
            string,
            {
              micro_challenges?: Record<string, { status?: string }>;
            }
          >;
        }
      | null
      | undefined;
    const ckId = state?.current_checkpoint_id ?? null;
    if (!ckId) {
      setCurrentMicroChallengeId(null);
      return;
    }
    const micros = state?.checkpoints?.[ckId]?.micro_challenges ?? {};
    const next =
      Object.entries(micros).find(([, mc]) => mc?.status !== "passed")?.[0] ??
      Object.keys(micros)[0] ??
      null;
    setCurrentMicroChallengeId(next);
  }, [session?.state_json, setCurrentMicroChallengeId]);

  const orderedCells = useMemo(
    () => [...cells].sort((a, b) => a.ord - b.ord),
    [cells],
  );

  // 5.4-A persists `bootstrap_complete` to session.state_json once the agent has
  // finished writing the lesson. Derived the same way as liveCheckpointId.
  const bootstrapComplete = useMemo(() => {
    const state = session?.state_json as
      | { bootstrap_complete?: boolean }
      | null
      | undefined;
    return state?.bootstrap_complete === true;
  }, [session?.state_json]);

  const sessionActive = session?.status === "active";
  // The lesson is still being written: show the warm opening / writing affordances.
  const writingLesson = sessionActive && !bootstrapComplete;

  // Auto-scroll on append, but only if user is already near the bottom.
  const prevCellCountRef = useRef(orderedCells.length);
  useEffect(() => {
    const el = cellsContainerRef.current?.closest(".app-shell-content") as
      | HTMLElement
      | null;
    if (!el) return;
    const grew = orderedCells.length > prevCellCountRef.current;
    prevCellCountRef.current = orderedCells.length;
    if (!grew) return;
    const distanceFromBottom =
      el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 200) {
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
    }
  }, [orderedCells.length]);

  // Derive failure-streak by code cell id from session.state_json.
  // Shape per HAIKU_TASKS / FILE_SCHEMAS: state.active_checkpoint.micro_challenges[i].fail_count
  // We can't reliably map micro_challenge_id -> cell_id without backend support,
  // so for MVP we apply hintPending to the most recent output cell when ANY
  // micro_challenge has fail_count in {1, 2}.
  const hintPendingForLastOutput = useMemo(() => {
    const state = session?.state_json as
      | {
          active_checkpoint?: {
            micro_challenges?: Array<{ fail_count?: number; status?: string }>;
          };
        }
      | null
      | undefined;
    const mcs = state?.active_checkpoint?.micro_challenges ?? [];
    return mcs.some(
      (mc) => mc.fail_count === 1 || mc.fail_count === 2,
    );
  }, [session?.state_json]);

  const lastOutputCellId = useMemo(() => {
    for (let i = orderedCells.length - 1; i >= 0; i--) {
      if (orderedCells[i].kind === "output") return orderedCells[i].id;
    }
    return null;
  }, [orderedCells]);

  function metaFor(cell: Cell): CellMeta | undefined {
    if (cell.kind !== "output") return undefined;
    return {
      hintPending: hintPendingForLastOutput && cell.id === lastOutputCellId,
    };
  }

  // Reveal animation only for cells that arrived after initial mount. Section
  // cells (chapter headers) get a slightly stronger reveal. SSR-seeded cells
  // get no class so a returning notebook renders instantly.
  function revealClass(cell: Cell): string | undefined {
    if (initialCellIdsRef.current.has(cell.id)) return undefined;
    return cell.kind === "section"
      ? "cell-reveal cell-reveal-section"
      : "cell-reveal";
  }

  function openThreadForCell(cellId: string, threadId: string) {
    setOpenThreadsByCell((prev) => {
      const existing = prev[cellId] ?? [];
      if (existing.includes(threadId)) return prev;
      return { ...prev, [cellId]: [...existing, threadId] };
    });
  }

  return (
    <div
      className={`notebook-layout${stageOpen ? " has-stage" : ""}${
        stageExpanded ? " stage-expanded" : ""
      }`}
    >
      <div className="notebook-content">
      <div
        className="notebook-progress"
        role="status"
        aria-label="Notebook progress"
      >
        {parentNotebook ? (
          <Link
            href={`/notebooks/${parentNotebook.id}`}
            className="branch-crumb"
            title={`Back to ${parentNotebook.title}`}
            aria-label={`Back to ${parentNotebook.title}`}
          >
            <ArrowLeft size={14} strokeWidth={2} aria-hidden />
          </Link>
        ) : null}
        {session ? (
          <span className="notebook-progress-label">{session.status}</span>
        ) : null}
        {currentCheckpointId ? (
          <span className="notebook-progress-checkpoint">
            Checkpoint: <code>{currentCheckpointId}</code>
          </span>
        ) : null}
        <SessionControl
          notebookId={notebookId}
          status={session?.status ?? null}
        />
        <button
          type="button"
          className={`workspace-toggle${stageOpen ? " active" : ""}`}
          onClick={() => (stageOpen ? closeStage() : openStage())}
          aria-pressed={stageOpen}
          title={stageOpen ? "Close workspace" : "Open workspace"}
        >
          ⧉ Workspace
        </button>
        {!parentNotebook ? (
          <Link
            href={`/notebooks/${notebookId}/branches`}
            className="branches-toggle"
            title="Open branches — grow mini notebooks from highlights"
          >
            Branches
          </Link>
        ) : null}
      </div>

      <div className="notebook-cells" ref={cellsContainerRef}>
        {orderedCells.length === 0 ? (
          writingLesson ? (
            <div className="notebook-opening" role="status" aria-live="polite">
              <div className="notebook-opening-glyph" aria-hidden="true">
                <span className="notebook-opening-pen">✍️</span>
                <span className="notebook-opening-sparkle">✨</span>
              </div>
              <div className="notebook-opening-title">
                {notebookTitle
                  ? `Writing your lesson on ${notebookTitle}…`
                  : "Writing your lesson…"}
              </div>
              <div className="notebook-opening-shimmer" aria-hidden="true" />
            </div>
          ) : (
            <p className="notebook-empty">Nothing here yet.</p>
          )
        ) : (
          orderedCells.map((cell, idx) => (
            <Fragment key={cell.id}>
              <div className={revealClass(cell)}>
                <CellRenderer cell={cell} meta={metaFor(cell)} />
              </div>
              {(openThreadsByCell[cell.id] ?? []).map((tid) => (
                <Thread
                  key={tid}
                  threadId={tid}
                  anchorPreview={cellPreview(cell)}
                />
              ))}
              {idx < orderedCells.length - 1 ? (
                <SeamAsk
                  cellId={cell.id}
                  onThreadOpened={(tid) => openThreadForCell(cell.id, tid)}
                />
              ) : null}
            </Fragment>
          ))
        )}
        {writingLesson && orderedCells.length > 0 ? (
          <div className="notebook-writing" role="status" aria-live="polite">
            <span className="notebook-writing-pen" aria-hidden="true">
              ✍️
            </span>
            <span className="notebook-writing-text">writing your lesson…</span>
            <span className="notebook-writing-dots" aria-hidden="true">
              <span className="chat-thinking-dot" />
              <span className="chat-thinking-dot" />
              <span className="chat-thinking-dot" />
            </span>
          </div>
        ) : null}
      </div>
      {puzzle ? <PuzzlePane puzzle={puzzle} /> : null}
      </div>
      {stageOpen ? <BuildStage cells={orderedCells} /> : null}
    </div>
  );
}

function cellPreview(cell: Cell): string {
  const flat = cell.content.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
}
