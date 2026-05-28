import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/notebook/AppShell";

/**
 * Notebook route. For Phase 3.4 this is shell-only: auth gate + AppShell with
 * a placeholder content area. Real notebook rendering arrives in Phase 5.6;
 * the mission ID in the URL is currently unused.
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

  // Middleware already redirects unauthenticated visitors, but a Server
  // Component should never trust upstream guards alone.
  if (!user) {
    redirect(`/login?next=/missions/${id}`);
  }

  return (
    <AppShell userEmail={user.email ?? "user"}>
      <div className="app-shell-placeholder">
        <h1>Notebook content loads here</h1>
        <p>
          Phase 5.6 fills this region with the real cell renderer driven by
          Supabase Realtime on <code>notebook_cells</code>. For now the shell
          (sidebar rail, slide-over panel, floating chat bar) is the spec.
        </p>
        <p>
          Mission id: <code>{id}</code>
        </p>
      </div>
    </AppShell>
  );
}
