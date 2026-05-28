import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postToFly } from "@/lib/flyClient";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

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

  const { data: missionRow } = await supabase
    .from("missions")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!missionRow) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Mission not found" } },
      { status: 404 },
    );
  }

  try {
    const { status, data } = await postToFly(`/missions/${id}/start`, user.id, {});
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
