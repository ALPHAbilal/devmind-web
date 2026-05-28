"use client";

import dynamic from "next/dynamic";
import { MarkdownCell } from "./MarkdownCell";
import { OutputCell } from "./OutputCell";
import { SectionCell } from "./SectionCell";
import { DividerCell } from "./DividerCell";
import type { Cell } from "./types";

// Monaco is browser-only — dynamic-import with ssr:false so `next build`
// doesn't try to render it on the server.
const CodeCell = dynamic(
  () => import("./CodeCell").then((m) => m.CodeCell),
  { ssr: false, loading: () => <CodeCellSkeleton /> },
);

function CodeCellSkeleton() {
  return <div className="cell cell-code cell-code-skeleton" aria-hidden />;
}

export type { Cell, CellKind, CellSource } from "./types";
export { MarkdownCell, CodeCell, OutputCell, SectionCell, DividerCell };

/** Optional per-cell render hints from NotebookContent (e.g., hint callout). */
export interface CellMeta {
  /** OutputCell only: show "Haiku is preparing a hint…" callout. */
  hintPending?: boolean;
}

export function CellRenderer({
  cell,
  meta,
}: {
  cell: Cell;
  meta?: CellMeta;
}) {
  switch (cell.kind) {
    case "markdown":
      return <MarkdownCell cell={cell} />;
    case "code":
      return <CodeCell cell={cell} />;
    case "output":
      return <OutputCell cell={cell} hintPending={meta?.hintPending} />;
    case "section":
      return <SectionCell cell={cell} />;
    case "divider":
      return <DividerCell cell={cell} />;
    default: {
      const _exhaustive: never = cell.kind;
      void _exhaustive;
      return null;
    }
  }
}
