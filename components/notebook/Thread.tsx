"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { marked } from "marked";
import {
  useRealtimeChannel,
  type RealtimeChangePayload,
} from "@/lib/realtime";
import { createClient } from "@/lib/supabase/client";
import { useNotebook } from "./NotebookProvider";
import type { Tables } from "@/lib/supabase/types";
import "./thread.css";

type ThreadMessage = Tables<"thread_messages">;

marked.setOptions({ gfm: true, breaks: false });

interface ThreadProps {
  threadId: string;
  /** Optional one-line preview of the cell this thread is anchored to. */
  anchorPreview?: string | null;
  defaultCollapsed?: boolean;
}

/**
 * Inline thread. Subscribes to thread_messages filtered by thread_id and
 * SSR-fetches the existing message list on mount via the browser client (RLS
 * gates the read). Continuation submits hit /api/chat with anchor.in_thread.
 *
 * Copy buttons on fenced code blocks lift the same handler CodeCell uses —
 * inlined here rather than abstracted, since this is the only other site.
 */
export function Thread({
  threadId,
  anchorPreview,
  defaultCollapsed = false,
}: ThreadProps) {
  const { missionId, notifyAgentReply } = useNotebook();
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [collapsed, setCollapsed] = useState(defaultCollapsed);
  const [value, setValue] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Initial load — RLS protected.
  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    void supabase
      .from("thread_messages")
      .select("*")
      .eq("thread_id", threadId)
      .order("ord", { ascending: true })
      .then(({ data }) => {
        if (cancelled) return;
        setMessages((data ?? []) as ThreadMessage[]);
      });
    return () => {
      cancelled = true;
    };
  }, [threadId]);

  const onMsgChange = useCallback(
    (payload: RealtimeChangePayload<ThreadMessage>) => {
      setMessages((prev) => {
        switch (payload.eventType) {
          case "INSERT": {
            if (prev.some((m) => m.id === payload.new.id)) return prev;
            return [...prev, payload.new].sort((a, b) => a.ord - b.ord);
          }
          case "UPDATE":
            return prev
              .map((m) => (m.id === payload.new.id ? payload.new : m))
              .sort((a, b) => a.ord - b.ord);
          case "DELETE":
            return prev.filter((m) => m.id !== payload.old.id);
          default:
            return prev;
        }
      });
      if (payload.eventType === "INSERT" && payload.new.role === "assistant") {
        notifyAgentReply();
      }
    },
    [notifyAgentReply],
  );

  useRealtimeChannel<ThreadMessage>(
    "thread_messages",
    { filter: { column: "thread_id", value: threadId } },
    onMsgChange,
    [threadId],
  );

  // Auto-scroll to newest on append.
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || collapsed) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, collapsed]);

  async function submit() {
    const trimmed = value.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission_id: missionId,
          content: trimmed,
          mode: "chat",
          anchor: { kind: "in_thread", thread_id: threadId },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        setError(body?.error?.message || `Failed (${res.status})`);
        return;
      }
      setValue("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error");
    } finally {
      setSubmitting(false);
    }
  }

  function onKey(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit();
    }
  }

  const ordered = useMemo(
    () => [...messages].sort((a, b) => a.ord - b.ord),
    [messages],
  );

  return (
    <section className="thread" data-thread-id={threadId}>
      <header className="thread-header">
        <button
          type="button"
          className="thread-collapse"
          onClick={() => setCollapsed((c) => !c)}
          aria-expanded={!collapsed}
        >
          <span className={`thread-caret${collapsed ? " collapsed" : ""}`}>▾</span>
          <span className="thread-title">
            Thread{anchorPreview ? `: ${anchorPreview}` : ""}
          </span>
        </button>
        <span className="thread-count">{ordered.length} messages</span>
      </header>

      {collapsed ? null : (
        <>
          <div className="thread-body" ref={bodyRef}>
            {ordered.length === 0 ? (
              <p className="thread-empty">Waiting for the agent…</p>
            ) : (
              ordered.map((m) => <ThreadMessageBubble key={m.id} message={m} />)
            )}
          </div>

          <div className="thread-input-row">
            <textarea
              ref={inputRef}
              className="thread-input"
              rows={2}
              placeholder="Continue the thread…"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={onKey}
              disabled={submitting}
            />
            <div className="thread-input-actions">
              {error ? <span className="thread-error">{error}</span> : null}
              <button
                type="button"
                className="thread-send"
                disabled={submitting || !value.trim()}
                onClick={() => void submit()}
              >
                {submitting ? "Sending…" : "Reply"}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function ThreadMessageBubble({ message }: { message: ThreadMessage }) {
  const isAssistant = message.role === "assistant";
  const html = isAssistant
    ? (marked.parse(message.content, { async: false }) as string)
    : null;

  // Bind copy handlers to any <pre><code> rendered from the markdown — same
  // pattern CodeCell uses but inline since this is the only other call site.
  useEffect(() => {
    if (!isAssistant) return;
    const root = document.querySelector(
      `[data-msg-id="${message.id}"]`,
    ) as HTMLElement | null;
    if (!root) return;
    const blocks = root.querySelectorAll<HTMLPreElement>("pre");
    const cleanups: Array<() => void> = [];
    blocks.forEach((pre) => {
      if (pre.querySelector(".thread-copy")) return;
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "thread-copy";
      btn.textContent = "Copy";
      const handler = () => {
        const code = pre.querySelector("code");
        const text = code?.textContent ?? pre.textContent ?? "";
        void navigator.clipboard.writeText(text).then(() => {
          btn.textContent = "Copied";
          setTimeout(() => {
            btn.textContent = "Copy";
          }, 1200);
        });
      };
      btn.addEventListener("click", handler);
      pre.appendChild(btn);
      cleanups.push(() => {
        btn.removeEventListener("click", handler);
        btn.remove();
      });
    });
    return () => {
      cleanups.forEach((c) => c());
    };
  }, [isAssistant, message.id, message.content]);

  return (
    <div
      className={`thread-msg thread-msg-${message.role}`}
      data-msg-id={message.id}
    >
      <div className="thread-msg-role">{isAssistant ? "Agent" : "You"}</div>
      {isAssistant && html ? (
        <div
          className="thread-msg-body"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <div className="thread-msg-body">{message.content}</div>
      )}
    </div>
  );
}
