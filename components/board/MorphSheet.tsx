"use client";

/**
 * MorphSheet — the bottom slide-up sheet (the demo's `openSheet`/`closeSheet`).
 * Two modes: `create` (the goal-chip form that replaces the wizard and will feed
 * the generator) and `open` (notebook preview → Full view). It owns a lagging
 * local copy of the config so the slide-down exit animation can finish before
 * the inner content unmounts (mirrors the demo's deferred innerHTML clear).
 */
import { useEffect, useState } from "react";
import { useBoard } from "./BoardContext";
import { NotebookCells } from "./NotebookCells";
import { Back, Full, X } from "./icons";
import type { SheetConfig } from "@/lib/board/types";

function CreateForm({ cfg }: { cfg: SheetConfig }) {
  const { dispatch, commitCreate, data } = useBoard();
  const [goal, setGoal] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const build = !!cfg.build;

  return (
    <>
      <div className="grab" />
      <div className="sheet-pad">
        <button className="cn-back" onClick={() => dispatch({ type: "closeSheet" })}>
          <Back />
          <span>Back to board</span>
        </button>
        <div className="cn-eyebrow">{build ? "Build your notebook" : "Create notebook"}</div>
        <div className="cn-title">{cfg.title}</div>
        <div className="cn-tsub">↳ {cfg.sub}</div>

        <div className="cn-field">
          <label>Why are you learning this?</label>
          <div className="goals">
            {data.goals.map((g) => (
              <button
                key={g.k}
                className={`goal ${goal === g.k ? "on" : ""}`}
                onClick={() => setGoal(g.k)}
              >
                {g.t}
                <small>{g.d}</small>
              </button>
            ))}
          </div>
        </div>

        <div className="cn-field">
          <label>
            Anything else for the agent? <span className="opt">optional</span>
          </label>
          <textarea
            className="cn-text"
            placeholder="e.g. focus on hooks · use TypeScript · I have a senior interview Friday…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>

        <button className="cn-go" onClick={() => commitCreate({ goal, note })}>
          {build ? "Build notebook →" : "Create notebook →"}
        </button>
        <div className="cn-note">
          {build
            ? "The agent assembles your notebook from everything you cleared."
            : "Builds in the background — head back and queue the next one."}
        </div>
      </div>
    </>
  );
}

function OpenPreview({ cfg }: { cfg: SheetConfig }) {
  const { state, dispatch, data } = useBoard();
  return (
    <>
      <div className="nb-head">
        <span className="nb-t">{cfg.title}</span>
        <span className="nb-tg">{data.techs[state.tech].mn}</span>
        <button className="nb-full" onClick={() => dispatch({ type: "openFull", title: cfg.title })}>
          <Full /> Full view
        </button>
        <button className="nb-x" onClick={() => dispatch({ type: "closeSheet" })}>
          <X />
        </button>
      </div>
      <div className="nb-body">
        <NotebookCells title={cfg.title} />
      </div>
    </>
  );
}

export function MorphSheet() {
  const { state, dispatch } = useBoard();
  // local config lags state.sheet so the close animation can play out
  const [cfg, setCfg] = useState<SheetConfig | null>(state.sheet);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state.sheet) {
      setCfg(state.sheet);
      const r = requestAnimationFrame(() => setOpen(true));
      return () => cancelAnimationFrame(r);
    }
    setOpen(false);
    const t = setTimeout(() => setCfg(null), 480);
    return () => clearTimeout(t);
  }, [state.sheet]);

  const scrimOn = !!state.sheet;
  const scrimSoft = state.sheet?.mode === "create";

  return (
    <>
      <div
        className={`scrim ${scrimOn ? "on" : ""} ${scrimSoft ? "soft" : ""}`}
        onClick={() => dispatch({ type: "closeSheet" })}
      />
      <section className={`sheet ${cfg?.mode === "open" ? "tall" : ""} ${open ? "open" : ""}`}>
        {cfg &&
          (cfg.mode === "open" ? <OpenPreview cfg={cfg} /> : <CreateForm cfg={cfg} />)}
      </section>
    </>
  );
}
