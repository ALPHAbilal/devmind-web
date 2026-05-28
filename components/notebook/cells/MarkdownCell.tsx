import { marked } from "marked";
import type { Cell } from "./types";

marked.setOptions({ gfm: true, breaks: false });

export function MarkdownCell({ cell }: { cell: Cell }) {
  const html = marked.parse(cell.content, { async: false }) as string;
  return (
    <div
      className="cell cell-markdown"
      data-cell-id={cell.id}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
