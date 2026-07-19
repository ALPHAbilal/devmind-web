/**
 * Board data adapter — the ONLY surface BoardShell reads data from.
 *
 * Phase 0: `mockAdapter` serves the ported demo arrays from mock.ts.
 * Phase 2: `buildBoardData` (supabaseAdapter.ts) produces the SAME `BoardData`
 *          shape from live rows; `resolveBoardData` selects mock vs supabase by
 *          the `?mock=true` flag — that flip is the whole swap.
 */
import type {
  BoardColumn,
  Goal,
  HistorySection,
  QuestionThread,
  SamplePrereq,
  Tech,
  TechSection,
  ThreadBucket,
  ThreadLink,
  ThreadNote,
} from "./types";
import {
  COLS,
  GOALS,
  HISTORY,
  SAMPLE_PREREQS,
  SECTIONS,
  TBUCKETS,
  TECHS,
  THREAD_LIST,
  THREAD_NOTES,
} from "./mock";
import { buildBoardData, type BoardRows } from "./supabaseAdapter";

export interface BoardData {
  sections: TechSection[];
  history: HistorySection;
  columns: BoardColumn[];
  goals: Goal[];
  techs: Record<string, Tech>;
  threadBuckets: ThreadBucket[];
  threads: QuestionThread[];
  threadNotes: ThreadNote[];
  samplePrereqs: SamplePrereq[];
  /** Supabase only — raw thread↔concept join seeding live ThreadNote derivation. */
  threadLinks?: ThreadLink[];
  /** Supabase only — History label → notebook id for "Open notebook" navigation. */
  historyLinks?: Record<string, string>;
}

export const mockAdapter: BoardData = {
  sections: SECTIONS,
  history: HISTORY,
  columns: COLS,
  goals: GOALS,
  techs: TECHS,
  threadBuckets: TBUCKETS,
  threads: THREAD_LIST,
  threadNotes: THREAD_NOTES,
  samplePrereqs: SAMPLE_PREREQS,
};

/**
 * Pick the data source. `mock=true` (or no rows) keeps the typed demo board;
 * otherwise assemble the live board from the SSR row bundle. Called from the
 * `/board` server component — the single seam between mock and real data.
 */
export function resolveBoardData(
  mock: boolean,
  rows: BoardRows | null,
  now: Date,
): BoardData {
  if (mock || !rows) return mockAdapter;
  return buildBoardData(rows, now);
}
