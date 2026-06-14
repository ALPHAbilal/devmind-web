/**
 * Board data adapter — the ONLY surface BoardShell reads data from.
 *
 * Phase 0: `mockAdapter` serves the ported demo arrays from mock.ts.
 * Phase 2: implement a `supabaseAdapter` against the same `BoardData` shape and
 *          flip the `boardAdapter` export below — that is the whole swap.
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

// Phase 2 → `export const boardAdapter: BoardData = supabaseAdapter;`
export const boardAdapter: BoardData = mockAdapter;
