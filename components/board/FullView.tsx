"use client";

/**
 * FullView — the full-screen notebook page (the demo's `fullView`). In
 * production this is where the board hands off to the existing /notebooks/[id]
 * surface; here it shows the same shared preview content. Lagging local title so
 * the fade-out can finish before unmounting (mirrors the demo).
 */
import { useEffect, useState } from "react";
import { useBoard } from "./BoardContext";
import { NotebookCells } from "./NotebookCells";
import { Back } from "./icons";

export function FullView() {
  const { state, dispatch } = useBoard();
  const [title, setTitle] = useState<string | null>(state.full);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.full) {
      setTitle(state.full);
      const r = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(r);
    }
    setOpen(false);
    const t = setTimeout(() => setTitle(null), 380);
    return () => clearTimeout(t);
  }, [state.full]);

  return (
    <div className={`fullview ${open ? "open" : ""}`}>
      {title && (
        <>
          <div className="fv-bar">
            <button className="fv-back" onClick={() => dispatch({ type: "closeFull" })}>
              <Back /> Back to board
            </button>
            <span className="fv-t">{title}</span>
            <span className="fv-tag">production notebook · /notebooks/[id]</span>
          </div>
          <div className="fv-body">
            <NotebookCells title={title} />
          </div>
        </>
      )}
    </div>
  );
}
