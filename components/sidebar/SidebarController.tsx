"use client";

/**
 * Owns the active-panel state and renders Rail + Panel together. This is the
 * single client boundary the sidebar needs — Rail and Panel themselves are
 * stateless (they could be server components in theory, but they're rendered
 * inside this client tree so they ship as client too — no SEO concern).
 *
 * Lives inside the server-rendered <AppShell>.
 */

import { useState } from "react";
import { SidebarRail } from "./SidebarRail";
import { SidebarPanel } from "./SidebarPanel";
import type { PanelKey } from "./panels/types";

interface SidebarControllerProps {
  userEmail: string;
}

export function SidebarController({ userEmail }: SidebarControllerProps) {
  const [active, setActive] = useState<PanelKey | null>(null);

  function handleSelect(key: PanelKey) {
    // Clicking the same icon twice closes the panel — matches the demo.
    setActive((prev) => (prev === key ? null : key));
  }

  return (
    <div className="sidebar">
      <SidebarRail
        active={active}
        onSelect={handleSelect}
        userEmail={userEmail}
      />
      <SidebarPanel
        active={active}
        onClose={() => setActive(null)}
        userEmail={userEmail}
      />
    </div>
  );
}
