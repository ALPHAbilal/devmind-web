"use client";

import { useCallback, useMemo, useState } from "react";
import {
  useRealtimeChannel,
  type RealtimeChangePayload,
} from "@/lib/realtime";
import { CellRenderer } from "./cells";
import type { Cell } from "./cells";
import type { Tables } from "@/lib/supabase/types";

type LearningSession = Tables<"learning_sessions">;

interface NotebookContentProps {
  missionId: string;
  currentCheckpointId: string | null;
  initialCells: Cell[];
  initialState: LearningSession | null;
}

/**
 * Live notebook renderer. SSR seeds the initial cells + session row; this
 * component then subscribes to Realtime on notebook_cells and
 * learning_sessions filtered by mission_id. New rows from Realtime are
 * merged into local state — INSERTs may arrive out of order so we re-sort
 * by `ord` after every change.
 */
export function NotebookContent({
  missionId,
  currentCheckpointId,
  initialCells,
  initialState,
}: NotebookContentProps) {
  const [cells, setCells] = useState<Cell[]>(initialCells);
  const [session, setSession] = useState<LearningSession | null>(initialState);

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
    },
    [],
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

  // Cells render in `ord` order. We sort on every change so the initial SSR
  // order isn't trusted past mount.
  const orderedCells = useMemo(
    () => [...cells].sort((a, b) => a.ord - b.ord),
    [cells],
  );

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

      <div className="notebook-cells">
        {orderedCells.length === 0 ? (
          <p className="notebook-empty">
            No cells yet. The agent will start writing here once the mission
            begins.
          </p>
        ) : (
          orderedCells.map((cell) => <CellRenderer key={cell.id} cell={cell} />)
        )}
      </div>
    </div>
  );
}
