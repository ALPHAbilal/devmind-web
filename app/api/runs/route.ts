import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postToFly } from "@/lib/flyClient";

export const runtime = "nodejs";
export const maxDuration = 60;

interface RunsBody {
  mission_id?: unknown;
  cell_id?: unknown;
  file_path?: unknown;
  code?: unknown;
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

  let body: RunsBody;
  try {
    body = (await req.json()) as RunsBody;
  } catch {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  const missionId = typeof body.mission_id === "string" ? body.mission_id : "";
  const cellId = typeof body.cell_id === "string" ? body.cell_id : "";
  const filePath = typeof body.file_path === "string" ? body.file_path : "";
  const code = typeof body.code === "string" ? body.code : "";

  if (!missionId || !cellId || !filePath) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "mission_id, cell_id, and file_path are required",
        },
      },
      { status: 400 },
    );
  }

  try {
    const { status, data } = await postToFly(`/runs`, user.id, {
      mission_id: missionId,
      cell_id: cellId,
      file_path: filePath,
      code,
    });
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
