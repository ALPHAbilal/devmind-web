"use client";

import { useCallback, useState } from "react";
import {
  useRealtimeChannel,
  type RealtimeChangePayload,
} from "@/lib/realtime";
import { CellRenderer } from "@/components/notebook/cells";
import type { Cell } from "@/components/notebook/cells";
import "../realtime-test.css";

/**
 * Smoke test for the full cell-rendering pipeline: subscribes to
 * notebook_cells against a hardcoded mission_id and renders incoming rows
 * through CellRenderer. Useful for verifying deploys without juggling auth.
 *
 * Open Supabase Studio → notebook_cells → Insert with the matching
 * mission_id and watch the cell appear here within ~1s.
 */
const TEST_MISSION_ID = "00000000-0000-0000-0000-0000000000aa";

export default function RealtimeCellsTestPage() {
  const [cells, setCells] = useState<Cell[]>([]);

  const onChange = useCallback((payload: RealtimeChangePayload<Cell>) => {
    setCells((prev) => {
      switch (payload.eventType) {
        case "INSERT":
          return [...prev, payload.new].sort((a, b) => a.ord - b.ord);
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
  }, []);

  useRealtimeChannel<Cell>(
    "notebook_cells",
    { filter: { column: "mission_id", value: TEST_MISSION_ID } },
    onChange,
    [],
  );

  return (
    <main className="theme-notebook rt-page">
      <div className="rt-card">
        <header className="rt-header">
          <span className="rt-eyebrow">Realtime cell-rendering test</span>
          <h1 className="rt-title">Live CellRenderer feed</h1>
          <p className="rt-sub">
            Filter: <code>mission_id=eq.{TEST_MISSION_ID}</code>
          </p>
        </header>

        <div className="notebook-cells">
          {cells.length === 0 ? (
            <p className="notebook-empty">
              Waiting for cells… insert one in Supabase Studio with the
              mission_id above.
            </p>
          ) : (
            cells.map((cell) => <CellRenderer key={cell.id} cell={cell} />)
          )}
        </div>
      </div>
    </main>
  );
}
