import type { Tables } from "@/lib/supabase/types";

export type BranchSession = Tables<"branch_sessions">;
export type BranchTurn = Tables<"branch_session_turns">;
export type Highlight = Tables<"mission_highlights">;
export type CanvasNodeRow = Tables<"canvas_nodes">;

export type RoadStatus =
  | "collecting"
  | "discussing"
  | "flagged"
  | "generating"
  | "generated"
  | "abandoned";

/** One road = the full provenance of one (attempted) mini notebook. */
export interface Road {
  session: BranchSession;
  picks: Highlight[]; // ordered by pick_order
  turns: BranchTurn[]; // ordered by seq
  child: { id: string; title: string; status: string } | null;
  /** palette slot 0..3 — stable per road, assigned by creation order */
  color: number;
}

/** What the agent hands back per exchange turn. The scripted implementation
 * fills this today; the real Claude-backed agent fills the same shape later. */
export interface AgentTurn {
  summary_line: string;
  full_text: string;
  /** Quick-reply options offered to the user (chips). */
  options?: string[];
  /** True when the plan is locked and the green flag should be offered. */
  done?: boolean;
  /** Agreed child-notebook title, available once the plan is locked. */
  title?: string;
}

export interface AgentContext {
  picks: Array<{ cell_id: string; text: string }>;
  priorTurns: Array<{ role: string; text: string }>;
}

/**
 * The exchange seam. The canvas only talks to this interface, so swapping
 * ScriptedAgent for a Claude-backed implementation is a drop-in change.
 */
export interface ExchangeAgent {
  /** First agent message after "Done highlighting". */
  start(ctx: AgentContext): Promise<AgentTurn>;
  /** Next agent message after a user reply. */
  reply(ctx: AgentContext, userText: string): Promise<AgentTurn>;
}
