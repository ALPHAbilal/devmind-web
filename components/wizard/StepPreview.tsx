"use client";

import "./step-preview.css";
import type { NotebookGoal, NotebookLevel, NotebookSpec, TimeChipValue } from "./types";
import { TIME_CHIPS } from "./types";

const GOAL_LABELS: Record<NotebookGoal, string> = {
  build: "Build something real",
  understand: "Understand concepts",
  interview: "Interview prep",
  work: "Solve a work problem",
};

const LEVEL_ICON: Record<NotebookLevel, string> = {
  beginner: "🌱",
  intermediate: "🌿",
  advanced: "🌳",
};

const LEVEL_LABEL: Record<NotebookLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Experienced",
};

function timeChipLabel(value: TimeChipValue): string {
  return TIME_CHIPS.find((c) => c.value === value)?.label ?? `${value} min`;
}

interface StepPreviewProps {
  notebook: NotebookSpec;
  isLaunching: boolean;
  launchError: string | null;
  onLaunch: () => void;
  onDifferent: () => void;
}

export function StepPreview({
  notebook,
  isLaunching,
  launchError,
  onLaunch,
  onDifferent,
}: StepPreviewProps) {
  const objectives = notebook.concept_graph.nodes.slice(0, 5);

  return (
    <>
      <div className="notebook-header">
        <div className="notebook-badge">🎯 Your Notebook</div>
        <h1 className="notebook-title">{notebook.title}</h1>

        <div className="constraint-summary">
          <span className="constraint-pill">
            ⏱ {timeChipLabel(notebook.time_budget_minutes as TimeChipValue)}
          </span>
          <span className="constraint-pill">
            🎯 {GOAL_LABELS[notebook.goal]}
          </span>
          {notebook.constraints.map((c, i) => (
            <span key={i} className="constraint-pill">
              ✎ {c.length > 48 ? c.slice(0, 48) + "…" : c}
            </span>
          ))}
        </div>
      </div>

      <ul className="learn-list">
        {objectives.map((node) => (
          <li key={node.id} className="learn-item">
            <span className="learn-bullet">●</span>
            <span>{node.label}</span>
          </li>
        ))}
      </ul>

      <div className="section-divider" />

      <div className="checkpoint-label">Checkpoints</div>
      <div className="checkpoint-list">
        {notebook.checkpoints.map((cp) => (
          <div key={cp.id} className="checkpoint-item">
            <div className="checkpoint-circle">{cp.n}</div>
            <span>{cp.name}</span>
          </div>
        ))}
      </div>

      {/* Per platform rule: NO minute estimates. Only count + level + topic. */}
      <div className="notebook-meta">
        <div className="meta-item">
          <span className="meta-icon">📚</span>
          <span>{notebook.checkpoints.length} checkpoints</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">{LEVEL_ICON[notebook.level]}</span>
          <span>{LEVEL_LABEL[notebook.level]}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">🧭</span>
          <span>{notebook.technology}</span>
        </div>
      </div>

      <div className="wizard-action-row">
        <button
          type="button"
          className="wizard-btn-primary"
          onClick={onLaunch}
          disabled={isLaunching}
        >
          {isLaunching
            ? "✓ Provisioning sandbox…"
            : launchError
              ? "🔁 Retry Launch"
              : "🚀 Launch Notebook"}
        </button>
        <button
          type="button"
          className="wizard-btn-secondary"
          onClick={onDifferent}
          disabled={isLaunching}
        >
          🔄 Different Notebook
        </button>
      </div>

      {isLaunching && (
        <div className="wizard-launch-status" role="status">
          Provisioning your sandbox… (this can take 20–40 seconds)
        </div>
      )}
      {!isLaunching && launchError && (
        <div className="wizard-launch-error" role="alert">
          {launchError}
        </div>
      )}
    </>
  );
}
