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
import type { Tables } from "@/lib/supabase/types";

export type Puzzle = Tables<"puzzles">;

interface NotebookContextValue {
  missionId: string;
  /** Whether the mission's learning_session exists and is active. */
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
  /** Latest puzzle row for this mission (any status). NotebookContent owns it. */
  puzzle: Puzzle | null;
  setPuzzle: (p: Puzzle | null) => void;
  /** mc_id of the current in-progress micro-challenge, derived from session.state_json. */
  currentMicroChallengeId: string | null;
  setCurrentMicroChallengeId: (id: string | null) => void;
}

const NotebookContext = createContext<NotebookContextValue | null>(null);

export function NotebookProvider({
  missionId,
  initialSessionActive,
  children,
}: {
  missionId: string;
  initialSessionActive: boolean;
  children: ReactNode;
}) {
  const [sessionActive, setSessionActive] = useState(initialSessionActive);
  const [thinking, setThinking] = useState(false);
  const [puzzle, setPuzzle] = useState<Puzzle | null>(null);
  const [currentMicroChallengeId, setCurrentMicroChallengeId] = useState<
    string | null
  >(null);
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
      missionId,
      sessionActive,
      setSessionActive,
      thinking,
      beginThinking,
      endThinking,
      notifyAgentReply,
      puzzle,
      setPuzzle,
      currentMicroChallengeId,
      setCurrentMicroChallengeId,
    }),
    [
      missionId,
      sessionActive,
      thinking,
      beginThinking,
      endThinking,
      notifyAgentReply,
      puzzle,
      currentMicroChallengeId,
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
