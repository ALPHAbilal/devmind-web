"use client";

/**
 * DiagramCell — agent-generated ASCII art. Plain text in a mono <pre>:
 * no wrapping, horizontal scroll when wide, selectable (so branch-mode
 * highlighting works on diagrams too). meta: { caption?: string }.
 */
import type { Cell } from "./types";

export function DiagramCell({ cell }: { cell: Cell }) {
  return (
    <figure className="cell cell-diagram">
      <pre>{cell.content}</pre>
      {cell.meta?.caption ? (
        <figcaption className="cell-diagram-caption">
          {cell.meta.caption}
        </figcaption>
      ) : null}
    </figure>
  );
}
