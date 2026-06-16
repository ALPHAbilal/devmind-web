/**
 * Mock data — ported VERBATIM from demo-full-dashboard.html (same names + values).
 * The supabaseAdapter (Phase 2) produces these same shapes from live rows; until
 * then this is the single source of board data, read only through adapter.ts.
 *
 * Inline <b>…</b> / &amp; in `ev`/`built` is intentional — rendered via the demo's
 * innerHTML path (dangerouslySetInnerHTML in ConceptCard). Kept exact.
 */
import type {
  BoardColumn,
  ColumnKey,
  DotClass,
  Goal,
  HistorySection,
  QuestionThread,
  SamplePrereq,
  Tech,
  TechSection,
  ThreadBucket,
  ThreadNote,
} from "./types";

export const GOALS: Goal[] = [
  { k: "build", t: "Build", d: "ship something" },
  { k: "understand", t: "Depth", d: "really get it" },
  { k: "interview", t: "Interview", d: "prep to pass" },
  { k: "work", t: "For work", d: "use it Monday" },
];

// concept.state: gap | learning | known ; known carries by:'you'|'agent' ; due:1 -> Review
export const TECHS: Record<string, Tech> = {
  react: {
    label: "React",
    mn: "Re",
    concepts: [
      { id: "jsx", name: "JSX", state: "known", by: "agent", ev: "verified in <b>Components &amp; JSX</b>", nb: 1 },
      { id: "comp", name: "Components", state: "known", by: "agent", ev: "verified in <b>Components &amp; JSX</b>", nb: 1 },
      { id: "props", name: "Props", state: "known", by: "you", nb: 1 },
      { id: "closures", name: "Closures (JS)", state: "known", by: "you", due: 1, review: "due today · 9-day interval", nb: 1 },
      { id: "usestate", name: "useState", state: "learning", nb: 1 },
      { id: "useeffect", name: "useEffect", state: "gap", built: "runs <b>after</b> render commits", needs: ["usestate"] },
      { id: "memo", name: "Memoization", state: "gap", built: "skips renders when props are <b>equal</b>", needs: [] },
    ],
  },
  python: {
    label: "Python",
    mn: "Py",
    concepts: [
      { id: "vars", name: "Variables & types", state: "known", by: "you", nb: 1 },
      { id: "fns", name: "Functions", state: "known", by: "agent", ev: "verified in <b>Functions From Scratch</b>", nb: 1 },
      { id: "loops", name: "Loops", state: "known", by: "you", due: 1, review: "due in 2 days", nb: 1 },
      { id: "classes", name: "Classes", state: "learning", nb: 1 },
      { id: "dicts", name: "Dictionaries", state: "gap", built: "attributes <b>are</b> a dict", needs: ["vars"] },
    ],
  },
  git: {
    label: "Git",
    mn: "Gi",
    concepts: [
      { id: "staging", name: "Staging", state: "known", by: "agent", ev: "verified in <b>Commits &amp; Staging</b>", nb: 1 },
      { id: "commits", name: "Commits", state: "known", by: "you", nb: 1 },
      { id: "branches", name: "Branches", state: "known", by: "agent", ev: "verified in <b>Branching basics</b>", nb: 1 },
      { id: "rebase", name: "Rebase", state: "gap", built: "<b>replays</b> commits onto a branch", needs: ["branches"] },
    ],
  },
  sql: {
    label: "Structured Query Language and relational databases",
    mn: "Sq",
    concepts: [
      { id: "select", name: "SELECT", state: "known", by: "you", nb: 1 },
      { id: "joins", name: "Joins", state: "learning", nb: 1 },
      { id: "index", name: "Indexes", state: "gap", built: "a <b>sorted lookup</b> structure", needs: [] },
    ],
  },
};

export const COLS: BoardColumn[] = [
  { key: "review", name: "Review", sw: "var(--amber)" },
  { key: "gap", name: "Gaps", sw: "var(--ink-3)" },
  { key: "learning", name: "Learning", sw: "var(--ink-2)" },
  { key: "you", name: "You marked", sw: "var(--you)" },
  { key: "agent", name: "Agent verified", sw: "rgb(var(--holo))" },
];

/* father sections group the technologies; History sits right under them.
   kids[] are TECHS keys → clicking a child sets state.tech (drives the board). */
export const SECTIONS: TechSection[] = [
  { id: "lang", name: "Languages", icon: "code", kids: ["python", "sql"] },
  { id: "frame", name: "Frameworks", icon: "layers", kids: ["react"] },
  { id: "tools", name: "Build & tools", icon: "cube", kids: ["git"] },
];

export const HISTORY: HistorySection = {
  id: "hist",
  name: "History",
  icon: "clock",
  items: ["React reconciliation and the fiber tree diffing algorithm explained in depth", "SQL window functions", "Git rebase"],
};

export function secOf(tech: string): string | null {
  const s = SECTIONS.find((x) => x.kids.includes(tech));
  return s ? s.id : null;
}

/* ─── Threads data (each asked question → its prerequisite notebooks) ────── */
export const THREAD_LIST: QuestionThread[] = [
  { id: "q6", q: "This auth test keeps failing intermittently — help me find the race condition.", tag: "TypeScript", bucket: "today", ago: "1h ago", files: [{ n: "auth.test.ts", l: 88 }, { n: "auth.ts", l: 140 }, { n: "session.ts", l: 64 }] },
  { id: "q1", q: "Why do my components re-render too much?", tag: "React", bucket: "today", ago: "2h ago" },
  { id: "q5", q: "Refactoring a large dashboard and several components re-render on every keystroke even though their props look stable — how do I find which ones are doing it and fix the referential-equality issues across the whole tree without blindly memoising everything?", tag: "React", bucket: "today", ago: "4h ago", files: [{ n: "Dashboard.tsx", l: 312 }], code: { lang: "TSX", text: "const rows = useMemo(() =>\n  data.filter(r => r.active),\n  [data]      // ← new array identity each render\n);" } },
  { id: "q7", q: "Why is this query slow on large tables?", tag: "SQL", bucket: "yesterday", ago: "1d ago", code: { lang: "SQL", text: "SELECT o.*, c.name\nFROM orders o\nJOIN customers c ON c.id = o.customer_id\nWHERE o.created_at > now() - interval '30 days'\nORDER BY o.total DESC\nLIMIT 100;" } },
  { id: "q3", q: "Optimize slow SQL queries", tag: "SQL", bucket: "earlier", ago: "3d ago" },
];

export const THREAD_NOTES: ThreadNote[] = [
  { q: "q6", n: "Async test timing", col: "gap" }, { q: "q6", n: "Mock the clock", col: "learning" }, { q: "q6", n: "Session lifecycle", col: "agent" },
  { q: "q1", n: "Render & commit", col: "agent" }, { q: "q1", n: "Referential equality", col: "learning" }, { q: "q1", n: "Reconciliation", col: "review" }, { q: "q1", n: "useMemo / useCallback", col: "gap" }, { q: "q1", n: "Stable references", col: "gap" }, { q: "q1", n: "Props identity", col: "you" },
  { q: "q5", n: "why-did-you-render", col: "learning" }, { q: "q5", n: "Referential equality", col: "gap" }, { q: "q5", n: "useMemo / useCallback", col: "gap" }, { q: "q5", n: "Context splitting", col: "agent" }, { q: "q5", n: "Stable callbacks", col: "you" },
  { q: "q7", n: "Query plans", col: "you" }, { q: "q7", n: "Indexes", col: "learning" }, { q: "q7", n: "Join strategies", col: "gap" },
  { q: "q3", n: "SELECT basics", col: "you" }, { q: "q3", n: "Window functions", col: "learning" }, { q: "q3", n: "EXPLAIN", col: "gap" },
];

export const TBUCKETS: ThreadBucket[] = [
  { k: "today", l: "Today", d: "Jun 14" },
  { k: "yesterday", l: "Yesterday", d: "Jun 13" },
  { k: "earlier", l: "Earlier", d: "" },
];

export const TORDER: ColumnKey[] = ["agent", "you", "review", "learning", "gap"];
export const TDOTC: Record<ColumnKey, DotClass> = { agent: "k", you: "k", review: "k", learning: "p", gap: "o" };
export const TCSTAT: Record<ColumnKey, string> = {
  review: "↻ due for review",
  gap: "gap to fill",
  learning: "in progress",
  you: "you marked known",
  agent: "✦ agent verified",
};

/* ─── prerequisite discovery (the agent "searches" — mock stand-in) ─────── */
export const SAMPLE_PREREQS: SamplePrereq[] = [
  { name: "Render & commit", desc: "React paints from a description" },
  { name: "Referential equality", desc: "=== compares object identity" },
  { name: "Reconciliation", desc: "diffing the previous tree" },
  { name: "Stable references", desc: "useMemo / useCallback" },
];
