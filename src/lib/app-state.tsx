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
  loadLocalDrafts,
  loadTheme,
  loadUserData,
  migrateKeys,
  purgeLegacyAccounts,
  resetEverything,
  saveCustomQuestions,
  saveLocalDrafts,
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
    avatarUrl?: string;
  };
};

type Ctx = {
  /** False until localStorage has been read (avoids SSR/hydration mismatches). */
  ready: boolean;
  /**
   * An identity change is in flight: signing in, signing out, or restoring a
   * session. Distinct from `ready`, which only ever answers "has the first
   * check finished" and stays true through every change after it.
   */
  authBusy: boolean;
  /** True once the shared question bank has either loaded or definitively failed. */
  bankReady: boolean;
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

  /** Resolves once the database has answered, so the editor can report a failure. */
  saveQuestion: (question: Question) => Promise<{ ok: true } | { ok: false; error: string }>;
  deleteQuestion: (id: string) => void;
  /** Several at once, for the admin's delete-by-number field. */
  deleteQuestions: (ids: string[]) => void;
  replaceCustomQuestions: (questions: Question[]) => void;

  /* ---------------- local AI drafts ----------------
     Kept out of the database on purpose: these are questions an admin is still
     deciding about, and the way to decide is to meet one in practice rather
     than to read it in a review card. */
  localDrafts: Question[];
  keepLocally: (question: Question) => void;
  dropLocalDraft: (id: string) => void;
  clearLocalDrafts: () => void;

  resetAll: () => void;
};

const AppContext = createContext<Ctx | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  /*
   * True from the moment an identity starts changing until the app knows who
   * it is talking to.
   *
   * Without it, signing in showed the marketing page: `ready` was already true
   * from the initial boot, `account` was still null while /api/profile
   * answered, and "ready and nobody" is exactly what a signed-out visitor
   * looks like. Signing out had the mirror image — the account was cleared
   * synchronously, so the landing arrived in the same frame as the click.
   */
  const [authBusy, setAuthBusy] = useState(false);
  const [bankReady, setBankReady] = useState(false);
  const [account, setAccount] = useState<Account | null>(null);
  const [data, setData] = useState<UserData>(EMPTY_USER_DATA);
  const [custom, setCustom] = useState<Question[]>([]);
  /** Read from localStorage after mount, like every other stored preference. */
  const [localDrafts, setLocalDrafts] = useState<Question[]>([]);
  /**
   * Seeded from what the boot script already decided, not from a guess.
   *
   * Starting at "light" meant the apply-effect below wrote `data-theme="light"`
   * on mount — over the top of the dark the boot script had correctly stamped —
   * and only corrected it a render later. That is a visible flash to the wrong
   * palette on every load for anyone whose theme is dark, and it made the
   * toggle look like it had not taken. Reading the attribute is the same source
   * the script wrote, so the first render agrees with the first paint.
   */
  const [theme, setTheme] = useState<"light" | "dark">(() => {
    if (typeof document === "undefined") return "light";
    return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
  });

  /*
   * Releases the pre-paint boot screen.
   *
   * The boot script stamps `data-session="restoring"` when it finds a Supabase
   * token, and CSS shows the loading screen instead of the landing for as long
   * as it is there. Only this knows when the question has actually been
   * answered — including the case the script cannot judge, a token that has
   * expired, where the honest outcome is the landing after a brief wait.
   */
  useEffect(() => {
    if (ready) delete document.documentElement.dataset.session;
  }, [ready]);

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
      avatarUrl: p.avatarUrl ?? "",
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
    // Unlike the custom bank, these are never refetched or replaced — this read
    // is the only place they come from.
    setLocalDrafts(loadLocalDrafts());

    const applied = document.documentElement.dataset.theme;
    setTheme(loadTheme() ?? (applied === "dark" ? "dark" : "light"));

    const client = supabase();
    if (!client) {
      setBankReady(true);
      setReady(true);
      return;
    }

    async function adopt(hasSession: boolean) {
      setBankReady(false);
      setAuthBusy(true);
      const profile = hasSession ? await loadProfile() : null;
      if (!live) return;

      setAccount(profile);
      if (!profile) {
        setData(EMPTY_USER_DATA);
        setBankReady(true);
        setReady(true);
        setAuthBusy(false);
        return;
      }

      // Render the cached history immediately, then reconcile with the server.
      // Waiting for the network before first paint would make every sign-in
      // feel slow for no benefit.
      const cached = loadUserData(profile.id);
      setData(cached);
      setReady(true);
      // Cleared here, not after the reconciliation below: the student can be
      // shown their dashboard as soon as it can be drawn, and the rest of this
      // function only sharpens what is already on screen.
      setAuthBusy(false);

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
      } finally {
        if (live) setBankReady(true);
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

  /*
   * Seed, database, then whatever is being tried out here.
   *
   * Local drafts join the bank rather than sitting in a preview pane, because
   * the questions worth testing are exactly the ones a card cannot answer for:
   * whether a generated chart survives a phone-width column, whether a passage
   * is too long once the timer is running, whether four choices fit. Last in the
   * list, so an id collision with a real question resolves to the real one.
   */
  const bank = useMemo(
    () => [...SEED_QUESTIONS, ...custom, ...localDrafts],
    [custom, localDrafts],
  );

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
    setAuthBusy(true);
    setAccount(null);
    setData(EMPTY_USER_DATA);
    // The auth event normally ends the busy state through adopt(). This is the
    // backstop for the case where it never arrives — a failed network call
    // must not leave the app showing a loader with nothing behind it.
    void signOutEverywhere().finally(() => setAuthBusy(false));
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
          avatarUrl: patch.avatarUrl,
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

  /* ---------------- local AI drafts ---------------- */

  const persistLocalDrafts = useCallback((next: Question[]) => {
    setLocalDrafts(next);
    saveLocalDrafts(next);
  }, []);

  /**
   * Park a generated draft in this browser's bank and nowhere else.
   *
   * Given its own id namespace so it can never be mistaken for a database row,
   * and stamped `local` so every surface that renders it can say what it is.
   */
  const keepLocally = useCallback<Ctx["keepLocally"]>(
    (question) => {
      const draft: Question = {
        ...question,
        id: `local-${crypto.randomUUID()}`,
        custom: true,
        local: true,
        createdAt: question.createdAt ?? Date.now(),
      };
      setLocalDrafts((previous) => {
        const next = [...previous, draft];
        saveLocalDrafts(next);
        return next;
      });
    },
    [],
  );

  const dropLocalDraft = useCallback<Ctx["dropLocalDraft"]>((id) => {
    setLocalDrafts((previous) => {
      const next = previous.filter((question) => question.id !== id);
      saveLocalDrafts(next);
      return next;
    });
  }, []);

  const clearLocalDrafts = useCallback(() => persistLocalDrafts([]), [persistLocalDrafts]);

  /** Pulls the shared bank back from the database and replaces the cache. */
  const refreshBank = useCallback(async () => {
    const response = await apiFetch("/api/questions");
    if (!response.ok) return;
    const body = (await response.json()) as { questions: Question[] };
    setCustom(body.questions);
    saveCustomQuestions(body.questions);
  }, []);

  const saveQuestion = useCallback<Ctx["saveQuestion"]>(
    async (question) => {
      const incomingId = String(question.id ?? "").trim();
      /*
       * A new question needs a local identity before the server gives it a real
       * one. It used to be held under a blank id, and that was the bug: two
       * unsaved questions both keyed on "" meant the second one replaced the
       * first in the list — the editor appeared to lose a question even though
       * both were safely in the database.
       *
       * The server treats any id it does not recognise as new, so a temporary
       * one costs nothing and is unique per save.
       */
      const localId = incomingId || `new-${crypto.randomUUID()}`;

      const previous = custom.find((q) => q.id === localId);
      // Provenance is the database's to assign, but stamping it optimistically
      // means a question the admin just saved shows an author and a time
      // straight away instead of blanks until the next reload. An edit keeps
      // whatever the original author and time were.
      const marked = {
        ...question,
        id: localId,
        custom: true,
        authorEmail: previous?.authorEmail ?? question.authorEmail ?? account?.email,
        createdAt: previous?.createdAt ?? question.createdAt ?? Date.now(),
      };
      const exists = previous !== undefined;
      persistCustom(
        exists ? custom.map((q) => (q.id === marked.id ? marked : q)) : [...custom, marked],
      );

      const response = await apiFetch("/api/questions", {
        method: "POST",
        body: JSON.stringify({ questions: [marked] }),
      });

      if (!response.ok) {
        // Drop the optimistic copy: leaving it would show the author a question
        // the database refused, and the next save would try again under a
        // different temporary id and create a duplicate.
        if (!incomingId) {
          setCustom((current) => {
            const next = current.filter((q) => q.id !== localId);
            saveCustomQuestions(next);
            return next;
          });
        }
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        return { ok: false as const, error: body.error ?? "Could not save the question." };
      }

      // Re-read rather than reconcile. The server owns the numbering, the
      // authorship and the timestamps, and every attempt to mirror that in the
      // client has cost a question so far.
      await refreshBank();
      return { ok: true as const };
    },
    [account?.email, custom, persistCustom, refreshBank],
  );

  /**
   * Removes a set of questions in one go.
   *
   * Deleting in a loop over `deleteQuestion` would not work: each call filters
   * the same captured `custom` array, so the last write puts back everything the
   * earlier ones removed and only one question actually disappears locally.
   */
  const deleteQuestions = useCallback<Ctx["deleteQuestions"]>(
    (ids) => {
      const doomed = new Set(ids);
      if (doomed.size === 0) return;
      persistCustom(custom.filter((q) => !doomed.has(q.id)));
      for (const id of doomed) {
        void apiFetch(`/api/questions?id=${encodeURIComponent(id)}`, { method: "DELETE" });
      }
    },
    [custom, persistCustom],
  );

  const deleteQuestion = useCallback<Ctx["deleteQuestion"]>(
    (id) => deleteQuestions([id]),
    [deleteQuestions],
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
    authBusy,
    bankReady,
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
    deleteQuestions,
    replaceCustomQuestions: replaceCustom,
    localDrafts,
    keepLocally,
    dropLocalDraft,
    clearLocalDrafts,
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
