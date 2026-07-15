"use client";

/**
 * RoadNode — ONE card holding the full provenance of a mini notebook:
 * the user's highlights (in picking order) + the exchange with the agent
 * + the green-flag stamp. Every entry is a one-line row that expands on
 * click. The same card is the live creation surface: its footer morphs
 * through collecting → discussing → flagged → generating → generated.
 */
import { memo, useState, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  ArrowRight,
  Bot,
  Check,
  Flag,
  GitBranch,
  Loader2,
  PenLine,
  Quote,
  User,
  X,
} from "lucide-react";
import type { BranchTurn, Highlight, RoadStatus } from "./types";

export type RoadNodeType = Node<
  {
    sessionId: string;
    title: string;
    color: number;
    status: RoadStatus;
    picks: Highlight[];
    turns: BranchTurn[];
    note: string | null;
    flagLine: string | null;
    agentTyping: boolean;
    options: string[] | null;
    live: boolean;
    onDone?: () => void;
    onReply?: (text: string) => void;
    onFlag?: () => void;
    onRemovePick?: (highlightId: string) => void;
    onPulsePick?: (pick: Highlight | null) => void;
    onHover?: (sessionId: string | null) => void;
  },
  "road"
>;

export const RoadNode = memo(function RoadNode({ data }: NodeProps<RoadNodeType>) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [draft, setDraft] = useState("");

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const send = () => {
    const v = draft.trim();
    if (!v || !data.onReply) return;
    setDraft("");
    data.onReply(v);
  };
  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") send();
  };

  const c = `var(--cv-br-${data.color % 4})`;

  return (
    <div
      className="cv-frame cv-road"
      style={{ ["--c" as string]: c }}
      onMouseEnter={() => data.onHover?.(data.sessionId)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <div className="cv-frame-tab canvas-frame-tab">
        <GitBranch size={11} strokeWidth={2} aria-hidden />
        <span>Road{data.live ? " · live" : ""}</span>
        <span className="cv-tag">
          {data.picks.length} pick{data.picks.length === 1 ? "" : "s"}
          {data.turns.length > 0 ? ` · ${data.turns.length} turns` : ""}
        </span>
      </div>

      <div className="cv-road-head">
        <span className="cv-road-icon" aria-hidden>
          <GitBranch size={13} strokeWidth={2} />
        </span>
        <span className="cv-road-headtext">
          <span className="cv-road-title">{data.title}</span>
          <span className="cv-road-sub">
            {data.status === "collecting"
              ? "highlighting…"
              : data.status === "discussing"
                ? "discussing with agent…"
                : data.status === "generating"
                  ? "generating…"
                  : "highlighted → discussed → generated"}
          </span>
        </span>
      </div>

      {/* ── picks ─────────────────────────────────────────────────────── */}
      <section className="cv-road-sec">
        <div className="cv-sec-label">
          <Quote size={10} strokeWidth={2} aria-hidden /> Your highlights · in
          picking order
        </div>
        {data.picks.length === 0 ? (
          <div className="cv-road-empty">
            <b>Select text in the notebook</b> — every pick stacks here as one
            line.
          </div>
        ) : (
          data.picks.map((p, i) => {
            const key = `pick-${p.id}`;
            return (
              <div key={p.id} className={`cv-row${open.has(key) ? " open" : ""}`}>
                <button
                  type="button"
                  className="cv-row-line"
                  onClick={() => toggle(key)}
                  onMouseEnter={() => data.onPulsePick?.(p)}
                  onMouseLeave={() => data.onPulsePick?.(null)}
                >
                  <span className="cv-row-num">{i + 1}</span>
                  <span className="cv-row-text">{flat(p.selected_text)}</span>
                  <span className="cv-row-caret" aria-hidden>
                    ▸
                  </span>
                  {data.status === "collecting" && data.onRemovePick ? (
                    <span
                      role="button"
                      tabIndex={0}
                      className="cv-row-x"
                      aria-label="Remove highlight"
                      onClick={(e) => {
                        e.stopPropagation();
                        data.onRemovePick?.(p.id);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") data.onRemovePick?.(p.id);
                      }}
                    >
                      <X size={9} strokeWidth={2.4} />
                    </span>
                  ) : null}
                </button>
                <div className="cv-row-full">
                  <div className="cv-row-full-inner">{p.selected_text}</div>
                </div>
              </div>
            );
          })
        )}
        {data.note ? (
          <div className={`cv-row${open.has("note") ? " open" : ""}`}>
            <button type="button" className="cv-row-line" onClick={() => toggle("note")}>
              <span className="cv-row-ico" aria-hidden>
                <PenLine size={11} strokeWidth={2} />
              </span>
              <span className="cv-row-text">note: {flat(data.note)}</span>
              <span className="cv-row-caret" aria-hidden>
                ▸
              </span>
            </button>
            <div className="cv-row-full">
              <div className="cv-row-full-inner">
                <span className="cv-row-who">your note</span>
                {data.note}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {/* ── exchange ──────────────────────────────────────────────────── */}
      {data.turns.length > 0 || data.agentTyping || data.status !== "collecting" ? (
        <section className="cv-road-sec">
          <div className="cv-sec-label">
            <Bot size={10} strokeWidth={2} aria-hidden /> Exchange with agent
          </div>
          {data.turns.map((t) => {
            const key = `turn-${t.id}`;
            return (
              <div key={t.id} className={`cv-row${open.has(key) ? " open" : ""}`}>
                <button
                  type="button"
                  className="cv-row-line"
                  onClick={() => toggle(key)}
                >
                  <span
                    className={`cv-row-ico ${t.role === "agent" ? "cv-ico-bot" : "cv-ico-user"}`}
                    aria-hidden
                  >
                    {t.role === "agent" ? (
                      <Bot size={11} strokeWidth={2} />
                    ) : (
                      <User size={11} strokeWidth={2} />
                    )}
                  </span>
                  <span className="cv-row-text">{t.summary_line}</span>
                  <span className="cv-row-caret" aria-hidden>
                    ▸
                  </span>
                </button>
                <div className="cv-row-full">
                  <div className="cv-row-full-inner">
                    <span className="cv-row-who">
                      {t.role === "agent" ? "agent" : "you"}
                    </span>
                    {t.full_text}
                  </div>
                </div>
              </div>
            );
          })}
          {data.agentTyping ? (
            <div className="cv-row">
              <div className="cv-row-line cv-row-static">
                <span className="cv-row-ico cv-ico-bot" aria-hidden>
                  <Bot size={11} strokeWidth={2} />
                </span>
                <span className="cv-typing" aria-label="Agent is thinking">
                  <i /> <i /> <i />
                </span>
              </div>
            </div>
          ) : null}
          {data.flagLine ? (
            <div className="cv-row">
              <div className="cv-row-line cv-row-static">
                <span className="cv-row-ico cv-ico-flag" aria-hidden>
                  <Flag size={11} strokeWidth={2} />
                </span>
                <span className="cv-row-text">
                  <b>green flag</b> · {data.flagLine}
                </span>
              </div>
            </div>
          ) : null}

          {/* quick replies */}
          {data.options && data.options.length > 0 && !data.agentTyping ? (
            <>
              <div className="cv-chips">
                {data.options.map((o) => (
                  <button
                    key={o}
                    type="button"
                    className="cv-chip"
                    onClick={() => data.onReply?.(o)}
                  >
                    {o}
                  </button>
                ))}
              </div>
              <div className="cv-free">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="…or your own words"
                  aria-label="Reply to the agent"
                />
                <button type="button" onClick={send} aria-label="Send reply">
                  <ArrowRight size={11} strokeWidth={2.2} />
                </button>
              </div>
            </>
          ) : null}
        </section>
      ) : null}

      {/* ── status footer ─────────────────────────────────────────────── */}
      {data.status === "collecting" ? (
        <div className="cv-road-foot">
          <button
            type="button"
            className="cv-btn-done"
            disabled={data.picks.length === 0}
            onClick={data.onDone}
          >
            <Check size={13} strokeWidth={2.4} aria-hidden /> Done highlighting
          </button>
        </div>
      ) : null}
      {data.status === "flagged" ? (
        <div className="cv-road-foot">
          <button type="button" className="cv-btn-flag" onClick={data.onFlag}>
            <Flag size={13} strokeWidth={2} aria-hidden /> Green flag — generate
            the lesson
          </button>
        </div>
      ) : null}
      {data.status === "generating" ? (
        <div className="cv-road-foot">
          <div className="cv-generating">
            <Loader2 size={15} strokeWidth={2} className="cv-spin" aria-hidden />
            Growing the mini notebook…
          </div>
        </div>
      ) : null}

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="cv-handle"
        isConnectable={false}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="out"
        className="cv-handle"
        isConnectable={false}
      />
    </div>
  );
});

function flat(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}
