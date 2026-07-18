import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { BranchWorkspace } from "@/components/branches/BranchWorkspace";
import type { Cell } from "@/components/notebook/cells";
import type {
  Branch,
  BranchSession,
  BranchTurn,
  Highlight,
} from "@/components/branches/types";
import type { Tables } from "@/lib/supabase/types";

type MissionRow = Tables<"missions">;

/**
 * Branch workspace route — hub of branches grown from this notebook plus the
 * three-lane workspace (notebook · clippings · agent · mini notebook).
 * SSR seeds everything; the client handles the live creation flow.
 */
export default async function BranchesPage({
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
    redirect(`/login?next=/missions/${id}/branches`);
  }

  const [missionRes, cellsRes, sessionsRes, hlRes] = await Promise.all([
    supabase
      .from("missions")
      .select("id, title, parent_mission_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("notebook_cells")
      .select("*")
      .eq("mission_id", id)
      .order("ord", { ascending: true }),
    supabase
      .from("branch_sessions")
      .select("*")
      .eq("parent_mission_id", id)
      .neq("status", "abandoned")
      .order("created_at", { ascending: true }),
    supabase
      .from("mission_highlights")
      .select("*")
      .eq("parent_mission_id", id)
      .order("pick_order", { ascending: true }),
  ]);

  const mission = (missionRes.data ?? null) as Pick<
    MissionRow,
    "id" | "title" | "parent_mission_id"
  > | null;
  if (!mission) redirect("/dashboard");
  // Branch lessons are one level deep — a child has no branches of its own.
  if (mission.parent_mission_id) redirect(`/missions/${id}`);

  const cells = (cellsRes.data ?? []) as Cell[];
  const sessions = (sessionsRes.data ?? []) as BranchSession[];
  const highlights = (hlRes.data ?? []) as Highlight[];

  // Turns + child missions for all sessions in two queries.
  const sessionIds = sessions.map((s) => s.id);
  const childIds = sessions
    .map((s) => s.child_mission_id)
    .filter((c): c is string => !!c);

  const [turnsRes, kidsRes] = await Promise.all([
    sessionIds.length > 0
      ? supabase
          .from("branch_session_turns")
          .select("*")
          .in("session_id", sessionIds)
          .order("seq", { ascending: true })
      : Promise.resolve({ data: [] }),
    childIds.length > 0
      ? supabase.from("missions").select("id, title, status").in("id", childIds)
      : Promise.resolve({ data: [] }),
  ]);

  const turns = (turnsRes.data ?? []) as BranchTurn[];
  const kids = (kidsRes.data ?? []) as Array<{
    id: string;
    title: string;
    status: string;
  }>;
  const kidById = new Map(kids.map((k) => [k.id, k]));

  const branches: Branch[] = sessions.map((session) => ({
    session,
    picks: highlights
      .filter((h) => h.session_id === session.id)
      .sort((a, b) => (a.pick_order ?? 0) - (b.pick_order ?? 0)),
    turns: turns.filter((t) => t.session_id === session.id),
    child: session.child_mission_id
      ? (kidById.get(session.child_mission_id) ?? null)
      : null,
  }));

  return (
    <BranchWorkspace
      missionId={id}
      missionTitle={mission.title}
      cells={cells}
      branches={branches}
    />
  );
}
