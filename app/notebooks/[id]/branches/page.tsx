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

type NotebookRow = Tables<"notebooks">;

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
  // Local JWT verification — middleware already did the full getUser() check;
  // RLS enforces per-row access regardless. Saves a Supabase Auth round trip.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims.sub ? { id: claims.claims.sub } : null;
  if (!user) {
    redirect(`/login?next=/notebooks/${id}/branches`);
  }

  const [notebookRes, cellsRes, sessionsRes, hlRes] = await Promise.all([
    supabase
      .from("notebooks")
      .select("id, title, parent_notebook_id")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("cells")
      .select("*")
      .eq("notebook_id", id)
      .order("ord", { ascending: true }),
    supabase
      .from("branch_sessions")
      .select("*")
      .eq("parent_notebook_id", id)
      .neq("status", "abandoned")
      .order("created_at", { ascending: true }),
    supabase
      .from("highlights")
      .select("*")
      .eq("parent_notebook_id", id)
      .order("pick_order", { ascending: true }),
  ]);

  const notebook = (notebookRes.data ?? null) as Pick<
    NotebookRow,
    "id" | "title" | "parent_notebook_id"
  > | null;
  if (!notebook) redirect("/board");
  // Branch lessons are one level deep — a child has no branches of its own.
  if (notebook.parent_notebook_id) redirect(`/notebooks/${id}`);

  const cells = (cellsRes.data ?? []) as Cell[];
  const sessions = (sessionsRes.data ?? []) as BranchSession[];
  const highlights = (hlRes.data ?? []) as Highlight[];

  // Turns + child notebooks for all sessions in two queries.
  const sessionIds = sessions.map((s) => s.id);
  const childIds = sessions
    .map((s) => s.child_notebook_id)
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
      ? supabase.from("notebooks").select("id, title, status").in("id", childIds)
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
    child: session.child_notebook_id
      ? (kidById.get(session.child_notebook_id) ?? null)
      : null,
  }));

  return (
    <BranchWorkspace
      notebookId={id}
      notebookTitle={notebook.title}
      cells={cells}
      branches={branches}
    />
  );
}
