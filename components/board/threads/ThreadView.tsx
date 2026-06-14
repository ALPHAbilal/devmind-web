"use client";

/**
 * ThreadView — the per-thread surface (the demo's `renderThreadView` +
 * `threadBoard`): the context rail on the left, a board scoped to just this
 * thread's notes on the right. The sidebar + edge-tab are hidden by the
 * `.app.thread-focus` class set in BoardShell.
 */
import { useBoard } from "../BoardContext";
import { ContextRail } from "./ContextRail";
import { TCSTAT } from "@/lib/board/dots";

export function ThreadView() {
  const { state, data } = useBoard();
  const t = data.threads.find((x) => x.id === state.thread);
  if (!t) return null;

  return (
    <div className="tview threadView">
      <ContextRail thread={t} />
      <div className="board">
        {data.columns.map((c) => {
          const cs = data.threadNotes.filter((n) => n.q === t.id && n.col === c.key);
          return (
            <div className="col" key={c.key}>
              <div className="col-h">
                <span className="sw" style={{ background: c.sw }} />
                <span className="nm">{c.name}</span>
                <span className="ct">{cs.length}</span>
              </div>
              <div className="col-b">
                {cs.length ? (
                  cs.map((n, i) => (
                    <div className="card" key={i}>
                      <div className="ctop">
                        <span className="nm">{n.n}</span>
                      </div>
                      {c.key === "learning" ? (
                        <div className="tcstat">
                          <span className="spin" /> in progress
                        </div>
                      ) : (
                        <div className={`tcstat ${c.key}`}>{TCSTAT[c.key]}</div>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="col-empty">—</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
