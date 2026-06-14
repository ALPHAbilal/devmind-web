import { BoardShell } from "@/components/board/BoardShell";

/**
 * /board — the new concept-kanban dashboard ("the board").
 *
 * Phase 0: server component that mounts the client shell on typed MOCK data
 * (lib/board). No backend, no auth gate — this route is additive and does not
 * touch /dashboard. The `.theme-board` scope carries the demo's monochrome+holo
 * tokens; `data-theme` defaults to dark and the TopBar toggle flips it.
 */
export default function BoardPage() {
  return (
    <div className="theme-board" data-theme="dark">
      <BoardShell />
    </div>
  );
}
