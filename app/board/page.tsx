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
export default async function BoardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/board");

  const { data: conceptData } = await supabase
    .from("concepts")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const concepts = (conceptData ?? []) as Concept[];

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

  return <Board initialConcepts={concepts} notebookTitles={titles} />;
}
