"use client";

/**
 * Board context — BoardShell builds this from the adapter + reducer and the leaf
 * components read their slice from it (the demo's render fns each read `state`).
 * Keeps prop-drilling out of an ~18-component tree; BoardShell stays the only
 * adapter consumer.
 */
import { createContext, useContext, type Dispatch } from "react";
import type { BoardData } from "@/lib/board/adapter";
import type { BoardState } from "@/lib/board/types";
import type { BoardAction } from "./boardState";

export interface BoardContextValue {
  state: BoardState;
  dispatch: Dispatch<BoardAction>;
  data: BoardData;
  /** Dock submit → starts a session and streams in the mock prerequisites. */
  submitQuestion: (raw: string) => void;
  /** MorphSheet "Create / Build" → the demo's commitCreate (timed simulation). */
  commitCreate: () => void;
  /** Sidebar "+" (new topic) focuses the dock input. */
  focusDock: () => void;
  /** Theme lives outside the reducer (demo reads/writes it on the scope). */
  theme: "dark" | "light";
  toggleTheme: () => void;
}

export const BoardContext = createContext<BoardContextValue | null>(null);

export function useBoard(): BoardContextValue {
  const ctx = useContext(BoardContext);
  if (!ctx) throw new Error("useBoard must be used within <BoardShell>");
  return ctx;
}

/** Demo's `c.built.replace(/<[^>]+>/g,'')` — strip inline markup for sheet subs. */
export function stripHtml(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}
