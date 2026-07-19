"use client";

/**
 * Board context — BoardShell builds this from the adapter + reducer and the leaf
 * components read their slice from it (the demo's render fns each read `state`).
 * Keeps prop-drilling out of an ~18-component tree; BoardShell stays the only
 * adapter consumer.
 */
import { createContext, useContext, type Dispatch } from "react";
import type { BoardData } from "@/lib/board/adapter";
import type { BoardState, Concept, SessionPrereq } from "@/lib/board/types";
import type { BoardAction } from "./boardState";

/** Values the MorphSheet create form collects and hands to `commitCreate`. */
export interface CreateForm {
  goal: string | null;
  note: string;
}

export interface BoardContextValue {
  state: BoardState;
  dispatch: Dispatch<BoardAction>;
  data: BoardData;
  /** false on the live board, true behind `?mock=true`. The verbs below branch
   *  on this so every component stays unaware of the data source. */
  mock: boolean;
  /** Dock submit → mock: stream sample prereqs · supabase: POST /threads. */
  submitQuestion: (raw: string) => void;
  /** MorphSheet "Create / Build" → mock: timed sim · supabase: POST generate. */
  commitCreate: (form: CreateForm) => void;
  /** A card's "Mark known" / a prereq's checkbox → mock: dispatch · supabase: UPDATE. */
  markKnown: (concept: Concept) => void;
  /** A prereq's triage checkbox (gated flow step 2). */
  prereqToggle: (prereq: SessionPrereq) => void;
  /** "Open notebook →" → mock: preview sheet · supabase: /notebooks/[id]. */
  openNotebook: (concept: Concept) => void;
  /** A History row → mock: preview sheet · supabase: navigate to its notebook. */
  openHistory: (item: string) => void;
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
