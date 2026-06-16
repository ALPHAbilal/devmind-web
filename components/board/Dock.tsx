"use client";

/**
 * Dock — the floating "what to learn next" input (the demo's `renderDock`).
 * While the session is searching it shows the busy state; otherwise an
 * uncontrolled auto-growing textarea + send. The ref is owned by BoardShell so
 * the sidebar "+" can focus it. The dock is bottom-anchored, so a taller pill
 * grows upward over the columns.
 */
import type { RefObject } from "react";
import { useBoard } from "./BoardContext";
import { Arrow } from "./icons";

/** Cap the textarea growth; past this it scrolls internally (thin bar). */
const MAX_H = 200;

/** Reset to one line, then grow to fit content up to MAX_H — overflow past it. */
function fit(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_H)}px`;
  el.style.overflowY = el.scrollHeight > MAX_H ? "auto" : "hidden";
}

export function Dock({ inputRef }: { inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const { state, submitQuestion } = useBoard();
  const busy = !!(state.session && state.session.searching);
  // first-run hint: a brand-new learner whose board has no cards yet
  const empty =
    !busy && !state.session && (state.techConcepts[state.tech]?.length ?? 0) === 0;

  const submit = () => {
    const el = inputRef.current;
    if (!el) return;
    const v = el.value;
    el.value = "";
    fit(el); // collapse back to one line
    submitQuestion(v);
  };

  return (
    <div className="dock">
      {empty && (
        <div className="dock-hint">
          Nothing here yet — ask anything you’re stuck on and I’ll map the
          prerequisites into cards.
        </div>
      )}
      <div className={`pill ${busy ? "busy" : ""}`}>
        {busy ? (
          <div className="work">
            <span className="spin" /> mapping prerequisites…
          </div>
        ) : (
          <>
            <textarea
              ref={inputRef}
              rows={1}
              placeholder="What do you want to learn next?"
              autoComplete="off"
              onInput={(e) => fit(e.currentTarget)}
              onFocus={(e) => fit(e.currentTarget)}
              onKeyDown={(e) => {
                // Enter submits; Shift+Enter inserts a newline (multiline now)
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submit();
                }
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
