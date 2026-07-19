"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Tables, TablesInsert } from "@/lib/supabase/types";
import {
  NotebookSidebar,
  type NotebookSidebarTech,
  type NotebookSidebarHistoryItem,
} from "@/components/sidebar/NotebookSidebar";
import { AgentPanel, type AgentPurpose, type SpecDraft } from "./AgentPanel";
import { Arrow, Plus } from "./icons";
import "./board.css";

export type Concept = Tables<"concepts">;
type ConceptState = Concept["state"];

interface BoardProps {
  initialConcepts: Concept[];
  notebookTitles: Record<string, string>;
  techs: NotebookSidebarTech[];
  history: NotebookSidebarHistoryItem[];
  userId: string;
  techFilter: string | null;
}

const DEFAULT_INTERVAL_DAYS = 3;
/** Dock textarea growth cap — past this it scrolls internally. */
const MAX_H = 200;

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

interface AgentCtx {
  purpose: AgentPurpose;
  conceptId?: string;
  conceptName?: string;
  seed?: string;
}

interface GenProgress {
  step: string;
  done: number;
  total: number;
}

/** Simulated build steps — the real backend will stream these over realtime. */
const GEN_STEPS = [
  "reading spec",
  "outlining sections",
  "writing cells 1/6",
  "writing cells 2/6",
  "writing cells 3/6",
  "writing cells 4/6",
  "writing cells 5/6",
  "writing cells 6/6",
  "wiring challenges",
];

/**
 * The board — four columns (To Learn · Learning · Completed · Review).
 * Entry to To Learn (⊕ / dock) and to Review (drag from Completed) both open
 * the AgentPanel: the columns fold away, the learner specs the work with the
 * agent (long ask + code/directory attachments), and on confirm the card
 * appears with a Generate button. Generation shows live backend progress on
 * the card (collapsible with ×) and auto-moves the card when done.
 */
export function Board({
  initialConcepts,
  notebookTitles,
  techs,
  history,
  userId,
  techFilter,
}: BoardProps) {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [concepts, setConcepts] = useState<Concept[]>(initialConcepts);
  const [titles, setTitles] = useState(notebookTitles);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropCol, setDropCol] = useState<ConceptState | null>(null);
  const [agent, setAgent] = useState<AgentCtx | null>(null);
  /** agent stays mounted during the fold-out so the exit animates */
  const [agentVisible, setAgentVisible] = useState(false);
  /** concept ids whose progress detail is collapsed (× on the progress view) */
  const [hiddenGen, setHiddenGen] = useState<Set<string>>(new Set());
  const [agentSide, setAgentSide] = useState<{ left: number; right: number } | null>(null);
  const dockRef = useRef<HTMLTextAreaElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const genTimers = useRef<Map<string, ReturnType<typeof setInterval>>>(
    new Map(),
  );

  useEffect(() => {
    const timers = genTimers.current;
    return () => timers.forEach((t) => clearInterval(t));
  }, []);

  /** FLIP merge — absolutize the columns, glide the working one to its edge,
   * gather the rest into the deck, and hand the freed space to the agent. */
  const mergeIn = useCallback((workKey: "queued" | "review") => {
    const board = boardRef.current;
    if (!board) return;
    const cols = Array.from(board.querySelectorAll<HTMLElement>(".col"));
    const bRect = board.getBoundingClientRect();
    const rects = new Map(cols.map((c) => [c, c.getBoundingClientRect()]));
    const work = cols.find((c) => c.dataset.col === workKey);
    if (!work) return;
    const workRight = workKey === "review"; // review works from the right edge
    const pad = 22;
    const wWork = 300;

    cols.forEach((c) => {
      const r = rects.get(c)!;
      c.style.left = `${r.left - bRect.left}px`;
      c.style.width = `${r.width}px`;
    });
    board.classList.add("merged");

    const workX = workRight ? bRect.width - pad - wWork : pad;
    work.classList.add("work");
    work.style.setProperty("--tx", `${workX - (rects.get(work)!.left - bRect.left)}px`);
    work.style.width = `${wWork}px`;

    const deckX = workRight ? bRect.width - pad - 120 : pad + 8;
    const deckY = bRect.height - 210;
    let i = 0;
    for (const c of cols) {
      if (c === work) continue;
      const r = rects.get(c)!;
      c.classList.add("deck");
      c.style.setProperty("--tx", `${deckX - (r.left - bRect.left) + i * 7}px`);
      c.style.setProperty("--ty", `${deckY + i * 6}px`);
      c.style.setProperty("--sc", "0.16");
      c.style.setProperty("--rot", `${(i - 1) * 4}deg`);
      c.style.zIndex = `${1 + i}`;
      i += 1;
    }
    setAgentSide(
      workRight
        ? { left: pad, right: pad + wWork + 18 }
        : { left: pad + wWork + 18, right: pad },
    );
  }, []);

  const mergeOut = useCallback(() => {
    const board = boardRef.current;
    if (!board) return;
    board.classList.remove("merged");
    board.querySelectorAll<HTMLElement>(".col").forEach((c) => {
      c.classList.remove("work", "deck");
      c.style.cssText = "";
    });
  }, []);

  const openAgent = useCallback(
    (ctx: AgentCtx) => {
      setAgent(ctx);
      requestAnimationFrame(() => {
        mergeIn(ctx.purpose === "spec_review" ? "review" : "queued");
        setAgentVisible(true);
      });
    },
    [mergeIn],
  );

  const closeAgent = useCallback(() => {
    setAgentVisible(false);
    mergeOut();
    setTimeout(() => {
      setAgent(null);
      setAgentSide(null);
    }, 620); // matches the merge duration
  }, [mergeOut]);

  const visible = useMemo(
    () =>
      techFilter
        ? concepts.filter((c) => c.technology === techFilter)
        : concepts,
    [concepts, techFilter],
  );

  const columns = useMemo(() => {
    const queued = visible.filter((c) => c.state === "queued");
    const learning = visible.filter((c) => c.state === "learning");
    const completed = visible.filter((c) => c.state === "completed");
    const review = visible
      .filter((c) => c.state === "review")
      .sort((a, b) => {
        const ad = a.review_due_at ? new Date(a.review_due_at).getTime() : 0;
        const bd = b.review_due_at ? new Date(b.review_due_at).getTime() : 0;
        return ad - bd; // most overdue first
      });
    return { queued, learning, completed, review };
  }, [visible]);

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
      // Review is entered only from Completed, and only through the agent.
      if (to === "review") {
        if (c.state !== "completed") return;
        openAgent({
          purpose: "spec_review",
          conceptId: c.id,
          conceptName: c.name,
        });
        return;
      }
      patch(c.id, { state: to });
    },
    [patch, openAgent],
  );

  /** Agent confirm — create the queued card, or arm the review. */
  const onSpecConfirm = useCallback(
    async (spec: SpecDraft) => {
      if (agent?.purpose === "spec_review" && agent.conceptId) {
        const days = DEFAULT_INTERVAL_DAYS;
        patch(agent.conceptId, {
          state: "review",
          generation: "ready",
          spec: spec as never,
          review_focus: spec.summary.slice(0, 200),
          review_interval_days: days,
          review_due_at: new Date(Date.now() + days * 86_400_000).toISOString(),
        });
      } else if (agent?.conceptId) {
        // re-spec of an existing To Learn card
        patch(agent.conceptId, {
          generation: "ready",
          spec: spec as never,
          technology: spec.technology,
          name: spec.title,
        });
      } else {
        const { data } = await supabase
          .from("concepts")
          .insert({
            user_id: userId,
            name: spec.title,
            technology: spec.technology,
            state: "queued",
            generation: "ready",
            spec: spec as never,
          } as never)
          .select("*")
          .single();
        if (data) setConcepts((prev) => [data as Concept, ...prev]);
      }
      // persist the session record for the future real agent (fire & forget)
      void supabase.from("agent_sessions").insert({
        user_id: userId,
        concept_id: agent?.conceptId ?? null,
        purpose: agent?.purpose ?? "spec_lesson",
        status: "confirmed",
        spec: spec as never,
        attachments: spec.attachments as never,
      } as never);
      closeAgent();
    },
    [agent, patch, supabase, userId, closeAgent],
  );

  /** Simulated generation: progress ticks on the card, then the real insert. */
  const generate = useCallback(
    (c: Concept, kind: "lesson" | "review") => {
      patch(c.id, {
        generation: "generating",
        generation_progress: { step: GEN_STEPS[0], done: 0, total: GEN_STEPS.length } as never,
      });
      let i = 0;
      const timer = setInterval(async () => {
        i += 1;
        if (i < GEN_STEPS.length) {
          patch(c.id, {
            generation_progress: { step: GEN_STEPS[i], done: i, total: GEN_STEPS.length } as never,
          });
          return;
        }
        clearInterval(timer);
        genTimers.current.delete(c.id);
        // build the notebook for real
        const spec = (c.spec ?? {}) as Partial<SpecDraft>;
        const nbInsert: TablesInsert<"notebooks"> = {
          user_id: userId,
          title: kind === "review" ? `Review: ${c.name}` : c.name,
          technology: c.technology,
          path_card: c.name,
          goal: "understand",
          level: "beginner",
          time_budget_minutes: 30,
          kind,
          concept_id: c.id,
          spec_json: (spec as never) ?? {},
        };
        const { data: nb, error } = await supabase
          .from("notebooks")
          .insert(nbInsert as never)
          .select("id, title")
          .single();
        if (error || !nb) {
          patch(c.id, { generation: "failed", generation_progress: null });
          return;
        }
        const nbRow = nb as { id: string; title: string };
        // seed an opening cell so the notebook isn't empty
        await supabase.from("cells").insert({
          notebook_id: nbRow.id,
          ord: 0,
          kind: "section",
          source: "backend",
          content:
            kind === "review"
              ? `# Review — ${c.name}\n\n_Generated from your review spec. The real lesson engine lands here._`
              : `# ${c.name}\n\n_Generated from your spec. The real lesson engine lands here._`,
        } as never);
        setTitles((t) => ({ ...t, [nbRow.id]: nbRow.title }));
        if (kind === "lesson") {
          patch(c.id, {
            state: "learning",
            generation: "none",
            generation_progress: null,
            notebook_id: nbRow.id,
          });
        } else {
          patch(c.id, {
            generation: "none",
            generation_progress: null,
            review_notebook_id: nbRow.id,
          });
        }
      }, 800);
      genTimers.current.set(c.id, timer);
    },
    [patch, supabase, userId],
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

  /** Dock submit — opens the agent seeded with the typed ask. */
  const submit = useCallback(() => {
    const el = dockRef.current;
    if (!el) return;
    const seed = el.value.trim();
    if (!seed) return;
    el.value = "";
    fit(el);
    openAgent({ purpose: "spec_lesson", seed });
  }, [openAgent]);

  const onDrop = useCallback(
    (to: ConceptState) => {
      const c = concepts.find((x) => x.id === dragId);
      setDragId(null);
      setDropCol(null);
      if (c) move(c, to);
    },
    [concepts, dragId, move],
  );

  const openNotebook = useCallback(
    (id: string) => router.push(`/notebooks/${id}`),
    [router],
  );

  const card = (c: Concept) => {
    const due =
      c.state === "review" && c.review_due_at ? dueLabel(c.review_due_at) : null;
    const nb = c.notebook_id ? titles[c.notebook_id] : null;
    const generating = c.generation === "generating";
    const prog = (c.generation_progress ?? null) as GenProgress | null;
    const genHidden = hiddenGen.has(c.id);

    let body: React.ReactNode = null;
    if (generating) {
      body = genHidden ? (
        <div className="frow">
          <button
            className="gen-badge"
            onClick={() =>
              setHiddenGen((s) => {
                const n = new Set(s);
                n.delete(c.id);
                return n;
              })
            }
          >
            <span className="spin" /> building… show
          </button>
        </div>
      ) : (
        <div className="gen-panel">
          <div className="gen-head">
            <span className="spin" />
            <span className="gen-step">{prog?.step ?? "starting…"}</span>
            <button
              className="gen-x"
              title="Hide (keeps building)"
              onClick={() =>
                setHiddenGen((s) => new Set(s).add(c.id))
              }
            >
              ×
            </button>
          </div>
          <div className="gen-bar">
            <div
              className="gen-fill"
              style={{
                width: `${prog ? Math.round((prog.done / prog.total) * 100) : 4}%`,
              }}
            />
          </div>
        </div>
      );
    } else if (c.state === "queued") {
      body = (
        <div className="frow">
          {c.generation === "ready" ? (
            <button className="btn-pri" onClick={() => generate(c, "lesson")}>
              Generate lesson
            </button>
          ) : c.generation === "failed" ? (
            <button className="btn-pri" onClick={() => generate(c, "lesson")}>
              Retry generation
            </button>
          ) : (
            <button
              className="btn-pri"
              onClick={() =>
                openAgent({
                  purpose: "spec_lesson",
                  conceptId: c.id,
                  seed: c.name,
                })
              }
            >
              Spec with agent →
            </button>
          )}
        </div>
      );
    } else if (c.state === "learning") {
      body = (
        <div className="frow">
          {c.notebook_id ? (
            <button className="btn-pri" onClick={() => openNotebook(c.notebook_id!)}>
              Open notebook →
            </button>
          ) : null}
          <button className="btn-ghost" onClick={() => move(c, "completed")}>
            Mark completed
          </button>
        </div>
      );
    } else if (c.state === "completed") {
      body = (
        <div className="frow">
          {c.notebook_id ? (
            <button className="btn-pri" onClick={() => openNotebook(c.notebook_id!)}>
              Open notebook →
            </button>
          ) : null}
        </div>
      );
    } else {
      // review
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
            {c.review_notebook_id ? (
              <button
                className="btn-pri"
                onClick={() => openNotebook(c.review_notebook_id!)}
              >
                Start review →
              </button>
            ) : c.generation === "ready" || c.generation === "failed" ? (
              <button className="btn-pri" onClick={() => generate(c, "review")}>
                {c.generation === "failed" ? "Retry generation" : "Generate review"}
              </button>
            ) : null}
            <button className="btn-open" onClick={() => reviewed(c)}>
              Reviewed ✓
            </button>
          </div>
        </>
      );
    }

    return (
      <div
        key={c.id}
        className={`card${due?.overdue ? " overdue" : ""}${generating ? " building" : ""}`}
        draggable={!generating}
        onDragStart={() => setDragId(c.id)}
        onDragEnd={() => {
          setDragId(null);
          setDropCol(null);
        }}
      >
        <div className="ctop">
          <span className="nm">{c.name}</span>
          {!techFilter && <span className="tag">{c.technology}</span>}
        </div>
        {nb && c.state !== "learning" && c.state !== "completed" ? (
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
    plus?: () => void,
  ) => (
    <div
      data-col={state}
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
        {plus && (
          <button className="col-plus" title="Spec with the agent" onClick={plus}>
            <Plus />
          </button>
        )}
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

  const agentOpen = agent !== null;

  return (
    <div className="theme-board" data-theme="dark">
      <div className="app">
        <NotebookSidebar techs={techs} history={history} />
        <div className="main">
          <div className={`board-wrap${agentOpen && agentVisible ? " agent-open" : ""}`}>
            {techFilter && (
              <div className="filter-bar">
                <span className="filter-chip">
                  {techFilter}
                  <button title="Clear filter" onClick={() => router.push("/board")}>
                    ×
                  </button>
                </span>
              </div>
            )}
            <div className="board cols-4" ref={boardRef}>
              {column("queued", "To Learn", columns.queued, false, () =>
                openAgent({ purpose: "spec_lesson" }),
              )}
              {column("learning", "Learning", columns.learning, false)}
              {column("completed", "Completed", columns.completed, false)}
              {column("review", "Review", columns.review, anyOverdue)}
            </div>

            {/* The agent surface — opens beside the preserved working column */}
            {agentOpen && (
              <div
                className={`agent${agentVisible ? " on" : ""}`}
                style={
                  agentSide
                    ? { left: agentSide.left, right: agentSide.right }
                    : undefined
                }
              >
                <AgentPanel
                  purpose={agent.purpose}
                  conceptName={agent.conceptName}
                  seed={agent.seed}
                  onConfirm={onSpecConfirm}
                  onCancel={closeAgent}
                />
              </div>
            )}

            {/* Dock — the floating chat input; acts as To Learn's ⊕ */}
            <div className="dock">
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
                      submit();
                    }
                  }}
                />
                <button className="send" onClick={submit}>
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
