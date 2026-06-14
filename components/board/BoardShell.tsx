"use client";

/**
 * BoardShell — the client root. Owns the reducer (the demo's global `state`),
 * the theme (kept on the `.theme-board` scope, outside the reducer — like the
 * demo), and the timed side effects the demo ran imperatively: the prerequisite
 * "search" stream and the create→building→done simulation. It is the ONLY
 * adapter consumer; everything below reads via BoardContext.
 */
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { boardAdapter } from "@/lib/board/adapter";
import { BoardContext, type BoardContextValue } from "./BoardContext";
import { boardReducer, initBoardState } from "./boardState";
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

export function BoardShell() {
  const [state, dispatch] = useReducer(boardReducer, boardAdapter, initBoardState);

  const appRef = useRef<HTMLDivElement>(null);
  const dockInputRef = useRef<HTMLInputElement | null>(null);
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

  // stop any in-flight prerequisite stream on unmount
  useEffect(
    () => () => {
      if (timerRef.current != null) clearTimeout(timerRef.current);
    },
    [],
  );

  // Dock submit → start a session and stream the mock prerequisites in over time
  // (the demo's startSession / tick).
  const submitQuestion = useCallback((raw: string) => {
    const v = raw.trim() || "why my React components re-render too much";
    if (timerRef.current != null) clearTimeout(timerRef.current);
    dispatch({ type: "startSession", request: v });
    const prereqs = boardAdapter.samplePrereqs;
    let i = 0;
    const tick = () => {
      if (i >= prereqs.length) {
        dispatch({ type: "endSearch" });
        return;
      }
      dispatch({
        type: "pushPrereq",
        prereq: { ...prereqs[i], id: i, known: false, status: "todo" },
      });
      i += 1;
      timerRef.current = window.setTimeout(tick, 700);
    };
    timerRef.current = window.setTimeout(tick, 600);
  }, []);

  // MorphSheet "Create / Build" (the demo's commitCreate).
  const commitCreate = useCallback(() => {
    const cfg = stateRef.current.sheet;
    if (!cfg) return;
    dispatch({ type: "closeSheet" });
    if (cfg.build) {
      window.setTimeout(() => dispatch({ type: "openFull", title: cfg.title }), 360);
      return;
    }
    if (cfg.prereqId != null) {
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
  }, []);

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

  const ctx: BoardContextValue = {
    state,
    dispatch,
    data: boardAdapter,
    submitQuestion,
    commitCreate,
    focusDock,
    theme,
    toggleTheme,
  };

  const appClass = `app${state.sbCollapsed ? " sb-collapsed" : ""}${
    state.nav === "thread" ? " thread-focus" : ""
  }`;

  return (
    <BoardContext.Provider value={ctx}>
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
