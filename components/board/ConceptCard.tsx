"use client";

/**
 * ConceptCard — a board concept (the demo's `conceptCard`). Body shape depends
 * on its derived column: gap (built-from + lock OR create) · learning (open +
 * mark) · review (due note + open) · known you/agent (evidence + open).
 * `ev`/`built`/`review` carry inline <b> markup → rendered via dangerouslySet.
 * Session-created cards get `in` so they animate once on mount.
 */
import type { ReactNode } from "react";
import { useBoard, stripHtml } from "./BoardContext";
import { colOf, knownIds, locked } from "./boardState";
import { NB } from "./icons";
import type { Concept } from "@/lib/board/types";

function Html({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}

export function ConceptCard({ concept: c }: { concept: Concept }) {
  const { state, dispatch, data, markKnown, openNotebook } = useBoard();
  const col = colOf(c);
  const mn = data.techs[state.tech]?.mn ?? "";
  const cls = `card${c.state === "known" ? " known" : ""}${c.session ? " in" : ""}`;

  let body: ReactNode = null;
  if (col === "gap") {
    const cards = state.techConcepts[state.tech] ?? [];
    const lk = locked(c, knownIds(cards));
    // show prereq NAMES, not ids (real ids are uuids) — fall back to the id
    const nameOf = (id: string) => cards.find((x) => x.id === id)?.name ?? id;
    body = (
      <>
        <div className="sub">
          ↳ built out of <Html html={c.built || "earlier ideas"} />
        </div>
        {lk ? (
          <div className="lock">
            🔒 needs {(c.needs || []).map(nameOf).join(", ")} first
          </div>
        ) : (
          <button
            className="mk"
            onClick={() =>
              dispatch({
                type: "openSheet",
                cfg: {
                  mode: "create",
                  title: c.name,
                  sub: c.built ? `built out of ${stripHtml(c.built)}` : "a new notebook",
                  conceptId: c.id,
                },
              })
            }
          >
            <NB /> Create a notebook to learn this
          </button>
        )}
      </>
    );
  } else if (col === "learning") {
    body = (
      <div className="frow">
        <button className="btn-pri" onClick={() => openNotebook(c)}>
          Open notebook →
        </button>
        <button className="btn-ghost" onClick={() => markKnown(c)}>
          Mark known
        </button>
      </div>
    );
  } else if (col === "review") {
    body = (
      <>
        <div className="sub rev">↻ {c.review || "due for review"}</div>
        <div className="frow">
          <span className="lbl">spaced review</span>
          <button className="btn-open" onClick={() => openNotebook(c)}>
            Open →
          </button>
        </div>
      </>
    );
  } else {
    // you / agent (known, not due)
    body = (
      <>
        <div className="ev">
          {c.ev ? (
            <>
              {c.by === "agent" ? "✦" : "●"} <Html html={c.ev} />
            </>
          ) : (
            "● you marked this known"
          )}
        </div>
        <div className="frow">
          <span className="lbl">{c.by === "agent" ? "agent verified" : "self-marked"}</span>
          <button className="btn-open" onClick={() => openNotebook(c)}>
            Open →
          </button>
        </div>
      </>
    );
  }

  return (
    <div className={cls}>
      <div className="ctop">
        <span className="nm">{c.name}</span>
        <span className="tag">{mn}</span>
      </div>
      {body}
    </div>
  );
}
