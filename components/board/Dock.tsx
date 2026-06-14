"use client";

/**
 * Dock — the floating "what to learn next" input (the demo's `renderDock`).
 * While the session is searching it shows the busy state; otherwise an
 * uncontrolled input + send. The ref is owned by BoardShell so the sidebar "+"
 * can focus it.
 */
import type { RefObject } from "react";
import { useBoard } from "./BoardContext";
import { Arrow } from "./icons";

export function Dock({ inputRef }: { inputRef: RefObject<HTMLInputElement | null> }) {
  const { state, submitQuestion } = useBoard();
  const busy = !!(state.session && state.session.searching);

  const submit = () => {
    const el = inputRef.current;
    if (!el) return;
    const v = el.value;
    el.value = "";
    submitQuestion(v);
  };

  return (
    <div className="dock">
      <div className={`pill ${busy ? "busy" : ""}`}>
        {busy ? (
          <div className="work">
            <span className="spin" /> mapping prerequisites…
          </div>
        ) : (
          <>
            <input
              ref={inputRef}
              placeholder="What do you want to learn next?"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
              }}
            />
            <button className="send" onClick={submit}>
              <Arrow />
            </button>
          </>
        )}
      </div>
    </div>
  );
}
