"use client";

import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";

type NotebookRow = Tables<"notebooks">;
type NotebookStatus = NotebookRow["status"];

/** Subset of spec_json we read on the card. */
type NotebookSpecShape = {
  checkpoints?: unknown[];
  error?: { message?: string };
};

interface NotebookCardProps {
  notebook: NotebookRow;
}

const STATUS_LABEL: Record<NotebookStatus, string> = {
  in_progress: "In progress",
  draft: "Draft",
  generating: "Generating…",
  completed: "Completed",
  abandoned: "Abandoned",
  failed: "Failed",
};

// Badge colors map to existing globals.css accent tokens (no new colors).
const STATUS_COLOR: Record<NotebookStatus, { fg: string; bg: string }> = {
  in_progress: { fg: "var(--accent-green)", bg: "var(--accent-green-soft)" },
  draft: { fg: "var(--accent-teal)", bg: "rgba(160, 207, 212, 0.12)" },
  generating: { fg: "var(--accent-yellow)", bg: "rgba(251, 191, 36, 0.12)" },
  completed: {
    fg: "var(--accent-green-bright)",
    bg: "var(--accent-green-soft)",
  },
  abandoned: { fg: "var(--text-muted)", bg: "rgba(255, 255, 255, 0.05)" },
  failed: { fg: "var(--accent-red)", bg: "var(--accent-red-soft)" },
};

const dateFmt = new Intl.DateTimeFormat(undefined, {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function NotebookCard({ notebook }: NotebookCardProps) {
  const router = useRouter();
  const spec = (notebook.spec_json ?? {}) as NotebookSpecShape;
  const checkpointCount = Array.isArray(spec.checkpoints)
    ? spec.checkpoints.length
    : 0;
  const errorMessage = spec.error?.message;

  const status = notebook.status;
  const isGenerating = status === "generating";
  const isFailed = status === "failed";
  const color = STATUS_COLOR[status];

  const handleOpen = () => {
    if (isGenerating) return;
    if (isFailed) {
      router.push("/notebooks/new");
      return;
    }
    router.push(`/notebooks/${notebook.id}`);
  };

  const clickable = !isGenerating;
  const updated = dateFmt.format(new Date(notebook.updated_at));
  const created = dateFmt.format(new Date(notebook.created_at));

  return (
    <article
      className={`notebook-card${clickable ? " is-clickable" : ""}`}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onClick={clickable ? handleOpen : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleOpen();
              }
            }
          : undefined
      }
      aria-disabled={!clickable}
    >
      <div className="notebook-card-top">
        <span
          className="notebook-badge"
          style={{ color: color.fg, background: color.bg }}
        >
          {isGenerating && <span className="notebook-spinner" aria-hidden />}
          {STATUS_LABEL[status]}
        </span>
        <span className="notebook-card-date" title={`Created ${created}`}>
          {updated}
        </span>
      </div>

      <h2 className="notebook-card-title">{notebook.title}</h2>

      <div className="notebook-card-meta">
        <span>{notebook.technology}</span>
        <span className="notebook-dot">·</span>
        <span>{notebook.level}</span>
        <span className="notebook-dot">·</span>
        <span>{notebook.time_budget_minutes} min</span>
        {checkpointCount > 0 && (
          <>
            <span className="notebook-dot">·</span>
            <span>
              {checkpointCount} checkpoint{checkpointCount === 1 ? "" : "s"}
            </span>
          </>
        )}
      </div>

      {isFailed && errorMessage && (
        <p className="notebook-card-error">{errorMessage}</p>
      )}
      {isFailed && (
        <p className="notebook-card-hint">Click to start a new notebook →</p>
      )}
    </article>
  );
}
