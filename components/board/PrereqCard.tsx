"use client";

/**
 * PrereqCard — a discovered prerequisite in the active Prerequisites column (the
 * demo's `prereqCard`). Check the box to mark it already-known; otherwise create
 * a notebook for it (→ building → done). Always carries `in` so it animates once
 * as it streams into the column.
 */
import type { ReactNode } from "react";
import { useBoard } from "./BoardContext";
import { NB } from "./icons";
import type { SessionPrereq } from "@/lib/board/types";

export function PrereqCard({ prereq: p }: { prereq: SessionPrereq }) {
  const { dispatch } = useBoard();
  const cls = `card prereq in${p.status === "building" ? " building" : ""}`;

  let foot: ReactNode;
  if (p.known) {
    foot = (
      <div className="lock">
        <span className="chk">✓</span> you already know this
      </div>
    );
  } else if (p.status === "building") {
    foot = (
      <div className="gen">
        <span className="spin" /> ✦ agent is building…
      </div>
    );
  } else if (p.status === "done") {
    foot = (
      <div className="lock">
        <span className="chk">✓</span> notebook created · in Learning
      </div>
    );
  } else {
    foot = (
      <button
        className="mk"
        onClick={() =>
          dispatch({
            type: "openSheet",
            cfg: { mode: "create", title: p.name, sub: p.desc, prereqId: p.id },
          })
        }
      >
        <NB /> Create a notebook to learn this
      </button>
    );
  }

  return (
    <div className={cls} data-pq={p.id}>
      <div className="ctop">
        <button
          className={`cb ${p.known ? "on" : ""}`}
          onClick={() => dispatch({ type: "toggleKnow", id: p.id })}
        >
          ✓
        </button>
        <span className="nm">{p.name}</span>
      </div>
      <div className="sub">↳ {p.desc}</div>
      {foot}
    </div>
  );
}
