"use client";

/**
 * TopBar — back button (thread view only) · the session/all view toggle (only
 * once prerequisites exist, on the board) · theme toggle. Mirrors the demo's
 * `.topbar` + `renderSeg()` + `applyNav()`.
 */
import { useBoard } from "./BoardContext";
import { Back, Moon, Sun } from "./icons";

export function TopBar() {
  const { state, dispatch, theme, toggleTheme } = useBoard();
  const showSeg = !!(state.session && !state.session.searching && state.nav === "board");

  return (
    <div className="topbar">
      {state.nav === "thread" && (
        <button className="back" onClick={() => dispatch({ type: "setNav", nav: "threads" })}>
          <Back /> All threads
        </button>
      )}
      <div className="spacer" />
      {showSeg && (
        <div className="seg">
          <button
            className={state.view === "session" ? "on" : ""}
            onClick={() => dispatch({ type: "setView", view: "session" })}
          >
            This session
          </button>
          <button
            className={state.view === "all" ? "on" : ""}
            onClick={() => dispatch({ type: "setView", view: "all" })}
          >
            All concepts
          </button>
        </div>
      )}
      <div className="spacer" />
      <button className="icon" title="theme" onClick={toggleTheme}>
        {theme === "dark" ? <Moon /> : <Sun />}
      </button>
    </div>
  );
}
