import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Wizard } from "@/components/wizard/Wizard";

/**
 * Notebook creation wizard route. Phase 4.1: shell-only — the 4-step flow
 * runs end-to-end against a hardcoded NotebookSpec mock. Real Opus call
 * arrives in 4.2 via /api/notebooks/generate.
 */
export default async function NotebooksNewPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Belt-and-suspenders on top of middleware.
  if (!user) {
    redirect("/login?next=/notebooks/new");
  }

  return (
    <main className="theme-wizard wizard-page">
      <Wizard userEmail={user.email ?? "you@example.com"} />
    </main>
  );
}
