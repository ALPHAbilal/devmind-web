"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import type { Tables } from "@/lib/supabase/types";
import "./board.css";

export type Concept = Tables<"concepts">;
type ConceptState = Concept["state"];

interface BoardProps {
  initialConcepts: Concept[];
  notebookTitles: Record<string, string>;
}

const DEFAULT_INTERVAL_DAYS = 3;

/** ms → "6d overdue" / "due in 2d" / "due today". */
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
 * Three-column concept board (Linear-inspired): To Learn · Learning · Review.
 * Overdue reviews are flagged and float to the top of Review — no fourth
 * column. Cards drag between columns; drops map to state transitions.
 */
export function Board({ initialConcepts, notebookTitles }: BoardProps) {
  const supabase = useMemo(() => createClient(), []);
  const [concepts, setConcepts] = useState<Concept[]>(initialConcepts);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState({ name: "", technology: "" });
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<ConceptState | null>(null);

  const columns = useMemo(() => {
    const queued = concepts.filter((c) => c.state === "queued");
    const learning = concepts.filter((c) => c.state === "learning");
    const review = concepts
      .filter((c) => c.state === "review")
      .sort((a, b) => {
        const ad = a.review_due_at ? new Date(a.review_due_at).getTime() : 0;
        const bd = b.review_due_at ? new Date(b.review_due_at).getTime() : 0;
        return ad - bd; // earliest due (most overdue) first
      });
    return { queued, learning, review };
  }, [concepts]);

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

  /** State transition — the only mutation drags/buttons perform. */
  const move = useCallback(
    (c: Concept, to: ConceptState) => {
      if (c.state === to) return;
      if (to === "review") {
        const days = c.review_interval_days ?? DEFAULT_INTERVAL_DAYS;
        patch(c.id, {
          state: "review",
          review_interval_days: days,
          review_due_at: new Date(
            Date.now() + days * 86_400_000,
          ).toISOString(),
        });
      } else {
        patch(c.id, { state: to });
      }
    },
    [patch],
  );

  /** Reviewed now → double the interval, push the due date. */
  const reviewed = useCallback(
    (c: Concept) => {
      const days = Math.max(c.review_interval_days ?? DEFAULT_INTERVAL_DAYS, 1) * 2;
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

  const addConcept = useCallback(async () => {
    const name = draft.name.trim();
    if (!name) return;
    setAdding(false);
    setDraft({ name: "", technology: "" });
    const { data } = await supabase
      .from("concepts")
      .insert({
        name,
        technology: draft.technology.trim() || "general",
        state: "queued",
      } as never)
      .select("*")
      .single();
    if (data) setConcepts((prev) => [data as Concept, ...prev]);
  }, [draft, supabase]);

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
    const due = c.state === "review" && c.review_due_at ? dueLabel(c.review_due_at) : null;
    const nb = c.notebook_id ? notebookTitles[c.notebook_id] : null;
    return (
      <article
        key={c.id}
        className={`bd-card${due?.overdue ? " overdue" : ""}${dragId === c.id ? " dragging" : ""}`}
        draggable
        onDragStart={() => setDragId(c.id)}
        onDragEnd={() => {
          setDragId(null);
          setDropCol(null);
        }}
      >
        <div className="bd-card-head">
          <span className="bd-name">{c.name}</span>
          <button
            type="button"
            className="bd-x"
            title="Remove"
            onClick={() => remove(c.id)}
          >
            ×
          </button>
        </div>
        <div className="bd-meta">
          <span className="bd-chip">⌗ {c.technology}</span>
          {nb && c.notebook_id ? (
            <Link className="bd-chip link" href={`/notebooks/${c.notebook_id}`}>
              ▤ {nb}
            </Link>
          ) : null}
          {due ? (
            <span className={`bd-chip due${due.overdue ? " flag" : ""}`}>
              {due.overdue ? "⚑ " : "⏰ "}
              {due.text}
            </span>
          ) : null}
        </div>
        <div className="bd-actions">
          {c.state === "queued" ? (
            <button type="button" onClick={() => move(c, "learning")}>
              start
            </button>
          ) : null}
          {c.state === "learning" ? (
            <button type="button" onClick={() => move(c, "review")}>
              schedule review
            </button>
          ) : null}
          {c.state === "review" ? (
            <>
              <button type="button" onClick={() => reviewed(c)}>
                reviewed
              </button>
              <button type="button" onClick={() => move(c, "learning")}>
                relearn
              </button>
            </>
          ) : null}
        </div>
      </article>
    );
  };

  const column = (
    state: ConceptState,
    label: string,
    glyph: string,
    items: Concept[],
  ) => (
    <section
      className={`bd-col${dropCol === state ? " over" : ""}`}
      onDragOver={(e) => {
        e.preventDefault();
        setDropCol(state);
      }}
      onDragLeave={() => setDropCol((d) => (d === state ? null : d))}
      onDrop={() => onDrop(state)}
    >
      <header className="bd-col-head">
        <span className="bd-glyph">{glyph}</span>
        <span>{label}</span>
        <span className="bd-count">{items.length}</span>
      </header>
      <div className="bd-col-body">
        {items.map(card)}
        {state === "queued" ? (
          adding ? (
            <div className="bd-add-form">
              <input
                autoFocus
                placeholder="concept"
                value={draft.name}
                onChange={(e) => setDraft((d) => ({ ...d, name: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addConcept();
                  if (e.key === "Escape") setAdding(false);
                }}
              />
              <input
                placeholder="technology"
                value={draft.technology}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, technology: e.target.value }))
                }
                onKeyDown={(e) => {
                  if (e.key === "Enter") void addConcept();
                  if (e.key === "Escape") setAdding(false);
                }}
              />
              <button type="button" onClick={() => void addConcept()}>
                add
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="bd-add"
              onClick={() => setAdding(true)}
            >
              ＋ concept
            </button>
          )
        ) : null}
      </div>
    </section>
  );

  return (
    <main className="theme-notebook bd-page" data-theme="light">
      <div className="bd-top">
        <Link href="/dashboard" className="bd-back">
          ← notebooks
        </Link>
        <h1>Board</h1>
      </div>
      <div className="bd-cols">
        {column("queued", "To Learn", "○", columns.queued)}
        {column("learning", "Learning", "◐", columns.learning)}
        {column("review", "Review", "⟳", columns.review)}
      </div>
    </main>
  );
}
