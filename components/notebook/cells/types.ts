/**
 * Cell type definitions for the notebook renderer.
 *
 * Mirrors the `cells` row shape from spec/db/001_initial_schema.sql
 * and the `cell_kind` / `cell_source` enums declared there. Kept hand-written
 * (instead of `supabase gen types`) so this file stays scoped to cells only.
 *
 * `exit_code` is a UI-only field — there is no column for it on
 * cells. For `output` cells it is parsed from the notebook.md header
 * (see spec/FILE_SCHEMAS.md §4) or derived from sandbox_runs and passed in
 * by the caller. Renderers tolerate it being absent.
 */

export type CellKind =
  | "markdown"
  | "code"
  | "output"
  | "section"
  | "divider"
  // Frontend-forward kind: the renderer + styling exist now; to actually emit
  // these the DB `cell_kind` enum needs `challenge` added (additive migration)
  // plus an agent notebook tool. Until then no `challenge` row arrives —
  // listing it here is harmless and keeps the dispatch switch exhaustive.
  | "challenge"
  // Agent visual vocabulary: sandboxed HTML/CSS demo + ASCII diagram.
  | "interactive"
  | "diagram";

/** Structured per-cell extras (cells.meta jsonb). Each kind reads the keys it
 * cares about; unknown keys are ignored. */
export interface CellMetaJson {
  /** interactive: iframe height in px (default 320) */
  height?: number;
  /** interactive: small title shown above the demo */
  title?: string;
  /** diagram: caption shown under the art */
  caption?: string;
}

export type CellSource = "agent" | "learner" | "backend";

export interface Cell {
  id: string;
  notebook_id: string;
  ord: number;
  kind: CellKind;
  content: string;
  language: string | null;
  attached_file: string | null;
  attached_to: string | null;
  meta?: CellMetaJson | null;
  source: CellSource;
  created_at: string;
  updated_at: string;
  /** UI-only. Output cells: stdout/stderr exit status. */
  exit_code?: number | null;
}
