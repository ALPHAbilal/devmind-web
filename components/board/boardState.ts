/**
 * boardState — the demo's global `state` + imperative `render()` become a
 * useReducer. Field set matches the demo 1:1 (plus `sbCollapsed`/`techConcepts`,
 * which the demo held as DOM classes / in-place TECHS mutation). Side effects
 * (timed prereq streaming, build delays) live in BoardShell, not here.
 */
import type { BoardData } from "@/lib/board/adapter";
import { secOf } from "@/lib/board/mock";
import type {
  BoardState,
  ColumnKey,
  Concept,
  Nav,
  SessionPrereq,
  SheetConfig,
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
  | { type: "pushPrereq"; prereq: SessionPrereq }
  | { type: "endSearch" }
  | { type: "toggleKnow"; id: number }
  | { type: "markKnown"; id: string }
  | { type: "createConceptLearning"; id: string } // gap → learning
  | { type: "prereqBuilding"; id: number }
  | { type: "prereqDone"; id: number; newConceptId: string }
  | { type: "openSheet"; cfg: SheetConfig }
  | { type: "closeSheet" }
  | { type: "openFull"; title: string }
  | { type: "closeFull" };

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

export function initBoardState(data: BoardData): BoardState {
  const techConcepts: Record<string, Concept[]> = {};
  for (const key of Object.keys(data.techs)) {
    // clone so the working board never mutates the adapter's source arrays
    techConcepts[key] = data.techs[key].concepts.map((c) => ({ ...c }));
  }
  return {
    tech: "react",
    nav: "board",
    thread: null,
    tquery: "",
    tcodeOpen: false,
    openSec: "frame", // accordion: 'frame' holds React (the default active tech)
    view: "all",
    session: null,
    sheet: null,
    full: null,
    sbCollapsed: false,
    techConcepts,
  };
}

/** Map one tech's concept array immutably. */
function patchConcepts(
  state: BoardState,
  tech: string,
  fn: (c: Concept[]) => Concept[],
): Record<string, Concept[]> {
  return { ...state.techConcepts, [tech]: fn(state.techConcepts[tech] ?? []) };
}

export function boardReducer(state: BoardState, action: BoardAction): BoardState {
  switch (action.type) {
    case "setTech":
      return { ...state, tech: action.tech, openSec: secOf(action.tech), nav: "board" };

    case "toggleSec":
      // collapsed rail → open the real sidebar focused on that section; else toggle
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
        session: { request: action.request, searching: true, prereqs: [] },
      };

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

    case "endSearch": {
      if (!state.session) return state;
      return { ...state, session: { ...state.session, searching: false } };
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

    case "markKnown":
      return {
        ...state,
        techConcepts: patchConcepts(state, state.tech, (cs) =>
          cs.map((c) =>
            c.id === action.id ? { ...c, state: "known", by: "you" } : c,
          ),
        ),
      };

    case "createConceptLearning":
      return {
        ...state,
        techConcepts: patchConcepts(state, state.tech, (cs) =>
          cs.map((c) =>
            c.id === action.id
              ? { ...c, state: "learning", nb: 1, session: true }
              : c,
          ),
        ),
      };

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
      // notebook created → a new concept lands at the top of Learning
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

    case "openSheet":
      return { ...state, sheet: action.cfg };

    case "closeSheet":
      return { ...state, sheet: null };

    case "openFull":
      return { ...state, sheet: null, full: action.title };

    case "closeFull":
      return { ...state, full: null };

    default:
      return state;
  }
}
