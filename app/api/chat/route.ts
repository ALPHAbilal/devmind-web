import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postToFly } from "@/lib/flyClient";

export const runtime = "nodejs";
export const maxDuration = 60;

type AnchorIn =
  | { kind: "none" }
  | { kind: "after_cell"; cell_id: string; new?: boolean }
  | { kind: "between_cells"; cell_a: string; cell_b: string }
  | { kind: "in_thread"; thread_id: string }
  | null;

interface ChatBody {
  mission_id?: unknown;
  content?: unknown;
  mode?: unknown;
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

  let body: ChatBody;
  try {
    body = (await req.json()) as ChatBody;
  } catch {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  const missionId = typeof body.mission_id === "string" ? body.mission_id : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const mode = body.mode === "error" ? "error" : "chat";
  const anchor: AnchorIn =
    body.anchor && typeof body.anchor === "object"
      ? (body.anchor as AnchorIn)
      : { kind: "none" };

  if (!missionId || !content) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "mission_id and content are required",
        },
      },
      { status: 400 },
    );
  }

  try {
    const { status, data } = await postToFly(`/chat`, user.id, {
      mission_id: missionId,
      content,
      mode,
      anchor,
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
