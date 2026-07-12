"use client";

/**
 * NotebookSidebar — the board's flat sidebar, ported to the notebook surface.
 * Same content and behaviour as components/board/Sidebar.tsx + EdgeTab, but
 * self-contained: it holds its own collapse state instead of the board reducer,
 * and its data (technologies + history) is fed as props from the mission page.
 * The old icon-rail + slide-over panels are gone.
 */
import { useRef, useState, type PointerEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevLeft, Gear, Logo, Plus, Search } from "@/components/board/icons";

export interface NotebookSidebarTech {
  key: string;
  label: string;
}
export interface NotebookSidebarHistoryItem {
  label: string;
  missionId: string;
}

interface NotebookSidebarProps {
  techs: NotebookSidebarTech[];
  history: NotebookSidebarHistoryItem[];
}

export function NotebookSidebar({ techs, history }: NotebookSidebarProps) {
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  // Edge-tab pointer logic (ported from board/EdgeTab): click toggles collapse,
  // drag moves it vertically. Position is imperative to avoid re-render churn.
  const tabRef = useRef<HTMLButtonElement>(null);
  const drag = useRef({ dragging: false, startY: 0, startTop: 0, moved: 0 });

  const onPointerDown = (e: PointerEvent<HTMLButtonElement>) => {
    const tab = tabRef.current;
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
    const tab = tabRef.current;
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
    tabRef.current?.classList.remove("dragging");
    try {
      tabRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* capture may already be released */
    }
    if (d.moved < 5) setCollapsed((c) => !c); // a click, not a drag
  };

  return (
    <div className={`nb-sidebar${collapsed ? " sb-collapsed" : ""}`}>
      <aside className="sidebar">
        <div className="brandrow">
          <Link className="brand" href="/board" title="Home">
            <span className="ic brand-ic">
              <Logo />
            </span>
            <span className="brandword">
              dev<b>mind</b>
            </span>
          </Link>
          <Link
            className="sbtn"
            href="/board?view=threads"
            title="Search conversations"
          >
            <Search />
          </Link>
        </div>

        <div className="scrollarea">
          <Link className="navitem" href="/board" title="New topic">
            <span className="ic">
              <Plus />
            </span>
            <span className="sname">New topic</span>
          </Link>

          <div className="slabel">Technologies</div>
          {techs.map((tk) => (
            <button
              key={tk.key}
              className="litem"
              onClick={() => router.push(`/board?tech=${tk.key}`)}
            >
              {tk.label}
            </button>
          ))}

          <div className="slabel">History</div>
          {history.map((h) => (
            <button
              key={h.missionId}
              className="litem hist"
              onClick={() => router.push(`/missions/${h.missionId}`)}
            >
              {h.label}
            </button>
          ))}
        </div>

        <div className="divz" />
        <button className="side-set" title="Settings">
          <Gear />
        </button>
      </aside>

      <button
        ref={tabRef}
        className="edge-tab"
        title="Collapse / expand · drag to move"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
        <ChevLeft />
      </button>
    </div>
  );
}
