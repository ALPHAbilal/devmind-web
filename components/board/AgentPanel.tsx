"use client";

/**
 * AgentPanel — the spec conversation surface that the board columns fold into.
 * One component for both flows:
 *   spec_lesson : "+" on To Learn / dock submit → shape what to learn
 *   spec_review : dragging Completed → Review   → shape what to review
 *
 * The agent here is a local stub (no tokens burned): it acknowledges the ask
 * and attachments, asks one clarifying round, then drafts a spec the user
 * confirms. The transcript/spec contract matches agent_sessions, so the real
 * backend slots in behind the same UI.
 */
import { useEffect, useRef, useState } from "react";
import { X } from "./icons";

export type AgentPurpose = "spec_lesson" | "spec_review";

export interface AgentAttachment {
  name: string;
  bytes: number;
  /** relative path when a whole directory was attached */
  path: string;
}

export interface SpecDraft {
  title: string;
  technology: string;
  summary: string;
  attachments: AgentAttachment[];
}

interface Msg {
  role: "agent" | "user";
  text: string;
}

interface AgentPanelProps {
  purpose: AgentPurpose;
  /** concept being reviewed (spec_review) or re-specced (spec_lesson) */
  conceptName?: string;
  /** text typed in the dock that opened this panel — becomes the first turn */
  seed?: string;
  onConfirm: (spec: SpecDraft) => void;
  onCancel: () => void;
}

/** Very light tech sniffing — the real agent will do this properly. */
const TECH_HINTS: Array<[RegExp, string]> = [
  [/\brust\b/i, "rust"],
  [/\bpython|django|flask\b/i, "python"],
  [/\breact|next\.?js\b/i, "react"],
  [/\btypescript|javascript|\bjs\b|node/i, "javascript"],
  [/\bcss|tailwind|grid|flexbox\b/i, "css"],
  [/\bsql|postgres|database\b/i, "sql"],
  [/\bdocker|container\b/i, "docker"],
  [/\bgit\b/i, "git"],
  [/\bgo(lang)?\b/i, "go"],
];

function sniffTech(text: string): string {
  for (const [re, tech] of TECH_HINTS) if (re.test(text)) return tech;
  return "general";
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1_048_576) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1_048_576).toFixed(1)} MB`;
}

export function AgentPanel({
  purpose,
  conceptName,
  seed,
  onConfirm,
  onCancel,
}: AgentPanelProps) {
  const isReview = purpose === "spec_review";
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [thinking, setThinking] = useState(false);
  const [attachments, setAttachments] = useState<AgentAttachment[]>([]);
  const [draft, setDraft] = useState<SpecDraft | null>(null);
  const userTurns = useRef(0);
  const allUserText = useRef("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const dirRef = useRef<HTMLInputElement>(null);
  const seeded = useRef(false);

  // Opening line + optional seeded first turn.
  useEffect(() => {
    if (seeded.current) return;
    seeded.current = true;
    const opener: Msg = {
      role: "agent",
      text: isReview
        ? `What should the “${conceptName}” review focus on? Attach your code to ground it.`
        : "What do you want to learn? Long and specific beats short. Attach code or a folder.",
    };
    setMsgs([opener]);
    if (seed?.trim()) {
      // the dock text arrives as the learner's first turn
      setTimeout(() => send(seed), 350);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // keep the transcript pinned to the bottom
  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight });
  }, [msgs, thinking, draft]);

  function agentReply(userText: string) {
    setThinking(true);
    const turn = ++userTurns.current;
    allUserText.current += ` ${userText}`;
    setTimeout(() => {
      setThinking(false);
      if (turn === 1) {
        setMsgs((m) => [
          ...m,
          {
            role: "agent",
            text: isReview
              ? "Quick refresh, or deep with exercises? How much time?"
              : "Your level? Hands-on or concept-first? Anything to skip?",
          },
        ]);
        return;
      }
      // turn 2+ → draft the spec
      const text = allUserText.current;
      const technology = sniffTech(text);
      const firstLine =
        (seed ?? userText).split("\n")[0].trim().slice(0, 80) || "New concept";
      const spec: SpecDraft = {
        title: isReview ? `Review: ${conceptName}` : firstLine,
        technology,
        summary: text.trim().slice(0, 500),
        attachments,
      };
      setDraft(spec);
      setMsgs((m) => [
        ...m,
        {
          role: "agent",
          text: "Draft spec — confirm to queue it, or keep refining.",
        },
      ]);
    }, 900 + Math.random() * 600);
  }

  function send(text?: string) {
    const el = taRef.current;
    const v = (text ?? el?.value ?? "").trim();
    if (!v) return;
    if (el && !text) {
      el.value = "";
      el.style.height = "auto";
    }
    setMsgs((m) => [...m, { role: "user", text: v }]);
    setDraft(null); // any new turn reopens the draft
    agentReply(v);
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    const next: AgentAttachment[] = Array.from(list).map((f) => ({
      name: f.name,
      bytes: f.size,
      path: (f as File & { webkitRelativePath?: string }).webkitRelativePath || f.name,
    }));
    setAttachments((a) => [...a, ...next]);
  }

  return (
    <div className="agent-panel">
      <div className="ap-head">
        <span className="ap-title">
          {isReview ? "Spec this review" : "Spec a new lesson"}
          {isReview && conceptName ? <b> · {conceptName}</b> : null}
        </span>
        <button className="ap-close" title="Cancel" onClick={onCancel}>
          <X />
        </button>
      </div>

      <div className="ap-log" ref={logRef}>
        {msgs.map((m, i) => (
          <div key={i} className={`ap-msg ${m.role}`}>
            {m.text}
          </div>
        ))}
        {thinking && (
          <div className="ap-msg agent thinking">
            <span className="d" />
            <span className="d" />
            <span className="d" />
          </div>
        )}
        {draft && (
          <div className="ap-spec">
            <div className="ap-spec-h">DRAFT SPEC</div>
            <div className="ap-spec-row">
              <span className="k">title</span>
              <span className="v">{draft.title}</span>
            </div>
            <div className="ap-spec-row">
              <span className="k">technology</span>
              <span className="v">{draft.technology}</span>
            </div>
            {draft.attachments.length > 0 && (
              <div className="ap-spec-row">
                <span className="k">grounded in</span>
                <span className="v">
                  {draft.attachments.length} file
                  {draft.attachments.length > 1 ? "s" : ""}
                </span>
              </div>
            )}
            <div className="ap-spec-row">
              <span className="k">your ask</span>
              <span className="v ask">{draft.summary}</span>
            </div>
            <div className="ap-spec-actions">
              <button className="btn-pri" onClick={() => onConfirm(draft)}>
                {isReview ? "Confirm review spec" : "Confirm — queue it"}
              </button>
              <button className="btn-ghost" onClick={onCancel}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      {attachments.length > 0 && (
        <div className="ap-files">
          {attachments.map((a, i) => (
            <span key={i} className="ap-file" title={a.path}>
              {a.name} <em>{fmtBytes(a.bytes)}</em>
              <button
                onClick={() =>
                  setAttachments((x) => x.filter((_, j) => j !== i))
                }
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="ap-input">
        <button
          className="ap-attach"
          title="Attach code files"
          onClick={() => fileRef.current?.click()}
        >
          ⎘ files
        </button>
        <button
          className="ap-attach"
          title="Attach a whole directory"
          onClick={() => dirRef.current?.click()}
        >
          ⌸ folder
        </button>
        <textarea
          ref={taRef}
          rows={1}
          placeholder={
            isReview
              ? "Tell it what to focus on — as long as you like…"
              : "Describe what you want to learn — the long version…"
          }
          onInput={(e) => {
            const el = e.currentTarget;
            el.style.height = "auto";
            el.style.height = `${Math.min(el.scrollHeight, 180)}px`;
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
        />
        <button className="ap-send" onClick={() => send()}>
          Send
        </button>
        <input
          ref={fileRef}
          type="file"
          multiple
          hidden
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={dirRef}
          type="file"
          hidden
          // @ts-expect-error non-standard but universally supported
          webkitdirectory=""
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
