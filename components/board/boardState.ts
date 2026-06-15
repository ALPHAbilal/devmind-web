/**
 * boardState — the demo's global `state` + imperative `render()` become a
 * useReducer. Field set matches the demo, plus the Phase-2 live entities
 * (`threads`, `threadConcepts`) seeded from SSR and merged from Realtime, and a
 * `techSec` map (replaces the mock-only `secOf`). Side effects (the mock prereq
 * simulation, real POSTs, the mark-known UPDATE) live in BoardShell, not here —
 * the reducer stays pure and database-unaware.
 */
import type { BoardData } from "@/lib/board/adapter";
import type {
  BoardState,
  ColumnKey,
  Concept,
  Nav,
  QuestionThread,
  SessionPrereq,
  SheetConfig,
  ThreadLink,
  ViewScope,
} from "@/lib/board/types";

export type BoardAction =
  | { type: "setTech"; tech: string }
  | { type: "toggleSec"; secId: string }
  | { type: "setNav"; nav: Nav }
  | { type: "openThread"; id: string }
  | { type: "setQuery"; q: string }
  | { type: "toggleCode" }
  | { type: "setView"; view: ViewScope }
  | { type: "newTopic" }
  | { type: "setCollapsed"; collapsed: boolean }
  | { type: "toggleCollapse" }
  | { type: "startSession"; request: string }
  | { type: "sessionThread"; threadId: string } // POST /threads resolved → subscribe
  | { type: "endSearch" }
  | { type: "markKnown"; id: string } // gap/learning/anything → known·you
  | { type: "createConceptLearning"; id: string } // gap → learning (optimistic)
  | { type: "openSheet"; cfg: SheetConfig }
  | { type: "closeSheet" }
  | { type: "openFull"; title: string }
  | { type: "closeFull" }
  // ── mock-only simulation (the demo's tick/build timers) ──────────────────
  | { type: "pushPrereq"; prereq: SessionPrereq }
  | { type: "toggleKnow"; id: string }
  | { type: "prereqBuilding"; id: string }
  | { type: "prereqDone"; id: string; newConceptId: string }
  // ── supabase live merge (Realtime) + the gated prereq flow ───────────────
  | { type: "rtConcept"; tech: string; concept: Concept }
  | { type: "rtThread"; thread: QuestionThread; status: string }
  | { type: "rtThreadConcept"; link: ThreadLink }
  | { type: "prereqBuildingSb"; id: string }; // optimistic "Create notebook"

/* ─── column placement (demo's colOf / locked / knownIds) ────────────────── */
export function colOf(c: Concept): ColumnKey {
  if (c.state === "gap") return "gap";
  if (c.state === "learning") return "learning";
  if (c.due) return "review";
  return c.by === "you" ? "you" : "agent";
}

export function knownIds(concepts: Concept[]): Set<string> {
  return new Set(concepts.filter((c) => c.state === "known").map((c) => c.id));
}

export function locked(c: Concept, known: Set<string>): boolean {
  return (c.needs || []).some((id) => !known.has(id));
}

/* ─── seed ───────────────────────────────────────────────────────────────── */
export function initBoardState(data: BoardData): BoardState {
  const techConcepts: Record<string, Concept[]> = {};
  for (const key of Object.keys(data.techs)) {
    // clone so the working board never mutates the adapter's source arrays
    techConcepts[key] = data.techs[key].concepts.map((c) => ({ ...c }));
  }

  // tech → father-section id (from the live taxonomy, not the mock constant)
  const techSec: Record<string, string> = {};
  for (const s of data.sections) for (const k of s.kids) techSec[k] = s.id;

  // Land on a tech that actually has cards so a real user never sees a blank
  // board; prefer React (the demo default) when it has any.
  const ordered = data.sections.flatMap((s) => s.kids);
  const has = (k: string) => (data.techs[k]?.concepts.length ?? 0) > 0;
  const tech =
    (has("react") ? "react" : null) ??
    ordered.find(has) ??
    (data.techs["react"] ? "react" : null) ??
    ordered[0] ??
    Object.keys(data.techs)[0] ??
    "";
  const openSec = techSec[tech] ?? data.sections[0]?.id ?? null;

  return {
    tech,
    nav: "board",
    thread: null,
    tquery: "",
    tcodeOpen: false,
    openSec,
    view: "all",
    session: null,
    sheet: null,
    full: null,
    sbCollapsed: false,
    techConcepts,
    threads: data.threads,
    threadConcepts: data.threadLinks ?? [],
    techSec,
  };
}

/* ─── immutable concept patches ──────────────────────────────────────────── */
function findConcept(state: BoardState, id: string): Concept | undefined {
  for (const k of Object.keys(state.techConcepts)) {
    const c = state.techConcepts[k].find((x) => x.id === id);
    if (c) return c;
  }
  return undefined;
}

/** Map one tech's concept array immutably. */
function patchConcepts(
  state: BoardState,
  tech: string,
  fn: (c: Concept[]) => Concept[],
): Record<string, Concept[]> {
  return { ...state.techConcepts, [tech]: fn(state.techConcepts[tech] ?? []) };
}

/** Update a concept wherever it lives (tech-agnostic — used by mark-known etc). */
function patchById(
  techConcepts: Record<string, Concept[]>,
  id: string,
  fn: (c: Concept) => Concept,
): Record<string, Concept[]> {
  const out: Record<string, Concept[]> = { ...techConcepts };
  for (const k of Object.keys(out)) {
    if (out[k].some((c) => c.id === id))
      out[k] = out[k].map((c) => (c.id === id ? fn(c) : c));
  }
  return out;
}

/** Upsert a Realtime concept into its tech bucket, preserving prereq `needs`
 *  (edges don't stream) and the session flag. */
function upsertConcept(
  techConcepts: Record<string, Concept[]>,
  tech: string,
  concept: Concept,
): Record<string, Concept[]> {
  const prev = techConcepts[tech]?.find((c) => c.id === concept.id);
  const merged: Concept = {
    ...concept,
    needs: concept.needs ?? prev?.needs,
    session: prev?.session || concept.session,
  };
  const bucket = techConcepts[tech] ?? [];
  const next = bucket.some((c) => c.id === concept.id)
    ? bucket.map((c) => (c.id === concept.id ? merged : c))
    : [merged, ...bucket];
  return { ...techConcepts, [tech]: next };
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "setTech":
      return {
        ...state,
        tech: action.tech,
        openSec: state.techSec[action.tech] ?? state.openSec,
        nav: "board",
      };

    case "toggleSec":
      if (state.sbCollapsed)
        return { ...state, sbCollapsed: false, openSec: action.secId };
      return {
        ...state,
        openSec: state.openSec === action.secId ? null : action.secId,
      };

    case "setNav":
      return { ...state, nav: action.nav };

    case "openThread":
      return { ...state, thread: action.id, tcodeOpen: false, nav: "thread" };

    case "setQuery":
      return { ...state, tquery: action.q };

    case "toggleCode":
      return { ...state, tcodeOpen: !state.tcodeOpen };

    case "setView":
      return { ...state, view: action.view };

    case "newTopic":
      return { ...state, nav: "board" };

    case "setCollapsed":
      return { ...state, sbCollapsed: action.collapsed };

    case "toggleCollapse":
      return { ...state, sbCollapsed: !state.sbCollapsed };

    case "startSession":
      return {
        ...state,
        view: "all",
        session: {
          threadId: null,
          request: action.request,
          searching: true,
          prereqs: [],
          building: [],
        },
      };

    case "sessionThread":
      if (!state.session) return state;
      return { ...state, session: { ...state.session, threadId: action.threadId } };

    case "endSearch":
      if (!state.session) return state;
      return { ...state, session: { ...state.session, searching: false } };

    case "markKnown":
      return {
        ...state,
        techConcepts: patchById(state.techConcepts, action.id, (c) => ({
          ...c,
          state: "known",
          by: "you",
          due: undefined,
          review: undefined,
        })),
      };

    case "createConceptLearning":
      return {
        ...state,
        techConcepts: patchById(state.techConcepts, action.id, (c) => ({
          ...c,
          state: "learning",
          nb: 1,
          session: true,
        })),
      };

    case "openSheet":
      return { ...state, sheet: action.cfg };

    case "closeSheet":
      return { ...state, sheet: null };

    case "openFull":
      return { ...state, sheet: null, full: action.title };

    case "closeFull":
      return { ...state, full: null };

    /* ── mock simulation ──────────────────────────────────────────────────── */
    case "pushPrereq": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          prereqs: [...state.session.prereqs, action.prereq],
        },
      };
    }

    case "toggleKnow": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          prereqs: state.session.prereqs.map((p) =>
            p.id === action.id && p.status === "todo"
              ? { ...p, known: !p.known }
              : p,
          ),
        },
      };
    }

    case "prereqBuilding": {
      if (!state.session) return state;
      return {
        ...state,
        session: {
          ...state.session,
          prereqs: state.session.prereqs.map((p) =>
            p.id === action.id ? { ...p, status: "building" } : p,
          ),
        },
      };
    }

    case "prereqDone": {
      if (!state.session) return state;
      const p = state.session.prereqs.find((x) => x.id === action.id);
      const session = {
        ...state.session,
        prereqs: state.session.prereqs.map((x) =>
          x.id === action.id ? { ...x, status: "done" as const } : x,
        ),
      };
      if (!p) return { ...state, session };
      const newConcept: Concept = {
        id: action.newConceptId,
        name: p.name,
        state: "learning",
        nb: 1,
        session: true,
      };
      return {
        ...state,
        session,
        techConcepts: patchConcepts(state, state.tech, (cs) => [newConcept, ...cs]),
      };
    }

    /* ── supabase live merge ──────────────────────────────────────────────── */
    case "rtConcept": {
      const techConcepts = upsertConcept(
        state.techConcepts,
        action.tech,
        action.concept,
      );
      // a card that left 'gap' is no longer "building" in the prereq column
      let session = state.session;
      if (
        session &&
        session.building.includes(action.concept.id) &&
        action.concept.state !== "gap"
      ) {
        session = {
          ...session,
          building: session.building.filter((id) => id !== action.concept.id),
        };
      }
      return { ...state, techConcepts, session };
    }

    case "rtThread": {
      const { thread, status } = action;
      const threads = state.threads.some((t) => t.id === thread.id)
        ? state.threads.map((t) => (t.id === thread.id ? thread : t))
        : [thread, ...state.threads];
      let session = state.session;
      if (session && session.threadId === thread.id)
        session = { ...session, searching: status === "mapping" };
      return { ...state, threads, session };
    }

    case "rtThreadConcept": {
      const { link } = action;
      const exists = state.threadConcepts.some(
        (l) => l.threadId === link.threadId && l.conceptId === link.conceptId,
      );
      const threadConcepts = exists
        ? state.threadConcepts.map((l) =>
            l.threadId === link.threadId && l.conceptId === link.conceptId ? link : l,
          )
        : [...state.threadConcepts, link];
      // mark this concept as belonging to the active session (the "This session" filter)
      let techConcepts = state.techConcepts;
      if (
        state.session?.threadId === link.threadId &&
        findConcept(state, link.conceptId)
      ) {
        techConcepts = patchById(techConcepts, link.conceptId, (c) =>
          c.session ? c : { ...c, session: true },
        );
      }
      return { ...state, threadConcepts, techConcepts };
    }

    case "prereqBuildingSb": {
      if (!state.session || state.session.building.includes(action.id)) return state;
      return {
        ...state,
        session: { ...state.session, building: [...state.session.building, action.id] },
      };
    }

    default:
      return state;
  }
}
