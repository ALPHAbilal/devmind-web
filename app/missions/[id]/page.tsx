import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/notebook/AppShell";
import { NotebookContent } from "@/components/notebook/NotebookContent";
import type { Cell } from "@/components/notebook/cells";
import type {
  ConceptGraphSpec,
  CheckpointLite,
} from "@/components/sidebar/ConceptGraph";
import type { Tables } from "@/lib/supabase/types";

// KNOWN TYPING MISMATCH (see app/realtime-test/page.tsx): @supabase/ssr@0.5
// returns a 3-generic SupabaseClient while @supabase/supabase-js expects 5,
// so chained .select()/.maybeSingle() resolve to `never`. We cast the row
// values back to the generated Tables<> shapes — RLS still gates the read.
type MissionRow = Tables<"missions">;
type LearningSessionRow = Tables<"learning_sessions">;

/**
 * Notebook route — SSR seeds the initial cells + session row, then
 * NotebookContent attaches Realtime subscriptions on the client. RLS gates
 * both reads; a non-owner sees an empty notebook rather than a 403.
 */
export default async function MissionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=/missions/${id}`);
  }

  const [cellsRes, sessionRes, missionRes] = await Promise.all([
    supabase
      .from("notebook_cells")
      .select("*")
      .eq("mission_id", id)
      .order("ord", { ascending: true }),
    supabase
      .from("learning_sessions")
      .select("*")
      .eq("mission_id", id)
      .maybeSingle(),
    supabase
      .from("missions")
      .select("current_checkpoint_id, spec_json")
      .eq("id", id)
      .maybeSingle(),
  ]);

  const initialCells = (cellsRes.data ?? []) as Cell[];
  const initialState = (sessionRes.data ?? null) as LearningSessionRow | null;
  const missionRow = (missionRes.data ?? null) as Pick<
    MissionRow,
    "current_checkpoint_id" | "spec_json"
  > | null;
  const currentCheckpointId = missionRow?.current_checkpoint_id ?? null;

  const { conceptGraph, checkpoints } = extractGraph(missionRow?.spec_json);
  const missionTitle = extractTitle(missionRow?.spec_json);

  const initialSessionActive = initialState?.status === "active";

  return (
    <AppShell
      userEmail={user.email ?? "user"}
      missionId={id}
      initialSessionActive={initialSessionActive}
    >
      <NotebookContent
        missionId={id}
        currentCheckpointId={currentCheckpointId}
        initialCells={initialCells}
        initialState={initialState}
        conceptGraph={conceptGraph}
        checkpoints={checkpoints}
        missionTitle={missionTitle}
      />
    </AppShell>
  );
}

/** Best-effort mission title from spec_json, for the warm "Writing your
 * lesson on …" opening state. Returns null when the spec lacks one. */
function extractTitle(
  specJson: Tables<"missions">["spec_json"] | undefined,
): string | null {
  if (!specJson || typeof specJson !== "object" || Array.isArray(specJson)) {
    return null;
  }
  const title = (specJson as Record<string, unknown>).title;
  return typeof title === "string" && title.trim() ? title : null;
}

/**
 * Pull concept_graph + a trimmed checkpoints list out of mission.spec_json.
 * spec_json is typed as Json; we defensively narrow rather than trust shape.
 * Returns nulls/empties when the spec lacks a usable graph (older missions).
 */
function extractGraph(specJson: Tables<"missions">["spec_json"] | undefined): {
  conceptGraph: ConceptGraphSpec | null;
  checkpoints: CheckpointLite[];
} {
  if (!specJson || typeof specJson !== "object" || Array.isArray(specJson)) {
    return { conceptGraph: null, checkpoints: [] };
  }
  const spec = specJson as Record<string, unknown>;

  const rawGraph = spec.concept_graph as
    | { nodes?: unknown; edges?: unknown }
    | undefined;
  let conceptGraph: ConceptGraphSpec | null = null;
  if (rawGraph && Array.isArray(rawGraph.nodes) && Array.isArray(rawGraph.edges)) {
    conceptGraph = {
      nodes: (rawGraph.nodes as Array<Record<string, unknown>>)
        .filter((n) => typeof n?.id === "string")
        .map((n) => ({
          id: n.id as string,
          label: typeof n.label === "string" ? (n.label as string) : (n.id as string),
        })),
      edges: rawGraph.edges as ConceptGraphSpec["edges"],
    };
  }

  const rawCheckpoints = Array.isArray(spec.checkpoints)
    ? (spec.checkpoints as Array<Record<string, unknown>>)
    : [];
  const checkpoints: CheckpointLite[] = rawCheckpoints
    .filter(
      (c) =>
        typeof c?.id === "string" &&
        typeof c?.n === "number" &&
        Array.isArray(c?.concept_nodes),
    )
    .map((c) => ({
      id: c.id as string,
      n: c.n as number,
      concept_nodes: (c.concept_nodes as unknown[]).filter(
        (x): x is string => typeof x === "string",
      ),
    }));

  return { conceptGraph, checkpoints };
}
