"use client";

/**
 * PrereqColumn — the holo "active" column where prerequisites map (the demo's
 * `prereqColumn`). Header status reflects searching / building / ready; the
 * gate's Build CTA appears once every prereq is cleared (known OR its notebook
 * built).
 *
 * Mock mode renders the streamed simulation (`session.prereqs`). Live mode
 * derives the prereqs from the thread's concepts (thread_concepts ⋈ concepts),
 * so cards stream in over Realtime and reflect real states — this is the gated
 * ask→prereqs→build flow (plan §5.6) replacing the demo's tick().
 */
import { useBoard, stripHtml } from "./BoardContext";
import { PrereqCard } from "./PrereqCard";
import type { Concept, SessionPrereq } from "@/lib/board/types";

/** Live prereq cards = this thread's concepts, mapped to the demo's shape. */
function livePrereqs(
  threadId: string,
  links: { threadId: string; conceptId: string; ord: number }[],
  conceptById: Map<string, Concept>,
  building: string[],
): SessionPrereq[] {
  return links
    .filter((l) => l.threadId === threadId)
    .sort((a, b) => a.ord - b.ord)
    .map((l) => conceptById.get(l.conceptId))
    .filter((c): c is Concept => !!c)
    .map((c) => ({
      id: c.id,
      name: c.name,
      desc: stripHtml(c.built || "") || "a prerequisite to learn",
      known: c.state === "known",
      status: building.includes(c.id)
        ? "building"
        : c.state !== "gap"
          ? "done"
          : "todo",
    }));
}

export function PrereqColumn() {
  const { state, dispatch, mock } = useBoard();
  const s = state.session;
  if (!s) return null;

  let prereqs: SessionPrereq[];
  if (mock) {
    prereqs = s.prereqs;
  } else if (s.threadId) {
    const byId = new Map<string, Concept>();
    for (const k of Object.keys(state.techConcepts))
      for (const c of state.techConcepts[k]) byId.set(c.id, c);
    prereqs = livePrereqs(s.threadId, state.threadConcepts, byId, s.building);
  } else {
    prereqs = [];
  }

  const building = prereqs.filter((p) => p.status === "building").length;
  const ready =
    prereqs.length > 0 &&
    !s.searching &&
    building === 0 &&
    prereqs.every((p) => p.known || p.status === "done");
  const status = s.searching
    ? `mapping “${s.request}”…`
    : building
      ? `${building} building…`
      : ready
        ? "all set — ready to build"
        : prereqs.length
          ? "check what you know"
          : "no prerequisites needed";

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
        {prereqs.length ? (
          prereqs.map((p) => <PrereqCard key={p.id} prereq={p} />)
        ) : (
          <div className="col-empty">{s.searching ? "searching…" : "—"}</div>
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
