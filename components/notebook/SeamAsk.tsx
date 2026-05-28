"use client";

import { useRef, useState, type KeyboardEvent } from "react";
import { useNotebook } from "./NotebookProvider";
import "./seam-ask.css";

interface SeamAskProps {
  /** The cell ID the question is anchored "after". */
  cellId: string;
  /** Called once the backend hands back a thread_id, so the parent can mount
   *  an inline <Thread> below the cell. */
  onThreadOpened: (threadId: string) => void;
}

export function SeamAsk({ cellId, onThreadOpened }: SeamAskProps) {
  const { missionId, sessionActive } = useNotebook();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  function expand() {
    if (!sessionActive) return;
    setOpen(true);
    queueMicrotask(() => inputRef.current?.focus());
  }

  function cancel() {
    setOpen(false);
    setValue("");
    setError(null);
  }

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission_id: missionId,
          content: trimmed,
          mode: "chat",
          anchor: { kind: "after_cell", cell_id: cellId, new: true },
        }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(body?.error?.message || `Failed (${res.status})`);
        return;
      }
      const threadId: string | undefined = body?.thread_id;
      if (threadId) {
        onThreadOpened(threadId);
      }
      cancel();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    } else if (e.key === "Escape") {
      cancel();
    }
  }

  if (!open) {
    return (
      <div className="seam-ask seam-ask-collapsed">
        <button
          type="button"
          className="seam-ask-trigger"
          aria-label="Ask between cells"
          title="Ask between cells"
          onClick={expand}
          disabled={!sessionActive}
        >
          <span className="seam-ask-line" />
          <span className="seam-ask-icon">+ Ask</span>
          <span className="seam-ask-line" />
        </button>
      </div>
    );
  }

  return (
    <div className="seam-ask seam-ask-open">
      <textarea
        ref={inputRef}
        className="seam-ask-input"
        rows={2}
        placeholder="Ask a question about this cell…"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={onKey}
        disabled={submitting}
      />
      <div className="seam-ask-actions">
        {error ? <span className="seam-ask-error">{error}</span> : null}
        <button
          type="button"
          className="seam-ask-btn seam-ask-cancel"
          onClick={cancel}
          disabled={submitting}
        >
          Cancel
        </button>
        <button
          type="button"
          className="seam-ask-btn seam-ask-submit"
          onClick={() => void submit()}
          disabled={submitting || !value.trim()}
        >
          {submitting ? "Sending…" : "Ask"}
        </button>
      </div>
    </div>
  );
}
