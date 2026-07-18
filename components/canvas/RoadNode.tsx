"use client";

/**
 * RoadNode — ONE card holding the full provenance of a mini notebook:
 * the user's highlights (as clippings) + the exchange with the agent
 * + the green-flag stamp. The same card is the live creation surface: its
 * footer morphs through collecting → discussing → flagged → generating →
 * generated.
 *
 * Visual language ported from the canvas_inspirations demo: a moss-washed
 * card, a bleeding "clippings" well where each highlight is a moss-barred
 * quote (click to unfold), and a chat-style exchange (agent / you bubbles,
 * typing dots, quick-reply chips, an underline composer).
 */
import { memo, useState, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import {
  ArrowRight,
  Check,
  Flag,
  GitBranch,
  Loader2,
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

  const showExchange =
    data.turns.length > 0 || data.agentTyping || data.status !== "collecting";

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
      </div>

      <h3 className="cv-road-title">{data.title}</h3>

      {/* ── clippings well ────────────────────────────────────────────── */}
      <div className="cv-well">
        <div className="cv-well-cnt">
          Clippings · {data.picks.length}
        </div>
        {data.picks.length === 0 ? (
          <div className="cv-well-empty">
            <b>Select text in the notebook</b> — every pick stacks here.
          </div>
        ) : (
          <div className="cv-clips">
            {data.picks.map((p) => {
              const key = `pick-${p.id}`;
              const multi = /\n\s*\n/.test(p.selected_text.trim());
              return (
                <div
                  key={p.id}
                  className={`cv-clip${open.has(key) ? " open" : ""}`}
                  onClick={() => toggle(key)}
                  onMouseEnter={() => data.onPulsePick?.(p)}
                  onMouseLeave={() => data.onPulsePick?.(null)}
                >
                  <q>{p.selected_text}</q>
                  {multi ||
                  (data.status === "collecting" && data.onRemovePick) ? (
                    <div className="cv-clip-meta">
                      {multi ? <span>click to unfold</span> : null}
                      {data.status === "collecting" && data.onRemovePick ? (
                        <button
                          type="button"
                          className="cv-clip-x"
                          aria-label="Remove highlight"
                          onClick={(e) => {
                            e.stopPropagation();
                            data.onRemovePick?.(p.id);
                          }}
                        >
                          remove
                        </button>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              );
            })}
            {data.note ? (
              <div
                className={`cv-clip cv-clip-note${open.has("note") ? " open" : ""}`}
                onClick={() => toggle("note")}
              >
                <q>{data.note}</q>
                <div className="cv-clip-meta">
                  <span>note</span>
                </div>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* ── exchange (chat) ───────────────────────────────────────────── */}
      {showExchange ? (
        <div className="cv-convo">
          {data.turns.map((t) => (
            <div
              key={t.id}
              className={`cv-msg ${t.role === "agent" ? "cv-msg-agent" : "cv-msg-user"}`}
            >
              <span className="cv-msg-who">
                {t.role === "agent" ? "Agent" : "You"}
              </span>
              {t.full_text}
            </div>
          ))}
          {data.agentTyping ? (
            <div className="cv-msg cv-msg-agent">
              <span className="cv-msg-who">Agent</span>
              <span className="cv-typing" aria-label="Agent is thinking">
                <i /> <i /> <i />
              </span>
            </div>
          ) : null}
          {data.flagLine ? (
            <div
              className="cv-flag-line"
              aria-label="Green-flagged"
              title="Green-flagged"
            >
              <Flag size={12} strokeWidth={2} aria-hidden />
            </div>
          ) : null}

          {/* quick replies + composer */}
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
              <div className="cv-composer">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={onKey}
                  placeholder="…or your own words"
                  aria-label="Reply to the agent"
                />
                <button type="button" onClick={send} aria-label="Send reply">
                  <ArrowRight size={13} strokeWidth={2.2} />
                </button>
              </div>
            </>
          ) : null}
        </div>
      ) : null}

      {/* ── status footer ─────────────────────────────────────────────── */}
      {data.status === "collecting" ? (
        <button
          type="button"
          className="cv-act"
          disabled={data.picks.length === 0}
          onClick={data.onDone}
        >
          <Check size={13} strokeWidth={2.4} aria-hidden /> Done highlighting
        </button>
      ) : null}
      {data.status === "flagged" ? (
        <button type="button" className="cv-act cv-act-flag" onClick={data.onFlag}>
          <Flag size={13} strokeWidth={2} aria-hidden /> Green flag — generate the
          lesson
        </button>
      ) : null}
      {data.status === "generating" ? (
        <div className="cv-generating">
          <Loader2 size={15} strokeWidth={2} className="cv-spin" aria-hidden />
          Growing the mini notebook…
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
