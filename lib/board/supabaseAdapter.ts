/**
 * supabaseAdapter — the ONLY place that knows the DB row shapes. It maps live
 * Supabase rows (per lib/supabase/types.ts) into the board domain types the
 * components already speak (Concept / QuestionThread / TechSection / ThreadNote),
 * so everything below BoardShell stays unaware of the database (the same
 * mock/real seam Phase 0 set up).
 *
 * Reads are seeded SSR (buildBoardData) and kept current over Realtime; the
 * per-row mappers (rowToConcept / rowToThread) are reused by BoardShell's
 * Realtime handlers so streamed inserts land in the same shapes.
 */
import type { Tables } from "@/lib/supabase/types";
import type { BoardData } from "./adapter";
import { COLS, GOALS } from "./mock";
import type {
  ColumnKey,
  Concept,
  HistorySection,
  QuestionThread,
  Tech,
  TechSection,
  ThreadBucket,
  ThreadFile,
  ThreadLink,
  ThreadNote,
} from "./types";

type ConceptRow = Tables<"concepts">;
type EdgeRow = Tables<"concept_edges">;
type ThreadRow = Tables<"question_threads">;
type ThreadConceptRow = Tables<"thread_concepts">;
type TechRow = Tables<"technologies">;
type SectionRow = Tables<"tech_sections">;
type NotebookRow = Tables<"notebooks">;

export interface BoardRows {
  concepts: ConceptRow[];
  edges: EdgeRow[];
  threads: ThreadRow[];
  threadConcepts: ThreadConceptRow[];
  technologies: TechRow[];
  sections: SectionRow[];
  /** Recent notebooks for the sidebar History section (label + link). */
  recentNotebooks: Pick<NotebookRow, "id" | "title">[];
}

const DAY = 86_400_000;

/** Calendar-day delta (today=0, yesterday=1, …) between two dates. */
function dayDelta(then: Date, now: Date): number {
  const a = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate());
  const b = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((b - a) / DAY);
}

function bucketOf(asked: Date, now: Date): QuestionThread["bucket"] {
  const d = dayDelta(asked, now);
  if (d <= 0) return "today";
  if (d === 1) return "yesterday";
  return "earlier";
}

/** Human "2h ago" / "1d ago" provenance label (replaces the demo's hardcoded). */
function agoLabel(asked: Date, now: Date): string {
  const ms = Math.max(0, now.getTime() - asked.getTime());
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

/** "due today" / "due in 3 days" + interval, for the Review column note. */
function reviewText(row: ConceptRow, now: Date): string {
  const d = row.review_due_at ? dayDelta(now, new Date(row.review_due_at)) : 0;
  const when = d <= 0 ? "due today" : d === 1 ? "due in 1 day" : `due in ${d} days`;
  return row.review_interval_days
    ? `${when} · ${row.review_interval_days}-day interval`
    : when;
}

function parseFiles(files: ThreadRow["files"]): ThreadFile[] | undefined {
  if (!Array.isArray(files)) return undefined;
  const out = files
    .map((f) =>
      f && typeof f === "object" && "n" in f
        ? { n: String((f as { n: unknown }).n), l: Number((f as { l: unknown }).l ?? 0) }
        : null,
    )
    .filter((f): f is ThreadFile => !!f && !!f.n);
  return out.length ? out : undefined;
}

function parseCode(code: ThreadRow["code"]): QuestionThread["code"] | undefined {
  if (!code || typeof code !== "object" || Array.isArray(code)) return undefined;
  const c = code as { lang?: unknown; text?: unknown };
  if (typeof c.text !== "string") return undefined;
  return { lang: typeof c.lang === "string" ? c.lang : "code", text: c.text };
}

/* ─── per-row mappers (reused by Realtime handlers) ──────────────────────── */

/** One concept row → board card. `needs` come from concept_edges (passed in);
 *  Realtime inserts have no edges yet, so callers preserve prior `needs`. */
export function rowToConcept(c: ConceptRow, needs: string[], now: Date): Concept {
  const due = !!c.review_due_at;
  return {
    id: c.id,
    name: c.name,
    state: c.state,
    by: c.verified_by ?? undefined,
    ev: c.evidence ?? undefined,
    nb: c.last_notebook_id ? 1 : undefined,
    notebookId: c.last_notebook_id ?? undefined,
    due: due ? 1 : undefined,
    review: due ? reviewText(c, now) : undefined,
    built: c.built_from ?? undefined,
    needs: needs.length ? needs : undefined,
  };
}

export function rowToThread(t: ThreadRow, now: Date): QuestionThread {
  const asked = new Date(t.asked_at);
  return {
    id: t.id,
    q: t.question_text,
    tag: t.tag ?? t.technology ?? "",
    bucket: bucketOf(asked, now),
    ago: agoLabel(asked, now),
    files: parseFiles(t.files),
    code: parseCode(t.code),
  };
}

/** tech_sections + technologies → the sidebar's father sections (with child
 *  tech keys, ordered). Only sections that actually own a technology appear. */
export function rowToSections(sections: SectionRow[], techs: TechRow[]): TechSection[] {
  const bySection = new Map<string, TechRow[]>();
  for (const t of techs) {
    const list = bySection.get(t.section_id) ?? [];
    list.push(t);
    bySection.set(t.section_id, list);
  }
  return sections
    .slice()
    .sort((a, b) => a.ord - b.ord)
    .map((s) => ({
      id: s.id,
      name: s.name,
      icon: s.icon ?? "cube",
      kids: (bySection.get(s.id) ?? [])
        .sort((a, b) => a.ord - b.ord)
        .map((t) => t.key),
    }))
    .filter((s) => s.kids.length > 0);
}

/** Derive the live ThreadNote[] (name + column) from the raw belonging join and
 *  the current concept states — so dot-ledgers + scoped boards move with cards. */
export function threadConceptsOf(
  links: ThreadLink[],
  conceptById: Map<string, Concept>,
  colOf: (c: Concept) => ColumnKey,
): ThreadNote[] {
  return links
    .slice()
    .sort((a, b) => a.ord - b.ord)
    .map((l): ThreadNote | null => {
      const c = conceptById.get(l.conceptId);
      if (!c) return null;
      return { q: l.threadId, n: c.name, col: colOf(c), id: c.id };
    })
    .filter((n): n is ThreadNote => n !== null);
}

/* ─── full SSR seed ──────────────────────────────────────────────────────── */

const BUCKET_META: { k: QuestionThread["bucket"]; l: string }[] = [
  { k: "today", l: "Today" },
  { k: "yesterday", l: "Yesterday" },
  { k: "earlier", l: "Earlier" },
];

function shortDate(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

/** Assemble a complete BoardData from one SSR fetch. Small data set (≤ hundreds
 *  of rows) → fetched whole; client-side per-tech filtering stays in memory. */
export function buildBoardData(rows: BoardRows, now: Date): BoardData {
  // edges → needs[] per concept
  const needsByConcept = new Map<string, string[]>();
  for (const e of rows.edges) {
    const list = needsByConcept.get(e.concept_id) ?? [];
    list.push(e.needs_concept_id);
    needsByConcept.set(e.concept_id, list);
  }

  // concepts grouped by technology
  const conceptsByTech = new Map<string, Concept[]>();
  for (const c of rows.concepts) {
    const concept = rowToConcept(c, needsByConcept.get(c.id) ?? [], now);
    const list = conceptsByTech.get(c.technology) ?? [];
    list.push(concept);
    conceptsByTech.set(c.technology, list);
  }

  // techs metadata for EVERY technology (so the sidebar/cards always resolve)
  const techs: Record<string, Tech> = {};
  for (const t of rows.technologies) {
    techs[t.key] = {
      label: t.label,
      mn: t.mn ?? t.key.slice(0, 2),
      concepts: conceptsByTech.get(t.key) ?? [],
    };
  }

  const sections = rowToSections(rows.sections, rows.technologies);

  const threads = rows.threads.map((t) => rowToThread(t, now));
  const threadLinks: ThreadLink[] = rows.threadConcepts.map((tc) => ({
    threadId: tc.thread_id,
    conceptId: tc.concept_id,
    ord: tc.ord,
  }));

  // History = recent notebooks; clicking navigates to /notebooks/[id]
  const historyLinks: Record<string, string> = {};
  for (const m of rows.recentNotebooks) {
    const label = m.title?.trim();
    if (label && !(label in historyLinks)) historyLinks[label] = m.id;
  }
  const history: HistorySection = {
    id: "hist",
    name: "History",
    icon: "clock",
    items: Object.keys(historyLinks).slice(0, 8),
  };

  // bucket labels relative to "now" (replaces the demo's hardcoded TBUCKETS)
  const yesterday = new Date(now.getTime() - DAY);
  const threadBuckets: ThreadBucket[] = BUCKET_META.map((b) => ({
    k: b.k,
    l: b.l,
    d: b.k === "today" ? shortDate(now) : b.k === "yesterday" ? shortDate(yesterday) : "",
  }));

  return {
    sections,
    history,
    columns: COLS,
    goals: GOALS,
    techs,
    threadBuckets,
    threads,
    threadNotes: [], // derived live in BoardShell from threadLinks + concepts
    threadLinks,
    historyLinks,
    samplePrereqs: [], // mock-only; the real prereqs stream in over Realtime
  };
}
