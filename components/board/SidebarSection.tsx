"use client";

/**
 * One accordion father-section (the demo's `secBlock`). The header lives in the
 * fixed 62px icon cell + label + chevron; `.kids` is the CSS grid 0fr↔1fr
 * accordion (animates on `open`). Keying sections by id keeps `.kids` mounted so
 * the transition runs. Collapsed rail shows only the father icon (children hide).
 */
import type { ReactNode } from "react";
import { useBoard } from "./BoardContext";
import { Chev, SectionIcon } from "./icons";

interface SidebarSectionProps {
  id: string;
  name: string;
  icon: string;
  open: boolean;
  active: boolean;
  children: ReactNode; // the child rows (techs or history items)
}

export function SidebarSection({ id, name, icon, open, active, children }: SidebarSectionProps) {
  const { dispatch } = useBoard();
  return (
    <div className={`sec ${open ? "open" : ""} ${active ? "active" : ""}`} data-sec={id}>
      <button className="sec-h" onClick={() => dispatch({ type: "toggleSec", secId: id })}>
        <span className="ic">
          <SectionIcon name={icon} />
        </span>
        <span className="sname">{name}</span>
        <span className="chev">
          <Chev />
        </span>
      </button>
      <div className="kids">
        <div className="kidsin">{children}</div>
      </div>
    </div>
  );
}
