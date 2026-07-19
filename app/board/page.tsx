import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Board } from "@/components/board/Board";
import type { Concept } from "@/components/board/Board";
import type { Tables } from "@/lib/supabase/types";

/**
 * Board route — the learner's working set. Three columns:
 *   To Learn (queued) · Learning · Review (spaced repetition, overdue flagged).
 * One concepts query seeds everything; notebook titles resolve in a second
 * small lookup only for linked concepts.
 */
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ tech?: string }>;
}) {
  const { tech } = await searchParams;
  const supabase = await createClient();
  // Local JWT verification — middleware already did the full getUser() check;
  // RLS enforces per-row access regardless. Saves a Supabase Auth round trip.
  const { data: claims } = await supabase.auth.getClaims();
  const user = claims?.claims.sub ? { id: claims.claims.sub } : null;
  if (!user) redirect("/login?next=/board");

  const [conceptsRes, techsRes, historyRes] = await Promise.all([
    supabase
      .from("concepts")
      .select("*")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false }),
    supabase
      .from("technologies")
      .select("key, label")
      .order("ord", { ascending: true }),
    supabase
      .from("notebooks")
      .select("id, title")
      .eq("user_id", user.id)
      .is("parent_notebook_id", null)
      .order("updated_at", { ascending: false })
      .limit(12),
  ]);

  const concepts = (conceptsRes.data ?? []) as Concept[];
  const techs = ((techsRes.data ?? []) as Array<{ key: string; label: string }>)
    .map((t) => ({ key: t.key, label: t.label }));
  const history = (
    (historyRes.data ?? []) as Array<{ id: string; title: string | null }>
  )
    .filter((n) => n.title && n.title.trim())
    .map((n) => ({ label: n.title as string, notebookId: n.id }));

  // Titles for linked notebooks (cards deep-link into the notebook).
  const notebookIds = [
    ...new Set(
      concepts.map((c) => c.notebook_id).filter((v): v is string => !!v),
    ),
  ];
  let titles: Record<string, string> = {};
  if (notebookIds.length > 0) {
    const { data } = await supabase
      .from("notebooks")
      .select("id, title")
      .in("id", notebookIds);
    const rows = (data ?? []) as Array<Pick<Tables<"notebooks">, "id" | "title">>;
    titles = Object.fromEntries(rows.map((r) => [r.id, r.title]));
  }

  return (
    <Board
      initialConcepts={concepts}
      notebookTitles={titles}
      techs={techs}
      history={history}
      userId={user.id}
      techFilter={tech ?? null}
    />
  );
}
