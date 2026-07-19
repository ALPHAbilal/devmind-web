import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NotebookList } from "@/components/dashboard/NotebookList";
import type { Tables } from "@/lib/supabase/types";
import "@/components/dashboard/dashboard.css";

// Same @supabase/ssr typing mismatch documented in app/notebooks/[id]/page.tsx:
// chained .select() resolves to `never`, so we cast rows back to Tables<>.
// RLS still gates every read to the owner.
type NotebookRow = Tables<"notebooks">;

/**
 * Notebooks dashboard — SSR seeds the signed-in user's notebooks; NotebookList
 * (client) attaches a Realtime subscription so status flips and new notebooks
 * appear without a refresh. RLS scopes the SELECT to the owner.
 */
export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/dashboard");
  }

  const { data } = await supabase
    .from("notebooks")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const notebooks = (data ?? []) as NotebookRow[];

  return (
    <main className="theme-notebook dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Your notebooks</h1>
        <p className="dashboard-subtitle">{user.email ?? "Signed in"}</p>
      </header>
      <NotebookList userId={user.id} initialNotebooks={notebooks} />
    </main>
  );
}
