import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postToFly } from "@/lib/flyClient";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * POST /api/board/threads — the board's only AI-action proxy (plan §5.3/§5.6
 * step 1). Forwards a question to the Fly `POST /threads` endpoint (HMAC-signed,
 * same pattern as /api/missions/generate). The 202 returns { thread_id, status:
 * 'mapping' }; the prerequisite concept cards then arrive over Realtime as the
 * backend decomposes in the background. Reads stay direct-to-Supabase.
 */
export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json(
      { error: { code: "unauthorized", message: "Sign in required" } },
      { status: 401 },
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Body must be JSON" } },
      { status: 400 },
    );
  }

  try {
    const { status, data } = await postToFly("/threads", user.id, body);
    return NextResponse.json(data, { status });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "upstream_error",
          message: err instanceof Error ? err.message : "Fly backend unreachable",
        },
      },
      { status: 502 },
    );
  }
}
