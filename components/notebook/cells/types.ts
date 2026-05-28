/**
 * Cell type definitions for the notebook renderer.
 *
 * Mirrors the `notebook_cells` row shape from spec/db/001_initial_schema.sql
 * and the `cell_kind` / `cell_source` enums declared there. Kept hand-written
 * (instead of `supabase gen types`) so this file stays scoped to cells only.
 *
 * `exit_code` is a UI-only field — there is no column for it on
 * notebook_cells. For `output` cells it is parsed from the notebook.md header
 * (see spec/FILE_SCHEMAS.md §4) or derived from sandbox_runs and passed in
 * by the caller. Renderers tolerate it being absent.
 */

export type CellKind =
  | "markdown"
  | "code"
  | "output"
  | "section"
  | "divider";

export type CellSource = "agent" | "learner" | "backend";

export interface Cell {
  id: string;
  mission_id: string;
  ord: number;
  kind: CellKind;
  content: string;
  language: string | null;
  attached_file: string | null;
  attached_to: string | null;
  source: CellSource;
  created_at: string;
  updated_at: string;
  /** UI-only. Output cells: stdout/stderr exit status. */
  exit_code?: number | null;
}
