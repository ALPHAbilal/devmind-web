"use client";

/**
 * MiniNode — a mini notebook (branch lesson) on the canvas. Compact card:
 * color dot + title + status pill + open action.
 */
import { memo } from "react";
import { useRouter } from "next/navigation";
import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { ArrowRight, Check, Leaf, PenLine } from "lucide-react";

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
    >
      <div className="cv-frame-tab canvas-frame-tab">
        <Leaf size={11} strokeWidth={2} aria-hidden />
        <span>Mini notebook{data.newborn ? " · just grown" : ""}</span>
      </div>
      <div className="cv-mini-head">
        <span className="cv-mini-dot" aria-hidden />
        <span className="cv-mini-title">{data.title}</span>
        <span className={`cv-mini-status ${draft ? "is-draft" : "is-ready"}`}>
          {draft ? (
            <>
              <PenLine size={8} strokeWidth={2.4} aria-hidden /> draft
            </>
          ) : (
            <>
              <Check size={8} strokeWidth={2.8} aria-hidden /> ready
            </>
          )}
        </span>
      </div>
      <div className="cv-mini-body">
        Grown from {data.pickCount} highlight{data.pickCount === 1 ? "" : "s"} in
        the parent notebook.
      </div>
      <div className="cv-mini-foot">
        <button
          type="button"
          className="cv-btn-open"
          onClick={() => router.push(`/missions/${data.missionId}`)}
        >
          <span>Open lesson</span>
          <ArrowRight size={11} strokeWidth={2.2} aria-hidden />
        </button>
      </div>
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
