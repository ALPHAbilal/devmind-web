"use client";

/**
 * RoadNode — the CLIPPINGS node: the user's highlights for one branch, in
 * picking order, as moss-barred quotes (click to unfold multi-paragraph
 * picks). Its "Done highlighting" footer hands off to the AgentNode, which
 * owns the exchange. The road carries no exchange data anymore.
 */
import { memo, useState } from "react";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { Check, GitBranch } from "lucide-react";
import type { Highlight, RoadStatus } from "./types";

export type RoadNodeType = Node<
  {
    sessionId: string;
    title: string;
    color: number;
    status: RoadStatus;
    picks: Highlight[];
    note: string | null;
    onDone?: () => void;
    onRemovePick?: (highlightId: string) => void;
    onPulsePick?: (pick: Highlight | null) => void;
    onHover?: (sessionId: string | null) => void;
  },
  "road"
>;

export const RoadNode = memo(function RoadNode({ data }: NodeProps<RoadNodeType>) {
  const [open, setOpen] = useState<Set<string>>(new Set());

  const toggle = (key: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const c = `var(--cv-br-${data.color % 4})`;
  const live = data.status === "collecting";

  return (
    <div
      className="cv-frame cv-road"
      style={{ ["--c" as string]: c }}
      onMouseEnter={() => data.onHover?.(data.sessionId)}
      onMouseLeave={() => data.onHover?.(null)}
    >
      <div className="cv-frame-tab canvas-frame-tab">
        <GitBranch size={11} strokeWidth={2} aria-hidden />
        <span>Road{live ? " · live" : ""}</span>
      </div>

      <h3 className="cv-road-title">{data.title}</h3>

      {/* ── clippings well ────────────────────────────────────────────── */}
      <div className="cv-well">
        <div className="cv-well-cnt">Clippings · {data.picks.length}</div>
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

      {/* ── footer: hand off to the agent ─────────────────────────────── */}
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
