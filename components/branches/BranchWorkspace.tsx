"use client";

/**
 * BranchWorkspace — hub (garden grid) ⇄ three-lane workspace.
 *
 * Replaces the React Flow branch canvas. The spine is fixed lanes —
 * Notebook (rail ⇄ surface) · Clippings · Agent · Mini notebook — so there is
 * no routing, placement, or focus system to manage.
 *
 * Data flow is identical to the old canvas: picks/turns persist as they
 * happen, the exchange runs through the ExchangeAgent seam (ScriptedAgent
 * today, Claude-backed later), and /api/branches grows the child notebook.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Moon, Sun } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { Cell } from "@/components/notebook/cells";
import { NotebookPanel, type PulseTarget } from "./NotebookPanel";
import { ScriptedAgent } from "./agent";
import type {
  Branch,
  BranchSession,
  BranchStatus,
  BranchTurn,
  Highlight,
} from "./types";
import "./branches.css";

/** Runtime branch state = stored branch + live-exchange UI state. */
interface BranchState extends Branch {
  status: BranchStatus;
  agentTyping: boolean;
  options: string[] | null;
  agreedTitle: string | null;
}

export interface BranchWorkspaceProps {
  notebookId: string;
  notebookTitle: string;
  cells: Cell[];
  branches: Branch[];
}

function timeAgo(iso: string | null): string {
  if (!iso) return "";
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 3600) return `${Math.max(1, Math.floor(s / 60))}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function chip(status: BranchStatus): { cls: string; label: string } {
  if (status === "generated") return { cls: "ready", label: "ready" };
  return { cls: "talk", label: status };
}

export function BranchWorkspace({
  notebookId,
  notebookTitle,
  cells,
  branches: initialBranches,
}: BranchWorkspaceProps) {
  const supabase = useMemo(() => createClient(), []);
  const agent = useMemo(() => new ScriptedAgent(), []);
  const router = useRouter();

  const [theme, setTheme] = useState<"light" | "dark">("light");

  /** null = hub; { sessionId: null } = new branch (session born on first pick) */
  const [view, setView] = useState<{ sessionId: string | null } | null>(null);
  const [nbOpen, setNbOpen] = useState(false);
  const [pulse, setPulse] = useState<PulseTarget | null>(null);
  const [draft, setDraft] = useState("");
  const chatRef = useRef<HTMLDivElement>(null);

  const [branchMap, setBranchMap] = useState<Map<string, BranchState>>(() => {
    const m = new Map<string, BranchState>();
    initialBranches.forEach((b) => {
      m.set(b.session.id, {
        ...b,
        status: b.session.status as BranchStatus,
        agentTyping: false,
        options: null,
        agreedTitle: null,
      });
    });
    return m;
  });

  // Stale-session hygiene: an empty live session (no picks, no turns) is junk
  // left by an abandoned visit — mark it abandoned and drop it.
  useEffect(() => {
    for (const b of initialBranches) {
      const live =
        b.session.status === "collecting" || b.session.status === "discussing";
      if (!live || b.picks.length > 0 || b.turns.length > 0) continue;
      void supabase
        .from("branch_sessions")
        .update({
          status: "abandoned",
          updated_at: new Date().toISOString(),
        } as never)
        .eq("id", b.session.id)
        .then(() => undefined);
      setBranchMap((prev) => {
        const next = new Map(prev);
        next.delete(b.session.id);
        return next;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const patchBranch = useCallback(
    (id: string, patch: Partial<BranchState>) => {
      setBranchMap((prev) => {
        const cur = prev.get(id);
        if (!cur) return prev;
        const next = new Map(prev);
        next.set(id, { ...cur, ...patch });
        return next;
      });
    },
    [],
  );

  /* ── persistence ───────────────────────────────────────────────────────── */
  const seqRef = useRef<Map<string, number>>(
    new Map(initialBranches.map((b) => [b.session.id, b.turns.length])),
  );

  const persistTurn = useCallback(
    async (
      sessionId: string,
      role: "agent" | "user",
      summary: string,
      full: string,
    ) => {
      const seq = (seqRef.current.get(sessionId) ?? 0) + 1;
      seqRef.current.set(sessionId, seq);
      const { data } = await supabase
        .from("branch_session_turns")
        .insert({
          session_id: sessionId,
          seq,
          role,
          summary_line: summary,
          full_text: full,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select("*")
        .single();
      const turn = (data ?? {
        id: `local-${Date.now()}`,
        session_id: sessionId,
        seq,
        role,
        summary_line: summary,
        full_text: full,
        created_at: new Date().toISOString(),
        user_id: "",
      }) as BranchTurn;
      setBranchMap((prev) => {
        const cur = prev.get(sessionId);
        if (!cur) return prev;
        const next = new Map(prev);
        next.set(sessionId, { ...cur, turns: [...cur.turns, turn] });
        return next;
      });
      return turn;
    },
    [supabase],
  );

  const setSessionStatus = useCallback(
    (sessionId: string, status: BranchStatus) => {
      void supabase
        .from("branch_sessions")
        .update({ status, updated_at: new Date().toISOString() } as never)
        .eq("id", sessionId)
        .then(() => undefined);
    },
    [supabase],
  );

  const agentCtx = useCallback(
    (sessionId: string) => {
      const b = branchMap.get(sessionId);
      return {
        picks: (b?.picks ?? []).map((p) => ({
          cell_id: p.cell_id,
          text: p.selected_text,
        })),
        priorTurns: (b?.turns ?? []).map((t) => ({
          role: t.role,
          text: t.full_text,
        })),
      };
    },
    [branchMap],
  );

  /* ── exchange flow ─────────────────────────────────────────────────────── */
  const onDone = useCallback(
    async (sessionId: string) => {
      setNbOpen(false);
      patchBranch(sessionId, {
        status: "discussing",
        agentTyping: true,
        options: null,
      });
      setSessionStatus(sessionId, "discussing");
      const turn = await agent.start(agentCtx(sessionId));
      await persistTurn(sessionId, "agent", turn.summary_line, turn.full_text);
      patchBranch(sessionId, {
        agentTyping: false,
        options: turn.options ?? null,
      });
    },
    [agent, agentCtx, patchBranch, persistTurn, setSessionStatus],
  );

  const onReply = useCallback(
    async (sessionId: string, text: string) => {
      patchBranch(sessionId, { agentTyping: true, options: null });
      await persistTurn(sessionId, "user", text, text);
      const turn = await agent.reply(agentCtx(sessionId), text);
      await persistTurn(sessionId, "agent", turn.summary_line, turn.full_text);
      if (turn.done) {
        patchBranch(sessionId, {
          agentTyping: false,
          options: null,
          status: "flagged",
          agreedTitle: turn.title ?? null,
        });
        setSessionStatus(sessionId, "flagged");
      } else {
        patchBranch(sessionId, {
          agentTyping: false,
          options: turn.options ?? null,
        });
      }
    },
    [agent, agentCtx, patchBranch, persistTurn, setSessionStatus],
  );

  const onFlag = useCallback(
    async (sessionId: string) => {
      const b = branchMap.get(sessionId);
      patchBranch(sessionId, { status: "generating" });
      setSessionStatus(sessionId, "generating");
      try {
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_notebook_id: notebookId,
            session_id: sessionId,
            note: b?.session.note ?? "",
            title: b?.agreedTitle ?? undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok)
          throw new Error(data?.error?.message ?? `Failed (${res.status})`);
        const child = data.child_notebook as {
          id: string;
          title: string;
          status: string;
        };
        patchBranch(sessionId, {
          status: "generated",
          child: { id: child.id, title: child.title, status: child.status },
        });
      } catch {
        // Roll back to flagged so the user can retry.
        patchBranch(sessionId, { status: "flagged" });
        setSessionStatus(sessionId, "flagged");
      }
    },
    [notebookId, patchBranch, branchMap, setSessionStatus],
  );

  /* ── picking ───────────────────────────────────────────────────────────── */
  const addPick = useCallback(
    async (cellId: string, text: string) => {
      let sessionId = view?.sessionId ?? null;
      if (sessionId && branchMap.get(sessionId)?.status !== "collecting")
        return;

      if (!sessionId) {
        const { data } = await supabase
          .from("branch_sessions")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert({ parent_notebook_id: notebookId, status: "collecting" } as any)
          .select("*")
          .single();
        const session = (data ?? null) as BranchSession | null;
        if (!session) return;
        sessionId = session.id;
        setBranchMap((prev) => {
          const next = new Map(prev);
          next.set(session.id, {
            session,
            picks: [],
            turns: [],
            child: null,
            status: "collecting",
            agentTyping: false,
            options: null,
            agreedTitle: null,
          });
          return next;
        });
        seqRef.current.set(session.id, 0);
        setView({ sessionId: session.id });
      }

      const order = (branchMap.get(sessionId)?.picks.length ?? 0) + 1;
      const { data: hlData } = await supabase
        .from("highlights")
        .insert({
          parent_notebook_id: notebookId,
          cell_id: cellId,
          selected_text: text,
          session_id: sessionId,
          pick_order: order,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
        } as any)
        .select("*")
        .single();
      const hl = (hlData ?? null) as Highlight | null;
      if (!hl) return;
      // Denormalize the first clipping onto the session — the hub reads
      // first_quote in one query instead of joining all highlights.
      if (order === 1) {
        void supabase
          .from("branch_sessions")
          .update({ first_quote: text } as never)
          .eq("id", sessionId)
          .then(() => undefined);
      }
      setBranchMap((prev) => {
        const cur = prev.get(sessionId as string);
        if (!cur) return prev;
        const next = new Map(prev);
        next.set(sessionId as string, { ...cur, picks: [...cur.picks, hl] });
        return next;
      });
    },
    [view, branchMap, supabase, notebookId],
  );

  const onRemovePick = useCallback(
    (sessionId: string, highlightId: string) => {
      void supabase
        .from("highlights")
        .delete()
        .eq("id", highlightId)
        .then(() => undefined);
      setBranchMap((prev) => {
        const cur = prev.get(sessionId);
        if (!cur) return prev;
        const next = new Map(prev);
        next.set(sessionId, {
          ...cur,
          picks: cur.picks.filter((p) => p.id !== highlightId),
        });
        return next;
      });
    },
    [supabase],
  );

  /* ── derived ───────────────────────────────────────────────────────────── */
  const branchesArr = useMemo(
    () =>
      [...branchMap.values()].sort((a, b) =>
        (b.session.updated_at ?? b.session.created_at ?? "").localeCompare(
          a.session.updated_at ?? a.session.created_at ?? "",
        ),
      ),
    [branchMap],
  );

  const active = view?.sessionId ? (branchMap.get(view.sessionId) ?? null) : null;
  const activeStatus: BranchStatus = active?.status ?? "collecting";
  const collecting = view !== null && (active === null || activeStatus === "collecting");

  // Keep the chat pinned to the latest turn.
  useEffect(() => {
    const el = chatRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [active?.turns.length, active?.agentTyping]);

  const enterBranch = useCallback((sessionId: string | null) => {
    setView({ sessionId });
    setNbOpen(sessionId === null);
    setDraft("");
    setPulse(null);
  }, []);

  const send = useCallback(() => {
    const text = draft.trim();
    if (!text || !view?.sessionId) return;
    setDraft("");
    void onReply(view.sessionId, text);
  }, [draft, view, onReply]);

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <div className="theme-notebook br-page" data-theme={theme}>
      {view === null ? (
        /* ═══ HUB ═══ */
        <>
          <div className="br-top">
            <button
              type="button"
              className="br-back"
              onClick={() => router.push(`/notebooks/${notebookId}`)}
            >
              <ArrowLeft size={13} strokeWidth={2.2} aria-hidden />
              Notebook
            </button>
            <span style={{ marginLeft: "auto" }} />
            <button
              type="button"
              className="br-iconbtn"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon size={14} strokeWidth={2} />
              ) : (
                <Sun size={14} strokeWidth={2} />
              )}
            </button>
          </div>
          <div className="br-hub">
            <div className="br-hub-inner">
              <div className="br-hub-top">
                <h1>{notebookTitle}</h1>
                <span className="n">
                  {branchesArr.length} branch{branchesArr.length === 1 ? "" : "es"}
                </span>
              </div>
              <div className="br-grid">
                <button
                  type="button"
                  className="br-new"
                  onClick={() => enterBranch(null)}
                >
                  <span className="plus">＋</span>
                  <span className="lbl">New branch</span>
                </button>
                {branchesArr.map((b) => {
                  const c = chip(b.status);
                  const first = b.picks[0]?.selected_text;
                  return (
                    <button
                      type="button"
                      key={b.session.id}
                      className="br-card"
                      onClick={() => enterBranch(b.session.id)}
                    >
                      <span className="row1">
                        <span className={`br-status ${c.cls}`}>{c.label}</span>
                        <span className="br-meta">
                          {timeAgo(b.session.updated_at ?? b.session.created_at)}
                        </span>
                      </span>
                      {b.child ? <h3>{b.child.title}</h3> : null}
                      {first ? (
                        <span className="br-quote">&ldquo;{first}&rdquo;</span>
                      ) : null}
                      <span className="foot">
                        <span className="br-meta">
                          {b.picks.length} clipping{b.picks.length === 1 ? "" : "s"}
                          {b.turns.length > 0
                            ? ` · ${b.turns.length} exchange${b.turns.length === 1 ? "" : "s"}`
                            : ""}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </>
      ) : (
        /* ═══ WORKSPACE ═══ */
        <>
          <div className="br-top">
            <button type="button" className="br-back" onClick={() => setView(null)}>
              <ArrowLeft size={13} strokeWidth={2.2} aria-hidden />
              Branches
            </button>
            <span className="br-notebook">{notebookTitle}</span>
            <span className={`br-status ${chip(activeStatus).cls}`}>
              {chip(activeStatus).label}
            </span>
            <span style={{ marginLeft: "auto" }} />
            <button
              type="button"
              className="br-iconbtn"
              onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
              aria-label="Toggle theme"
            >
              {theme === "light" ? (
                <Moon size={14} strokeWidth={2} />
              ) : (
                <Sun size={14} strokeWidth={2} />
              )}
            </button>
          </div>

          <div className={`br-work${nbOpen ? " nb-open" : ""}`}>
            <NotebookPanel
              title={notebookTitle}
              cells={cells}
              open={nbOpen}
              onOpen={() => setNbOpen(true)}
              onCollapse={() => setNbOpen(false)}
              picks={(active?.picks ?? []).map((p) => ({
                cell_id: p.cell_id,
                selected_text: p.selected_text,
              }))}
              pulse={pulse}
              canPick={collecting}
              onAddPick={(cellId, text) => void addPick(cellId, text)}
            />

            {/* ── clippings ── */}
            <div className="br-lane clips">
              <div className="br-lane-h">
                Clippings{" "}
                {active && active.picks.length > 0 ? (
                  <span className="n">· {active.picks.length}</span>
                ) : null}
              </div>
              <div className="br-lane-b">
                {(active?.picks ?? []).map((p) => (
                  <div
                    key={p.id}
                    className="br-clip"
                    onMouseEnter={() =>
                      setPulse({
                        cell_id: p.cell_id,
                        selected_text: p.selected_text,
                      })
                    }
                    onMouseLeave={() => setPulse(null)}
                  >
                    <q>{p.selected_text}</q>
                    {collecting && active ? (
                      <button
                        type="button"
                        className="br-clip-x"
                        aria-label="Remove highlight"
                        onClick={() => onRemovePick(active.session.id, p.id)}
                      >
                        remove
                      </button>
                    ) : null}
                  </div>
                ))}
                <button
                  type="button"
                  className="br-addmore"
                  onClick={() => setNbOpen(true)}
                  disabled={!collecting}
                  style={collecting ? undefined : { opacity: 0.4, cursor: "default" }}
                >
                  ＋ Highlight more
                </button>
                {collecting ? (
                  <button
                    type="button"
                    className="br-done"
                    disabled={!active || active.picks.length === 0}
                    onClick={() => active && void onDone(active.session.id)}
                  >
                    Done highlighting
                  </button>
                ) : null}
              </div>
            </div>

            {/* ── agent ── */}
            <div className="br-lane agent">
              <div className="br-lane-h">Agent</div>
              <div className="br-lane-b" ref={chatRef}>
                {!active || active.turns.length === 0 ? (
                  active?.agentTyping ? null : (
                    <div className="br-agent-empty">
                      The agent joins after your first highlights.
                    </div>
                  )
                ) : null}
                {(active?.turns ?? []).map((t) =>
                  t.role === "agent" ? (
                    <div key={t.id} className="br-msg agent">
                      <span className="avatar">✦</span>
                      <div className="bubble">{t.full_text}</div>
                    </div>
                  ) : (
                    <div key={t.id} className="br-msg user">
                      <div className="bubble">{t.full_text}</div>
                    </div>
                  ),
                )}
                {active?.agentTyping ? (
                  <div className="br-action working">
                    <span className="ic">✦</span>thinking
                  </div>
                ) : null}
                {active && !active.agentTyping && active.options ? (
                  <div className="br-chips">
                    {active.options.map((o) => (
                      <button
                        type="button"
                        key={o}
                        className="br-chip"
                        onClick={() => void onReply(active.session.id, o)}
                      >
                        {o}
                      </button>
                    ))}
                  </div>
                ) : null}
                {active && activeStatus === "flagged" ? (
                  <button
                    type="button"
                    className="br-flag"
                    onClick={() => void onFlag(active.session.id)}
                  >
                    ⚑ Grow the lesson
                  </button>
                ) : null}
                {activeStatus === "generating" ? (
                  <div className="br-action working">
                    <span className="ic">✦</span>growing the lesson
                  </div>
                ) : null}
                {activeStatus === "generated" ? (
                  <div className="br-action">
                    <span className="ic">✦</span>lesson ready
                  </div>
                ) : null}
              </div>
              <div className="br-composer">
                <div className="br-composer-shell">
                  <input
                    placeholder="Reply…"
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") send();
                    }}
                    disabled={activeStatus !== "discussing" || !!active?.agentTyping}
                  />
                  <button
                    type="button"
                    className="br-send"
                    onClick={send}
                    disabled={
                      activeStatus !== "discussing" ||
                      !!active?.agentTyping ||
                      draft.trim().length === 0
                    }
                    aria-label="Send"
                  >
                    ➤
                  </button>
                </div>
              </div>
            </div>

            {/* ── mini notebook ── */}
            <div className="br-lane mini">
              <div className="br-lane-h">Mini notebook</div>
              <div className="br-lane-b">
                {active?.child ? (
                  <div className="br-mini-card">
                    <span className="br-mini-kind">Branch lesson</span>
                    <span className="br-mini-title">{active.child.title}</span>
                    <button
                      type="button"
                      className="br-open-mini"
                      onClick={() => router.push(`/notebooks/${active.child!.id}`)}
                    >
                      Open notebook
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
