"use client";

/**
 * ThreadsView — the all-threads list (the demo's `renderThreadsView` +
 * `renderTlist`). A `threads` label, a search box, and the threads grouped into
 * provenance buckets (Today / Yesterday / Earlier) via the sticky date gutter.
 * The search input is controlled — React keeps focus across re-renders, so the
 * demo's "re-render only the list" hack isn't needed.
 */
import { useBoard } from "../BoardContext";
import { Search } from "../icons";
import { ThreadCard } from "./ThreadCard";

export function ThreadsView() {
  const { state, dispatch, data } = useBoard();
  const q = state.tquery.trim().toLowerCase();
  const filtered = !q
    ? data.threads
    : data.threads.filter(
        (t) => t.q.toLowerCase().includes(q) || t.tag.toLowerCase().includes(q),
      );
  const groups = data.threadBuckets
    .map((b) => ({ b, items: filtered.filter((t) => t.bucket === b.k) }))
    .filter((g) => g.items.length);

  return (
    <div className="tview threadsView">
      <div className="tw">
        <div className="pagelabel">threads</div>
        <div className="tsearch">
          <Search />
          <input
            placeholder="Search threads…"
            value={state.tquery}
            onChange={(e) => dispatch({ type: "setQuery", q: e.target.value })}
          />
        </div>
        <div>
          {data.threads.length === 0 ? (
            <div className="tnores">
              No threads yet. Ask a question from the board and it starts a thread
              here — each one tracks the prerequisites it spawned.
            </div>
          ) : groups.length ? (
            groups.map(({ b, items }) => (
              <div className="tgrp" key={b.k}>
                <div className="tgd-wrap">
                  <div className="tgd">{b.l}</div>
                  {b.d && <span className="tgm">{b.d}</span>}
                  {b.k === "today" && <span className="tgnow">NOW</span>}
                </div>
                <div className="tgrows">
                  {items.map((t) => (
                    <ThreadCard key={t.id} thread={t} />
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="tnores">No threads match “{state.tquery}”.</div>
          )}
        </div>
      </div>
    </div>
  );
}
