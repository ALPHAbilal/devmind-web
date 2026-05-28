"use client";

import { useState } from "react";
import "./design-test.css";

/* ============================================================================
 * /design-test
 *
 * Visual verifier for devmind_web/DESIGN_TOKENS.md.
 *
 * Acceptance test (per BUILD_PLAN Task 3.2):
 *   Open this page side-by-side with demo-mission-creation.html and
 *   demo-notebook.html. Every swatch / type sample / radius / brand mark
 *   should match what the demos render.
 * ========================================================================== */

type Theme = "mission" | "notebook";

const DevMindMark = () => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="#e8f5e0"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M17 8c2.2 2 3 5.2 3 8-3 0-6-.8-8-3-2.2-2.4-3-5.5-3-8.5 3.2 0 6 1 8 3.5z" />
    <path d="M9 12.5c-1.5 1.2-2 3-2.2 4.5" />
  </svg>
);

/* ─── Token registries (verbatim from DESIGN_TOKENS.md §1, §9) ─────────── */

type TokenRow = [name: string, value: string];

const missionBgTokens: TokenRow[] = [
  ["--bg-base", "#1a1d18"],
  ["--bg-subtle", "#22261f"],
  ["--bg-elevated", "#2a2f26"],
  ["--bg-interactive", "#353b30"],
  ["--bg-interactive-hover", "#3f4639"],
];

const missionTextTokens: TokenRow[] = [
  ["--text-primary", "#f4f5f2"],
  ["--text-secondary", "#b8bdb2"],
  ["--text-tertiary", "#7d8477"],
  ["--text-quaternary", "#565b51"],
];

const missionAccentTokens: TokenRow[] = [
  ["--accent-green", "#9cd594"],
  ["--accent-green-soft", "rgba(156,213,148,0.12)"],
  ["--accent-green-border", "rgba(156,213,148,0.25)"],
  ["--accent-green-glow", "rgba(156,213,148,0.08)"],
];

const missionBorderTokens: TokenRow[] = [
  ["--border-subtle", "rgba(255,255,255,0.06)"],
  ["--border-medium", "rgba(255,255,255,0.1)"],
];

const notebookBgTokens: TokenRow[] = [
  ["--bg-deepest", "#1a2418"],
  ["--bg-app", "#303F2D"],
  ["--bg-surface", "#3b4b38"],
  ["--bg-card", "#424940"],
  ["--bg-elevated", "#52634f"],
  ["--bg-hover", "#5a6b56"],
];

const notebookTextTokens: TokenRow[] = [
  ["--text-primary", "#e8eaed"],
  ["--text-secondary", "#baccb3"],
  ["--text-muted", "#84967f"],
  ["--text-disabled", "#6b7c66"],
];

const notebookAccentTokens: TokenRow[] = [
  ["--accent-green", "#9cd594"],
  ["--accent-green-bright", "#b7f1ae"],
  ["--accent-green-dim", "#679e62"],
  ["--accent-teal", "#a0cfd4"],
  ["--accent-teal-dim", "#6b989d"],
  ["--accent-yellow", "#fbbf24"],
  ["--accent-pink", "#f472b6"],
  ["--accent-red", "#de3730"],
  ["--accent-purple", "#a78bfa"],
];

const notebookBorderTokens: TokenRow[] = [
  ["--border-subtle", "rgba(255,255,255,0.08)"],
  ["--border-medium", "rgba(255,255,255,0.14)"],
  ["--border-strong", "rgba(255,255,255,0.22)"],
];

const missionRadii: Array<[string, string]> = [
  ["--radius-sm", "8px"],
  ["--radius-md", "12px"],
  ["--radius-lg", "16px"],
  ["--radius-full", "9999px"],
];

const notebookRadii: Array<[string, string]> = [
  ["--radius-sm", "8px"],
  ["--radius-md", "12px"],
  ["--radius-lg", "16px"],
];

/* ─── Type scale rows (§2.2 verbatim) ──────────────────────────────────── */

type TypeRow = {
  label: string;
  sample: string;
  style: React.CSSProperties;
};

const missionTypeRows: TypeRow[] = [
  {
    label: "main-title · display · 32px / 400 / -0.02em",
    sample: "What do you want to learn today?",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 32,
      fontWeight: 400,
      letterSpacing: "-0.02em",
      lineHeight: 1.2,
    },
  },
  {
    label: "constraints-title · display · 28px / 400",
    sample: "Shape your mission",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 28,
      fontWeight: 400,
    },
  },
  {
    label: "mission-title · display · 26px / 400 / 1.3",
    sample: "Build a Task Tracker with React Hooks",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 26,
      fontWeight: 400,
      lineHeight: 1.3,
    },
  },
  {
    label: "ai-question · display · 24px / 400",
    sample: "What's your experience level?",
    style: {
      fontFamily: "var(--font-display)",
      fontSize: 24,
      fontWeight: 400,
    },
  },
  {
    label: "main-input · body · 18px",
    sample: "I want to learn React hooks",
    style: { fontFamily: "var(--font-body)", fontSize: 18 },
  },
  {
    label: "ai-message · body · 16px / 1.7",
    sample: "Great! React hooks are powerful tools for managing state.",
    style: { fontFamily: "var(--font-body)", fontSize: 16, lineHeight: 1.7 },
  },
  {
    label: "btn-primary · body · 14px / 600",
    sample: "✨ Generate Mission",
    style: { fontFamily: "var(--font-body)", fontSize: 14, fontWeight: 600 },
  },
  {
    label: "learn-item · body · 14px",
    sample: "useState for managing component state",
    style: { fontFamily: "var(--font-body)", fontSize: 14 },
  },
  {
    label: "constraints-subtitle · body · 14px / tertiary",
    sample: "Set constraints so the AI builds a mission that fits your reality.",
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--text-tertiary)",
    },
  },
  {
    label: "greeting · body · 14px / 400",
    sample: "Welcome back, Alex",
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 14,
      color: "var(--text-tertiary)",
    },
  },
  {
    label: "meta-item · body · 13px",
    sample: "⏱ ~45 minutes",
    style: { fontFamily: "var(--font-body)", fontSize: 13 },
  },
  {
    label: "chip · body · 13px / 500",
    sample: "1 hour",
    style: { fontFamily: "var(--font-body)", fontSize: 13, fontWeight: 500 },
  },
  {
    label: "goal-desc · body · 11px / 1.4 / tertiary",
    sample: "Working project to use or show",
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      lineHeight: 1.4,
      color: "var(--text-tertiary)",
    },
  },
  {
    label:
      "ai-name · body · 12px / 600 / 0.05em / uppercase / accent-green",
    sample: "DevMind",
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 12,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
      color: "var(--accent-green)",
    },
  },
  {
    label: "constraint-label · body · 11px / 600 / 0.08em / uppercase",
    sample: "⏱ TIME BUDGET",
    style: {
      fontFamily: "var(--font-body)",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.08em",
      color: "var(--text-quaternary)",
    },
  },
];

const notebookTypeRows: TypeRow[] = [
  {
    label: "body · 16px / 1.6 / Segoe UI",
    sample: "The quick brown fox jumps over the lazy dog.",
    style: { fontFamily: "var(--font-ui)", fontSize: 16, lineHeight: 1.6 },
  },
  {
    label: "panel-title · 11px / 600 / 1.2px / uppercase",
    sample: "JOURNEYS",
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: 11,
      fontWeight: 600,
      letterSpacing: "1.2px",
      textTransform: "uppercase",
      color: "var(--text-muted)",
    },
  },
  {
    label: "panel-section-label · 10px / 600 / 1px / uppercase",
    sample: "ACTIVE",
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: 10,
      fontWeight: 600,
      letterSpacing: "1px",
      textTransform: "uppercase",
      color: "var(--text-disabled)",
    },
  },
  {
    label: "journey-name · 12.5px / 600",
    sample: "Learn Python — Flask App",
    style: { fontFamily: "var(--font-ui)", fontSize: 12.5, fontWeight: 600 },
  },
  {
    label: "journey-step · 11.5px",
    sample: "● Set up the project",
    style: { fontFamily: "var(--font-ui)", fontSize: 11.5 },
  },
  {
    label: "session-title · 12.5px / 500",
    sample: "Debugging the Flask import error",
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: 12.5,
      fontWeight: 500,
      color: "var(--text-secondary)",
    },
  },
  {
    label: "chat-input · 13px / 1.5",
    sample: "Why does my function return None?",
    style: { fontFamily: "var(--font-ui)", fontSize: 13, lineHeight: 1.5 },
  },
  {
    label: "code-action-btn · 11px / 500",
    sample: "▶ RUN",
    style: { fontFamily: "var(--font-ui)", fontSize: 11, fontWeight: 500 },
  },
  {
    label: "code · Cascadia Code · 13px",
    sample: 'def hello():\n    return "world"',
    style: {
      fontFamily: "var(--font-code)",
      fontSize: 13,
      whiteSpace: "pre",
      display: "inline-block",
    },
  },
  {
    label: "session-meta · 10.5px / disabled",
    sample: "Yesterday · 12 messages",
    style: {
      fontFamily: "var(--font-ui)",
      fontSize: 10.5,
      color: "var(--text-disabled)",
    },
  },
];

/* ─── Components ─────────────────────────────────────────────────────────── */

function SwatchGroup({
  title,
  tokens,
  textOnSurface = false,
}: {
  title: string;
  tokens: Array<[string, string]>;
  textOnSurface?: boolean;
}) {
  return (
    <div>
      <h3 className="dt-section-title">{title}</h3>
      <div className="dt-swatch-grid">
        {tokens.map(([name, value]) => (
          <div className="dt-swatch" key={name}>
            {textOnSurface ? (
              <div className="dt-text-swatch" style={{ color: value }}>
                Aa
              </div>
            ) : (
              <div className="dt-swatch-chip" style={{ background: value }} />
            )}
            <div className="dt-swatch-meta">
              <span className="dt-swatch-name">{name}</span>
              <span className="dt-swatch-value">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function TypeBlock({ title, rows }: { title: string; rows: TypeRow[] }) {
  return (
    <div>
      <h3 className="dt-section-title">{title}</h3>
      <div className="dt-type-list">
        {rows.map((r, i) => (
          <div className="dt-type-row" key={i}>
            <span className="dt-type-label">{r.label}</span>
            <span className="dt-type-sample" style={r.style}>
              {r.sample}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RadiusGrid({
  title,
  radii,
}: {
  title: string;
  radii: Array<[string, string]>;
}) {
  return (
    <div>
      <h3 className="dt-section-title">{title}</h3>
      <div className="dt-radius-grid">
        {radii.map(([name, value]) => (
          <div className="dt-radius-box" key={name}>
            <div
              className={`dt-radius-shape${
                value === "9999px" ? " full" : ""
              }`}
              style={{ borderRadius: value }}
            />
            <span className="dt-radius-name">{name}</span>
            <span className="dt-radius-value">{value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BrandRow() {
  return (
    <div>
      <h3 className="dt-section-title">Brand mark (DESIGN_TOKENS §8)</h3>
      <div className="dt-brand-row">
        <div className="dt-brand-mission">
          <DevMindMark />
        </div>
        <div className="dt-brand-meta">
          <span className="dt-brand-title">Mission rail · 32×32 · radius 10</span>
          <span className="dt-brand-desc">
            linear-gradient(145deg, #7bc474, #4a8a44) · shadow 0 2px 8px
            rgba(74,138,68,0.3)
          </span>
        </div>
        <div style={{ width: 24 }} />
        <div className="dt-brand-notebook">
          <DevMindMark />
        </div>
        <div className="dt-brand-meta">
          <span className="dt-brand-title">Notebook rail · 28×28 · radius 8</span>
          <span className="dt-brand-desc">
            radial-gradient(circle at 30% 30%, #83cc7c, #4e924a 55%, #3a7136)
          </span>
        </div>
      </div>
    </div>
  );
}

export default function DesignTestPage() {
  const [theme, setTheme] = useState<Theme>("mission");

  const isMission = theme === "mission";
  const themeClass = isMission ? "theme-mission" : "theme-notebook";

  return (
    <main className={`dt-page ${themeClass}`}>
      <div className="dt-toolbar">
        <span className="dt-toolbar-title">
          DevMind · Design Token Verifier · Theme:{" "}
          {isMission ? "mission" : "notebook"}
        </span>
        <button
          className="dt-toolbar-toggle"
          onClick={() => setTheme(isMission ? "notebook" : "mission")}
        >
          <span className="dt-toolbar-toggle-dot" />
          Switch to .theme-{isMission ? "notebook" : "mission"}
        </button>
      </div>

      <div className="dt-content">
        {isMission ? (
          <>
            <SwatchGroup
              title="Backgrounds (mission §1.1)"
              tokens={missionBgTokens}
            />
            <SwatchGroup
              title="Text colors (mission §1.1)"
              tokens={missionTextTokens}
              textOnSurface
            />
            <SwatchGroup
              title="Accent (mission §1.1)"
              tokens={missionAccentTokens}
            />
            <SwatchGroup
              title="Borders (mission §1.1)"
              tokens={missionBorderTokens}
            />
            <TypeBlock
              title="Typography (mission §2.2)"
              rows={missionTypeRows}
            />
            <RadiusGrid
              title="Radii (mission §3)"
              radii={missionRadii}
            />
            <BrandRow />
          </>
        ) : (
          <>
            <SwatchGroup
              title="Backgrounds (notebook §1.2)"
              tokens={notebookBgTokens}
            />
            <SwatchGroup
              title="Text colors (notebook §1.2)"
              tokens={notebookTextTokens}
              textOnSurface
            />
            <SwatchGroup
              title="Accent (notebook §1.2)"
              tokens={notebookAccentTokens}
            />
            <SwatchGroup
              title="Borders (notebook §1.2)"
              tokens={notebookBorderTokens}
            />
            <TypeBlock
              title="Typography (notebook §2.2)"
              rows={notebookTypeRows}
            />
            <RadiusGrid
              title="Radii (notebook §3)"
              radii={notebookRadii}
            />
            <BrandRow />
          </>
        )}
      </div>
    </main>
  );
}
