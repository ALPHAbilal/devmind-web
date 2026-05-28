import { MarkdownCell } from "./MarkdownCell";
import { CodeCell } from "./CodeCell";
import { OutputCell } from "./OutputCell";
import { SectionCell } from "./SectionCell";
import { DividerCell } from "./DividerCell";
import type { Cell } from "./types";

export type { Cell, CellKind, CellSource } from "./types";
export { MarkdownCell, CodeCell, OutputCell, SectionCell, DividerCell };

/**
 * Pure dispatcher — given a Cell row, render the matching component.
 * No internal state, no side effects, no data fetching.
 */
export function CellRenderer({ cell }: { cell: Cell }) {
  switch (cell.kind) {
    case "markdown":
      return <MarkdownCell cell={cell} />;
    case "code":
      return <CodeCell cell={cell} />;
    case "output":
      return <OutputCell cell={cell} />;
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
