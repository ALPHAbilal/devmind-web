import type { Cell } from "./types";

/**
 * Output cell — renders captured stdout/stderr from Lane L's POST /runs.
 *
 * The notebook_cells row stores raw text in `content`. Lane L formats this
 * via the pytest test runner, so we parse the textual summary line for the
 * status pill / duration / counts rather than introducing a parallel schema.
 *
 * Parsing is best-effort: if no pytest-style summary is found, we still
 * render the body and infer status from exit_code.
 */
export function OutputCell({
  cell,
  hintPending = false,
}: {
  cell: Cell;
  /** True when the failure streak for the attached code cell is 1 or 2 —
   *  drives the "Haiku is preparing a hint…" callout. */
  hintPending?: boolean;
}) {
  const exit = cell.exit_code ?? 0;
  const ansiStripped = stripAnsi(cell.content);
  const summary = parsePytestSummary(ansiStripped);
  const status = computeStatus(exit, summary);
  const highlighted = highlightTraceback(ansiStripped);

  const statusLabel: Record<typeof status, string> = {
    passed: "Passed",
    failed: "Failed",
    errored: "Error",
    empty: exit === 0 ? "Output" : `Exit ${exit}`,
  };

  return (
    <div
      className={`cell cell-output cell-output-${status}`}
      data-cell-id={cell.id}
      data-attached-to={cell.attached_to ?? undefined}
    >
      <div className="cell-output-header">
        <span className={`cell-output-pill pill-${status}`}>
          {statusLabel[status]}
        </span>
        {summary ? (
          <>
            {summary.counts ? (
              <span className="cell-output-counts">{summary.counts}</span>
            ) : null}
            {summary.duration ? (
              <span className="cell-output-duration">{summary.duration}</span>
            ) : null}
          </>
        ) : null}
      </div>

      {hintPending && status !== "passed" ? (
        <div className="cell-output-hint" role="status">
          Haiku is preparing a hint…
        </div>
      ) : null}

      <pre
        className="cell-output-body"
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

type OutputStatus = "passed" | "failed" | "errored" | "empty";

interface PytestSummary {
  counts: string | null;
  duration: string | null;
  hasFailures: boolean;
  hasErrors: boolean;
}

function computeStatus(
  exit: number,
  summary: PytestSummary | null,
): OutputStatus {
  if (summary) {
    if (summary.hasErrors) return "errored";
    if (summary.hasFailures) return "failed";
    return "passed";
  }
  if (exit === 0) return "empty";
  return "failed";
}

// e.g. "===== 3 passed, 1 failed in 0.42s ====="
//      "===== 2 errors in 0.10s ====="
const PYTEST_SUMMARY_RE =
  /=+\s*([\w,\s]*?(?:passed|failed|error[s]?|skipped|xfailed|xpassed)[\w,\s]*?)\s+in\s+([\d.]+s)\s*=+/i;

function parsePytestSummary(text: string): PytestSummary | null {
  const m = text.match(PYTEST_SUMMARY_RE);
  if (!m) return null;
  const inner = m[1].trim();
  const duration = `in ${m[2]}`;
  const hasFailures = /\d+\s+failed/i.test(inner);
  const hasErrors = /\d+\s+error/i.test(inner);
  return { counts: inner, duration, hasFailures, hasErrors };
}

// Strip ANSI escape sequences (pytest emits color codes when stdout is a TTY).
// Single regex covers CSI, OSC, and basic SGR forms.
function stripAnsi(s: string): string {
  // eslint-disable-next-line no-control-regex
  return s.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "");
}

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>]/g, (c) => HTML_ESCAPE[c]);
}

// Tiny regex highlighter for pytest tracebacks — no Prism dependency.
// Targets:
//   - "File ".../foo.py", line 12, in bar"
//   - "TypeError: ..."  (any CapitalizedWord ending in Error/Exception)
//   - "E   assert ..."  (pytest E-prefix lines)
//   - "FAILED tests/..."  / "PASSED tests/..."
function highlightTraceback(text: string): string {
  const escaped = escapeHtml(text);
  return escaped
    .replace(
      /^(E\s+.*)$/gm,
      '<span class="tb-error-line">$1</span>',
    )
    .replace(
      /^(FAILED\s+.*)$/gm,
      '<span class="tb-failed">$1</span>',
    )
    .replace(
      /^(PASSED\s+.*)$/gm,
      '<span class="tb-passed">$1</span>',
    )
    .replace(
      /(File\s+&quot;[^&]+&quot;,\s+line\s+\d+(?:,\s+in\s+\S+)?)/g,
      '<span class="tb-file">$1</span>',
    )
    .replace(
      /\b([A-Z][a-zA-Z]*(?:Error|Exception|Warning))\b(:\s*[^\n]*)?/g,
      '<span class="tb-exc">$1</span>$2',
    );
}
