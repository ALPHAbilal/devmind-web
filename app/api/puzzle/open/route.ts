import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postToFly } from "@/lib/flyClient";

export const runtime = "nodejs";
export const maxDuration = 60;

interface OpenBody {
  mission_id?: unknown;
  micro_challenge_id?: unknown;
  anchor?: unknown;
}

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

  let body: OpenBody;
  try {
    body = (await req.json()) as OpenBody;
  } catch {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  const missionId =
    typeof body.mission_id === "string" ? body.mission_id : "";
  const microChallengeId =
    typeof body.micro_challenge_id === "string" ? body.micro_challenge_id : "";
  if (!missionId || !microChallengeId) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "mission_id and micro_challenge_id are required",
        },
      },
      { status: 400 },
    );
  }

  try {
    const { status, data } = await postToFly(`/puzzle/open`, user.id, {
      mission_id: missionId,
      micro_challenge_id: microChallengeId,
      anchor: body.anchor ?? null,
    });
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
