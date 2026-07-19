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
type NotebookRow = Tables<"notebooks">;

/**
 * Notebook route — SSR seeds the initial cells + session row, then
 * NotebookContent attaches Realtime subscriptions on the client. RLS gates
 * both reads; a non-owner sees an empty notebook rather than a 403.
 */
export default async function NotebookPage({
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
    redirect(`/login?next=/notebooks/${id}`);
  }

  const [cellsRes, notebookRes, techsRes, historyRes] =
    await Promise.all([
      supabase
        .from("cells")
        .select("*")
        .eq("notebook_id", id)
        .order("ord", { ascending: true }),
      supabase
        .from("notebooks")
        .select("current_checkpoint_id, spec_json, parent_notebook_id")
        .eq("id", id)
        .maybeSingle(),
      // Same GLOBAL taxonomy + user history the board sidebar shows.
      supabase
        .from("technologies")
        .select("key, label")
        .order("ord", { ascending: true }),
      supabase
        .from("notebooks")
        .select("id, title")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

  const techs = ((techsRes.data ?? []) as Array<{
    key: string;
    label: string;
  }>).map((t) => ({ key: t.key, label: t.label }));

  const history = ((historyRes.data ?? []) as Array<{
    id: string;
    title: string | null;
  }>)
    .filter((m) => m.title && m.title.trim())
    .map((m) => ({ label: m.title as string, notebookId: m.id }));

  const initialCells = (cellsRes.data ?? []) as Cell[];
  // learning_sessions is parked until the real backend lands — no session row.
  const initialState = null;
  const notebookRow = (notebookRes.data ?? null) as Pick<
    NotebookRow,
    "current_checkpoint_id" | "spec_json" | "parent_notebook_id"
  > | null;
  const currentCheckpointId = notebookRow?.current_checkpoint_id ?? null;

  // Child notebook → fetch the parent's title for the back-crumb.
  let parentNotebook: { id: string; title: string } | null = null;
  if (notebookRow?.parent_notebook_id) {
    const { data: parentData } = await supabase
      .from("notebooks")
      .select("id, title")
      .eq("id", notebookRow.parent_notebook_id)
      .maybeSingle();
    const p = (parentData ?? null) as { id: string; title: string } | null;
    if (p) parentNotebook = { id: p.id, title: p.title };
  }

  const { conceptGraph, checkpoints } = extractGraph(notebookRow?.spec_json);
  const notebookTitle = extractTitle(notebookRow?.spec_json);

  const initialSessionActive = false;

  return (
    <AppShell
      notebookId={id}
      initialSessionActive={initialSessionActive}
      techs={techs}
      history={history}
    >
      <NotebookContent
        notebookId={id}
        currentCheckpointId={currentCheckpointId}
        initialCells={initialCells}
        initialState={initialState}
        conceptGraph={conceptGraph}
        checkpoints={checkpoints}
        notebookTitle={notebookTitle}
        parentNotebook={parentNotebook}
      />
    </AppShell>
  );
}

/** Best-effort notebook title from spec_json, for the warm "Writing your
 * lesson on …" opening state. Returns null when the spec lacks one. */
function extractTitle(
  specJson: Tables<"notebooks">["spec_json"] | undefined,
): string | null {
  if (!specJson || typeof specJson !== "object" || Array.isArray(specJson)) {
    return null;
  }
  const title = (specJson as Record<string, unknown>).title;
  return typeof title === "string" && title.trim() ? title : null;
}

/**
 * Pull concept_graph + a trimmed checkpoints list out of notebook.spec_json.
 * spec_json is typed as Json; we defensively narrow rather than trust shape.
 * Returns nulls/empties when the spec lacks a usable graph (older notebooks).
 */
function extractGraph(specJson: Tables<"notebooks">["spec_json"] | undefined): {
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
