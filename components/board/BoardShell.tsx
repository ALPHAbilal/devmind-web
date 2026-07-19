"use client";

/**
 * BoardShell — the client root. Owns the reducer (the demo's global `state`),
 * the theme scope, and the data verbs. It is the ONLY adapter/Realtime consumer;
 * everything below reads via BoardContext, unaware of the data source.
 *
 * Two modes, selected by the server (`mock` prop):
 *  • mock  — seeds from the typed mock board; the dock/build run the demo's timed
 *            simulation. Reached via `/board?mock=true`. Unchanged from Phase 0.
 *  • live  — seeds from the SSR `initialData`, subscribes Realtime on
 *            concepts/question_threads/thread_concepts (RLS-scoped to the user),
 *            and the verbs hit the DB: ask → POST /threads, create/build → POST
 *            /notebooks/generate, mark-known → direct Supabase UPDATE.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type Dispatch,
} from "react";
import { useRouter } from "next/navigation";
import type { BoardData } from "@/lib/board/adapter";
import type { Concept, SessionPrereq } from "@/lib/board/types";
import type { Tables } from "@/lib/supabase/types";
import { createClient } from "@/lib/supabase/client";
import { useRealtimeChannel } from "@/lib/realtime";
import { rowToConcept, rowToThread, threadConceptsOf } from "@/lib/board/supabaseAdapter";
import { BoardContext, type BoardContextValue, type CreateForm } from "./BoardContext";
import { boardReducer, colOf, initBoardState, type BoardAction } from "./boardState";
import { Sidebar } from "./Sidebar";
import { EdgeTab } from "./EdgeTab";
import { TopBar } from "./TopBar";
import { Board } from "./Board";
import { Dock } from "./Dock";
import { MorphSheet } from "./MorphSheet";
import { FullView } from "./FullView";
import { ThreadsView } from "./threads/ThreadsView";
import { ThreadView } from "./threads/ThreadView";
import "./board.css";

type ConceptRow = Tables<"concepts">;
type ThreadRow = Tables<"question_threads">;
type ThreadConceptRow = Tables<"thread_concepts">;

interface BoardShellProps {
  initialData: BoardData;
  /** Present on the live board; absent in mock mode. Drives the Realtime filters. */
  userId?: string;
  mock?: boolean;
}

/** POST the generator proxy. Returns the new notebook id (202) or null. */
async function postGenerate(body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch("/api/notebooks/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const j = (await res.json().catch(() => ({}))) as { notebook_id?: string };
    return res.status === 202 && j.notebook_id ? j.notebook_id : null;
  } catch {
    return null;
  }
}

/** Owner-scoped concept UPDATE (mark known) — RLS allows the owner. */
async function markConceptKnown(id: string): Promise<void> {
  try {
    const sb = createClient();
    // @supabase/ssr's 3-generic client narrows update() args to `never` (same
    // mismatch app/realtime-test documents); cast the payload to satisfy it.
    await sb
      .from("concepts")
      .update({ state: "known", verified_by: "you" } as never)
      .eq("id", id);
  } catch {
    // Realtime/refresh will reconcile; the optimistic move already happened.
  }
}

export function BoardShell({ initialData, userId, mock = false }: BoardShellProps) {
  const [state, dispatch] = useReducer(boardReducer, initialData, initBoardState);
  const router = useRouter();

  const appRef = useRef<HTMLDivElement>(null);
  const dockInputRef = useRef<HTMLTextAreaElement | null>(null);
  const timerRef = useRef<number | null>(null);
  const stateRef = useRef(state);
  stateRef.current = state;

  // theme lives on the .theme-board scope (the demo toggles data-theme there)
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    appRef.current?.closest(".theme-board")?.setAttribute("data-theme", theme);
  }, [theme]);
  const toggleTheme = useCallback(
    () => setTheme((t) => (t === "dark" ? "light" : "dark")),
    [],
  );

  // stop any in-flight mock prerequisite stream on unmount
  useEffect(
    () => () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    },
    [],
  );

  // ── Ask (dock submit) ────────────────────────────────────────────────────
  const submitQuestion = useCallback(
    (raw: string) => {
      const v = raw.trim();
      if (mock) {
        const vv = v || "why my React components re-render too much";
        if (timerRef.current != null) clearTimeout(timerRef.current);
        dispatch({ type: "startSession", request: vv });
        const prereqs = initialData.samplePrereqs;
        let i = 0;
        const tick = () => {
          if (i >= prereqs.length) return dispatch({ type: "endSearch" });
          dispatch({
            type: "pushPrereq",
            prereq: { ...prereqs[i], id: String(i), known: false, status: "todo" },
          });
          i += 1;
          timerRef.current = window.setTimeout(tick, 700);
        };
        timerRef.current = window.setTimeout(tick, 600);
        return;
      }
      // live: POST the thread; prereq cards arrive via Realtime (status='mapping').
      if (!v) return;
      dispatch({ type: "startSession", request: v });
      const technology = stateRef.current.tech;
      void (async () => {
        try {
          const res = await fetch("/api/board/threads", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ question_text: v, technology }),
          });
          const body = (await res.json().catch(() => ({}))) as { thread_id?: string };
          if (res.status === 202 && body.thread_id)
            dispatch({ type: "sessionThread", threadId: body.thread_id });
          else dispatch({ type: "endSearch" });
        } catch {
          dispatch({ type: "endSearch" });
        }
      })();
    },
    [mock, initialData.samplePrereqs],
  );

  // ── Create a notebook / Build the target (MorphSheet commit) ─────────────
  const commitCreate = useCallback(
    (form: CreateForm) => {
      const cfg = stateRef.current.sheet;
      if (!cfg) return;
      dispatch({ type: "closeSheet" });

      if (mock) {
        if (cfg.build) {
          window.setTimeout(() => dispatch({ type: "openFull", title: cfg.title }), 360);
        } else if (cfg.prereqId != null) {
          const id = cfg.prereqId;
          window.setTimeout(() => dispatch({ type: "prereqBuilding", id }), 80);
          window.setTimeout(
            () => dispatch({ type: "prereqDone", id, newConceptId: `nb${Date.now()}` }),
            2400,
          );
        } else if (cfg.conceptId != null) {
          const id = cfg.conceptId;
          window.setTimeout(() => dispatch({ type: "createConceptLearning", id }), 80);
        }
        return;
      }

      // live: feed the existing generator, stamped with board provenance.
      const goal = form.goal ?? "build";
      const constraints = form.note.trim() ? [form.note.trim()] : [];
      const threadId = stateRef.current.session?.threadId ?? undefined;
      void (async () => {
        if (cfg.build) {
          // step 5: the target notebook for the original question
          const mid = await postGenerate({
            topic: cfg.title,
            goal,
            constraints,
            origin_thread_id: threadId,
            is_thread_target: true,
          });
          if (mid) router.push(`/notebooks/${mid}`);
          return;
        }
        const conceptId = cfg.prereqId ?? cfg.conceptId;
        if (!conceptId) return;
        const isPrereq = cfg.prereqId != null;
        const mid = await postGenerate({
          topic: cfg.title,
          goal,
          constraints,
          concept_id: conceptId,
          origin_thread_id: isPrereq ? threadId : undefined,
        });
        if (!mid) return;
        // backend flips the concept gap→learning over Realtime; nudge it now
        if (isPrereq) dispatch({ type: "prereqBuildingSb", id: conceptId });
        else dispatch({ type: "createConceptLearning", id: conceptId });
      })();
    },
    [mock, router],
  );

  // ── Mark known (board card + prereq triage) ──────────────────────────────
  const markKnown = useCallback(
    (c: Concept) => {
      dispatch({ type: "markKnown", id: c.id }); // optimistic
      if (!mock) void markConceptKnown(c.id); // RLS UPDATE; Realtime confirms
    },
    [mock],
  );

  const prereqToggle = useCallback(
    (p: SessionPrereq) => {
      if (mock) {
        dispatch({ type: "toggleKnow", id: p.id });
        return;
      }
      if (p.known) return; // live triage is one-way (persists)
      dispatch({ type: "markKnown", id: p.id });
      void markConceptKnown(p.id);
    },
    [mock],
  );

  // ── Open notebook / History ──────────────────────────────────────────────
  const openNotebook = useCallback(
    (c: Concept) => {
      if (mock) {
        dispatch({ type: "openSheet", cfg: { mode: "open", title: c.name, conceptId: c.id } });
        return;
      }
      if (c.notebookId) router.push(`/notebooks/${c.notebookId}`);
    },
    [mock, router],
  );

  const openHistory = useCallback(
    (item: string) => {
      if (mock) {
        dispatch({ type: "openSheet", cfg: { mode: "open", title: item } });
        return;
      }
      const mid = initialData.historyLinks?.[item];
      if (mid) router.push(`/notebooks/${mid}`);
    },
    [mock, router, initialData.historyLinks],
  );

  const focusDock = useCallback(() => dockInputRef.current?.focus(), []);

  // Esc closes the full view, then the sheet (the demo's keydown handler).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (stateRef.current.full) dispatch({ type: "closeFull" });
      else if (stateRef.current.sheet) dispatch({ type: "closeSheet" });
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // ── live data overlay: threads + derived ThreadNotes track the reducer ────
  const conceptById = useMemo(() => {
    const m = new Map<string, Concept>();
    for (const k of Object.keys(state.techConcepts))
      for (const c of state.techConcepts[k]) m.set(c.id, c);
    return m;
  }, [state.techConcepts]);

  const data = useMemo<BoardData>(
    () =>
      mock
        ? { ...initialData, threads: state.threads }
        : {
            ...initialData,
            threads: state.threads,
            threadNotes: threadConceptsOf(state.threadConcepts, conceptById, colOf),
          },
    [mock, initialData, state.threads, state.threadConcepts, conceptById],
  );

  const ctx: BoardContextValue = {
    state,
    dispatch,
    data,
    mock,
    submitQuestion,
    commitCreate,
    markKnown,
    prereqToggle,
    openNotebook,
    openHistory,
    focusDock,
    theme,
    toggleTheme,
  };

  const appClass = `app${state.sbCollapsed ? " sb-collapsed" : ""}${
    state.nav === "thread" ? " thread-focus" : ""
  }`;

  const activeThreadId = !mock ? state.session?.threadId ?? null : null;

  return (
    <BoardContext.Provider value={ctx}>
      {!mock && userId && <BoardRealtime userId={userId} dispatch={dispatch} />}
      {activeThreadId && (
        <ThreadConceptsSync threadId={activeThreadId} dispatch={dispatch} />
      )}
      <div className={appClass} ref={appRef}>
        <Sidebar />
        <div className="main">
          <EdgeTab />
          <TopBar />
          {/* board stays mounted (just hidden) so the active column glow + scroll
              survive a trip to the threads views — matches the demo's applyNav */}
          <div className={`board-wrap${state.nav !== "board" ? " hide" : ""}`}>
            <Board />
            <Dock inputRef={dockInputRef} />
          </div>
          {state.nav === "threads" && <ThreadsView />}
          {state.nav === "thread" && <ThreadView />}
        </div>
      </div>
      <MorphSheet />
      <FullView />
    </BoardContext.Provider>
  );
}

/**
 * Concept + thread subscriptions (live board). RLS scopes both to the signed-in
 * user, so no extra filtering is needed — concepts power column moves and the
 * "cards stream in"; question_threads carries status (mapping → awaiting).
 */
function BoardRealtime({
  userId,
  dispatch,
}: {
  userId: string;
  dispatch: Dispatch<BoardAction>;
}) {
  useRealtimeChannel<ConceptRow>(
    "concepts",
    { filter: { column: "user_id", value: userId } },
    (p) => {
      if (p.eventType === "DELETE" || !p.new) return;
      const row = p.new;
      dispatch({
        type: "rtConcept",
        tech: row.technology,
        concept: rowToConcept(row, [], new Date()),
      });
    },
    [userId],
  );

  useRealtimeChannel<ThreadRow>(
    "question_threads",
    { filter: { column: "user_id", value: userId } },
    (p) => {
      if (p.eventType === "DELETE" || !p.new) return;
      const row = p.new;
      dispatch({ type: "rtThread", thread: rowToThread(row, new Date()), status: row.status });
    },
    [userId],
  );

  return null;
}

/**
 * thread_concepts has no user_id, so it's filtered by the active thread and only
 * mounted while a dock session is live — that's exactly when prereq cards attach
 * (the demo's tick). Unmounting on session end unsubscribes.
 */
function ThreadConceptsSync({
  threadId,
  dispatch,
}: {
  threadId: string;
  dispatch: Dispatch<BoardAction>;
}) {
  useRealtimeChannel<ThreadConceptRow>(
    "thread_concepts",
    { filter: { column: "thread_id", value: threadId } },
    (p) => {
      if (p.eventType === "DELETE" || !p.new) return;
      const row = p.new;
      dispatch({
        type: "rtThreadConcept",
        link: { threadId: row.thread_id, conceptId: row.concept_id, ord: row.ord },
      });
    },
    [threadId],
  );
  return null;
}
