/**
 * Board domain types — the contract the demo's `state -> render()` implied,
 * made explicit. Phase 2 swaps the mock adapter for a Supabase one against the
 * exact same shapes (see lib/board/adapter.ts).
 */

export type ConceptState = "gap" | "learning" | "known";
export type Verifier = "you" | "agent";
export type ColumnKey = "review" | "gap" | "learning" | "you" | "agent";
export type DotClass = "k" | "p" | "o"; // known (filled) · learning (pulsing) · gap (hollow)

/** A board card. `ev`/`built`/`review` may carry inline <b> markup (demo verbatim). */
export interface Concept {
  id: string;
  name: string;
  state: ConceptState;
  by?: Verifier; // set once `state==='known'`
  ev?: string; // "verified in <b>…</b>"
  nb?: number; // has a notebook
  notebookId?: string; // last_notebook_id → "Open notebook →" navigates to /notebooks/[id]
  due?: number; // truthy ⇒ surfaces in the Review column
  review?: string; // "due today · 9-day interval"
  built?: string; // the "↳ built out of …" line
  needs?: string[]; // prereq concept ids → drives locked()
  session?: boolean; // created during the active session (drives the "This session" filter)
}

export interface Tech {
  label: string;
  mn: string; // 2-letter card tag
  concepts: Concept[];
}

export interface BoardColumn {
  key: ColumnKey;
  name: string;
  sw: string; // swatch color (CSS value)
}

export interface TechSection {
  id: string;
  name: string;
  icon: string; // icon registry key (see components/board/icons.tsx)
  kids: string[]; // TECHS keys
}

export interface HistorySection {
  id: string;
  name: string;
  icon: string;
  items: string[];
}

export interface Goal {
  k: string;
  t: string;
  d: string;
}

export interface ThreadFile {
  n: string;
  l: number;
}

export interface ThreadCode {
  lang: string;
  text: string;
}

export interface QuestionThread {
  id: string;
  q: string;
  tag: string;
  bucket: "today" | "yesterday" | "earlier";
  ago: string;
  files?: ThreadFile[];
  code?: ThreadCode;
}

/** Which concepts a question spawned, and where they sit on the scoped board. */
export interface ThreadNote {
  q: string; // thread id
  n: string; // concept name
  col: ColumnKey;
  id?: string; // concept id (supabase) — mock notes are display-only and omit it
}

/** Raw thread↔concept belonging (supabase). The live `ThreadNote[]` is derived
 * from these + the current concept states, so dot-ledgers move as cards do. */
export interface ThreadLink {
  threadId: string;
  conceptId: string;
  ord: number;
}

export interface ThreadBucket {
  k: string;
  l: string;
  d: string;
}

export interface SamplePrereq {
  name: string;
  desc: string;
}

/* ─── client state (mirrors the demo's `state` object) ──────────────────── */

export type Nav = "board" | "threads" | "thread";
export type ViewScope = "all" | "session";
export type SheetMode = "create" | "open";

export interface SessionPrereq {
  id: string; // mock: "0".. ; supabase: the concept uuid
  name: string;
  desc: string;
  known: boolean;
  status: "todo" | "building" | "done";
}

export interface Session {
  /** The backing question_thread (supabase). Null for mock + until POST returns. */
  threadId: string | null;
  request: string;
  searching: boolean;
  /** Mock source of truth (the streamed simulation). */
  prereqs: SessionPrereq[];
  /** Supabase: concept ids whose "Create notebook" POST is in flight (optimistic).
   *  The prereq set itself is derived from `threadConcepts` for `threadId`. */
  building: string[];
}

export interface SheetConfig {
  mode: SheetMode;
  title: string;
  sub?: string;
  build?: boolean;
  prereqId?: string; // mock: "0".. ; supabase: the prereq concept's uuid
  conceptId?: string;
}

export interface BoardState {
  tech: string;
  nav: Nav;
  thread: string | null;
  tquery: string;
  tcodeOpen: boolean;
  openSec: string | null;
  view: ViewScope;
  session: Session | null;
  sheet: SheetConfig | null;
  full: string | null;
  /** Demo held these as DOM classes on `.app`; in React they live in state. */
  sbCollapsed: boolean;
  /** Working copy of every tech's concepts (the demo mutated TECHS in place). */
  techConcepts: Record<string, Concept[]>;
  /** Live question threads (seeded from SSR, kept current over Realtime). */
  threads: QuestionThread[];
  /** Live thread↔concept belonging (supabase); drives the derived ThreadNote[]. */
  threadConcepts: ThreadLink[];
  /** tech key → father-section id (replaces the mock-only `secOf`). */
  techSec: Record<string, string>;
}
