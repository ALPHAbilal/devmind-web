"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
interface NotebookContextValue {
  notebookId: string;
  /** Whether the notebook's learning_session exists and is active. */
  sessionActive: boolean;
  setSessionActive: (active: boolean) => void;
  /** True between submit and the first new cell or thread message arriving. */
  thinking: boolean;
  /** Begin "thinking" — caller (ChatBar / Thread) flips this on submit. */
  beginThinking: () => void;
  /** Force-clear thinking (e.g. on transport error). */
  endThinking: () => void;
  /** NotebookContent calls this on cell/thread-message INSERT to settle the spinner. */
  notifyAgentReply: () => void;
  /** Build stage (the right-side workspace) — view state lives here, the
   *  surface reads it. */
  stageOpen: boolean;
  stageExpanded: boolean;
  openStage: () => void;
  closeStage: () => void;
  toggleStageExpanded: () => void;
}

const NotebookContext = createContext<NotebookContextValue | null>(null);

export function NotebookProvider({
  notebookId,
  initialSessionActive,
  children,
}: {
  notebookId: string;
  initialSessionActive: boolean;
  children: ReactNode;
}) {
  const [sessionActive, setSessionActive] = useState(initialSessionActive);
  const [thinking, setThinking] = useState(false);
  const [stageOpen, setStageOpen] = useState(false);
  const [stageExpanded, setStageExpanded] = useState(false);

  const openStage = useCallback(() => setStageOpen(true), []);
  const closeStage = useCallback(() => {
    setStageOpen(false);
    setStageExpanded(false);
  }, []);
  const toggleStageExpanded = useCallback(
    () => setStageExpanded((e) => !e),
    [],
  );
  // Tracks the moment thinking started so that pre-existing cells don't
  // race-clear the spinner (e.g. SSR seed events).
  const thinkingSinceRef = useRef<number>(0);

  const beginThinking = useCallback(() => {
    thinkingSinceRef.current = Date.now();
    setThinking(true);
  }, []);

  const endThinking = useCallback(() => {
    thinkingSinceRef.current = 0;
    setThinking(false);
  }, []);

  const notifyAgentReply = useCallback(() => {
    // Any agent-side event after the submit moment clears thinking.
    if (thinkingSinceRef.current > 0) {
      thinkingSinceRef.current = 0;
      setThinking(false);
    }
  }, []);

  const value = useMemo<NotebookContextValue>(
    () => ({
      notebookId,
      sessionActive,
      setSessionActive,
      thinking,
      beginThinking,
      endThinking,
      notifyAgentReply,
      stageOpen,
      stageExpanded,
      openStage,
      closeStage,
      toggleStageExpanded,
    }),
    [
      notebookId,
      sessionActive,
      thinking,
      beginThinking,
      endThinking,
      notifyAgentReply,
      stageOpen,
      stageExpanded,
      openStage,
      closeStage,
      toggleStageExpanded,
    ],
  );

  return (
    <NotebookContext.Provider value={value}>{children}</NotebookContext.Provider>
  );
}

export function useNotebook(): NotebookContextValue {
  const ctx = useContext(NotebookContext);
  if (!ctx) {
    throw new Error("useNotebook must be used inside <NotebookProvider>");
  }
  return ctx;
}

/** Non-throwing variant — returns null when rendered outside a provider (e.g.
 *  the design-test harness). Cells that only *optionally* need notebook state
 *  (like ChallengeCell's Start-Building button) use this so they stay
 *  renderable in isolation. */
export function useNotebookOptional(): NotebookContextValue | null {
  return useContext(NotebookContext);
}
