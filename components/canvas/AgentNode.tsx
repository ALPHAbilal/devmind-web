"use client";

/**
 * AgentNode — the exchange with the agent as its OWN canvas node, sitting
 * between the road (clippings) and the mini notebook, exactly like the
 * canvas_inspirations demo. Moss-washed card: chat bubbles (Agent / You),
 * typing dots, quick-reply chips, an underline composer, and the footer that
 * morphs discussing → flagged → generating.
 *
 * The road no longer carries any exchange data — it lives here.
 */
import { memo, useState, type KeyboardEvent } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ArrowRight, Bot, Flag, Loader2 } from "lucide-react";
import type { BranchTurn, RoadStatus } from "./types";

export type AgentNodeType = Node<
  {
    sessionId: string;
    color: number;
    status: RoadStatus;
    turns: BranchTurn[];
    agentTyping: boolean;
    options: string[] | null;
    flagLine: string | null;
    onReply?: (text: string) => void;
    onFlag?: () => void;
    onHover?: (sessionId: string | null) => void;
  },
  "agent"
>;

export const AgentNode = memo(function AgentNode({ data }: NodeProps<AgentNodeType>) {
  const [draft, setDraft] = useState("");

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
  const live = data.status === "discussing";

  return (
    <div
      className="cv-frame cv-agent"
      style={{ ["--c" as string]: c }}
      onMouseEnter={() => data.onHover?.(data.sessionId)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <div className="cv-frame-tab canvas-frame-tab">
        <Bot size={11} strokeWidth={2} aria-hidden />
        <span>Agent{live ? " · live" : ""}</span>
      </div>

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
      </div>

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

      {/* footer states */}
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
