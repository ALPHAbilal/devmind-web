"use client";

import { useRef, useState, type ChangeEvent, type KeyboardEvent } from "react";
import { SendIcon, ThreadIcon } from "@/components/sidebar/icons";
import "./chat-bar.css";

type ChatMode = "chat" | "error";

const PLACEHOLDERS: Record<ChatMode, string> = {
  chat: "Ask a question…",
  error: "Paste an error or describe what's broken…",
};

const MAX_HEIGHT_PX = 120;

export function ChatBar() {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const [value, setValue] = useState("");
  const [mode, setMode] = useState<ChatMode>("chat");

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

  function send() {
    const trimmed = value.trim();
    if (!trimmed) return;
    // Wiring lands in Phase 6.1 — for now just log so the dev can verify.
    // eslint-disable-next-line no-console
    console.log("[ChatBar.send]", { mode, content: trimmed });
    setValue("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "";
      textareaRef.current.classList.remove("scrollable");
    }
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  return (
    <div className="chat-bar" role="form" aria-label="Chat input">
      <div className="chat-input-wrap">
        <textarea
          ref={textareaRef}
          className="chat-input"
          rows={1}
          placeholder={PLACEHOLDERS[mode]}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
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
        </div>

        <button
          type="button"
          className="chat-send"
          onClick={send}
          disabled={!value.trim()}
          title="Send"
          aria-label="Send message"
        >
          <SendIcon />
        </button>
      </div>
    </div>
  );
}
