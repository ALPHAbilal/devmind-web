"use client";

import { useEffect, useMemo, useState } from "react";
import Editor, { type Monaco, type OnMount } from "@monaco-editor/react";
import {
  buildMonacoTheme,
  DEVMIND_MONACO_THEME,
  readThemeColors,
} from "@/lib/monaco-theme";
import { useNotebook, type Puzzle } from "@/components/notebook/NotebookProvider";
import "./puzzle-pane.css";

type Step = "framing" | "hypothesis" | "try_it" | "fix" | "generalize";

const STEP_ORDER: Step[] = ["framing", "hypothesis", "try_it", "fix", "generalize"];
const STEP_LABELS: Record<Step, string> = {
  framing: "Framing",
  hypothesis: "Hypothesis",
  try_it: "Try it",
  fix: "Fix",
  generalize: "Generalize",
};

interface FixAttempt {
  attempt_n: number;
  code: string;
  test_result: "pass" | "fail";
  hint?: string;
}

export function PuzzlePane({ puzzle }: { puzzle: Puzzle }) {
  // The pane is a fully-controlled view of the puzzle row from Realtime.
  // Local view-only state: which step the learner is currently looking at
  // (they can skip ahead from framing → hypothesis without hitting the
  // backend) and form inputs that haven't been submitted yet.
  const status = puzzle.status;
  const backendStep = puzzle.step as Step;

  const [viewStep, setViewStep] = useState<Step>(backendStep);
  useEffect(() => {
    // When backend advances ahead of the view, follow it.
    if (stepIndex(backendStep) > stepIndex(viewStep)) setViewStep(backendStep);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendStep]);

  const completed = status === "completed";
  const abandoned = status === "abandoned";

  return (
    <aside
      className="puzzle-pane"
      role="complementary"
      aria-label="Puzzle pane"
    >
      <PaneHeader puzzle={puzzle} />
      <StepIndicator
        currentStep={completed ? "generalize" : viewStep}
        backendStep={backendStep}
        completed={completed}
      />

      <div className="puzzle-pane-body">
        {completed ? (
          <CompletedView />
        ) : abandoned ? (
          <AbandonedView />
        ) : viewStep === "framing" ? (
          <FramingView
            puzzle={puzzle}
            onAdvance={() => setViewStep("hypothesis")}
          />
        ) : viewStep === "hypothesis" ? (
          <HypothesisView puzzle={puzzle} />
        ) : viewStep === "try_it" ? (
          <TryItView
            puzzle={puzzle}
            onAdvance={() => setViewStep("fix")}
          />
        ) : viewStep === "fix" ? (
          <FixView puzzle={puzzle} />
        ) : (
          <GeneralizeView puzzle={puzzle} />
        )}
      </div>

      {!completed && !abandoned ? <PaneFooter puzzle={puzzle} /> : null}
    </aside>
  );
}

function stepIndex(s: Step): number {
  return STEP_ORDER.indexOf(s);
}

function PaneHeader({ puzzle }: { puzzle: Puzzle }) {
  const { setPuzzle } = useNotebook();
  const closable =
    puzzle.status === "completed" || puzzle.status === "abandoned";
  return (
    <header className="puzzle-pane-header">
      <div className="puzzle-pane-eyebrow">
        <span className="puzzle-pane-eyebrow-dot" />
        <span>Debug puzzle</span>
      </div>
      <h2 className="puzzle-pane-title">
        {puzzle.micro_challenge_id || "Puzzle"}
      </h2>
      {closable ? (
        <button
          type="button"
          className="puzzle-pane-close"
          onClick={() => setPuzzle(null)}
          aria-label="Close puzzle pane"
        >
          ×
        </button>
      ) : null}
    </header>
  );
}

function StepIndicator({
  currentStep,
  backendStep,
  completed,
}: {
  currentStep: Step;
  backendStep: Step;
  completed: boolean;
}) {
  return (
    <ol className="puzzle-pane-steps" aria-label="Puzzle progress">
      {STEP_ORDER.map((s) => {
        const idx = stepIndex(s);
        const isCurrent = !completed && s === currentStep;
        const isDone = completed || idx < stepIndex(backendStep);
        return (
          <li
            key={s}
            className={`puzzle-pane-step${isCurrent ? " is-current" : ""}${
              isDone ? " is-done" : ""
            }`}
            aria-current={isCurrent ? "step" : undefined}
          >
            <span className="puzzle-pane-step-dot" />
            <span className="puzzle-pane-step-label">{STEP_LABELS[s]}</span>
          </li>
        );
      })}
    </ol>
  );
}

function PaneFooter({ puzzle }: { puzzle: Puzzle }) {
  const [submitting, setSubmitting] = useState(false);
  async function abandon() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await fetch("/api/puzzle/abandon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzle_id: puzzle.id }),
      });
    } finally {
      setSubmitting(false);
    }
  }
  return (
    <footer className="puzzle-pane-footer">
      <button
        type="button"
        className="puzzle-pane-abandon"
        onClick={() => void abandon()}
        disabled={submitting}
      >
        Abandon puzzle
      </button>
    </footer>
  );
}

function FramingView({
  puzzle,
  onAdvance,
}: {
  puzzle: Puzzle;
  onAdvance: () => void;
}) {
  const text = puzzle.framing_text?.trim() ?? "";
  return (
    <section className="puzzle-section">
      <h3 className="puzzle-section-title">What you got right</h3>
      <div className="puzzle-prose">
        {text.length === 0 ? (
          <p className="puzzle-pane-muted">Haiku is framing the problem…</p>
        ) : (
          text.split("\n\n").map((p, i) => <p key={i}>{p}</p>)
        )}
      </div>
      <div className="puzzle-section-actions">
        <button
          type="button"
          className="puzzle-pane-primary"
          onClick={onAdvance}
        >
          Skip framing → Hypothesis
        </button>
      </div>
    </section>
  );
}

function HypothesisView({ puzzle }: { puzzle: Puzzle }) {
  const [text, setText] = useState(puzzle.user_hypothesis ?? "");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const submitted = !!puzzle.user_hypothesis;

  async function submit() {
    if (!text.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/puzzle/hypothesis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzle_id: puzzle.id, text: text.trim() }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message || `Failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="puzzle-section">
      <h3 className="puzzle-section-title">The question for you</h3>
      <p className="puzzle-pane-muted">
        Before we probe — what do you think is going wrong?
      </p>
      <textarea
        className="puzzle-textarea"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="I think…"
        disabled={submitted}
      />
      {error ? <p className="puzzle-pane-error">{error}</p> : null}
      <div className="puzzle-section-actions">
        <button
          type="button"
          className="puzzle-pane-primary"
          onClick={() => void submit()}
          disabled={submitting || submitted || !text.trim()}
        >
          {submitted
            ? "Submitted"
            : submitting
              ? "Submitting…"
              : "Submit hypothesis"}
        </button>
      </div>
    </section>
  );
}

function TryItView({
  puzzle,
  onAdvance,
}: {
  puzzle: Puzzle;
  onAdvance: () => void;
}) {
  const [requesting, setRequesting] = useState(false);
  const probe = puzzle.probe_code?.trim() ?? "";

  async function requestProbe() {
    if (requesting) return;
    setRequesting(true);
    try {
      await fetch("/api/puzzle/try-it", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzle_id: puzzle.id }),
      });
    } finally {
      setRequesting(false);
    }
  }

  return (
    <section className="puzzle-section">
      <h3 className="puzzle-section-title">Try it</h3>
      {probe.length === 0 ? (
        <>
          <p className="puzzle-pane-muted">
            We'll write a small probe to test your hypothesis.
          </p>
          <div className="puzzle-section-actions">
            <button
              type="button"
              className="puzzle-pane-primary"
              onClick={() => void requestProbe()}
              disabled={requesting}
            >
              {requesting ? "Generating…" : "Generate probe"}
            </button>
          </div>
        </>
      ) : (
        <>
          <ReadOnlyCode code={probe} language="python" />
          <p className="puzzle-pane-muted">
            Run the probe from the notebook cell that appeared, then continue.
          </p>
          <div className="puzzle-section-actions">
            <button
              type="button"
              className="puzzle-pane-primary"
              onClick={onAdvance}
            >
              Continue → Fix attempt
            </button>
          </div>
        </>
      )}
    </section>
  );
}

function FixView({ puzzle }: { puzzle: Puzzle }) {
  const attempts = readFixAttempts(puzzle.fix_attempts);
  const lastAttempt = attempts[attempts.length - 1];
  const passed = lastAttempt?.test_result === "pass";
  const attemptCount = attempts.length;
  const triesLeft = Math.max(0, 3 - attemptCount);

  const initialCode = lastAttempt?.code ?? puzzle.probe_code ?? "";
  const [code, setCode] = useState(initialCode);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (lastAttempt?.code && lastAttempt.code !== code) {
      setCode(lastAttempt.code);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lastAttempt?.code]);

  async function submit() {
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/puzzle/fix-attempt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ puzzle_id: puzzle.id, code }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message || `Failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="puzzle-section">
      <h3 className="puzzle-section-title">
        Fix attempt
        <span className="puzzle-section-aside">
          {triesLeft} {triesLeft === 1 ? "try" : "tries"} left
        </span>
      </h3>

      {lastAttempt ? (
        <div
          className={`puzzle-attempt-badge ${
            passed ? "is-pass" : "is-fail"
          }`}
        >
          {passed
            ? `Attempt ${lastAttempt.attempt_n}: passed`
            : `Attempt ${lastAttempt.attempt_n}: failed`}
        </div>
      ) : null}
      {!passed && lastAttempt?.hint ? (
        <p className="puzzle-hint">{lastAttempt.hint}</p>
      ) : null}
      {!passed && puzzle.probe_code ? (
        <>
          <p className="puzzle-pane-muted">New probe:</p>
          <ReadOnlyCode code={puzzle.probe_code} language="python" />
        </>
      ) : null}

      <PaneEditor value={code} onChange={setCode} readOnly={passed} />

      {error ? <p className="puzzle-pane-error">{error}</p> : null}

      <div className="puzzle-section-actions">
        <button
          type="button"
          className="puzzle-pane-primary"
          onClick={() => void submit()}
          disabled={submitting || passed || triesLeft === 0 || !code.trim()}
        >
          {submitting ? "Submitting…" : "Submit fix"}
        </button>
      </div>
    </section>
  );
}

function GeneralizeView({ puzzle }: { puzzle: Puzzle }) {
  const unlocked = puzzle.generalization_unlocked;
  const passed = puzzle.generalization_passed;
  const [code, setCode] = useState("");
  const [explanation, setExplanation] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    const trimmed = code.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/puzzle/generalization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          puzzle_id: puzzle.id,
          code: explanation.trim()
            ? `# ${explanation.trim().replace(/\n/g, "\n# ")}\n${trimmed}`
            : trimmed,
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message || `Failed (${res.status})`);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!unlocked) {
    return (
      <section className="puzzle-section">
        <h3 className="puzzle-section-title">Generalize</h3>
        <p className="puzzle-pane-muted">
          Pass the fix first to unlock generalization.
        </p>
      </section>
    );
  }

  return (
    <section className="puzzle-section">
      <h3 className="puzzle-section-title">Generalize</h3>
      <p className="puzzle-pane-muted">
        Restate the rule in your own words, then show it on a fresh example.
      </p>
      <textarea
        className="puzzle-textarea"
        rows={3}
        value={explanation}
        onChange={(e) => setExplanation(e.target.value)}
        placeholder="In one sentence: the rule is…"
        disabled={passed}
      />
      <PaneEditor value={code} onChange={setCode} readOnly={passed} />
      {error ? <p className="puzzle-pane-error">{error}</p> : null}
      <div className="puzzle-section-actions">
        <button
          type="button"
          className="puzzle-pane-primary"
          onClick={() => void submit()}
          disabled={submitting || passed || !code.trim()}
        >
          {passed
            ? "Passed"
            : submitting
              ? "Submitting…"
              : "Submit generalization"}
        </button>
      </div>
    </section>
  );
}

function CompletedView() {
  const { setPuzzle } = useNotebook();
  return (
    <section className="puzzle-section puzzle-celebrate">
      <div className="puzzle-celebrate-check" aria-hidden="true">
        ✓
      </div>
      <h3 className="puzzle-celebrate-title">AHA!</h3>
      <p className="puzzle-pane-muted">
        Your AHA cell is now in the notebook above. Keep going — the
        checkpoint waits for you.
      </p>
      <div className="puzzle-section-actions">
        <button
          type="button"
          className="puzzle-pane-primary"
          onClick={() => setPuzzle(null)}
        >
          Close pane
        </button>
      </div>
    </section>
  );
}

function AbandonedView() {
  const { setPuzzle } = useNotebook();
  return (
    <section className="puzzle-section">
      <h3 className="puzzle-section-title">Puzzle closed</h3>
      <p className="puzzle-pane-muted">
        A summary cell has been added to the notebook. You can resume the
        mission from where you left off.
      </p>
      <div className="puzzle-section-actions">
        <button
          type="button"
          className="puzzle-pane-primary"
          onClick={() => setPuzzle(null)}
        >
          Resume mission
        </button>
      </div>
    </section>
  );
}

function ReadOnlyCode({
  code,
  language,
}: {
  code: string;
  language: string;
}) {
  // Read-only render uses a <pre> instead of Monaco to keep the pane light.
  return (
    <pre className={`puzzle-readonly-code lang-${language}`}>
      <code>{code}</code>
    </pre>
  );
}

function PaneEditor({
  value,
  onChange,
  readOnly,
}: {
  value: string;
  onChange: (v: string) => void;
  readOnly: boolean;
}) {
  const handleMount: OnMount = (editor, monaco: Monaco) => {
    const colors = readThemeColors();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    monaco.editor.defineTheme(DEVMIND_MONACO_THEME, buildMonacoTheme(colors) as any);
    monaco.editor.setTheme(DEVMIND_MONACO_THEME);
  };

  const options = useMemo(
    () => ({
      readOnly,
      fontFamily: "var(--font-code)",
      fontSize: 13,
      lineHeight: 22,
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      automaticLayout: true,
      padding: { top: 10, bottom: 10 },
      renderLineHighlight: "none" as const,
      overviewRulerLanes: 0,
      overviewRulerBorder: false,
      wordWrap: "on" as const,
      tabSize: 4,
    }),
    [readOnly],
  );

  return (
    <div className="puzzle-editor">
      <Editor
        value={value}
        language="python"
        onChange={(v) => onChange(v ?? "")}
        onMount={handleMount}
        theme={DEVMIND_MONACO_THEME}
        options={options}
        loading={null}
        height={220}
      />
    </div>
  );
}

function readFixAttempts(raw: unknown): FixAttempt[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (a): a is FixAttempt =>
      typeof a === "object" &&
      a !== null &&
      typeof (a as FixAttempt).attempt_n === "number" &&
      typeof (a as FixAttempt).code === "string" &&
      ((a as FixAttempt).test_result === "pass" ||
        (a as FixAttempt).test_result === "fail"),
  );
}
