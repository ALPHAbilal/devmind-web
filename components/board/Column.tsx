"use client";

/**
 * Column — one of the 5 board columns (the demo's `column`). Filters the active
 * tech's concepts by derived column; "This session" view further narrows to the
 * concepts created in the active session.
 */
import { useBoard } from "./BoardContext";
import { colOf } from "./boardState";
import { ConceptCard } from "./ConceptCard";
import type { BoardColumn } from "@/lib/board/types";

export function Column({ col }: { col: BoardColumn }) {
  const { state } = useBoard();
  let cards = (state.techConcepts[state.tech] ?? []).filter((c) => colOf(c) === col.key);
  if (state.session && state.view === "session") cards = cards.filter((c) => c.session);

  return (
    <div className="col">
      <div className="col-h">
        <span className="sw" style={{ background: col.sw }} />
        <span className="nm">{col.name}</span>
        <span className="ct">{cards.length}</span>
      </div>
      <div className="col-b">
        {cards.length ? (
          cards.map((c) => <ConceptCard key={c.id} concept={c} />)
        ) : (
          <div className="col-empty">—</div>
        )}
      </div>
    </div>
  );
}
