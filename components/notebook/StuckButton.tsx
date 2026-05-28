"use client";

import { useState } from "react";
import { useNotebook } from "./NotebookProvider";

const ACTIVE_STATUSES = new Set(["active"]);

export function StuckButton() {
  const { missionId, puzzle, currentMicroChallengeId, sessionActive } =
    useNotebook();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const puzzleOpen = !!puzzle && ACTIVE_STATUSES.has(puzzle.status);
  const disabled =
    !sessionActive || puzzleOpen || !currentMicroChallengeId || submitting;

  async function onClick() {
    if (disabled) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/puzzle/open", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission_id: missionId,
          micro_challenge_id: currentMicroChallengeId,
          anchor: null,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message || `Failed (${res.status})`);
        return;
      }
      setToast("Let's debug this together");
      window.setTimeout(() => setToast(null), 2500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  const title = puzzleOpen
    ? "A puzzle is already open"
    : !sessionActive
      ? "Start the mission first"
      : !currentMicroChallengeId
        ? "No active micro-challenge yet"
        : "Open a puzzle for the current step";

  return (
    <>
      <button
        type="button"
        className="stuck-btn"
        onClick={() => void onClick()}
        disabled={disabled}
        title={title}
        aria-label="I'm stuck — open puzzle"
      >
        {submitting ? "Opening…" : "I'm stuck"}
      </button>
      {error ? (
        <span className="stuck-btn-error" role="alert">
          {error}
        </span>
      ) : null}
      {toast ? (
        <div className="stuck-toast" role="status">
          {toast}
        </div>
      ) : null}
    </>
  );
}
