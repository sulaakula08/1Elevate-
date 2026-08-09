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
  ensureDataEpoch,
  ensureVersion,
  loadCustomQuestions,
  loadTheme,
  loadUserData,
  migrateKeys,
  purgeLegacyAccounts,
  resetEverything,
  saveCustomQuestions,
  saveTheme,
  saveUserData,
} from "./storage";
import {
  type AuthOutcome,
  signInWithPassword,
  signOutEverywhere,
  signUpWithPassword,
} from "./auth";
import { apiFetch, supabase, supabaseReady } from "./supabase/client";
import { merge as mergeHistory, push as pushHistory } from "./sync";

export type AuthResult = AuthOutcome;

/** Everything the signup form collects. */
export type SignUpInput = {
  name: string;
  email: string;
  password: string;
  grade: string;
  targetScore: number;
};

/** The profile row, shaped as the rest of the app already expects an Account. */
type ProfileResponse = {
  profile: {
    id: string;
    name: string | null;
    email: string | null;
    grade: string | null;
    role: "student" | "admin";
    targetScore: number;
  };
};

type Ctx = {
  /** False until localStorage has been read (avoids SSR/hydration mismatches). */
  ready: boolean;
  account: Account | null;
  /**
   * Empty now that profiles live in Supabase. Kept so the account switcher and
   * anything else reading it renders an empty list rather than crashing.
   */
  accounts: Account[];
  /** False when NEXT_PUBLIC_SUPABASE_* is missing, so the UI can explain itself. */
  authConfigured: boolean;
  data: UserData;
  /** Seed questions plus admin-created ones. */
  bank: Question[];
  theme: "light" | "dark";
  toggleTheme: () => void;

  signUp: (input: SignUpInput) => Promise<AuthResult>;
  signIn: (email: string, password: string) => Promise<AuthResult>;
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
  const [account, setAccount] = useState<Account | null>(null);
  const [data, setData] = useState<UserData>(EMPTY_USER_DATA);
  const [custom, setCustom] = useState<Question[]>([]);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  /**
   * Loads the profile behind the current Supabase session. Returns null when
   * nobody is signed in, so the caller can clear state either way.
   */
  const loadProfile = useCallback(async (): Promise<Account | null> => {
    const response = await apiFetch("/api/profile");
    if (!response.ok) return null;
    const body = (await response.json()) as ProfileResponse;
    const p = body.profile;
    return {
      id: p.id,
      name: p.name?.trim() || (p.email ?? "").split("@")[0] || "Student",
      email: p.email ?? "",
      grade: p.grade ?? "",
      role: p.role,
      createdAt: Date.now(),
      targetScore: p.targetScore,
    };
  }, []);

  // Local caches only exist on the client, and the session has to be read from
  // Supabase before anything can render as signed in. setState here is deliberate.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let live = true;

    migrateKeys();
    ensureVersion();
    // Before anything reads a cached history: drop caches from an older epoch,
    // so a browser holding another account's rows starts clean and refetches.
    ensureDataEpoch();
    // The pre-Supabase browser profiles go here, once.
    purgeLegacyAccounts();
    setCustom(loadCustomQuestions());

    const applied = document.documentElement.dataset.theme;
    setTheme(loadTheme() ?? (applied === "dark" ? "dark" : "light"));

    const client = supabase();
    if (!client) {
      setReady(true);
      return;
    }

    async function adopt(hasSession: boolean) {
      const profile = hasSession ? await loadProfile() : null;
      if (!live) return;

      setAccount(profile);
      if (!profile) {
        setData(EMPTY_USER_DATA);
        setReady(true);
        return;
      }

      // Render the cached history immediately, then reconcile with the server.
      // Waiting for the network before first paint would make every sign-in
      // feel slow for no benefit.
      const cached = loadUserData(profile.id);
      setData(cached);
      setReady(true);

      const result = await mergeHistory(profile.id, cached);
      if (live && !result.offline) {
        setData(result.data);
        saveUserData(profile.id, result.data);
      }

      // The shared question bank. The database is the record here, not a merge
      // target: an admin deleting a question must remove it for everyone, so a
      // successful fetch replaces the local cache outright.
      try {
        const response = await apiFetch("/api/questions");
        if (!live || !response.ok) return;
        const body = (await response.json()) as { questions: Question[] };
        setCustom(body.questions);
        saveCustomQuestions(body.questions);
      } catch {
        // Offline: the cached bank stays in use.
      }
    }

    client.auth.getSession().then(({ data: s }) => void adopt(Boolean(s.session)));

    // Covers sign-in, sign-out, token refresh and the recovery link landing —
    // including sign-out performed in another tab.
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (event === "TOKEN_REFRESHED") return;
      void adopt(Boolean(session));
    });

    return () => {
      live = false;
      sub.subscription.unsubscribe();
    };
  }, [loadProfile]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);


  const accountId = account?.id ?? null;

  // Drain whatever failed to send while the connection was down. Sending an
  // empty push is what flushes the outbox.
  useEffect(() => {
    if (!accountId) return;
    const flush = () => void pushHistory(accountId, {});
    window.addEventListener("online", flush);
    return () => window.removeEventListener("online", flush);
  }, [accountId]);

  const bank = useMemo(() => [...SEED_QUESTIONS, ...custom], [custom]);

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

  const signUp = useCallback<Ctx["signUp"]>(async (input) => {
    const outcome = await signUpWithPassword({
      email: input.email,
      password: input.password,
      name: input.name,
    });
    if (!outcome.ok) return outcome;

    // With confirmation required there is no session yet, so the grade and
    // target cannot be written — they are collected again after the first
    // sign-in rather than silently lost.
    if (!outcome.needsConfirmation) {
      await apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({ grade: input.grade, targetScore: input.targetScore }),
      });
      // onAuthStateChange refreshes the profile; this makes the new values
      // visible without waiting for that round trip.
    }
    return outcome;
  }, []);

  const signIn = useCallback<Ctx["signIn"]>(
    async (email, password) => signInWithPassword(email, password),
    [],
  );

  const signOut = useCallback(() => {
    // onAuthStateChange clears account and data; this keeps the UI honest even
    // if the network call is slow.
    setAccount(null);
    setData(EMPTY_USER_DATA);
    void signOutEverywhere();
  }, []);

  const updateAccount = useCallback<Ctx["updateAccount"]>(
    (patch) => {
      if (!account) return;
      setAccount({ ...account, ...patch });
      void apiFetch("/api/profile", {
        method: "PATCH",
        body: JSON.stringify({
          name: patch.name,
          grade: patch.grade,
          targetScore: patch.targetScore,
        }),
      });
    },
    [account],
  );

  const recordAttempts = useCallback<Ctx["recordAttempts"]>(
    (attempts) => {
      if (!accountId || attempts.length === 0) return;
      persistData((previous) => ({
        ...previous,
        attempts: [...previous.attempts, ...attempts],
      }));
      // Write-through, not awaited: answering a question must never wait on the
      // network. A failure is queued in the outbox and retried.
      void pushHistory(accountId, { attempts });
    },
    [accountId, persistData],
  );

  const recordMock = useCallback<Ctx["recordMock"]>(
    (result) => {
      if (!accountId) return;
      const stored = { ...result, id: `mock-${crypto.randomUUID()}` };
      persistData((previous) => ({ ...previous, mocks: [...previous.mocks, stored] }));
      void pushHistory(accountId, { mocks: [stored] });
    },
    [accountId, persistData],
  );

  /**
   * The bank is shared, so localStorage is only a cache here — the database is
   * the record. Writes go to both: the editor stays instant, and every other
   * student sees the question.
   */
  const persistCustom = useCallback((next: Question[]) => {
    setCustom(next);
    saveCustomQuestions(next);
  }, []);

  const saveQuestion = useCallback<Ctx["saveQuestion"]>(
    (question) => {
      const previous = custom.find((q) => q.id === question.id);
      // Provenance is the database's to assign, but stamping it optimistically
      // means a question the admin just saved shows an author and a time
      // straight away instead of blanks until the next reload. An edit keeps
      // whatever the original author and time were.
      const marked = {
        ...question,
        custom: true,
        authorEmail: previous?.authorEmail ?? question.authorEmail ?? account?.email,
        createdAt: previous?.createdAt ?? question.createdAt ?? Date.now(),
      };
      const exists = previous !== undefined;
      persistCustom(
        exists ? custom.map((q) => (q.id === marked.id ? marked : q)) : [...custom, marked],
      );
      void (async () => {
        const response = await apiFetch("/api/questions", {
          method: "POST",
          body: JSON.stringify({ questions: [marked] }),
        });
        if (!response.ok) return;

        // A new question is saved with a blank id and numbered by the server,
        // so the optimistic copy has to be renamed to the id it was actually
        // given — otherwise the editor holds a question the database has never
        // heard of, and the next save would create a second one.
        const body = (await response.json().catch(() => ({}))) as {
          assigned?: { from: string; to: string }[];
        };
        const given = body.assigned?.find((a) => a.from === String(marked.id));
        if (!given) return;
        setCustom((current) => {
          const next = current.map((q) =>
            q.id === marked.id ? { ...q, id: given.to } : q,
          );
          saveCustomQuestions(next);
          return next;
        });
      })();
    },
    [account?.email, custom, persistCustom],
  );

  const deleteQuestion = useCallback<Ctx["deleteQuestion"]>(
    (id) => {
      persistCustom(custom.filter((q) => q.id !== id));
      void apiFetch(`/api/questions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    },
    [custom, persistCustom],
  );

  /**
   * Bulk import from the editor's JSON paste. Uploads the whole set, since that
   * is the operation the admin actually performed.
   */
  const replaceCustom = useCallback<Ctx["replaceCustomQuestions"]>(
    (questions) => {
      const marked = questions.map((q) => ({ ...q, custom: true }));
      persistCustom(marked);
      if (marked.length > 0) {
        void apiFetch("/api/questions", {
          method: "POST",
          body: JSON.stringify({ questions: marked }),
        });
      }
    },
    [persistCustom],
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
    setData(EMPTY_USER_DATA);
    setCustom([]);
    // Local caches are gone; the Supabase session has to go too, or the app
    // would still be signed in with nothing behind it.
    setAccount(null);
    void signOutEverywhere();
  }, []);

  const value: Ctx = {
    ready,
    account,
    accounts: [],
    authConfigured: supabaseReady(),
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
    replaceCustomQuestions: replaceCustom,
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
