import type { ReactNode } from "react";
import {
  NotebookSidebar,
  type NotebookSidebarTech,
  type NotebookSidebarHistoryItem,
} from "@/components/sidebar/NotebookSidebar";
import { ChatBar } from "./ChatBar";
import { NotebookProvider } from "./NotebookProvider";
import "@/components/sidebar/sidebar.css";
import "./app-shell.css";

/**
 * Notebook shell. Server component; only NotebookSidebar, NotebookProvider,
 * and ChatBar are client-side. The sidebar mirrors the board's (flat list +
 * collapse); its data is fetched by the notebook page and passed through here.
 */
interface AppShellProps {
  notebookId: string;
  initialSessionActive: boolean;
  techs: NotebookSidebarTech[];
  history: NotebookSidebarHistoryItem[];
  children: ReactNode;
}

export function AppShell({
  notebookId,
  initialSessionActive,
  techs,
  history,
  children,
}: AppShellProps) {
  return (
    <div className="theme-notebook app-shell" data-theme="light">
      <div className="app-shell-body">
        <NotebookSidebar techs={techs} history={history} />

        <div className="app-shell-main">
          <NotebookProvider
            notebookId={notebookId}
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
