"use client";

import { CloseIcon } from "./icons";
import { FavoritesPanel } from "./panels/FavoritesPanel";
import { HistoryPanel } from "./panels/HistoryPanel";
import { JourneyPanel } from "./panels/JourneyPanel";
import { SearchPanel } from "./panels/SearchPanel";
import { SettingsPanel } from "./panels/SettingsPanel";
import { PANEL_TITLES, type PanelKey } from "./panels/types";

interface SidebarPanelProps {
  active: PanelKey | null;
  onClose: () => void;
  userEmail: string;
}

export function SidebarPanel({ active, onClose, userEmail }: SidebarPanelProps) {
  const isOpen = active !== null;
  // Keep the last-active panel's content mounted while closing so the slide-out
  // animation doesn't snap to a different view mid-transition.
  const renderKey = active ?? "journey";

  return (
    <div
      className={`sidebar-panel${isOpen ? " open" : ""}`}
      aria-hidden={!isOpen}
    >
      <div className="panel-header">
        <span className="panel-title">{PANEL_TITLES[renderKey]}</span>
        <button
          type="button"
          className="panel-close"
          onClick={onClose}
          title="Close panel"
        >
          <CloseIcon />
        </button>
      </div>
      <div className="panel-body">
        {renderKey === "journey" && <JourneyPanel />}
        {renderKey === "history" && <HistoryPanel />}
        {renderKey === "favorites" && <FavoritesPanel />}
        {renderKey === "search" && <SearchPanel />}
        {renderKey === "settings" && <SettingsPanel userEmail={userEmail} />}
      </div>
    </div>
  );
}
