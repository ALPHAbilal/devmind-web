"use client";

/**
 * MiniNode — a mini notebook (branch lesson) on the canvas.
 *
 * Visual language ported from the canvas_inspirations demo: a moss-washed
 * card with a kind label, title, a small meta line and a pill "open" action.
 * All wiring (routing, hover, newborn pop, color) is preserved.
 */
import { memo } from "react";
import { useRouter } from "next/navigation";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ArrowRight, Leaf } from "lucide-react";

export type MiniNodeType = Node<
  {
    sessionId: string;
    missionId: string;
    title: string;
    status: string; // mission status: draft | generating | in_progress | completed | …
    color: number;
    pickCount: number;
    newborn: boolean;
    onHover?: (sessionId: string | null) => void;
  },
  "mini"
>;

export const MiniNode = memo(function MiniNode({ data }: NodeProps<MiniNodeType>) {
  const router = useRouter();
  const draft = data.status === "draft" || data.status === "generating";

  return (
    <div
      className={`cv-frame cv-mini${data.newborn ? " cv-newborn" : ""}`}
      style={{ ["--c" as string]: `var(--cv-br-${data.color % 4})` }}
      onMouseEnter={() => data.onHover?.(data.sessionId)}
      onMouseLeave={() => data.onHover?.(null)}
      onClick={() => router.push(`/missions/${data.missionId}`)}
    >
      <div className="cv-frame-tab canvas-frame-tab">
        <Leaf size={11} strokeWidth={2} aria-hidden />
        <span>Mini notebook{data.newborn ? " · just grown" : ""}</span>
      </div>

      <div className="cv-mini-kind">
        <Leaf size={11} strokeWidth={2} aria-hidden /> Branch lesson
      </div>
      <h3 className="cv-mini-title">{data.title}</h3>
      <div className="cv-mini-meta">
        <b>
          {data.pickCount} cell{data.pickCount === 1 ? "" : "s"}
        </b>{" "}
        · {draft ? "draft" : "ready"}
      </div>
      <button
        type="button"
        className="cv-mini-go"
        onClick={(e) => {
          e.stopPropagation();
          router.push(`/missions/${data.missionId}`);
        }}
      >
        <span>Open lesson</span>
        <ArrowRight size={12} strokeWidth={2.2} aria-hidden />
      </button>

      <Handle
        type="target"
        position={Position.Left}
        id="in"
        className="cv-handle"
        isConnectable={false}
      />
    </div>
  );
});
