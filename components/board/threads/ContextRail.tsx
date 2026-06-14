"use client";

/**
 * ContextRail — the left rail of the per-thread view (the demo's context column
 * inside `renderThreadView`). Shows the FULL question (never truncated), the
 * dot-ledger progress, attached files, and the expandable pasted code. It has
 * NO collapse button by design.
 */
import { useBoard } from "../BoardContext";
import { tdots, tstat } from "@/lib/board/dots";
import { Code } from "../icons";
import { FileChip } from "./ThreadCard";
import type { QuestionThread } from "@/lib/board/types";

export function ContextRail({ thread: t }: { thread: QuestionThread }) {
  const { state, dispatch, data } = useBoard();
  const s = tstat(data.threadNotes, t.id);
  const dots = tdots(data.threadNotes, t.id);

  return (
    <aside className="ctx">
      <div className="ctxsec">Your question</div>
      <div className="ctxq">{t.q}</div>
      <div className="ctxmeta">
        <span className="tqtag">{t.tag}</span>
        <span className="tsep">·</span>
        <span className="twhen">asked {t.ago}</span>
      </div>

      <div>
        <div className="ctxsec" style={{ marginBottom: "7px" }}>
          Progress
        </div>
        <span className="tdots">
          {dots.map((d, i) => (
            <i key={i} className={d} />
          ))}
          <span className="tdlab">
            {s.learned} of {s.total} learned
          </span>
        </span>
      </div>

      {t.files && (
        <div>
          <div className="ctxsec">Attached files</div>
          <div className="ctxfiles" style={{ marginTop: "7px" }}>
            {t.files.map((f, i) => (
              <FileChip key={i} file={f} />
            ))}
          </div>
        </div>
      )}

      {t.code && (
        <div>
          <div className="ctxsec" style={{ marginBottom: "7px" }}>
            Pasted code
          </div>
          <div className="tcodeblock">
            <div className="tcbh">
              <Code /> {t.code.lang}
            </div>
            <div className={`tcbwrap ${state.tcodeOpen ? "open" : ""}`}>
              <pre className="tcbpre">{t.code.text}</pre>
              <span className="tcbfade" />
            </div>
            <button className="tcbtoggle" onClick={() => dispatch({ type: "toggleCode" })}>
              {state.tcodeOpen ? "Collapse" : "Expand"}
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
