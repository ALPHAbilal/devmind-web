import type { Cell } from "./types";

export function OutputCell({ cell }: { cell: Cell }) {
  const exit = cell.exit_code ?? 0;
  const status = exit === 0 ? "success" : "error";
  return (
    <div
      className={`cell cell-output cell-output-${status}`}
      data-cell-id={cell.id}
      data-attached-to={cell.attached_to ?? undefined}
    >
      <div className="cell-output-label">
        {status === "success" ? "Output" : `Output — exit ${exit}`}
      </div>
      <pre className="cell-output-body">{cell.content}</pre>
    </div>
  );
}
