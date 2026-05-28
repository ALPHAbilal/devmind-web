import type { ReactNode } from "react";
import { SidebarController } from "@/components/sidebar/SidebarController";
import { ChatBar } from "./ChatBar";
import "@/components/sidebar/sidebar.css";
import "./app-shell.css";

/**
 * Notebook shell. Server component by design — the only interactive bit is
 * SidebarController (active-panel state) and ChatBar (textarea + mode), both
 * marked "use client" individually.
 *
 * Wraps everything in <div class="theme-notebook"> so tokens from
 * globals.css resolve correctly.
 */
interface AppShellProps {
  userEmail: string;
  children: ReactNode;
}

export function AppShell({ userEmail, children }: AppShellProps) {
  return (
    <div className="theme-notebook app-shell">
      <div className="app-shell-body">
        <SidebarController userEmail={userEmail} />

        <div className="app-shell-main">
          <div className="app-shell-content">{children}</div>
          <ChatBar />
        </div>
      </div>
    </div>
  );
}
