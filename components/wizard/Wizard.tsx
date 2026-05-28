"use client";

import { useState } from "react";
import "./wizard.css";
import { StepIndicator } from "./StepIndicator";
import { StepTopic } from "./StepTopic";
import { StepLevel } from "./StepLevel";
import { StepShape } from "./StepShape";
import { StepPreview } from "./StepPreview";
import { buildMockMission, variantIdOf } from "./mock";
import {
  INITIAL_STATE,
  type GeneratePayload,
  type MissionGoal,
  type MissionLevel,
  type MissionSpec,
  type TimeChipValue,
  type WizardState,
} from "./types";

const MOCK_DELAY_MS = 1500;

/**
 * Wizard orchestrator. All state lives here as a single `WizardState` object
 * (chose useState over useReducer — the 4 transitions are simple enough that
 * a reducer would just be ceremony). Each step component owns its own
 * scratch state internally and reports up through narrow callbacks.
 *
 * fadeUp animation is applied via `key={step}` on the .wizard-step wrapper,
 * which forces a remount on every step change.
 */
interface WizardProps {
  userEmail: string;
}

export function Wizard({ userEmail }: WizardProps) {
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [generating, setGenerating] = useState(false);
  const [mission, setMission] = useState<MissionSpec | null>(null);
  const [excludeVariants, setExcludeVariants] = useState<string[]>([]);
  const [isLaunching, setIsLaunching] = useState(false);

  function patch<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  /* ── Step 1 → Step 2 ────────────────────────────────────────────────── */
  function handleTopicPick(topic: string) {
    setState((s) => ({ ...s, topic, step: 2 }));
  }

  /* ── Step 2 → Step 3 ────────────────────────────────────────────────── */
  function handleLevelPick(level: MissionLevel) {
    setState((s) => ({ ...s, level, step: 3 }));
  }

  /* ── Step 3 → Step 4 (mocked) ───────────────────────────────────────── */
  function handleShapeCommit(next: {
    time: TimeChipValue;
    goal: MissionGoal | null;
    known: string[];
    customConstraint: string;
  }) {
    const updated: WizardState = {
      ...state,
      time: next.time,
      goal: next.goal,
      known: next.known,
      customConstraint: next.customConstraint,
      step: 4,
    };
    setState(updated);
    runMockGeneration(updated, []);
  }

  function handleShapeSkip() {
    const updated: WizardState = { ...state, step: 4 };
    setState(updated);
    runMockGeneration(updated, []);
  }

  function runMockGeneration(s: WizardState, exclude: string[]) {
    setGenerating(true);
    setMission(null);
    setExcludeVariants(exclude);
    window.setTimeout(() => {
      const spec = buildMockMission(s, exclude);
      setMission(spec);
      setGenerating(false);
    }, MOCK_DELAY_MS);
  }

  /* ── Step 4 actions ─────────────────────────────────────────────────── */
  function handleLaunch() {
    if (!mission || !state.level || !state.goal) return;

    const payload: GeneratePayload = {
      topic: state.topic,
      level: state.level,
      time_budget_minutes: state.time,
      goal: state.goal,
      known: state.known,
      constraints: state.customConstraint ? [state.customConstraint] : [],
      exclude_variants: excludeVariants,
    };

    // Real POST lands in Phase 4.2 / launch in 5.5. For now: just log.
    // eslint-disable-next-line no-console
    console.log("[Wizard.launch] payload (POST /api/missions/generate):", payload);
    // eslint-disable-next-line no-console
    console.log("[Wizard.launch] mission (mocked MissionSpec):", mission);

    setIsLaunching(true);
    window.setTimeout(() => setIsLaunching(false), 1500);
  }

  function handleDifferent() {
    if (!mission) return;
    const justSaw = variantIdOf(mission);
    runMockGeneration(state, [...excludeVariants, justSaw]);
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="wizard-step" key={state.step}>
      <StepIndicator current={state.step} />

      {state.step === 1 && (
        <StepTopic
          userEmail={userEmail}
          initialTopic={state.topic}
          onPick={handleTopicPick}
        />
      )}

      {state.step === 2 && (
        <StepLevel
          topic={state.topic}
          selected={state.level}
          onPick={handleLevelPick}
          onEdit={() => patch("step", 1)}
        />
      )}

      {state.step === 3 && (
        <StepShape
          topic={state.topic}
          time={state.time}
          goal={state.goal}
          known={state.known}
          customConstraint={state.customConstraint}
          onCommit={handleShapeCommit}
          onSkip={handleShapeSkip}
        />
      )}

      {state.step === 4 &&
        (generating || !mission ? (
          <div className="wizard-generating">
            <div className="wizard-gen-spinner" />
            <div className="wizard-gen-text">Crafting your mission…</div>
            <div className="wizard-gen-sub">
              Fitting your constraints, level, and goals into a personalized path
            </div>
          </div>
        ) : (
          <StepPreview
            mission={mission}
            isLaunching={isLaunching}
            onLaunch={handleLaunch}
            onDifferent={handleDifferent}
          />
        ))}
    </div>
  );
}
