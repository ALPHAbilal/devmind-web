import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Tables } from "@/lib/supabase/types";

export const runtime = "nodejs";
export const maxDuration = 30;

type MissionRow = Tables<"missions">;
type HighlightRow = Tables<"mission_highlights">;

interface BranchBody {
  parent_mission_id?: unknown;
  note?: unknown;
  highlights?: unknown;
  /** Branch-canvas road: when set, the child links to this session and the
   *  session's already-stored highlights are adopted (none re-inserted). */
  session_id?: unknown;
  /** Optional explicit child title (e.g. agreed during the exchange). */
  title?: unknown;
}

/**
 * POST /api/branches — create a child notebook ("branch lesson") from a set of
 * highlights in the parent notebook. One depth only: refuses when the parent
 * is itself a child. The child mission is created as a draft; agent generation
 * of its cells is wired later — the highlights + note are stored in spec_json
 * so the generator has full context.
 */
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

  let body: BranchBody;
  try {
    body = (await req.json()) as BranchBody;
  } catch {
    return NextResponse.json(
      { error: { code: "validation_failed", message: "Invalid JSON" } },
      { status: 400 },
    );
  }

  const parentId =
    typeof body.parent_mission_id === "string" ? body.parent_mission_id : "";
  const note = typeof body.note === "string" ? body.note.trim() : "";
  const highlights = Array.isArray(body.highlights)
    ? (body.highlights as Array<{ cell_id?: unknown; text?: unknown }>)
        .filter(
          (h) =>
            typeof h?.cell_id === "string" &&
            typeof h?.text === "string" &&
            (h.text as string).trim(),
        )
        .map((h) => ({
          cell_id: h.cell_id as string,
          text: (h.text as string).trim(),
        }))
    : [];
  const sessionId =
    typeof body.session_id === "string" && body.session_id ? body.session_id : null;
  const explicitTitle =
    typeof body.title === "string" && body.title.trim() ? body.title.trim() : null;

  // Session mode: highlights already live in mission_highlights (written as
  // the user picked them); load them instead of requiring them in the body.
  let sessionHighlights: HighlightRow[] = [];
  if (sessionId) {
    const { data: shData } = await supabase
      .from("mission_highlights")
      .select("*")
      .eq("session_id", sessionId)
      .order("pick_order", { ascending: true });
    sessionHighlights = (shData ?? []) as HighlightRow[];
    for (const h of sessionHighlights) {
      highlights.push({ cell_id: h.cell_id, text: h.selected_text });
    }
  }

  if (!parentId || highlights.length === 0) {
    return NextResponse.json(
      {
        error: {
          code: "validation_failed",
          message: "parent_mission_id and at least one highlight are required",
        },
      },
      { status: 400 },
    );
  }

  const { data: parentData } = await supabase
    .from("missions")
    .select("*")
    .eq("id", parentId)
    .eq("user_id", user.id)
    .maybeSingle();
  const parent = (parentData ?? null) as MissionRow | null;

  if (!parent) {
    return NextResponse.json(
      { error: { code: "not_found", message: "Parent mission not found" } },
      { status: 404 },
    );
  }
  if (parent.parent_mission_id) {
    return NextResponse.json(
      {
        error: {
          code: "depth_limit",
          message: "Branch lessons can only go one level deep",
        },
      },
      { status: 422 },
    );
  }

  const title =
    explicitTitle ??
    (note
      ? note.length > 80
        ? `${note.slice(0, 80)}…`
        : note
      : `Deep dive: ${truncate(highlights[0].text, 60)}`);

  const { data: childData, error: childErr } = await supabase
    .from("missions")
    .insert({
      user_id: user.id,
      parent_mission_id: parent.id,
      title,
      technology: parent.technology,
      goal: parent.goal,
      level: parent.level,
      path_card: parent.path_card,
      time_budget_minutes: 15,
      status: "draft",
      spec_json: {
        title,
        branch: {
          parent_mission_id: parent.id,
          note: note || null,
          highlights,
        },
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    .select("*")
    .single();

  const child = (childData ?? null) as MissionRow | null;
  if (childErr || !child) {
    return NextResponse.json(
      {
        error: {
          code: "insert_failed",
          message: childErr?.message ?? "Could not create branch lesson",
        },
      },
      { status: 500 },
    );
  }

  let outHighlights: HighlightRow[];
  if (sessionId) {
    // Adopt the session's highlights and close the road.
    const { data: updData, error: updErr } = await supabase
      .from("mission_highlights")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({ child_mission_id: child.id } as any)
      .eq("session_id", sessionId)
      .select("*");
    if (updErr) {
      return NextResponse.json(
        { error: { code: "update_failed", message: updErr.message } },
        { status: 500 },
      );
    }
    outHighlights = (updData ?? []) as HighlightRow[];
    await supabase
      .from("branch_sessions")
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .update({
        child_mission_id: child.id,
        status: "generated",
        note: note || null,
        updated_at: new Date().toISOString(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any)
      .eq("id", sessionId);
  } else {
    const { data: hlData, error: hlErr } = await supabase
      .from("mission_highlights")
      .insert(
        highlights.map((h) => ({
          user_id: user.id,
          parent_mission_id: parent.id,
          child_mission_id: child.id,
          cell_id: h.cell_id,
          selected_text: h.text,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        })) as any,
      )
      .select("*");

    if (hlErr) {
      return NextResponse.json(
        { error: { code: "insert_failed", message: hlErr.message } },
        { status: 500 },
      );
    }
    outHighlights = (hlData ?? []) as HighlightRow[];
  }

  return NextResponse.json({
    child_mission: child,
    highlights: outHighlights,
  });
}

function truncate(s: string, n: number): string {
  const flat = s.replace(/\s+/g, " ").trim();
  return flat.length > n ? `${flat.slice(0, n)}…` : flat;
}
