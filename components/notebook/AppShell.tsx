import type { ReactNode } from "react";
import { SidebarController } from "@/components/sidebar/SidebarController";
import { ChatBar } from "./ChatBar";
import { NotebookProvider } from "./NotebookProvider";
import "@/components/sidebar/sidebar.css";
import "./app-shell.css";

/**
 * Notebook shell. Server component; only SidebarController, NotebookProvider,
 * and ChatBar are client-side. NotebookProvider scopes the context shared
 * between ChatBar (which submits) and NotebookContent (which fulfills via
 * Realtime events).
 */
interface AppShellProps {
  userEmail: string;
  missionId: string;
  initialSessionActive: boolean;
  children: ReactNode;
}

export function AppShell({
  userEmail,
  missionId,
  initialSessionActive,
  children,
}: AppShellProps) {
  return (
    <div className="theme-notebook app-shell">
      <div className="app-shell-body">
        <SidebarController userEmail={userEmail} />

        <div className="app-shell-main">
          <NotebookProvider
            missionId={missionId}
            initialSessionActive={initialSessionActive}
          >
            <div className="app-shell-content">{children}</div>
            <ChatBar />
          </NotebookProvider>
        </div>
      </div>
    </div>
  );
}
