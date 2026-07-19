"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import {
  NotebookSidebar,
  type NotebookSidebarTech,
  type NotebookSidebarHistoryItem,
} from "@/components/sidebar/NotebookSidebar";
import { Arrow } from "./icons";
import "./board.css";

export type Concept = Tables<"concepts">;
type ConceptState = Concept["state"];

interface BoardProps {
  initialConcepts: Concept[];
  notebookTitles: Record<string, string>;
  techs: NotebookSidebarTech[];
  history: NotebookSidebarHistoryItem[];
}

const DEFAULT_INTERVAL_DAYS = 3;
/** Dock textarea growth cap — past this it scrolls internally. */
const MAX_H = 200;

/** Preset review angles — the free-text field covers everything else. */
const FOCUS_PRESETS = ["More theory", "More code", "Coding problems", "Mixed"];

/** Reset to one line, then grow to fit content up to MAX_H. */
function fit(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = `${Math.min(el.scrollHeight, MAX_H)}px`;
  el.style.overflowY = el.scrollHeight > MAX_H ? "auto" : "hidden";
}

/** "6d overdue" / "due in 2d" / "due today". */
function dueLabel(dueAt: string): { text: string; overdue: boolean } {
  const diff = new Date(dueAt).getTime() - Date.now();
  const days = Math.round(Math.abs(diff) / 86_400_000);
  if (diff < -43_200_000) {
    return { text: `${Math.max(days, 1)}d overdue`, overdue: true };
  }
  if (days === 0) return { text: "due today", overdue: false };
  return { text: `due in ${days}d`, overdue: false };
}

/**
 * The board — four columns (To Learn · Learning · Completed · Review) in the
 * .theme-board visual system. The dock seeds To Learn with things the learner
 * wants later; Review is reachable only from Completed, and promoting a card
 * there opens the focus panel: preset chips + free text describing what the
 * review should emphasize (theory, code, problems…). That focus is stored on
 * the concept and will drive the review agent. Overdue reviews float to the
 * top of Review with the amber flag.
 */
export function Board({
  initialConcepts,
  notebookTitles,
  techs,
  history,
}: BoardProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [concepts, setConcepts] = useState<Concept[]>(initialConcepts);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<ConceptState | null>(null);
  /** Card whose review-focus panel is open (completed → review promotion). */
  const [focusFor, setFocusFor] = useState<string | null>(null);
  const [focusPreset, setFocusPreset] = useState<string | null>(null);
  const focusTextRef = useRef<HTMLTextAreaElement>(null);
  const dockRef = useRef<HTMLTextAreaElement>(null);

  const columns = useMemo(() => {
    const queued = concepts.filter((c) => c.state === "queued");
    const learning = concepts.filter((c) => c.state === "learning");
    const completed = concepts.filter((c) => c.state === "completed");
    const review = concepts
      .filter((c) => c.state === "review")
      .sort((a, b) => {
        const ad = a.review_due_at ? new Date(a.review_due_at).getTime() : 0;
        const bd = b.review_due_at ? new Date(b.review_due_at).getTime() : 0;
        return ad - bd; // most overdue first
      });
    return { queued, learning, completed, review };
  }, [concepts]);

  const anyOverdue = columns.review.some(
    (c) => c.review_due_at && dueLabel(c.review_due_at).overdue,
  );

  const patch = useCallback(
    (id: string, fields: Partial<Concept>) => {
      setConcepts((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...fields } : c)),
      );
      void supabase
        .from("concepts")
        .update({ ...fields, updated_at: new Date().toISOString() } as never)
        .eq("id", id)
        .then(() => undefined);
    },
    [supabase],
  );

  const move = useCallback(
    (c: Concept, to: ConceptState) => {
      if (c.state === to) return;
      // Review is only entered through the focus panel, from Completed.
      if (to === "review") {
        if (c.state !== "completed") return;
        setFocusFor(c.id);
        setFocusPreset(null);
        return;
      }
      patch(c.id, { state: to });
    },
    [patch],
  );

  /** Confirm the focus panel — schedule the review with the chosen angle. */
  const scheduleReview = useCallback(
    (c: Concept) => {
      const free = focusTextRef.current?.value.trim() ?? "";
      const focus = [focusPreset, free].filter(Boolean).join(" — ") || null;
      const days = c.review_interval_days ?? DEFAULT_INTERVAL_DAYS;
      patch(c.id, {
        state: "review",
        review_focus: focus,
        review_interval_days: days,
        review_due_at: new Date(Date.now() + days * 86_400_000).toISOString(),
      });
      setFocusFor(null);
      setFocusPreset(null);
    },
    [patch, focusPreset],
  );

  /** Reviewed now → double the interval, push the due date out. */
  const reviewed = useCallback(
    (c: Concept) => {
      const days =
        Math.max(c.review_interval_days ?? DEFAULT_INTERVAL_DAYS, 1) * 2;
      patch(c.id, {
        review_interval_days: days,
        review_due_at: new Date(Date.now() + days * 86_400_000).toISOString(),
      });
    },
    [patch],
  );

  const remove = useCallback(
    (id: string) => {
      setConcepts((prev) => prev.filter((c) => c.id !== id));
      void supabase.from("concepts").delete().eq("id", id).then(() => undefined);
    },
    [supabase],
  );

  /** Dock submit — park something the learner wants later in To Learn. */
  const submit = useCallback(async () => {
    const el = dockRef.current;
    if (!el) return;
    const name = el.value.trim();
    if (!name) return;
    el.value = "";
    fit(el);
    const { data } = await supabase
      .from("concepts")
      .insert({ name, technology: "general", state: "queued" } as never)
      .select("*")
      .single();
    if (data) setConcepts((prev) => [data as Concept, ...prev]);
  }, [supabase]);

  const onDrop = useCallback(
    (to: ConceptState) => {
      const c = concepts.find((x) => x.id === dragId);
      setDragId(null);
      setDropCol(null);
      if (c) move(c, to);
    },
    [concepts, dragId, move],
  );

  const card = (c: Concept) => {
    const due =
      c.state === "review" && c.review_due_at ? dueLabel(c.review_due_at) : null;
    const nb = c.notebook_id ? notebookTitles[c.notebook_id] : null;
    const focusOpen = focusFor === c.id;

    let body: React.ReactNode = null;
    if (c.state === "queued") {
      body = (
        <div className="frow">
          <button className="btn-pri" onClick={() => move(c, "learning")}>
            Start learning
          </button>
        </div>
      );
    } else if (c.state === "learning") {
      body = (
        <div className="frow">
          {c.notebook_id ? (
            <button
              className="btn-pri"
              onClick={() => router.push(`/notebooks/${c.notebook_id}`)}
            >
              Open notebook →
            </button>
          ) : null}
          <button className="btn-ghost" onClick={() => move(c, "completed")}>
            Mark completed
          </button>
        </div>
      );
    } else if (c.state === "completed") {
      body = focusOpen ? (
        <div className="focus-panel">
          <div className="focus-lbl">What should this review focus on?</div>
          <div className="focus-chips">
            {FOCUS_PRESETS.map((p) => (
              <button
                key={p}
                className={`chip${focusPreset === p ? " on" : ""}`}
                onClick={() => setFocusPreset((cur) => (cur === p ? null : p))}
              >
                {p}
              </button>
            ))}
          </div>
          <textarea
            ref={focusTextRef}
            rows={2}
            placeholder="…or tell it in your own words"
          />
          <div className="frow">
            <button className="btn-pri" onClick={() => scheduleReview(c)}>
              Schedule review
            </button>
            <button
              className="btn-ghost"
              onClick={() => {
                setFocusFor(null);
                setFocusPreset(null);
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="frow">
          <button className="btn-pri" onClick={() => move(c, "review")}>
            Review this →
          </button>
          {c.notebook_id ? (
            <button
              className="btn-ghost"
              onClick={() => router.push(`/notebooks/${c.notebook_id}`)}
            >
              Open notebook
            </button>
          ) : null}
        </div>
      );
    } else {
      body = (
        <>
          <div className={`sub rev${due?.overdue ? " overdue" : ""}`}>
            {due?.overdue ? "⚑ " : "↻ "}
            {due?.text ?? "due for review"}
          </div>
          {c.review_focus ? (
            <div className="sub focus">◎ {c.review_focus}</div>
          ) : null}
          <div className="frow">
            <span className="lbl">spaced review</span>
            <button className="btn-open" onClick={() => reviewed(c)}>
              Reviewed ✓
            </button>
            <button className="btn-ghost" onClick={() => move(c, "learning")}>
              Relearn
            </button>
          </div>
        </>
      );
    }

    return (
      <div
        key={c.id}
        className={`card${due?.overdue ? " overdue" : ""}`}
        draggable={!focusOpen}
        onDragStart={() => setDragId(c.id)}
        onDragEnd={() => {
          setDragId(null);
          setDropCol(null);
        }}
      >
        <button className="cx" title="Remove" onClick={() => remove(c.id)}>
          ×
        </button>
        <div className="ctop">
          <span className="nm">{c.name}</span>
          <span className="tag">{c.technology}</span>
        </div>
        {nb && c.state !== "learning" ? (
          <div className="sub">
            ↳ from <b>{nb}</b>
          </div>
        ) : null}
        {body}
      </div>
    );
  };

  const column = (
    state: ConceptState,
    label: string,
    items: Concept[],
    active: boolean,
  ) => (
    <div
      className={`col${active ? " active" : ""}${dropCol === state ? " drop" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDropCol(state);
      }}
      onDragLeave={() => setDropCol((d) => (d === state ? null : d))}
      onDrop={() => onDrop(state)}
    >
      <div className="col-h">
        <span className="sw" />
        <span className="nm">{label}</span>
        <span className="ct">{items.length}</span>
      </div>
      <div className="col-b">
        {items.length === 0 ? (
          <div className="col-empty">nothing here yet</div>
        ) : (
          items.map(card)
        )}
      </div>
    </div>
  );

  const empty = concepts.length === 0;

  return (
    <div className="theme-board" data-theme="dark">
      <div className="app">
        <NotebookSidebar techs={techs} history={history} />
        <div className="main">
          <div className="board-wrap">
            <div className="board cols-4">
              {column("queued", "To Learn", columns.queued, false)}
              {column("learning", "Learning", columns.learning, false)}
              {column("completed", "Completed", columns.completed, false)}
              {column("review", "Review", columns.review, anyOverdue)}
            </div>

            {/* Dock — the floating chat input, bottom-anchored */}
            <div className="dock">
              {empty && (
                <div className="dock-hint">
                  Nothing here yet — type something you want to learn and it
                  lands in To Learn until you’re ready.
                </div>
              )}
              <div className="pill">
                <textarea
                  ref={dockRef}
                  rows={1}
                  placeholder="What do you want to learn next?"
                  autoComplete="off"
                  onInput={(e) => fit(e.currentTarget)}
                  onFocus={(e) => fit(e.currentTarget)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void submit();
                    }
                  }}
                />
                <button className="send" onClick={() => void submit()}>
                  <Arrow />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
