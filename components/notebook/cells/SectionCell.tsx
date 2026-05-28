import type { Cell } from "./types";

/**
 * Section content convention: first line is the eyebrow label
 * (e.g. "Step 1"), remaining lines are the title. If only one line is
 * supplied, the title carries it with no eyebrow.
 */
export function SectionCell({ cell }: { cell: Cell }) {
  const lines = cell.content.split("\n");
  const hasEyebrow = lines.length > 1;
  const eyebrow = hasEyebrow ? lines[0] : "";
  const title = hasEyebrow ? lines.slice(1).join(" ").trim() : cell.content;
  return (
    <div className="cell cell-section" data-cell-id={cell.id}>
      {eyebrow ? <div className="section-number">{eyebrow}</div> : null}
      <div className="section-title">{title}</div>
    </div>
  );
}
