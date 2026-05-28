"use client";

import { useMemo } from "react";
import "./step-cards.css";
import { LogoMark } from "@/components/sidebar/icons";
import type { MissionLevel } from "./types";

const LEVELS: Array<{
  key: MissionLevel;
  emoji: string;
  title: string;
  desc: string;
}> = [
  {
    key: "beginner",
    emoji: "🌱",
    title: "Beginner",
    desc: "New to this topic or programming",
  },
  {
    key: "intermediate",
    emoji: "🌿",
    title: "Some Experience",
    desc: "Know the basics, want deeper",
  },
  {
    key: "advanced",
    emoji: "🌳",
    title: "Experienced",
    desc: "Used it, want to master it",
  },
];

/** Topic → contextual feedback. Real AI feedback is post-MVP. */
const TOPIC_HINTS: Array<[RegExp, string]> = [
  [/react/i, "<strong>React</strong> rewards learners who tinker — small components first, big patterns later."],
  [/python/i, "<strong>Python</strong> is a generous first language — readable syntax, deep when you need it."],
  [/sql|database/i, "<strong>SQL</strong> is half declarative thinking, half learning your database's quirks."],
  [/git/i, "<strong>Git</strong> clicks the moment you mentally separate the working tree, the index, and history."],
  [/web|html|css/i, "<strong>Web Dev</strong> stays fun if you treat the browser as a layout puzzle, not a framework arms race."],
];

function aiBubbleHtml(topic: string): string {
  const trimmed = topic.trim();
  if (!trimmed) {
    return "Tell me what you want to learn and I'll shape a mission around it.";
  }
  for (const [pat, msg] of TOPIC_HINTS) {
    if (pat.test(trimmed)) return msg;
  }
  return `<strong>${escapeHtml(trimmed)}</strong> — good pick. Let's shape a mission around it.`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

interface StepLevelProps {
  topic: string;
  selected: MissionLevel | null;
  onPick: (level: MissionLevel) => void;
  onEdit: () => void;
}

export function StepLevel({ topic, selected, onPick, onEdit }: StepLevelProps) {
  const html = useMemo(() => aiBubbleHtml(topic), [topic]);

  return (
    <>
      <div className="ai-section">
        <div className="ai-header">
          <div className="ai-avatar">
            <LogoMark />
          </div>
          <span className="ai-name">DevMind</span>
        </div>
        <p
          className="ai-message"
          dangerouslySetInnerHTML={{ __html: html }}
        />
        <h2 className="ai-question">What&apos;s your experience level?</h2>
      </div>

      <div className="level-grid">
        {LEVELS.map((l) => (
          <button
            key={l.key}
            type="button"
            className={`level-card${selected === l.key ? " is-selected" : ""}`}
            onClick={() => onPick(l.key)}
          >
            <div className="level-emoji">{l.emoji}</div>
            <div className="level-title">{l.title}</div>
            <div className="level-desc">{l.desc}</div>
          </button>
        ))}
      </div>

      <div className="wizard-user-context">
        <span className="wizard-user-context-text">
          You said: &ldquo;<strong>{topic}</strong>&rdquo;
        </span>
        <button type="button" className="wizard-edit-btn" onClick={onEdit}>
          Edit
        </button>
      </div>
    </>
  );
}
