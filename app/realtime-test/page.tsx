"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  useRealtimeChannel,
  type RealtimeChangePayload,
} from "@/lib/realtime";
import "./realtime-test.css";

/**
 * Public test page for the useRealtimeChannel hook. Subscribes to
 * cells filtered by a hardcoded notebook_id, logs every event to a
 * <ul>, and exposes a button that INSERTs a dummy row (which will RLS-fail
 * because nobody owns this notebook — that's expected; the wiring test is
 * the subscription, not the write).
 */

// Any valid UUID works — non-existent notebooks still produce a working
// subscription (Realtime publishes by filter, not by FK).
const TEST_NOTEBOOK_ID = "00000000-0000-0000-0000-0000000000aa";

type NotebookCellRow = {
  id: string;
  notebook_id: string;
  kind: string;
  source: string;
  content: string;
  ord: number;
};

interface LogEntry {
  ts: string;
  kind: "event" | "error" | "info";
  text: string;
}

function nowStamp() {
  return new Date().toLocaleTimeString();
}

export default function RealtimeTestPage() {
  // Empty on first server render to avoid a hydration mismatch — timestamps
  // populate after mount, in the client only.
  const [log, setLog] = useState<LogEntry[]>([]);

  const append = useCallback((entry: Omit<LogEntry, "ts">) => {
    setLog((prev) => [{ ts: nowStamp(), ...entry }, ...prev].slice(0, 200));
  }, []);

  useEffect(() => {
    append({
      kind: "info",
      text: `Subscribed to cells where notebook_id=${TEST_NOTEBOOK_ID}. Open Supabase Studio → cells → Insert a row with this notebook_id to see an event arrive.`,
    });
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useRealtimeChannel<NotebookCellRow>(
    "cells",
    { filter: { column: "notebook_id", value: TEST_NOTEBOOK_ID } },
    (payload: RealtimeChangePayload<NotebookCellRow>) => {
      append({
        kind: "event",
        text: `${payload.eventType} · ${JSON.stringify(
          payload.new ?? payload.old,
        )}`,
      });
    },
    [TEST_NOTEBOOK_ID],
  );

  async function insertDummyCell() {
    const supabase = createClient();
    const payload = {
      notebook_id: TEST_NOTEBOOK_ID,
      kind: "markdown",
      source: "learner",
      content: "Dummy cell from /realtime-test",
      ord: Date.now() % 10000,
    };
    // KNOWN TYPING MISMATCH: @supabase/ssr@0.5 returns a 3-generic
    // SupabaseClient, but @supabase/supabase-js@2.106 expects 5, so the
    // .insert() chain resolves to never[]. Safe to bypass here — the insert
    // is expected to RLS-fail; this page only verifies the subscription.
    // Resolve properly by bumping @supabase/ssr when it reaches a 5-generic
    // release.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (supabase.from("cells") as any).insert(
      payload,
    );
    if (error) {
      append({ kind: "error", text: `INSERT failed: ${error.message}` });
    } else {
      append({ kind: "info", text: "INSERT succeeded (unexpected — RLS off?)" });
    }
  }

  return (
    <main className="theme-notebook rt-page">
      <div className="rt-card">
        <header className="rt-header">
          <span className="rt-eyebrow">Realtime subscription test</span>
          <h1 className="rt-title">cells live feed</h1>
          <p className="rt-sub">
            Filter:&nbsp;
            <code>notebook_id=eq.{TEST_NOTEBOOK_ID}</code>
          </p>
        </header>

        <div className="rt-actions">
          <button type="button" className="rt-btn" onClick={insertDummyCell}>
            Insert dummy cell
          </button>
          <button
            type="button"
            className="rt-btn rt-btn-ghost"
            onClick={() =>
              setLog([
                {
                  ts: nowStamp(),
                  kind: "info",
                  text: "Cleared log.",
                },
              ])
            }
          >
            Clear log
          </button>
        </div>

        <ul className="rt-log" aria-live="polite">
          {log.map((entry, i) => (
            <li key={i} className={`rt-log-row rt-${entry.kind}`}>
              <span className="rt-log-ts">{entry.ts}</span>
              <span className="rt-log-text">{entry.text}</span>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
