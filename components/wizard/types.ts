/**
 * Wizard state + payload shapes.
 *
 * `GeneratePayload` MUST match spec/ROUTES_AND_CHANNELS.md §2.1 verbatim —
 * Phase 4.2 will POST exactly this shape to /api/notebooks/generate.
 *
 * `NotebookSpec` MUST match spec/FILE_SCHEMAS.md §1 (notebook.json) — the mock
 * preview in Step 4 conforms so the swap-to-real-data in 4.2 is a no-op.
 */

export type NotebookGoal = "build" | "understand" | "interview" | "work";
export type NotebookLevel = "beginner" | "intermediate" | "advanced";

/** User-selectable time chips. Values are the minute integers we send. */
export type TimeChipValue = 15 | 30 | 60 | 120 | 240;

export interface TimeChip {
  label: string;
  value: TimeChipValue;
}

export const TIME_CHIPS: TimeChip[] = [
  { label: "15 min", value: 15 },
  { label: "30 min", value: 30 },
  { label: "1 hour", value: 60 },
  { label: "2+ hours", value: 120 },
  { label: "No limit", value: 240 },
];

export interface WizardState {
  step: 1 | 2 | 3 | 4;
  topic: string;
  level: NotebookLevel | null;
  time: TimeChipValue;
  goal: NotebookGoal | null;
  known: string[];
  customConstraint: string;
}

export const INITIAL_STATE: WizardState = {
  step: 1,
  topic: "",
  level: null,
  time: 60,
  goal: null,
  known: [],
  customConstraint: "",
};

/** §2.1 request body shape. */
export interface GeneratePayload {
  topic: string;
  level: NotebookLevel;
  time_budget_minutes: number;
  goal: NotebookGoal;
  known: string[];
  constraints: string[];
  exclude_variants: string[];
}

/* ── NotebookSpec (subset used by the preview; full schema in §1) ───────── */

export interface ConceptNode {
  id: string;
  label: string;
  doc_refs?: string[];
}

export interface ConceptEdge {
  from: string;
  to: string;
}

export interface MicroChallenge {
  id: string;
  description: string;
  test_file: string;
  expected_outcome?: string;
  hint_if_stuck?: string;
  bloom_level?: "remember" | "understand" | "apply" | "analyze";
  kind?:
    | "classify"
    | "implement"
    | "implement_with_edge_cases"
    | "explain"
    | "predict";
}

export interface CheckpointShape {
  kind:
    | "build"
    | "understand"
    | "interview_recognition"
    | "interview_template"
    | "interview_variation"
    | "work";
  [extra: string]: unknown;
}

export interface Checkpoint {
  n: number;
  id: string;
  name: string;
  concept_nodes: string[];
  prereqs_required: string[];
  shape: CheckpointShape;
  micro_challenges: MicroChallenge[];
}

export interface FinalSynthesis {
  kind: "mini_project" | "recap" | "pattern_variation" | "scenario_solution";
  description: string;
  run_command?: string;
}

export interface NotebookSpec {
  notebook_id: string;
  title: string;
  technology: string;
  path_card: string;
  goal: NotebookGoal;
  level: NotebookLevel;
  time_budget_minutes: number;
  constraints: string[];
  concept_graph: { nodes: ConceptNode[]; edges: ConceptEdge[] };
  checkpoints: Checkpoint[];
  final_synthesis: FinalSynthesis;
}
