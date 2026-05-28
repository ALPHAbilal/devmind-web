import type { Cell } from "./types";

export function DividerCell({ cell }: { cell: Cell }) {
  return <hr className="cell cell-divider" data-cell-id={cell.id} />;
}
