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
import { SeamAsk } from "./SeamAsk";
import { Thread } from "./Thread";
import { useNotebook, type Puzzle } from "./NotebookProvider";
import { PuzzlePane } from "@/components/puzzle/PuzzlePane";
import type { Tables } from "@/lib/supabase/types";

type LearningSession = Tables<"learning_sessions">;

interface NotebookContentProps {
  missionId: string;
  currentCheckpointId: string | null;
  initialCells: Cell[];
  initialState: LearningSession | null;
}

/**
 * Live notebook renderer. SSR seeds initial cells + session; client subscribes
 * to Realtime on notebook_cells + learning_sessions. New rows merge into local
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
  missionId,
  currentCheckpointId,
  initialCells,
  initialState,
}: NotebookContentProps) {
  const {
    setSessionActive,
    notifyAgentReply,
    puzzle,
    setPuzzle,
    setCurrentMicroChallengeId,
  } = useNotebook();

  const [cells, setCells] = useState<Cell[]>(initialCells);
  const [session, setSession] = useState<LearningSession | null>(initialState);
  /** thread_id -> anchor cell_id, for inline thread mounts opened via SeamAsk. */
  const [openThreadsByCell, setOpenThreadsByCell] = useState<
    Record<string, string[]>
  >({});

  const cellsContainerRef = useRef<HTMLDivElement>(null);

  // Push initial session-active state into context once on mount + whenever it changes.
  useEffect(() => {
    setSessionActive(Boolean(session && session.status === "active"));
  }, [session, setSessionActive]);

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
      }
    },
    [notifyAgentReply],
  );

  const onSessionChange = useCallback(
    (payload: RealtimeChangePayload<LearningSession>) => {
      if (payload.eventType === "DELETE") {
        setSession(null);
        return;
      }
      setSession(payload.new);
    },
    [],
  );

  useRealtimeChannel<Cell>(
    "notebook_cells",
    { filter: { column: "mission_id", value: missionId } },
    onCellChange,
    [missionId],
  );

  useRealtimeChannel<LearningSession>(
    "learning_sessions",
    { filter: { column: "mission_id", value: missionId } },
    onSessionChange,
    [missionId],
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
    { filter: { column: "mission_id", value: missionId } },
    onPuzzleChange,
    [missionId],
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

  function openThreadForCell(cellId: string, threadId: string) {
    setOpenThreadsByCell((prev) => {
      const existing = prev[cellId] ?? [];
      if (existing.includes(threadId)) return prev;
      return { ...prev, [cellId]: [...existing, threadId] };
    });
  }

  return (
    <div className="notebook-content">
      <div
        className="notebook-progress"
        role="status"
        aria-label="Mission progress"
      >
        <span className="notebook-progress-label">
          {session ? `Session: ${session.status}` : "Session: not started"}
        </span>
        {currentCheckpointId ? (
          <span className="notebook-progress-checkpoint">
            Checkpoint: <code>{currentCheckpointId}</code>
          </span>
        ) : null}
      </div>

      <div className="notebook-cells" ref={cellsContainerRef}>
        {orderedCells.length === 0 ? (
          <p className="notebook-empty">
            No cells yet. The agent will start writing here once the mission
            begins.
          </p>
        ) : (
          orderedCells.map((cell, idx) => (
            <Fragment key={cell.id}>
              <CellRenderer cell={cell} meta={metaFor(cell)} />
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
      </div>
      {puzzle ? <PuzzlePane puzzle={puzzle} /> : null}
    </div>
  );
}

function cellPreview(cell: Cell): string {
  const flat = cell.content.replace(/\s+/g, " ").trim();
  return flat.length > 60 ? `${flat.slice(0, 60)}…` : flat;
}
