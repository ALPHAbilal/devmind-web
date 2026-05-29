import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MissionList } from "@/components/dashboard/MissionList";
import type { Tables } from "@/lib/supabase/types";
import "@/components/dashboard/dashboard.css";

// Same @supabase/ssr typing mismatch documented in app/missions/[id]/page.tsx:
// chained .select() resolves to `never`, so we cast rows back to Tables<>.
// RLS still gates every read to the owner.
type MissionRow = Tables<"missions">;

/**
 * Missions dashboard — SSR seeds the signed-in user's missions; MissionList
 * (client) attaches a Realtime subscription so status flips and new missions
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
    .from("missions")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  const missions = (data ?? []) as MissionRow[];

  return (
    <main className="theme-notebook dashboard-page">
      <header className="dashboard-header">
        <h1 className="dashboard-title">Your missions</h1>
        <p className="dashboard-subtitle">{user.email ?? "Signed in"}</p>
      </header>
      <MissionList userId={user.id} initialMissions={missions} />
    </main>
  );
}
