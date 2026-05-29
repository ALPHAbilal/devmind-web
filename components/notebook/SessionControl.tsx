"use client";

import { useEffect, useRef, useState } from "react";
import type { Tables } from "@/lib/supabase/types";
import "./session-control.css";

type SessionStatus = Tables<"learning_sessions">["status"];

interface SessionControlProps {
  missionId: string;
  /**
   * Live session status, read from the learning_sessions subscription that
   * already lives in NotebookContent — do NOT open a second subscription here.
   * `null` means the session hasn't started yet (nothing to pause/resume).
   */
  status: SessionStatus | null;
}

/**
 * Explicit Pause / Resume control (8.5). POSTs to the Vercel proxy routes; the
 * authoritative state flip arrives via Realtime (learning_sessions:UPDATE),
 * which re-renders this component through the `status` prop. We keep a local
 * `pending` flag for optimistic feedback and clear it once the prop changes
 * (or on error). If the Fly backend hasn't shipped /pause yet it 404s and we
 * surface a toast — harmless.
 */
export function SessionControl({ missionId, status }: SessionControlProps) {
  const [pending, setPending] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const prevStatusRef = useRef<SessionStatus | null>(status);

  // The Realtime row flip is the source of truth — when status changes, the
  // requested action landed, so drop the optimistic pending state.
  useEffect(() => {
    if (prevStatusRef.current !== status) {
      prevStatusRef.current = status;
      setPending(false);
    }
  }, [status]);

  async function act(action: "pause" | "resume") {
    if (pending) return;
    setPending(true);
    setToast(null);
    try {
      const res = await fetch(`/api/missions/${missionId}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const message: string =
          res.status === 404
            ? `${action === "pause" ? "Pause" : "Resume"} isn't available yet.`
            : body?.error?.message || `${action} failed (${res.status})`;
        setToast(message);
        setPending(false);
        window.setTimeout(() => setToast(null), 3000);
      }
      // On success the learning_sessions row flips via Realtime; the status
      // prop changes and the effect above clears `pending`.
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Network error");
      setPending(false);
      window.setTimeout(() => setToast(null), 3000);
    }
  }

  if (status === null) return null;

  if (status === "completed") {
    return (
      <span className="session-control session-done" role="status">
        ✓ Mission complete
      </span>
    );
  }

  const isActive = status === "active";

  return (
    <span className="session-control">
      <button
        type="button"
        className={`session-btn ${isActive ? "session-pause" : "session-resume"}`}
        onClick={() => void act(isActive ? "pause" : "resume")}
        disabled={pending}
        title={isActive ? "Pause this mission" : "Resume this mission"}
      >
        {pending
          ? isActive
            ? "Pausing…"
            : "Resuming…"
          : isActive
            ? "Pause mission"
            : "Resume mission"}
      </button>
      {toast ? (
        <span className="session-toast" role="alert">
          {toast}
        </span>
      ) : null}
    </span>
  );
}
