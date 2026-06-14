"use client";

/**
 * PrereqColumn — the holo "active" column where the agent maps prerequisites
 * (the demo's `prereqColumn`). Header status reflects searching / building /
 * ready; the gate's Build CTA appears once every prereq is cleared (known OR its
 * notebook built).
 */
import { useBoard } from "./BoardContext";
import { PrereqCard } from "./PrereqCard";

export function PrereqColumn() {
  const { state, dispatch } = useBoard();
  const s = state.session;
  if (!s) return null;

  const building = s.prereqs.filter((p) => p.status === "building").length;
  const ready =
    s.prereqs.length > 0 &&
    !s.searching &&
    building === 0 &&
    s.prereqs.every((p) => p.known || p.status === "done");
  const status = s.searching
    ? `mapping “${s.request}”…`
    : building
      ? `${building} building…`
      : ready
        ? "all set — ready to build"
        : "check what you know";

  return (
    <div className="col active">
      <div className="col-h">
        <span className="sw" style={{ background: "rgb(var(--holo))" }} />
        <span className="nm">Prerequisites</span>
        <span className="agent">
          <span className="pulse" />
          <span>{status}</span>
        </span>
      </div>
      <div className="col-b">
        {s.prereqs.length ? (
          s.prereqs.map((p) => <PrereqCard key={p.id} prereq={p} />)
        ) : (
          <div className="col-empty">searching…</div>
        )}
        {ready && (
          <div className="build-block">
            <div className="build-lbl">✓ prerequisites cleared</div>
            <button
              className="build-cta"
              onClick={() =>
                dispatch({
                  type: "openSheet",
                  cfg: {
                    mode: "create",
                    build: true,
                    title: s.request,
                    sub: "all prerequisites cleared — set the goal and build",
                  },
                })
              }
            >
              ✦ Build the notebook →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
