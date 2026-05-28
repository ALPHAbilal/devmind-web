"use client";

import "./step-preview.css";
import type { MissionGoal, MissionLevel, MissionSpec, TimeChipValue } from "./types";
import { TIME_CHIPS } from "./types";

const GOAL_LABELS: Record<MissionGoal, string> = {
  build: "Build something real",
  understand: "Understand concepts",
  interview: "Interview prep",
  work: "Solve a work problem",
};

const LEVEL_ICON: Record<MissionLevel, string> = {
  beginner: "🌱",
  intermediate: "🌿",
  advanced: "🌳",
};

const LEVEL_LABEL: Record<MissionLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Experienced",
};

function timeChipLabel(value: TimeChipValue): string {
  return TIME_CHIPS.find((c) => c.value === value)?.label ?? `${value} min`;
}

interface StepPreviewProps {
  mission: MissionSpec;
  isLaunching: boolean;
  launchError: string | null;
  onLaunch: () => void;
  onDifferent: () => void;
}

export function StepPreview({
  mission,
  isLaunching,
  launchError,
  onLaunch,
  onDifferent,
}: StepPreviewProps) {
  const objectives = mission.concept_graph.nodes.slice(0, 5);

  return (
    <>
      <div className="mission-header">
        <div className="mission-badge">🎯 Your Mission</div>
        <h1 className="mission-title">{mission.title}</h1>

        <div className="constraint-summary">
          <span className="constraint-pill">
            ⏱ {timeChipLabel(mission.time_budget_minutes as TimeChipValue)}
          </span>
          <span className="constraint-pill">
            🎯 {GOAL_LABELS[mission.goal]}
          </span>
          {mission.constraints.map((c, i) => (
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
        {mission.checkpoints.map((cp) => (
          <div key={cp.id} className="checkpoint-item">
            <div className="checkpoint-circle">{cp.n}</div>
            <span>{cp.name}</span>
          </div>
        ))}
      </div>

      {/* Per platform rule: NO minute estimates. Only count + level + topic. */}
      <div className="mission-meta">
        <div className="meta-item">
          <span className="meta-icon">📚</span>
          <span>{mission.checkpoints.length} checkpoints</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">{LEVEL_ICON[mission.level]}</span>
          <span>{LEVEL_LABEL[mission.level]}</span>
        </div>
        <div className="meta-item">
          <span className="meta-icon">🧭</span>
          <span>{mission.technology}</span>
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
              : "🚀 Launch Mission"}
        </button>
        <button
          type="button"
          className="wizard-btn-secondary"
          onClick={onDifferent}
          disabled={isLaunching}
        >
          🔄 Different Mission
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
