"use client";

import { useState, type KeyboardEvent } from "react";
import "./step-cards.css";

const PATHS = [
  { label: "Python", emoji: "🐍" },
  { label: "React", emoji: "⚛️" },
  { label: "Web Dev", emoji: "🌐" },
  { label: "SQL", emoji: "🗃️" },
  { label: "Git", emoji: "📦" },
  { label: "More", emoji: "→" },
];

interface StepTopicProps {
  userEmail: string;
  initialTopic: string;
  onPick: (topic: string) => void;
}

function deriveFirstName(email: string): string {
  const local = email.split("@")[0] ?? "";
  const stripped = local.replace(/[._+-].*$/, "").replace(/\d+$/, "");
  if (!stripped) return "there";
  return stripped.charAt(0).toUpperCase() + stripped.slice(1).toLowerCase();
}

export function StepTopic({ userEmail, initialTopic, onPick }: StepTopicProps) {
  const [value, setValue] = useState(initialTopic);
  const [selected, setSelected] = useState<string>(initialTopic);

  function pick(topic: string) {
    if (!topic.trim()) return;
    setSelected(topic);
    onPick(topic.trim());
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      pick(value);
    }
  }

  return (
    <div className="wizard-content">
      <div className="wizard-greeting">Welcome back, {deriveFirstName(userEmail)}</div>
      <h1 className="wizard-title">What do you want to learn today?</h1>

      <div className="wizard-input-wrap">
        <input
          className="wizard-input"
          type="text"
          placeholder="I want to learn..."
          autoComplete="off"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          autoFocus
        />
      </div>

      <div className="path-grid">
        {PATHS.map((p) => (
          <button
            key={p.label}
            type="button"
            className={`path-card${selected === p.label ? " is-selected" : ""}`}
            onClick={() => pick(p.label)}
          >
            <span className="path-emoji">{p.emoji}</span>
            <span className="path-label">{p.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
