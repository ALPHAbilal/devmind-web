import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postToFly } from "@/lib/flyClient";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
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

  let body: { puzzle_id?: unknown; code?: unknown };
  try {
    body = (await req.json()) as { puzzle_id?: unknown; code?: unknown };
  } catch {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  const puzzleId = typeof body.puzzle_id === "string" ? body.puzzle_id : "";
  const code = typeof body.code === "string" ? body.code : "";
  if (!puzzleId || !code) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "puzzle_id and code are required",
        },
      },
      { status: 400 },
    );
  }

  try {
    const { status, data } = await postToFly(
      `/puzzle/generalization`,
      user.id,
      { puzzle_id: puzzleId, code },
    );
    return NextResponse.json(data, { status });
  } catch (err) {
    return NextResponse.json(
      {
        error: {
          code: "upstream_error",
          message:
            err instanceof Error ? err.message : "Fly backend unreachable",
        },
      },
      { status: 502 },
    );
  }
}
