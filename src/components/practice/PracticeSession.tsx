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
import type { Question } from "@/data/types";

export type PracticeSessionInput = {
  questions: Question[];
  title: string;
};

export type PracticeSession = PracticeSessionInput & {
  key: number;
};

type PracticeSessionContextValue = {
  session: PracticeSession | null;
  startSession: (input: PracticeSessionInput) => PracticeSession;
  clearSession: () => void;
};

const PracticeSessionContext = createContext<PracticeSessionContextValue | null>(null);

export function PracticeSessionProvider({ children }: { children: ReactNode }) {
  const nextKey = useRef(0);
  const [session, setSession] = useState<PracticeSession | null>(null);

  const startSession = useCallback((input: PracticeSessionInput) => {
    const created = { ...input, key: ++nextKey.current };
    setSession(created);
    return created;
  }, []);

  const clearSession = useCallback(() => setSession(null), []);
  const value = useMemo(
    () => ({ session, startSession, clearSession }),
    [clearSession, session, startSession],
  );

  return (
    <PracticeSessionContext.Provider value={value}>
      {children}
    </PracticeSessionContext.Provider>
  );
}

export function usePracticeSession(): PracticeSessionContextValue {
  const context = useContext(PracticeSessionContext);
  if (!context) {
    throw new Error("usePracticeSession must be used inside PracticeSessionProvider");
  }
  return context;
}
