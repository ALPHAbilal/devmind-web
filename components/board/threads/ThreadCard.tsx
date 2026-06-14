"use client";

/**
 * ThreadCard — one asked question in the all-threads list (the demo's `tcard`).
 * Shows the question, tag · time, file/code chips, and the dot-ledger (learned
 * of total). Clicking opens the per-thread view.
 */
import type { ReactNode } from "react";
import { useBoard } from "../BoardContext";
import { tdots, tstat } from "@/lib/board/dots";
import { Arrow, Code, File } from "../icons";
import type { QuestionThread, ThreadFile } from "@/lib/board/types";

export function FileChip({ file }: { file: ThreadFile }) {
  return (
    <span className="tfile">
      <File />
      <span>{file.n}</span>
      <em>{file.l}</em>
    </span>
  );
}

export function ThreadCard({ thread: t }: { thread: QuestionThread }) {
  const { dispatch, data } = useBoard();
  const s = tstat(data.threadNotes, t.id);
  const dots = tdots(data.threadNotes, t.id);

  let extra: ReactNode = null;
  if (t.files) {
    extra = (
      <div className="tcx">
        {t.files.slice(0, 2).map((f, i) => (
          <FileChip key={i} file={f} />
        ))}
        {t.files.length > 2 && <span className="tfmore">+{t.files.length - 2}</span>}
      </div>
    );
  } else if (t.code) {
    extra = (
      <div className="tcx">
        <span className="tcode">
          <Code /> included a {t.code.lang} snippet
        </span>
      </div>
    );
  }

  return (
    <div className="tcard" onClick={() => dispatch({ type: "openThread", id: t.id })}>
      <span className="topen">
        <Arrow />
      </span>
      <div className="tcq">{t.q}</div>
      <div className="tcmeta">
        <span className="tqtag">{t.tag}</span>
        <span className="tsep">·</span>
        <span className="twhen">{t.ago}</span>
      </div>
      {extra}
      <div className="tcdots">
        <span className="tdots">
          {dots.map((d, i) => (
            <i key={i} className={d} />
          ))}
          <span className="tdlab">
            {s.learned} of {s.total}
          </span>
        </span>
      </div>
    </div>
  );
}
