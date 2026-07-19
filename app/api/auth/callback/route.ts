import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Supabase emails the user a link like:
 *   ${origin}/api/auth/callback?code=<one-time-code>&next=/notebooks/new
 *
 * We exchange the code for a session (writing cookies), then redirect to
 * `next` (default /notebooks/new). Used for email confirmation and any
 * future OAuth flows.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/notebooks/new";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Fall through on error or missing code — bounce to login with a hint.
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
