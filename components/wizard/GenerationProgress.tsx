"use client";

import { useEffect, useMemo, useState } from "react";

/** How long each stage label holds before advancing. */
const STAGE_MS = 7000;

/**
 * Plain-English generation stages, personalized with the learner's topic.
 * The last item holds until the notebook actually arrives (the cycle clamps).
 *
 * SEAM (SCOPE_DOCS_PIPELINE D1): when generation becomes agentic the backend
 * can emit real step events over the `notebooks:id=<id>` Realtime channel. Swap
 * this timed cycle for those events here — callers only see the returned label.
 */
function buildStages(topic: string): string[] {
  const t = topic.trim();
  return [
    "Understanding what you want to learn…",
    t ? `Reading up on ${t}…` : "Reading up on your topic…",
    "Finding the key ideas to cover…",
    "Designing your learning steps…",
    "Shaping it to your level and goals…",
    "Almost ready…",
  ];
}

/**
 * Advances a stage index on a timer while `active`, clamped at the final stage.
 * Resets to the first stage whenever generation stops. Returns the live label.
 */
export function useGenerationStage(active: boolean, topic: string): string {
  const stages = useMemo(() => buildStages(topic), [topic]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active) {
      setIndex(0);
      return;
    }
    setIndex(0);
    const last = stages.length - 1;
    const id = window.setInterval(() => {
      setIndex((i) => (i >= last ? last : i + 1));
    }, STAGE_MS);
    return () => window.clearInterval(id);
  }, [active, stages.length]);

  return stages[Math.min(index, stages.length - 1)];
}

/**
 * Cycling generation label. `key={label}` re-mounts the span on each change so
 * the CSS fade animation replays per stage.
 */
export function GenerationProgress({
  active,
  topic,
}: {
  active: boolean;
  topic: string;
}) {
  const label = useGenerationStage(active, topic);
  return (
    <div className="wizard-gen-stage" aria-live="polite">
      <span key={label} className="wizard-gen-stage-label">
        {label}
      </span>
    </div>
  );
}
