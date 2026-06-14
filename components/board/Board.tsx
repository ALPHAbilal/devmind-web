"use client";

/**
 * Board — the horizontal kanban (the demo's `renderBoard`). When a session is
 * active the holo Prerequisites column leads; then the 5 fixed columns.
 */
import { useBoard } from "./BoardContext";
import { Column } from "./Column";
import { PrereqColumn } from "./PrereqColumn";

export function Board() {
  const { state, data } = useBoard();
  return (
    <div className="board">
      {state.session && <PrereqColumn />}
      {data.columns.map((col) => (
        <Column key={col.key} col={col} />
      ))}
    </div>
  );
}
