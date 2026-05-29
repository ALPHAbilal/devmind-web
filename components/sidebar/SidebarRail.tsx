"use client";

import Link from "next/link";
import {
  FavoritesIcon,
  GridIcon,
  HistoryIcon,
  JourneyIcon,
  LogoMark,
  PlusIcon,
  SearchIcon,
  SettingsIcon,
} from "./icons";
import type { PanelKey } from "./panels/types";

interface SidebarRailProps {
  active: PanelKey | null;
  onSelect: (key: PanelKey) => void;
  onNewSession?: () => void;
  userEmail: string;
}

const RAIL_BUTTONS: Array<{
  key: PanelKey;
  label: string;
  Icon: typeof JourneyIcon;
}> = [
  { key: "journey", label: "Journey", Icon: JourneyIcon },
  { key: "history", label: "History", Icon: HistoryIcon },
  { key: "favorites", label: "Favorites", Icon: FavoritesIcon },
  { key: "search", label: "Search", Icon: SearchIcon },
];

export function SidebarRail({
  active,
  onSelect,
  onNewSession,
  userEmail,
}: SidebarRailProps) {
  const initial = (userEmail[0] ?? "?").toUpperCase();

  return (
    <div className="sidebar-rail">
      <div className="rail-logo" title="DevMind">
        <LogoMark />
      </div>

      <div className="rail-divider" />

      <Link
        href="/dashboard"
        className="rail-icon"
        title="Dashboard"
        aria-label="Dashboard"
      >
        <GridIcon />
      </Link>

      <button
        type="button"
        className="rail-icon new-btn"
        onClick={onNewSession}
        title="New Session"
      >
        <PlusIcon />
      </button>

      <div className="rail-divider" />

      {RAIL_BUTTONS.map(({ key, label, Icon }) => (
        <button
          key={key}
          type="button"
          className={`rail-icon${active === key ? " active" : ""}`}
          onClick={() => onSelect(key)}
          title={label}
          aria-pressed={active === key}
        >
          <Icon />
        </button>
      ))}

      <div className="rail-spacer" />

      <button
        type="button"
        className={`rail-icon${active === "settings" ? " active" : ""}`}
        onClick={() => onSelect("settings")}
        title="Settings"
        aria-pressed={active === "settings"}
      >
        <SettingsIcon />
      </button>

      <div
        className="rail-avatar"
        onClick={() => onSelect("settings")}
        title={userEmail}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") onSelect("settings");
        }}
      >
        {initial}
      </div>
    </div>
  );
}
