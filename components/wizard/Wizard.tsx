"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./wizard.css";
import { useRealtimeChannel } from "@/lib/realtime";
import type { Database } from "@/lib/supabase/types";
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

/** No terminal Realtime update within this window → surface a timeout error. */
const GEN_TIMEOUT_MS = 120_000;

/** Subset of the `missions` row we read off the Realtime payload. */
type MissionRow = Pick<
  Database["public"]["Tables"]["missions"]["Row"],
  "id" | "status" | "spec_json"
>;

/** Shape the backend writes into spec_json on failure. */
type MissionFailureSpec = {
  error?: { code?: string; message?: string; errors?: string[] };
};

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

  // mission_id returned by the 202; we subscribe to its row for the result.
  const [pendingMissionId, setPendingMissionId] = useState<string | null>(null);

  // Latest wizard inputs + attempt, so the Realtime callback can transparently
  // retry once on a validation failure without going stale across renders.
  const genCtxRef = useRef<{
    state: WizardState;
    exclude: string[];
    attempt: number;
  } | null>(null);

  // Client-side timeout: if no draft/failed update lands, stop the spinner.
  const genTimeoutRef = useRef<number | null>(null);

  function clearGenTimeout() {
    if (genTimeoutRef.current !== null) {
      window.clearTimeout(genTimeoutRef.current);
      genTimeoutRef.current = null;
    }
  }

  useEffect(() => clearGenTimeout, []);

  // Subscribe to the pending mission row. With an empty value the filter is
  // `id=eq.` which matches nothing — harmless until a generation starts.
  useRealtimeChannel<MissionRow>(
    "missions",
    { filter: { column: "id", value: pendingMissionId ?? "" } },
    (payload) => {
      if (payload.eventType !== "UPDATE") return;
      const row = payload.new;
      if (!row || (row.status !== "draft" && row.status !== "failed")) return;

      clearGenTimeout();

      if (row.status === "draft") {
        const spec = row.spec_json as unknown as MissionSpec;
        if (!spec.mission_id) spec.mission_id = row.id;
        setMission(spec);
        setError(null);
        setGenerating(false);
        setPendingMissionId(null);
        return;
      }

      // status === "failed"
      const fail = (row.spec_json as MissionFailureSpec | null)?.error;
      const ctx = genCtxRef.current;
      if (fail?.code === "validation_failed" && ctx && ctx.attempt === 1) {
        // Transparent single retry on validation failure.
        setPendingMissionId(null);
        runGeneration(ctx.state, ctx.exclude, 2);
        return;
      }
      setError({
        kind: fail?.code === "validation_failed" ? "validation" : "server",
        message:
          fail?.message ??
          (fail?.code === "validation_failed"
            ? "We couldn't generate a mission. Try a different topic or simpler constraints."
            : "Something went wrong generating your mission."),
        attempt: ctx?.attempt ?? 1,
      });
      setGenerating(false);
      setPendingMissionId(null);
    },
    [pendingMissionId],
  );

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
  ): Promise<{
    status: number;
    body: {
      mission_id?: string;
      status?: string;
      error?: { code?: string; message?: string };
    };
  }> {
    const res = await fetch("/api/missions/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    return { status: res.status, body };
  }

  async function runGeneration(s: WizardState, exclude: string[], attempt = 1) {
    clearGenTimeout();
    setGenerating(true);
    setMission(null);
    setError(null);
    setPendingMissionId(null);
    setExcludeVariants(exclude);
    genCtxRef.current = { state: s, exclude, attempt };

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

      // New async contract: 202 + { mission_id, status: "generating" }.
      // The result arrives later via the Realtime subscription on this row.
      if (status === 202 && body.mission_id) {
        genTimeoutRef.current = window.setTimeout(() => {
          genTimeoutRef.current = null;
          setError({
            kind: "server",
            message:
              "Mission generation is taking longer than expected. Please try again.",
            attempt,
          });
          setGenerating(false);
          setPendingMissionId(null);
        }, GEN_TIMEOUT_MS);
        setPendingMissionId(body.mission_id);
        return;
      }

      // The POST itself can still fail synchronously (auth / upstream).
      if (status === 401) {
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
      setGenerating(false);
    } catch {
      setError({
        kind: "network",
        message: "Couldn't reach the server. Check your connection and try again.",
        attempt,
      });
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
