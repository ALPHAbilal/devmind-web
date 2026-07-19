"use client";

import { useState, type KeyboardEvent } from "react";
import "./step-shape.css";
import { TIME_CHIPS, type NotebookGoal, type TimeChipValue } from "./types";

const GOALS: Array<{
  key: NotebookGoal;
  icon: string;
  name: string;
  desc: string;
}> = [
  {
    key: "build",
    icon: "🔨",
    name: "Build something real",
    desc: "Working project to use or show",
  },
  {
    key: "understand",
    icon: "🧠",
    name: "Understand concepts",
    desc: "Deep understanding, not just code",
  },
  {
    key: "interview",
    icon: "💼",
    name: "Interview prep",
    desc: "Practice patterns interviewers test",
  },
  {
    key: "work",
    icon: "🚀",
    name: "Solve a work problem",
    desc: "Learn what I need for a task",
  },
];

const TAG_SUGGESTIONS: Record<string, string[]> = {
  python: ["variables", "loops", "functions", "lists", "dict", "pip"],
  react: ["JSX", "components", "props", "JavaScript", "HTML/CSS", "npm"],
  sql: ["SELECT", "WHERE", "INSERT", "tables", "primary keys"],
  git: ["git add", "git commit", "git push", "staging area", "terminal"],
};

function suggestionsFor(topic: string): string[] {
  const t = topic.toLowerCase();
  for (const [key, list] of Object.entries(TAG_SUGGESTIONS)) {
    if (t.includes(key)) return list;
  }
  return ["variables", "functions", "loops", "basics"];
}

interface StepShapeProps {
  topic: string;
  time: TimeChipValue;
  goal: NotebookGoal | null;
  known: string[];
  customConstraint: string;
  onCommit: (next: {
    time: TimeChipValue;
    goal: NotebookGoal | null;
    known: string[];
    customConstraint: string;
  }) => void;
  onSkip: () => void;
}

export function StepShape({
  topic,
  time,
  goal,
  known,
  customConstraint,
  onCommit,
  onSkip,
}: StepShapeProps) {
  const [localTime, setLocalTime] = useState<TimeChipValue>(time);
  const [localGoal, setLocalGoal] = useState<NotebookGoal | null>(goal);
  const [tags, setTags] = useState<string[]>(known);
  const [tagDraft, setTagDraft] = useState("");
  const [constraint, setConstraint] = useState(customConstraint);

  const suggestions = suggestionsFor(topic).filter((s) => !tags.includes(s));

  function addTag(t: string) {
    const v = t.trim();
    if (!v || tags.includes(v)) return;
    setTags([...tags, v]);
    setTagDraft("");
  }

  function removeTag(idx: number) {
    setTags(tags.filter((_, i) => i !== idx));
  }

  function onTagKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && tagDraft.trim()) {
      e.preventDefault();
      addTag(tagDraft);
    } else if (e.key === "Backspace" && !tagDraft && tags.length > 0) {
      removeTag(tags.length - 1);
    }
  }

  function autoGrowTextarea(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 100)}px`;
  }

  function generate() {
    onCommit({
      time: localTime,
      goal: localGoal,
      known: tags,
      customConstraint: constraint.trim(),
    });
  }

  const canGenerate = localGoal !== null;

  return (
    <>
      <div className="constraints-header">
        <h1 className="constraints-title">Shape your notebook</h1>
        <p className="constraints-subtitle">
          Set constraints so the AI builds a notebook that fits your reality. Everything here is optional.
        </p>
      </div>

      <div className="constraint-section">
        <div className="constraint-label">
          <span className="constraint-label-icon">⏱</span> Time budget
        </div>
        <div className="chip-row">
          {TIME_CHIPS.map((chip) => (
            <button
              key={chip.value}
              type="button"
              className={`chip${localTime === chip.value ? " is-selected" : ""}`}
              onClick={() => setLocalTime(chip.value)}
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      <div className="constraint-section">
        <div className="constraint-label">
          <span className="constraint-label-icon">🎯</span> What&apos;s this for?
        </div>
        <div className="goal-grid">
          {GOALS.map((g) => (
            <button
              key={g.key}
              type="button"
              className={`goal-card${localGoal === g.key ? " is-selected" : ""}`}
              onClick={() => setLocalGoal(g.key)}
            >
              <span className="goal-icon">{g.icon}</span>
              <div>
                <div className="goal-name">{g.name}</div>
                <div className="goal-desc">{g.desc}</div>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="constraint-section">
        <div className="constraint-label">
          <span className="constraint-label-icon">✓</span> I already know
        </div>
        <div className="tag-input-wrap">
          {tags.map((t, i) => (
            <span key={`${t}-${i}`} className="tag">
              {t}
              <button
                type="button"
                className="tag-remove"
                onClick={() => removeTag(i)}
                aria-label={`Remove ${t}`}
              >
                ×
              </button>
            </span>
          ))}
          <input
            className="tag-input"
            type="text"
            placeholder="Type a concept and press Enter..."
            autoComplete="off"
            value={tagDraft}
            onChange={(e) => setTagDraft(e.target.value)}
            onKeyDown={onTagKey}
          />
        </div>
        {suggestions.length > 0 && (
          <div className="tag-suggestions">
            {suggestions.map((s) => (
              <button
                key={s}
                type="button"
                className="tag-suggestion"
                onClick={() => addTag(s)}
              >
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="constraint-section">
        <div className="constraint-label">
          <span className="constraint-label-icon">✎</span> Anything else?
        </div>
        <textarea
          className="custom-input"
          rows={1}
          placeholder={'e.g. "Use TypeScript", "No class components"...'}
          value={constraint}
          onChange={(e) => {
            setConstraint(e.target.value);
            autoGrowTextarea(e.target);
          }}
        />
      </div>

      <div className="wizard-action-row">
        <button
          type="button"
          className="wizard-btn-primary"
          onClick={generate}
          disabled={!canGenerate}
        >
          ✨ Generate Notebook
        </button>
      </div>
      <button type="button" className="wizard-skip-link" onClick={onSkip}>
        Skip — generate with defaults
      </button>
    </>
  );
}
