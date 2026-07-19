import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { postToFly } from "@/lib/flyClient";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Proxy for Lane A's POST /notebooks/{id}/resume. Auth via the Supabase server
 * client, then forward to Fly with the HMAC signer. Mirrors ./start/route.ts.
 */
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

  const { data: notebookRow } = await supabase
    .from("notebooks")
    .select("id")
    .eq("id", id)
    .maybeSingle();

  if (!notebookRow) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Notebook not found" } },
      { status: 404 },
    );
  }

  try {
    const { status, data } = await postToFly(`/notebooks/${id}/resume`, user.id, {});
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
