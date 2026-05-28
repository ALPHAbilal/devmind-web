/**
 * Mock mission generator. Real Opus call lands in Phase 4.2 — this stays
 * shape-compatible with spec/FILE_SCHEMAS.md §1 so the swap is a no-op.
 *
 * Each goal has 2 variants so "Different Mission" can re-roll within the same
 * goal. Variants are picked deterministically by `excludeVariants` so re-roll
 * never returns the same one twice in a row.
 */

import type {
  MissionGoal,
  MissionLevel,
  MissionSpec,
  WizardState,
} from "./types";

/** Stable UUID-shaped string. Not real RFC4122 — but matches the pattern
 *  enough that downstream code that only validates format is happy. */
function fakeUuid(seed: string): string {
  const hex = (n: number) =>
    Array.from(seed + n.toString(), (c) => c.charCodeAt(0))
      .reduce((a, b) => (a * 33 + b) & 0xffffff, 0xc0ffee)
      .toString(16)
      .padStart(6, "0");
  return [
    hex(1).slice(0, 8).padEnd(8, "0"),
    hex(2).slice(0, 4).padEnd(4, "0"),
    "4" + hex(3).slice(0, 3).padEnd(3, "0"),
    "8" + hex(4).slice(0, 3).padEnd(3, "0"),
    (hex(5) + hex(6)).slice(0, 12).padEnd(12, "0"),
  ].join("-");
}

interface MockVariant {
  variantId: string;
  title: string;
  technology: string;
  path_card: string;
  conceptLabels: string[];
  checkpointNames: string[];
  finalDescription: string;
  shapeKind: MissionSpec["checkpoints"][number]["shape"]["kind"];
  finalKind: MissionSpec["final_synthesis"]["kind"];
}

const VARIANTS: Record<MissionGoal, MockVariant[]> = {
  build: [
    {
      variantId: "build_cli_todo",
      title: "Build a CLI todo tool",
      technology: "python",
      path_card: "python/cli",
      conceptLabels: [
        "argparse for command parsing",
        "JSON file persistence",
        "List + dict modeling",
        "Functions for clean modules",
      ],
      checkpointNames: [
        "Set up project + arg parser",
        "Add a task with persistence",
        "List + complete tasks",
        "Delete + edit + filter",
      ],
      finalDescription:
        "Run your CLI end-to-end: add three tasks, mark one done, list filtered output, and persist across restarts.",
      shapeKind: "build",
      finalKind: "mini_project",
    },
    {
      variantId: "build_link_shortener",
      title: "Build a tiny link shortener",
      technology: "python",
      path_card: "python/web",
      conceptLabels: [
        "Flask routes and request handling",
        "Random short-code generation",
        "In-memory + file persistence",
        "Redirect responses",
      ],
      checkpointNames: [
        "Boot a Flask app with /health",
        "POST /shorten returns a slug",
        "GET /<slug> redirects",
        "Persist mapping to disk",
      ],
      finalDescription:
        "Shorten three URLs, restart the server, follow each redirect successfully.",
      shapeKind: "build",
      finalKind: "mini_project",
    },
  ],
  understand: [
    {
      variantId: "understand_python_oop",
      title: "Understand Python OOP",
      technology: "python",
      path_card: "python/oop",
      conceptLabels: [
        "Classes and instances",
        "Methods vs functions",
        "Inheritance vs composition",
        "Dunder methods",
      ],
      checkpointNames: [
        "Define a class with state",
        "Add methods that read + mutate",
        "Subclass and override",
        "Explain why composition often wins",
      ],
      finalDescription:
        "Refactor a procedural script into a small class hierarchy and explain the trade-offs out loud.",
      shapeKind: "understand",
      finalKind: "recap",
    },
    {
      variantId: "understand_async",
      title: "Understand Python async/await",
      technology: "python",
      path_card: "python/async",
      conceptLabels: [
        "Event loop intuition",
        "Coroutines and awaiting",
        "asyncio.gather for concurrency",
        "Blocking vs non-blocking I/O",
      ],
      checkpointNames: [
        "Run a single coroutine",
        "Compose two with await",
        "Run N concurrently with gather",
        "Explain when async hurts",
      ],
      finalDescription:
        "Take a sequential HTTP fetch script and convert it to concurrent async — measure the difference.",
      shapeKind: "understand",
      finalKind: "recap",
    },
  ],
  interview: [
    {
      variantId: "interview_two_pointers",
      title: "Master the Two Pointers pattern",
      technology: "python",
      path_card: "dsa/two-pointers",
      conceptLabels: [
        "When two pointers beats nested loops",
        "Opposite-end pointer template",
        "Same-direction pointer template",
        "Edge-case discipline (empty, single, dupes)",
      ],
      checkpointNames: [
        "Recognize a two-pointer problem cold",
        "Implement the canonical template",
        "Solve a sliding-window variation",
        "Handle the tricky edge cases",
      ],
      finalDescription:
        "Given an unseen two-pointer prompt, write a passing solution in under 15 minutes.",
      shapeKind: "interview_template",
      finalKind: "pattern_variation",
    },
    {
      variantId: "interview_hashmap",
      title: "Master the Hash Map counting pattern",
      technology: "python",
      path_card: "dsa/hashmap",
      conceptLabels: [
        "Counter + dict idioms",
        "Frequency-by-key reduction",
        "Sliding window with counts",
        "Worst-case collisions to ignore",
      ],
      checkpointNames: [
        "Spot the counting signal",
        "Build the canonical Counter solve",
        "Apply to a sliding-window twist",
        "Defend the O(n) claim",
      ],
      finalDescription:
        "Take three unseen counting prompts and write passing solutions back-to-back.",
      shapeKind: "interview_template",
      finalKind: "pattern_variation",
    },
  ],
  work: [
    {
      variantId: "work_csv_cleanup",
      title: "Solve a CSV cleanup task at work",
      technology: "python",
      path_card: "python/data-cleaning",
      conceptLabels: [
        "csv module vs pandas",
        "Detecting + fixing dirty rows",
        "Idempotent transformations",
        "Writing a verifiable output",
      ],
      checkpointNames: [
        "Read the file without crashing",
        "Strip + normalize each column",
        "Drop the obviously broken rows",
        "Write a clean CSV + a report",
      ],
      finalDescription:
        "Run the cleanup on the sample file; the report should show counts of rows kept, fixed, and dropped.",
      shapeKind: "work",
      finalKind: "scenario_solution",
    },
    {
      variantId: "work_log_summarizer",
      title: "Summarize a noisy log file at work",
      technology: "python",
      path_card: "python/data-cleaning",
      conceptLabels: [
        "Streaming line-by-line reads",
        "Regex for log patterns",
        "Aggregating by key",
        "Producing a focused summary",
      ],
      checkpointNames: [
        "Read the log without loading it all",
        "Extract structured fields",
        "Roll up by hour + level",
        "Print a one-screen summary",
      ],
      finalDescription:
        "Point the script at the provided log; output should fit on one screen and answer the question 'what got worse today?'.",
      shapeKind: "work",
      finalKind: "scenario_solution",
    },
  ],
};

function pickVariant(
  goal: MissionGoal,
  excludeVariants: string[],
): MockVariant {
  const all = VARIANTS[goal];
  const remaining = all.filter((v) => !excludeVariants.includes(v.variantId));
  return remaining.length > 0 ? remaining[0]! : all[0]!;
}

/** Build a MissionSpec from a chosen variant + the user's wizard answers. */
export function buildMockMission(
  state: WizardState,
  excludeVariants: string[] = [],
): MissionSpec {
  const goal: MissionGoal = state.goal ?? "build";
  const level: MissionLevel = state.level ?? "beginner";
  const variant = pickVariant(goal, excludeVariants);

  const constraints: string[] = [];
  if (state.known.length > 0) {
    constraints.push(`learner already knows: ${state.known.join(", ")}`);
  }
  if (state.customConstraint.trim()) {
    constraints.push(state.customConstraint.trim());
  }

  const nodes: MissionSpec["concept_graph"]["nodes"] =
    variant.conceptLabels.map((label, i) => ({
      id: `c_${variant.variantId}_${i + 1}`,
      label,
    }));

  // Linear edges — node[i] → node[i+1] — simplest valid DAG.
  const edges: MissionSpec["concept_graph"]["edges"] = nodes
    .slice(0, -1)
    .map((n, i) => ({ from: n.id, to: nodes[i + 1]!.id }));

  const checkpoints: MissionSpec["checkpoints"] = variant.checkpointNames.map(
    (name, i) => ({
      n: i + 1,
      id: `ck_${variant.variantId}_${i + 1}`,
      name,
      concept_nodes: nodes
        .slice(i, Math.min(i + 2, nodes.length))
        .map((n) => n.id),
      prereqs_required: [],
      shape: { kind: variant.shapeKind },
      micro_challenges: [
        {
          id: `mc_${variant.variantId}_${i + 1}_a`,
          description: `Apply ${nodes[i]?.label ?? "the concept"} to advance the checkpoint.`,
          test_file: `tests/mc_${variant.variantId}_${i + 1}_a.py`,
          bloom_level: "apply",
          kind: "implement",
        },
      ],
    }),
  );

  return {
    mission_id: fakeUuid(variant.variantId),
    title: variant.title,
    technology: variant.technology,
    path_card: variant.path_card,
    goal,
    level,
    time_budget_minutes: state.time,
    constraints,
    concept_graph: { nodes, edges },
    checkpoints,
    final_synthesis: {
      kind: variant.finalKind,
      description: variant.finalDescription,
    },
  };
}

/** Used by "Different Mission" — returns the variantId we just rendered so
 *  the caller can pass it to excludeVariants next time. */
export function variantIdOf(spec: MissionSpec): string {
  // We stash the variantId in the checkpoint id prefix: ck_<variantId>_<n>
  const ckp = spec.checkpoints[0]?.id ?? "";
  const m = ckp.match(/^ck_(.+)_\d+$/);
  return m?.[1] ?? "";
}
