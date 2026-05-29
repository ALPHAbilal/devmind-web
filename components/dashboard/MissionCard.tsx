"use client";

import { useRouter } from "next/navigation";
import type { Tables } from "@/lib/supabase/types";

type MissionRow = Tables<"missions">;
type MissionStatus = MissionRow["status"];

/** Subset of spec_json we read on the card. */
type MissionSpecShape = {
  checkpoints?: unknown[];
  error?: { message?: string };
};

interface MissionCardProps {
  mission: MissionRow;
}

const STATUS_LABEL: Record<MissionStatus, string> = {
  in_progress: "In progress",
  draft: "Draft",
  generating: "Generating…",
  completed: "Completed",
  abandoned: "Abandoned",
  failed: "Failed",
};

// Badge colors map to existing globals.css accent tokens (no new colors).
const STATUS_COLOR: Record<MissionStatus, { fg: string; bg: string }> = {
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

export function MissionCard({ mission }: MissionCardProps) {
  const router = useRouter();
  const spec = (mission.spec_json ?? {}) as MissionSpecShape;
  const checkpointCount = Array.isArray(spec.checkpoints)
    ? spec.checkpoints.length
    : 0;
  const errorMessage = spec.error?.message;

  const status = mission.status;
  const isGenerating = status === "generating";
  const isFailed = status === "failed";
  const color = STATUS_COLOR[status];

  const handleOpen = () => {
    if (isGenerating) return;
    if (isFailed) {
      router.push("/missions/new");
      return;
    }
    router.push(`/missions/${mission.id}`);
  };

  const clickable = !isGenerating;
  const updated = dateFmt.format(new Date(mission.updated_at));
  const created = dateFmt.format(new Date(mission.created_at));

  return (
    <article
      className={`mission-card${clickable ? " is-clickable" : ""}`}
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
      <div className="mission-card-top">
        <span
          className="mission-badge"
          style={{ color: color.fg, background: color.bg }}
        >
          {isGenerating && <span className="mission-spinner" aria-hidden />}
          {STATUS_LABEL[status]}
        </span>
        <span className="mission-card-date" title={`Created ${created}`}>
          {updated}
        </span>
      </div>

      <h2 className="mission-card-title">{mission.title}</h2>

      <div className="mission-card-meta">
        <span>{mission.technology}</span>
        <span className="mission-dot">·</span>
        <span>{mission.level}</span>
        <span className="mission-dot">·</span>
        <span>{mission.time_budget_minutes} min</span>
        {checkpointCount > 0 && (
          <>
            <span className="mission-dot">·</span>
            <span>
              {checkpointCount} checkpoint{checkpointCount === 1 ? "" : "s"}
            </span>
          </>
        )}
      </div>

      {isFailed && errorMessage && (
        <p className="mission-card-error">{errorMessage}</p>
      )}
      {isFailed && (
        <p className="mission-card-hint">Click to start a new mission →</p>
      )}
    </article>
  );
}
