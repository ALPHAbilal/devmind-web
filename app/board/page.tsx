import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { resolveBoardData } from "@/lib/board/adapter";
import type { BoardRows } from "@/lib/board/supabaseAdapter";
import type { Tables } from "@/lib/supabase/types";
import { BoardShell } from "@/components/board/BoardShell";

/**
 * /board — the concept-kanban dashboard, now on live owner-scoped data.
 *
 * SSR seeds the first paint: the signed-in user's concepts + edges + question
 * threads + thread↔concept join (RLS-scoped) and the GLOBAL taxonomy
 * (tech_sections + technologies). The data set is small (≤ hundreds of rows) so
 * we fetch it whole and pass it as `initialData`; BoardShell then attaches the
 * Realtime subscriptions. Owner scoping makes the board gated — see middleware.
 *
 * `?mock=true` keeps the typed Phase-0 mock board (same escape hatch the Wizard
 * uses), with no auth/data dependency.
 */
export default async function BoardPage({
  searchParams,
}: {
  searchParams: Promise<{ mock?: string }>;
}) {
  const sp = await searchParams;
  const mock = sp?.mock === "true";

  if (mock) {
    const data = resolveBoardData(true, null, new Date());
    return (
      <div className="theme-board" data-theme="dark">
        <BoardShell initialData={data} mock />
      </div>
    );
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/board");

  // One owner-scoped fetch of everything the board paints (RLS double-gates).
  const [concepts, edges, threads, threadConcepts, technologies, sections, missions] =
    await Promise.all([
      supabase.from("concepts").select("*").eq("user_id", user.id),
      supabase.from("concept_edges").select("*").eq("user_id", user.id),
      supabase
        .from("question_threads")
        .select("*")
        .eq("user_id", user.id)
        .order("asked_at", { ascending: false }),
      supabase.from("thread_concepts").select("*"), // RLS scopes to the user's threads
      supabase.from("technologies").select("*").order("ord", { ascending: true }),
      supabase.from("tech_sections").select("*").order("ord", { ascending: true }),
      supabase
        .from("missions")
        .select("id, title")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(8),
    ]);

  // Same @supabase/ssr generic mismatch the dashboard documents: chained
  // .select() resolves to `never`, so cast rows back to the generated shapes.
  const rows: BoardRows = {
    concepts: (concepts.data ?? []) as Tables<"concepts">[],
    edges: (edges.data ?? []) as Tables<"concept_edges">[],
    threads: (threads.data ?? []) as Tables<"question_threads">[],
    threadConcepts: (threadConcepts.data ?? []) as Tables<"thread_concepts">[],
    technologies: (technologies.data ?? []) as Tables<"technologies">[],
    sections: (sections.data ?? []) as Tables<"tech_sections">[],
    recentMissions: (missions.data ?? []) as Pick<Tables<"missions">, "id" | "title">[],
  };

  const data = resolveBoardData(false, rows, new Date());

  return (
    <div className="theme-board" data-theme="dark">
      <BoardShell initialData={data} userId={user.id} />
    </div>
  );
}
