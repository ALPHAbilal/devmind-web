"use client";

/**
 * BranchCanvas — the branch-tree canvas for a parent notebook.
 *
 * Figma-style board built on React Flow. Three node kinds:
 *   notebook (the parent, real cells) → road (one card = picks + exchange,
 *   the full provenance of a mini) → mini (the branch lesson).
 *
 * The exchange runs through the ExchangeAgent seam (ScriptedAgent today,
 * Claude-backed later); every turn is persisted to branch_session_turns as it
 * happens, so live creation and past history render through the same card.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import {
  Background,
  BackgroundVariant,
  ReactFlow,
  ReactFlowProvider,
  useNodesState,
  applyNodeChanges,
  type Edge,
  type EdgeTypes,
  type Node,
  type NodeChange,
  type NodeTypes,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import {
  ArrowLeft,
  GitBranch,
  Maximize2,
  Minus,
  Moon,
  Plus,
  Sun,
} from "lucide-react";
import { useReactFlow } from "@xyflow/react";
import { createClient } from "@/lib/supabase/client";
import type { Cell } from "@/components/notebook/cells";
import { NotebookNode, type NotebookNodeType } from "./NotebookNode";
import { RoadNode, type RoadNodeType } from "./RoadNode";
import { MiniNode, type MiniNodeType } from "./MiniNode";
import { SmartEdge } from "./SmartEdge";
import { ScriptedAgent } from "./agent";
import type {
  BranchSession,
  BranchTurn,
  CanvasNodeRow,
  Highlight,
  Road,
  RoadStatus,
} from "./types";
import "./canvas.css";

const nodeTypes: NodeTypes = {
  notebook: NotebookNode,
  road: RoadNode,
  mini: MiniNode,
};

const edgeTypes: EdgeTypes = {
  smart: SmartEdge,
};

/** Runtime road state = stored road + live-exchange UI state. */
interface RoadState extends Road {
  status: RoadStatus;
  agentTyping: boolean;
  options: string[] | null;
  agreedTitle: string | null;
  newborn: boolean;
}

interface Pos {
  x: number;
  y: number;
}
const LANE_H = 440;
const ROAD_X = 780;
const MINI_X = 1180;

export interface BranchCanvasProps {
  missionId: string;
  missionTitle: string;
  cells: Cell[];
  roads: Road[];
  positions: CanvasNodeRow[];
}

export function BranchCanvas(props: BranchCanvasProps) {
  return (
    <ReactFlowProvider>
      <CanvasInner {...props} />
    </ReactFlowProvider>
  );
}

function CanvasInner({
  missionId,
  missionTitle,
  cells,
  roads: initialRoads,
  positions,
}: BranchCanvasProps) {
  const supabase = useMemo(() => createClient(), []);
  const agent = useMemo(() => new ScriptedAgent(), []);
  const { zoomIn, zoomOut, fitView } = useReactFlow();

  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [hotRoad, setHotRoad] = useState<string | null>(null);

  // Hover state flows to NotebookNode outside React (CSS highlights only), so
  // hovering a road never rebuilds node data — memo'd nodes stay mounted.
  const hoverStore = useMemo(() => {
    const listeners = new Set<() => void>();
    const state: {
      hotRoad: string | null;
      pulsePick: { cell_id: string; selected_text: string } | null;
    } = { hotRoad: null, pulsePick: null };
    return {
      get: () => state,
      set(patch: Partial<typeof state>) {
        Object.assign(state, patch);
        listeners.forEach((l) => l());
      },
      subscribe(cb: () => void) {
        listeners.add(cb);
        return () => {
          listeners.delete(cb);
        };
      },
    };
  }, []);

  const handleHover = useCallback(
    (sid: string | null) => {
      setHotRoad(sid);
      hoverStore.set({ hotRoad: sid });
    },
    [hoverStore],
  );

  const handlePulsePick = useCallback(
    (p: Highlight | null) => {
      hoverStore.set({
        pulsePick: p
          ? { cell_id: p.cell_id, selected_text: p.selected_text }
          : null,
      });
    },
    [hoverStore],
  );
  const [wiredRoads, setWiredRoads] = useState<Set<string>>(new Set());

  const [roadMap, setRoadMap] = useState<Map<string, RoadState>>(() => {
    const m = new Map<string, RoadState>();
    initialRoads.forEach((r) => {
      m.set(r.session.id, {
        ...r,
        status: r.session.status as RoadStatus,
        agentTyping: false,
        options: null,
        agreedTitle: null,
        newborn: false,
      });
    });
    return m;
  });
  /** The one in-flight (collecting/discussing) road, if any. */
  const liveIdRef = useRef<string | null>(
    initialRoads.find((r) => r.session.status === "collecting" || r.session.status === "discussing")
      ?.session.id ?? null,
  );

  const patchRoad = useCallback(
    (id: string, patch: Partial<RoadState>) => {
      setRoadMap((prev) => {
        const cur = prev.get(id);
        if (!cur) return prev;
        const next = new Map(prev);
        next.set(id, { ...cur, ...patch });
        return next;
      });
    },
    [],
  );

  /* ── positions ─────────────────────────────────────────────────────────── */
  const savedPos = useMemo(() => {
    const m = new Map<string, Pos>();
    positions.forEach((p) => {
      m.set(`${p.node_type}:${p.ref_id ?? ""}`, { x: p.x, y: p.y });
    });
    return m;
  }, [positions]);

  const defaultPos = useCallback(
    (type: string, refId: string, laneIndex: number): Pos => {
      const saved = savedPos.get(`${type}:${refId}`);
      if (saved) return saved;
      if (type === "notebook") return { x: 0, y: 0 };
      const y = 40 + laneIndex * LANE_H;
      return { x: type === "road" ? ROAD_X : MINI_X, y };
    },
    [savedPos],
  );

  const persistPos = useCallback(
    (type: string, refId: string, pos: Pos) => {
      void supabase
        .from("canvas_nodes")
        .upsert(
          {
            mission_id: missionId,
            node_type: type,
            ref_id: refId,
            x: pos.x,
            y: pos.y,
            updated_at: new Date().toISOString(),
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
          { onConflict: "mission_id,node_type,ref_id" },
        )
        .then(() => undefined);
    },
    [supabase, missionId],
  );

  /* ── exchange flow (agent seam) ────────────────────────────────────────── */
  // seq counter lives in a ref so two turns persisted in the same handler
  // (user reply + agent answer) can't collide on unique(session_id, seq).
  const seqRef = useRef<Map<string, number>>(
    new Map(initialRoads.map((r) => [r.session.id, r.turns.length])),
  );
  const persistTurn = useCallback(
    async (sessionId: string, role: "agent" | "user", summary: string, full: string) => {
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
      setRoadMap((prev) => {
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
    (sessionId: string, status: RoadStatus) => {
      void supabase
        .from("branch_sessions")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ status, updated_at: new Date().toISOString() } as never)
        .eq("id", sessionId)
        .then(() => undefined);
    },
    [supabase],
  );

  const agentCtx = useCallback(
    (sessionId: string) => {
      const road = roadMap.get(sessionId);
      return {
        picks: (road?.picks ?? []).map((p) => ({
          cell_id: p.cell_id,
          text: p.selected_text,
        })),
        priorTurns: (road?.turns ?? []).map((t) => ({
          role: t.role,
          text: t.full_text,
        })),
      };
    },
    [roadMap],
  );

  const onDone = useCallback(
    async (sessionId: string) => {
      patchRoad(sessionId, { status: "discussing", agentTyping: true, options: null });
      setSessionStatus(sessionId, "discussing");
      const turn = await agent.start(agentCtx(sessionId));
      await persistTurn(sessionId, "agent", turn.summary_line, turn.full_text);
      patchRoad(sessionId, {
        agentTyping: false,
        options: turn.options ?? null,
      });
    },
    [agent, agentCtx, patchRoad, persistTurn, setSessionStatus],
  );

  const onReply = useCallback(
    async (sessionId: string, text: string) => {
      patchRoad(sessionId, { agentTyping: true, options: null });
      await persistTurn(sessionId, "user", text, text);
      const turn = await agent.reply(agentCtx(sessionId), text);
      await persistTurn(sessionId, "agent", turn.summary_line, turn.full_text);
      if (turn.done) {
        patchRoad(sessionId, {
          agentTyping: false,
          options: null,
          status: "flagged",
          agreedTitle: turn.title ?? null,
        });
        setSessionStatus(sessionId, "flagged");
      } else {
        patchRoad(sessionId, {
          agentTyping: false,
          options: turn.options ?? null,
        });
      }
    },
    [agent, agentCtx, patchRoad, persistTurn, setSessionStatus],
  );

  const onFlag = useCallback(
    async (sessionId: string) => {
      const road = roadMap.get(sessionId);
      patchRoad(sessionId, { status: "generating" });
      setSessionStatus(sessionId, "generating");
      try {
        const res = await fetch("/api/branches", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            parent_mission_id: missionId,
            session_id: sessionId,
            note: road?.session.note ?? "",
            title: road?.agreedTitle ?? undefined,
          }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data?.error?.message ?? `Failed (${res.status})`);
        const child = data.child_mission as { id: string; title: string; status: string };
        patchRoad(sessionId, {
          status: "generated",
          child: { id: child.id, title: child.title, status: child.status },
          newborn: true,
        });
        if (liveIdRef.current === sessionId) liveIdRef.current = null;
      } catch {
        // Roll back to flagged so the user can retry.
        patchRoad(sessionId, { status: "flagged" });
        setSessionStatus(sessionId, "flagged");
      }
    },
    [missionId, patchRoad, roadMap, setSessionStatus],
  );

  /* ── selection pill + picking ──────────────────────────────────────────── */
  const [pill, setPill] = useState<{ x: number; y: number; cellId: string; text: string } | null>(null);

  useEffect(() => {
    function onMouseUp(e: MouseEvent) {
      if ((e.target as HTMLElement | null)?.closest?.(".cv-pill")) return;
      requestAnimationFrame(() => {
        const sel = window.getSelection();
        if (!sel || sel.isCollapsed || sel.rangeCount === 0) {
          setPill(null);
          return;
        }
        const text = sel.toString().trim();
        if (text.length < 3) {
          setPill(null);
          return;
        }
        const range = sel.getRangeAt(0);
        const anchorEl =
          range.commonAncestorContainer instanceof Element
            ? range.commonAncestorContainer
            : range.commonAncestorContainer.parentElement;
        const cellEl = anchorEl?.closest<HTMLElement>("[data-cell-id]");
        if (!cellEl || !anchorEl?.closest("[data-canvas-cells]")) {
          setPill(null);
          return;
        }
        const rect = range.getBoundingClientRect();
        setPill({
          x: rect.left + rect.width / 2,
          y: Math.min(rect.bottom + 10, window.innerHeight - 64),
          cellId: cellEl.dataset.cellId as string,
          text,
        });
      });
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  const addPick = useCallback(async () => {
    if (!pill) return;
    const { cellId, text } = pill;
    setPill(null);
    window.getSelection()?.removeAllRanges();

    let sessionId = liveIdRef.current;
    // Only a collecting road accepts picks.
    if (sessionId && roadMap.get(sessionId)?.status !== "collecting") sessionId = null;

    if (!sessionId) {
      const { data } = await supabase
        .from("branch_sessions")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .insert({ parent_mission_id: missionId, status: "collecting" } as any)
        .select("*")
        .single();
      const session = (data ?? null) as BranchSession | null;
      if (!session) return;
      sessionId = session.id;
      liveIdRef.current = sessionId;
      const color = roadMap.size % 4;
      setRoadMap((prev) => {
        const next = new Map(prev);
        next.set(session.id, {
          session,
          picks: [],
          turns: [],
          child: null,
          color,
          status: "collecting",
          agentTyping: false,
          options: null,
          agreedTitle: null,
          newborn: false,
        });
        return next;
      });
    }

    const order = (roadMap.get(sessionId)?.picks.length ?? 0) + 1;
    const { data: hlData } = await supabase
      .from("mission_highlights")
      .insert({
        parent_mission_id: missionId,
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
    setRoadMap((prev) => {
      const cur = prev.get(sessionId as string);
      if (!cur) return prev;
      const next = new Map(prev);
      next.set(sessionId as string, { ...cur, picks: [...cur.picks, hl] });
      return next;
    });
  }, [pill, supabase, missionId, roadMap]);

  const onRemovePick = useCallback(
    (sessionId: string, highlightId: string) => {
      void supabase.from("mission_highlights").delete().eq("id", highlightId)
        .then(() => undefined);
      setRoadMap((prev) => {
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

  /* ── nodes + edges ─────────────────────────────────────────────────────── */
  const roadsArr = useMemo(() => [...roadMap.values()], [roadMap]);

  const onHandlesMeasured = useCallback((ids: string[]) => {
    setWiredRoads((prev) => {
      if (prev.size === ids.length && ids.every((i) => prev.has(i))) return prev;
      return new Set(ids);
    });
  }, []);

  const builtNodes = useMemo<Node[]>(() => {
    const liveId = liveIdRef.current;
    const live = liveId ? roadMap.get(liveId) : null;
    const isCollecting = live?.status === "collecting";

    const notebook: NotebookNodeType = {
      id: "notebook",
      type: "notebook",
      position: defaultPos("notebook", missionId, 0),
      dragHandle: ".canvas-frame-tab",
      data: {
        title: missionTitle,
        cellCount: cells.length,
        branchCount: roadsArr.filter((r) => r.child).length,
        cells,
        roads: roadsArr
          .filter((r) => !(isCollecting && r.session.id === liveId))
          .filter((r) => r.picks.length > 0)
          .map((r) => ({
            sessionId: r.session.id,
            color: r.color,
            picks: r.picks.map((p) => ({
              cell_id: p.cell_id,
              selected_text: p.selected_text,
            })),
          })),
        pending: isCollecting
          ? live!.picks.map((p) => ({
              cell_id: p.cell_id,
              selected_text: p.selected_text,
            }))
          : [],
        pendingSessionId: isCollecting ? liveId : null,
        hover: hoverStore,
        onHandlesMeasured,
      },
    };

    const out: Node[] = [notebook];
    roadsArr.forEach((r, i) => {
      const sid = r.session.id;
      const title =
        r.child?.title ?? r.agreedTitle ?? (r.status === "collecting" || r.status === "discussing"
          ? "New branch lesson"
          : "Branch lesson");
      const roadNode: RoadNodeType = {
        id: `road-${sid}`,
        type: "road",
        position: defaultPos("road", sid, i),
        dragHandle: ".canvas-frame-tab",
        data: {
          sessionId: sid,
          title,
          color: r.color,
          status: r.status,
          picks: r.picks,
          turns: r.turns,
          note: r.session.note,
          flagLine:
            r.status === "generated"
              ? r.turns.length > 0
                ? "generated"
                : "generated (before exchanges existed)"
              : null,
          agentTyping: r.agentTyping,
          options: r.options,
          live: r.status === "collecting" || r.status === "discussing",
          onDone: () => void onDone(sid),
          onReply: (text: string) => void onReply(sid, text),
          onFlag: () => void onFlag(sid),
          onRemovePick: (hlId: string) => onRemovePick(sid, hlId),
          onPulsePick: handlePulsePick,
          onHover: handleHover,
        },
      };
      out.push(roadNode);
      if (r.child) {
        const miniNode: MiniNodeType = {
          id: `mini-${sid}`,
          type: "mini",
          position: defaultPos("mini", sid, i),
          dragHandle: ".canvas-frame-tab",
          data: {
            sessionId: sid,
            missionId: r.child.id,
            title: r.child.title,
            status: r.child.status,
            color: r.color,
            pickCount: r.picks.length,
            newborn: r.newborn,
            onHover: handleHover,
          },
        };
        out.push(miniNode);
      }
    });
    return out;
  }, [
    roadsArr, roadMap, cells, missionId, missionTitle, defaultPos, hoverStore,
    handleHover, handlePulsePick, onDone, onReply, onFlag, onRemovePick,
    onHandlesMeasured,
  ]);

  // React Flow owns positions after mount; we rebuild data but keep positions.
  const [nodes, setNodes] = useNodesState(builtNodes);
  useEffect(() => {
    setNodes((prev) => {
      const posById = new Map(prev.map((n) => [n.id, n.position]));
      return builtNodes.map((n) => ({
        ...n,
        position: posById.get(n.id) ?? n.position,
      }));
    });
  }, [builtNodes, setNodes]);

  // Dim classes are layered on top without touching `data`, so memo'd node
  // components skip re-rendering when hover changes.
  const displayNodes = useMemo(() => {
    if (!hotRoad) return nodes;
    return nodes.map((n) =>
      n.id === "notebook" || n.id === `road-${hotRoad}` || n.id === `mini-${hotRoad}`
        ? n
        : { ...n, className: "cv-dim" },
    );
  }, [nodes, hotRoad]);

  const onNodesChange = useCallback(
    (changes: NodeChange[]) => {
      setNodes((prev) => applyNodeChanges(changes, prev));
    },
    [setNodes],
  );

  const onNodeDragStop = useCallback(
    (_: unknown, node: Node) => {
      if (node.id === "notebook") {
        persistPos("notebook", missionId, node.position);
      } else {
        const [type, sid] = node.id.split(/-(.+)/);
        persistPos(type, sid, node.position);
      }
    },
    [persistPos, missionId],
  );

  const edges = useMemo<Edge[]>(() => {
    const out: Edge[] = [];
    roadsArr.forEach((r) => {
      const sid = r.session.id;
      const stroke = `rgb(var(--cv-br-${r.color % 4}))`;
      const pending = r.status !== "generated";
      const dimmed = hotRoad !== null && hotRoad !== sid;
      const style = {
        stroke: pending ? "rgb(var(--cv-pending))" : stroke,
        strokeWidth: 1.6,
        opacity: dimmed ? 0.08 : hotRoad === sid ? 0.95 : 0.4,
      };
      if (wiredRoads.has(sid)) {
        out.push({
          id: `e-hl-${sid}`,
          type: "smart",
          source: "notebook",
          sourceHandle: `road-${sid}`,
          target: `road-${sid}`,
          targetHandle: "in",
          animated: pending,
          style,
        });
      }
      if (r.child) {
        out.push({
          id: `e-rm-${sid}`,
          type: "smart",
          source: `road-${sid}`,
          sourceHandle: "out",
          target: `mini-${sid}`,
          targetHandle: "in",
          animated: false,
          style,
        });
      }
    });
    return out;
  }, [roadsArr, hotRoad, wiredRoads]);

  /* ── render ────────────────────────────────────────────────────────────── */
  return (
    <div className="theme-notebook cv-page" data-theme={theme}>
      <header className="cv-topbar">
        <Link href={`/missions/${missionId}`} className="cv-back">
          <ArrowLeft size={13} strokeWidth={2.2} aria-hidden />
          Back to notebook
        </Link>
        <span className="cv-crumb">{missionTitle}</span>
        <span className="cv-mode">
          <GitBranch size={11} strokeWidth={2.2} aria-hidden /> Branch canvas
        </span>
        <span className="cv-spacer" />
        <button
          type="button"
          className="cv-icon-btn"
          onClick={() => setTheme((t) => (t === "light" ? "dark" : "light"))}
          aria-label="Toggle theme"
          title="Toggle light/dark"
        >
          {theme === "light" ? (
            <Moon size={13} strokeWidth={2} />
          ) : (
            <Sun size={13} strokeWidth={2} />
          )}
        </button>
      </header>

      <div className="cv-flow">
        <ReactFlow
          nodes={displayNodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          onNodesChange={onNodesChange}
          onNodeDragStop={onNodeDragStop}
          fitView
          fitViewOptions={{ padding: 0.12, maxZoom: 0.9 }}
          minZoom={0.2}
          maxZoom={2}
          nodesConnectable={false}
          deleteKeyCode={null}
          proOptions={{ hideAttribution: true }}
        >
          <Background variant={BackgroundVariant.Dots} gap={26} size={1.2} />
        </ReactFlow>
      </div>

      <div className="cv-tools">
        <button type="button" onClick={() => zoomOut()} aria-label="Zoom out">
          <Minus size={13} strokeWidth={2.2} />
        </button>
        <button type="button" onClick={() => zoomIn()} aria-label="Zoom in">
          <Plus size={13} strokeWidth={2.2} />
        </button>
        <span className="cv-tools-sep" />
        <button
          type="button"
          onClick={() => fitView({ padding: 0.12, duration: 500 })}
          aria-label="Fit everything"
          title="Fit everything"
        >
          <Maximize2 size={12} strokeWidth={2.2} />
        </button>
      </div>

      {pill ? (
        <div className="cv-pill" style={{ left: pill.x, top: pill.y }}>
          <button type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => void addPick()}>
            <GitBranch size={13} strokeWidth={2.2} aria-hidden />
            Add to branch
          </button>
        </div>
      ) : null}
    </div>
  );
}
