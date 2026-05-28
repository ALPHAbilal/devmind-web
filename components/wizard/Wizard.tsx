"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import "./wizard.css";
import { StepIndicator } from "./StepIndicator";
import { StepTopic } from "./StepTopic";
import { StepLevel } from "./StepLevel";
import { StepShape } from "./StepShape";
import { StepPreview } from "./StepPreview";
import { buildMockMission } from "./mock";
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
 * Wizard orchestrator. All state lives here as a single `WizardState`.
 *
 * Step 4 calls `POST /api/missions/generate` (Vercel proxy → Fly HMAC →
 * Opus). The wizard never talks to Fly directly. The mock generator stays
 * in tree behind `?mock=true` for offline dev.
 */
interface WizardProps {
  userEmail: string;
}

type GenError = {
  kind: "validation" | "network" | "auth" | "server";
  message: string;
  attempt: number;
};

type LaunchError = {
  kind: "bridge_timeout" | "auth" | "network" | "server";
  message: string;
};

function isMockMode(): boolean {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get("mock") === "true";
}

function buildPayload(s: WizardState, exclude: string[]): GeneratePayload {
  return {
    topic: s.topic,
    level: s.level ?? "beginner",
    time_budget_minutes: s.time,
    goal: s.goal ?? "understand",
    known: s.known,
    constraints: s.customConstraint ? [s.customConstraint] : [],
    exclude_variants: exclude,
  };
}

export function Wizard({ userEmail }: WizardProps) {
  const router = useRouter();
  const [state, setState] = useState<WizardState>(INITIAL_STATE);
  const [generating, setGenerating] = useState(false);
  const [mission, setMission] = useState<MissionSpec | null>(null);
  const [excludeVariants, setExcludeVariants] = useState<string[]>([]);
  const [error, setError] = useState<GenError | null>(null);
  const [isLaunching, setIsLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<LaunchError | null>(null);

  function patch<K extends keyof WizardState>(key: K, value: WizardState[K]) {
    setState((s) => ({ ...s, [key]: value }));
  }

  function handleTopicPick(topic: string) {
    setState((s) => ({ ...s, topic, step: 2 }));
  }

  function handleLevelPick(level: MissionLevel) {
    setState((s) => ({ ...s, level, step: 3 }));
  }

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
    runGeneration(updated, []);
  }

  function handleShapeSkip() {
    const updated: WizardState = { ...state, step: 4 };
    setState(updated);
    runGeneration(updated, []);
  }

  async function callGenerate(
    payload: GeneratePayload,
  ): Promise<{ status: number; body: { mission?: MissionSpec; error?: { code: string; message: string } } }> {
    const res = await fetch("/api/missions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  async function runGeneration(s: WizardState, exclude: string[], attempt = 1) {
    setGenerating(true);
    setMission(null);
    setError(null);
    setExcludeVariants(exclude);

    if (isMockMode()) {
      window.setTimeout(() => {
        setMission(buildMockMission(s, exclude));
        setGenerating(false);
      }, MOCK_DELAY_MS);
      return;
    }

    try {
      const payload = buildPayload(s, exclude);
      const { status, body } = await callGenerate(payload);

      if (status === 200 && body.mission) {
        setMission(body.mission);
        setGenerating(false);
        return;
      }

      if (status === 422) {
        // 4.5 — auto-retry once on validation failure.
        if (attempt === 1) {
          await runGeneration(s, exclude, 2);
          return;
        }
        setError({
          kind: "validation",
          message:
            "We couldn't generate a mission. Try a different topic or simpler constraints.",
          attempt,
        });
      } else if (status === 401) {
        setError({
          kind: "auth",
          message: "Your session expired. Please sign in again.",
          attempt,
        });
      } else {
        setError({
          kind: "server",
          message:
            body.error?.message ?? "Something went wrong generating your mission.",
          attempt,
        });
      }
    } catch {
      setError({
        kind: "network",
        message: "Couldn't reach the server. Check your connection and try again.",
        attempt,
      });
    } finally {
      setGenerating(false);
    }
  }

  function handleRetry() {
    runGeneration(state, excludeVariants, 1);
  }

  async function handleLaunch() {
    if (!mission || isLaunching) return;
    setIsLaunching(true);
    setLaunchError(null);

    try {
      const res = await fetch(`/api/missions/${mission.mission_id}/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      });
      const body = await res.json().catch(() => ({}));

      if (res.status === 200) {
        router.push(`/missions/${mission.mission_id}`);
        return;
      }

      if (res.status === 401) {
        router.push("/login");
        return;
      }

      if (
        res.status === 503 &&
        body?.error?.code === "sandbox_bridge_timeout"
      ) {
        setLaunchError({
          kind: "bridge_timeout",
          message:
            "Sandbox didn't come online in time. Try again — it usually works on the second attempt.",
        });
      } else {
        setLaunchError({
          kind: "server",
          message:
            body?.error?.message ??
            "Backend not ready yet — try again in a few minutes.",
        });
      }
      setIsLaunching(false);
    } catch {
      setLaunchError({
        kind: "network",
        message:
          "Couldn't reach the server. Check your connection and try again.",
      });
      setIsLaunching(false);
    }
  }

  function handleDifferent() {
    if (!mission) return;
    setLaunchError(null);
    const checkpointIds = mission.checkpoints.map((cp) => cp.id);
    runGeneration(state, [...excludeVariants, ...checkpointIds], 1);
  }

  const showSpinner = generating || (!mission && !error);

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

      {state.step === 4 && (
        <>
          {showSpinner && (
            <div className="wizard-generating">
              <div className="wizard-gen-spinner" />
              <div className="wizard-gen-text">Crafting your mission…</div>
              <div className="wizard-gen-sub">
                Fitting your constraints, level, and goals into a personalized path.
                This can take 30–60 seconds.
              </div>
            </div>
          )}
          {!showSpinner && error && (
            <div className="wizard-error" role="alert">
              <div className="wizard-error-title">Mission generation failed</div>
              <div className="wizard-error-msg">{error.message}</div>
              <button
                type="button"
                className="wizard-btn-primary"
                onClick={handleRetry}
              >
                Try Again
              </button>
            </div>
          )}
          {!showSpinner && mission && !error && (
            <StepPreview
              mission={mission}
              isLaunching={isLaunching}
              launchError={launchError?.message ?? null}
              onLaunch={handleLaunch}
              onDifferent={handleDifferent}
            />
          )}
        </>
      )}
    </div>
  );
}
