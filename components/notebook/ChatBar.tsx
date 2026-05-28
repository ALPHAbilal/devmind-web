"use client";

import {
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { SendIcon, ThreadIcon } from "@/components/sidebar/icons";
import { useNotebook } from "./NotebookProvider";
import { StuckButton } from "./StuckButton";
import "./chat-bar.css";

type ChatMode = "chat" | "error";

const PLACEHOLDERS: Record<ChatMode, string> = {
  chat: "Ask a question…",
  error: "Paste an error or describe what's broken…",
};

const MAX_HEIGHT_PX = 120;

export function ChatBar() {
  const { missionId, sessionActive, thinking, beginThinking, endThinking } =
    useNotebook();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");
  const [error, setError] = useState<string | null>(null);
  const inFlightRef = useRef(false);

  const disabled = !sessionActive || thinking;

  function autoGrow(el: HTMLTextAreaElement) {
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT_PX);
    el.style.height = `${next}px`;
    el.classList.toggle("scrollable", el.scrollHeight > MAX_HEIGHT_PX);
  }

  function handleChange(e: ChangeEvent<HTMLTextAreaElement>) {
    setValue(e.target.value);
    autoGrow(e.target);
  }

  function resetInput() {
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
      textareaRef.current.classList.remove("scrollable");
    }
  }

  async function send() {
    const trimmed = value.trim();
    if (!trimmed || inFlightRef.current) return;
    if (!sessionActive) {
      setError("Start the mission first.");
      return;
    }

    inFlightRef.current = true;
    setError(null);
    beginThinking();
    // Optimistic clear — POST is fire-and-forget; agent's response arrives via Realtime.
    const submitted = trimmed;
    const submittedMode = mode;
    resetInput();

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mission_id: missionId,
          content: submitted,
          mode: submittedMode,
          anchor: { kind: "none" },
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const code = body?.error?.code;
        const message: string =
          code === "mission_not_started" || code === "conflict"
            ? "Start the mission first."
            : body?.error?.message || `Send failed (${res.status})`;
        endThinking();
        setError(message);
        // Restore the text so the user can retry.
        setValue(submitted);
        return;
      }
      // 202 accepted — agent reply arrives via Realtime → notifyAgentReply().
    } catch (err) {
      endThinking();
      setError(err instanceof Error ? err.message : "Network error");
      setValue(submitted);
    } finally {
      inFlightRef.current = false;
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send();
    }
  }

  return (
    <div className="chat-bar" role="form" aria-label="Chat input">
      {error ? (
        <div className="chat-toast" role="alert">
          <span>{error}</span>
          <button
            type="button"
            className="chat-toast-retry"
            onClick={() => {
              setError(null);
              void send();
            }}
          >
            Retry
          </button>
        </div>
      ) : null}

      {thinking ? (
        <div className="chat-thinking" aria-live="polite">
          <span className="chat-thinking-dot" />
          <span className="chat-thinking-dot" />
          <span className="chat-thinking-dot" />
          <span className="chat-thinking-label">thinking…</span>
        </div>
      ) : null}

      <div className="chat-input-wrap">
        <textarea
          ref={textareaRef}
          className="chat-input"
          rows={1}
          placeholder={
            sessionActive ? PLACEHOLDERS[mode] : "Start the mission to chat…"
          }
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          aria-label="Message"
        />
      </div>

      <div className="chat-bottom-rail">
        <div className="chat-bottom-left">
          <button
            type="button"
            className="chat-thread-btn"
            title="Threads"
            aria-label="Open thread picker"
          >
            <ThreadIcon />
          </button>

          <div
            className="chat-mode-segmented"
            role="radiogroup"
            aria-label="Message mode"
          >
            <button
              type="button"
              role="radio"
              aria-checked={mode === "chat"}
              className={`chat-mode-option mode-chat${
                mode === "chat" ? " is-active" : ""
              }`}
              onClick={() => setMode("chat")}
            >
              <span className="chat-mode-option-icon">💬</span> Chat
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={mode === "error"}
              className={`chat-mode-option mode-error${
                mode === "error" ? " is-active" : ""
              }`}
              onClick={() => setMode("error")}
            >
              <span className="chat-mode-option-icon">⚠</span> Error
            </button>
          </div>

          <StuckButton />
        </div>

        <button
          type="button"
          className="chat-send"
          onClick={() => void send()}
          disabled={disabled || !value.trim()}
          title="Send"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
