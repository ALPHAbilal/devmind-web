"use client";

import Link from "next/link";
import type { PanelKey } from "./panels/types";

interface SidebarRailProps {
  active: PanelKey | null;
  onSelect: (key: PanelKey) => void;
  onNewSession?: () => void;
  userEmail: string;
}

// Flat, text-only navigation — mirrors the board sidebar (no icon rail).
const NAV_ITEMS: Array<{ key: PanelKey; label: string }> = [
  { key: "journey", label: "Journey" },
  { key: "history", label: "History" },
  { key: "favorites", label: "Favorites" },
  { key: "search", label: "Search" },
];

export function SidebarRail({
  active,
  onSelect,
  onNewSession,
  userEmail,
}: SidebarRailProps) {
  return (
    <div className="sidebar-rail">
      <div className="brandrow">
        <Link href="/board" className="brand" title="Home">
          <span className="brandword">
            dev<b>mind</b>
          </span>
        </Link>
      </div>

      <div className="scrollarea">
        <button
          type="button"
          className="navitem"
          onClick={onNewSession}
          title="New session"
        >
          <span className="sname">New session</span>
        </button>

        <div className="slabel">Notebook</div>
        {NAV_ITEMS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            className={`litem${active === key ? " on" : ""}`}
            onClick={() => onSelect(key)}
            aria-pressed={active === key}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="divz" />
      <button
        type="button"
        className={`side-set${active === "settings" ? " on" : ""}`}
        onClick={() => onSelect("settings")}
        title={userEmail}
      >
        Settings
      </button>
    </div>
  );
}
