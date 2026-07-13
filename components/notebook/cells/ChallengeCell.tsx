"use client";

import { useNotebookOptional } from "../NotebookProvider";
import type { Cell } from "./types";

/**
 * Challenge ("What to Try") cell — the yellow build-task card.
 *
 * Content convention (plain text, agent-authored):
 *   line 1            → challenge title (the header label)
 *   lines `- ...`     → requirement checklist items
 *   any other lines   → descriptive prose paragraphs
 *
 * Checkboxes are presentational here — pass/fail state is owned by the
 * backend (puzzle / micro-challenge verification), not the cell content.
 */
export function ChallengeCell({ cell }: { cell: Cell }) {
  const nb = useNotebookOptional();
  const lines = cell.content.split("\n");
  const title = (lines[0] ?? "What to try").trim() || "What to try";

  const reqs: string[] = [];
  const prose: string[] = [];
  for (const raw of lines.slice(1)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("- ") || line.startsWith("* ")) {
      reqs.push(line.slice(2).trim());
    } else {
      prose.push(line);
    }
  }

  return (
    <div className="cell cell-challenge" data-cell-id={cell.id}>
      <div className="challenge-header">
        <span className="challenge-icon" aria-hidden="true">
          🎯
        </span>
        <span className="challenge-title">{title}</span>
      </div>
      <div className="challenge-body">
        {prose.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        {reqs.length > 0 ? (
          <ul className="challenge-reqs">
            {reqs.map((r, i) => (
              <li className="challenge-req" key={i}>
                <span className="challenge-check" aria-hidden="true" />
                <span>{r}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      {nb ? (
        <div className="challenge-footer">
          <button
            type="button"
            className="challenge-start"
            onClick={nb.openStage}
          >
            ✎ Start Building
          </button>
        </div>
      ) : null}
    </div>
  );
}
