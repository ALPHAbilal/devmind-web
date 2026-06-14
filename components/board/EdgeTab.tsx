"use client";

/**
 * Draggable floating edge-tab — ported from the demo's pointer logic. Click
 * (moved < 5px) toggles the sidebar collapse; drag moves it on the Y axis,
 * clamped to the viewport. Position is set imperatively to avoid re-rendering
 * on every pointermove (matches the demo).
 */
import { useRef, type PointerEvent } from "react";
import { useBoard } from "./BoardContext";
import { ChevLeft } from "./icons";

export function EdgeTab() {
  const { dispatch } = useBoard();
  const ref = useRef<HTMLButtonElement>(null);
  const drag = useRef({ dragging: false, startY: 0, startTop: 0, moved: 0 });

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const tab = ref.current;
    if (!tab) return;
    drag.current = {
      dragging: true,
      startY: e.clientY,
      startTop: parseFloat(getComputedStyle(tab).top) || 120,
      moved: 0,
    };
    tab.setPointerCapture(e.pointerId);
    tab.classList.add("dragging");
    e.preventDefault();
  };

  const onPointerMove = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    const tab = ref.current;
    if (!d.dragging || !tab) return;
    const dy = e.clientY - d.startY;
    d.moved = Math.max(d.moved, Math.abs(dy));
    const max = window.innerHeight - tab.offsetHeight - 12;
    tab.style.top = `${Math.max(12, Math.min(d.startTop + dy, max))}px`;
  };

  const end = (e: PointerEvent<HTMLButtonElement>) => {
    const d = drag.current;
    if (!d.dragging) return;
    d.dragging = false;
    const tab = ref.current;
    tab?.classList.remove("dragging");
    try {
      tab?.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be released */
    }
    if (d.moved < 5) dispatch({ type: "toggleCollapse" }); // a click, not a drag
  };

  return (
    <button
      ref={ref}
      className="edge-tab"
      title="Collapse / expand · drag to move"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <ChevLeft />
    </button>
  );
}
