import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/notebook/AppShell";
import { NotebookContent } from "@/components/notebook/NotebookContent";
import type { Cell } from "@/components/notebook/cells";
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
      .select("current_checkpoint_id")
      .eq("id", id)
      .maybeSingle(),
  ]);

  const initialCells = (cellsRes.data ?? []) as Cell[];
  const initialState = (sessionRes.data ?? null) as LearningSessionRow | null;
  const missionRow = (missionRes.data ?? null) as Pick<
    MissionRow,
    "current_checkpoint_id"
  > | null;
  const currentCheckpointId = missionRow?.current_checkpoint_id ?? null;

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
      />
    </AppShell>
  );
}
