"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SEED_QUESTIONS } from "@/data";
import type { ExamId, Question } from "@/data/types";
import {
  type Account,
  type Attempt,
  type MockResult,
  type UserData,
  EMPTY_USER_DATA,
  ensureVersion,
  hashPin,
  loadAccounts,
  loadCustomQuestions,
  loadSession,
  loadTheme,
  loadUserData,
  migrateKeys,
  newId,
  resetEverything,
  saveAccounts,
  saveCustomQuestions,
  saveSession,
  saveTheme,
  saveUserData,
} from "./storage";

type AuthResult = { ok: true } | { ok: false; error: "wrongPin" | "nameTaken" | "pinShort" };

/** Everything the signup wizard collects. */
export type SignUpInput = {
  name: string;
  email: string;
  grade: string;
  pin: string;
  targetScore: number;
};

type Ctx = {
  /** False until localStorage has been read (avoids SSR/hydration mismatches). */
  ready: boolean;
  account: Account | null;
  accounts: Account[];
  data: UserData;
  /** Seed questions plus admin-created ones. */
  bank: Question[];
  theme: "light" | "dark";
  toggleTheme: () => void;

  signUp: (input: SignUpInput) => Promise<AuthResult>;
  /** `handle` matches either the account name or its email. */
  signIn: (handle: string, pin: string) => Promise<AuthResult>;
  signOut: () => void;
  updateAccount: (patch: Partial<Omit<Account, "id" | "pinHash">>) => void;

  recordAttempts: (attempts: Attempt[]) => void;
  recordMock: (result: Omit<MockResult, "id">) => void;

  saveQuestion: (question: Question) => void;
  deleteQuestion: (id: string) => void;
  replaceCustomQuestions: (questions: Question[]) => void;

  resetAll: () => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [accountId, setAccountId] = useState<string | null>(null);
  const [data, setData] = useState<UserData>(EMPTY_USER_DATA);
  const [custom, setCustom] = useState<Question[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  // The whole store lives in localStorage, which only exists on the client, so
  // it is loaded after mount and `ready` gates anything that reads it. setState
  // here is deliberate.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    migrateKeys();
    ensureVersion();
    const loadedAccounts = loadAccounts();
    const session = loadSession();
    setAccounts(loadedAccounts);
    setCustom(loadCustomQuestions());
    const valid = session && loadedAccounts.some((a) => a.id === session) ? session : null;
    setAccountId(valid);
    if (valid) setData(loadUserData(valid));
    // The inline bootstrap in layout.tsx already put the right theme on <html>
    // before paint; read it back rather than deciding again.
    const applied = document.documentElement.dataset.theme;
    setTheme(loadTheme() ?? (applied === "dark" ? "dark" : "light"));
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  const account = useMemo(
    () => accounts.find((a) => a.id === accountId) ?? null,
    [accounts, accountId],
  );

  const bank = useMemo(() => [...SEED_QUESTIONS, ...custom], [custom]);

  const persistAccounts = useCallback((next: Account[]) => {
    setAccounts(next);
    saveAccounts(next);
  }, []);

  /**
   * Always derive the next value from the previous state. `recordAttempts` and
   * `recordMock` are called back-to-back when a mock test finishes, and reading
   * `data` from the render closure would make the second call discard the first.
   */
  const persistData = useCallback(
    (update: (previous: UserData) => UserData) => {
      setData((previous) => {
        const next = update(previous);
        if (accountId) saveUserData(accountId, next);
        return next;
      });
    },
    [accountId],
  );

  const signUp = useCallback<Ctx["signUp"]>(
    async (input) => {
      const trimmed = input.name.trim();
      const email = input.email.trim().toLowerCase();
      if (input.pin.length < 4) return { ok: false, error: "pinShort" };
      if (
        accounts.some(
          (a) => a.name.toLowerCase() === trimmed.toLowerCase() || a.email === email,
        )
      ) {
        return { ok: false, error: "nameTaken" };
      }
      const created: Account = {
        id: newId("acc"),
        name: trimmed,
        email,
        grade: input.grade.trim(),
        pinHash: await hashPin(input.pin),
        // The first account on a fresh browser owns the content editor.
        role: accounts.length === 0 ? "admin" : "student",
        createdAt: Date.now(),
        targetScore: input.targetScore,
      };
      persistAccounts([...accounts, created]);
      setAccountId(created.id);
      saveSession(created.id);
      setData(loadUserData(created.id));
      return { ok: true };
    },
    [accounts, persistAccounts],
  );

  const signIn = useCallback<Ctx["signIn"]>(
    async (handle, pin) => {
      const key = handle.trim().toLowerCase();
      const found = accounts.find(
        (a) => a.name.toLowerCase() === key || a.email === key,
      );
      if (!found || found.pinHash !== (await hashPin(pin))) {
        return { ok: false, error: "wrongPin" };
      }
      setAccountId(found.id);
      saveSession(found.id);
      setData(loadUserData(found.id));
      return { ok: true };
    },
    [accounts],
  );

  const signOut = useCallback(() => {
    setAccountId(null);
    saveSession(null);
    setData(EMPTY_USER_DATA);
  }, []);

  const updateAccount = useCallback<Ctx["updateAccount"]>(
    (patch) => {
      if (!account) return;
      persistAccounts(accounts.map((a) => (a.id === account.id ? { ...a, ...patch } : a)));
    },
    [account, accounts, persistAccounts],
  );

  const recordAttempts = useCallback<Ctx["recordAttempts"]>(
    (attempts) => {
      if (!accountId || attempts.length === 0) return;
      persistData((previous) => ({
        ...previous,
        attempts: [...previous.attempts, ...attempts],
      }));
    },
    [accountId, persistData],
  );

  const recordMock = useCallback<Ctx["recordMock"]>(
    (result) => {
      if (!accountId) return;
      const stored = { ...result, id: newId("mock") };
      persistData((previous) => ({ ...previous, mocks: [...previous.mocks, stored] }));
    },
    [accountId, persistData],
  );

  const persistCustom = useCallback((next: Question[]) => {
    setCustom(next);
    saveCustomQuestions(next);
  }, []);

  const saveQuestion = useCallback<Ctx["saveQuestion"]>(
    (question) => {
      const marked = { ...question, custom: true };
      const exists = custom.some((q) => q.id === marked.id);
      persistCustom(
        exists ? custom.map((q) => (q.id === marked.id ? marked : q)) : [...custom, marked],
      );
    },
    [custom, persistCustom],
  );

  const deleteQuestion = useCallback<Ctx["deleteQuestion"]>(
    (id) => persistCustom(custom.filter((q) => q.id !== id)),
    [custom, persistCustom],
  );

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      saveTheme(next);
      return next;
    });
  }, []);

  const resetAll = useCallback(() => {
    resetEverything();
    setAccounts([]);
    setAccountId(null);
    setData(EMPTY_USER_DATA);
    setCustom([]);
  }, []);

  const value: Ctx = {
    ready,
    account,
    accounts,
    data,
    bank,
    theme,
    toggleTheme,
    signUp,
    signIn,
    signOut,
    updateAccount,
    recordAttempts,
    recordMock,
    saveQuestion,
    deleteQuestion,
    replaceCustomQuestions: persistCustom,
    resetAll,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): Ctx {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

/** Questions for one subject, drawn from the merged bank. */
export function questionsForSubject(bank: Question[], subjectId: string): Question[] {
  return bank.filter((q) => q.subjectId === subjectId);
}

export function questionsForExam(bank: Question[], exam: ExamId): Question[] {
  return bank.filter((q) => q.exam === exam);
}
