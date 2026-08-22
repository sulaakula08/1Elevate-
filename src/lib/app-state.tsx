"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { SEED_QUESTIONS } from "@/data";
import type { ExamId, Question, QuestionIndexEntry } from "@/data/types";
import {
  type Account,
  type Attempt,
  type MockResult,
  type UserData,
  EMPTY_USER_DATA,
  ensureDataEpoch,
  ensureVersion,
  loadLocalDrafts,
  loadQuestionIndex,
  loadTheme,
  loadUserData,
  migrateKeys,
  purgeLegacyAccounts,
  resetEverything,
  saveLocalDrafts,
  saveQuestionIndex,
  saveTheme,
  saveUserData,
} from "./storage";
import {
  type Verdict,
  fetchAdminBank,
  fetchBodies,
  fetchIndex,
  grade,
  score,
  toIndexEntry,
} from "./questions/client";
import {
  type AuthOutcome,
  signInWithPassword,
  signOutEverywhere,
  signUpWithPassword,
} from "./auth";
import { adoptLegacySession, apiFetch, supabase, supabaseReady } from "./supabase/client";
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
  /**
   * The whole bank, as taxonomy only — id, subject, topic, domain, skill,
   * difficulty. No prompt, no passage, no choices, no answer, no explanation.
   *
   * This is the shape every screen that reasons about the bank in aggregate
   * actually wants: the practice browser and its filters, the review queue, the
   * progress charts, mock assembly. It used to be the entire bank in full, held
   * in this context and mirrored into localStorage, which meant a student's tab
   * contained the product. Content is now fetched for the handful of questions on
   * screen — see `loadQuestions` — and answers only in exchange for a submitted
   * choice, through `checkAnswer`.
   */
  bank: QuestionIndexEntry[];
  /**
   * Question content the client has been given, by id.
   *
   * An entry appears once `loadQuestions` has fetched it, and gains its `answer`
   * and `explanation` only once `checkAnswer` has graded it. Reading a question
   * out of here and finding no `answer` is the normal state, not a bug.
   */
  questions: Record<string, Question>;
  /** Fetch content for these ids, in pages the server will accept. Idempotent. */
  loadQuestions: (ids: string[]) => Promise<void>;
  /**
   * Submit a choice for grading and merge the revealed answer and explanation
   * into `questions`. -1 means "reveal it, I give up". Null means the check
   * failed and the caller must not pretend it was answered.
   */
  checkAnswer: (questionId: string, choice: number) => Promise<Verdict | null>;
  /**
   * Tally a batch of choices without revealing anything — the mock's path.
   * Returns id → correct; an id the server could not grade is absent.
   */
  scoreAnswers: (
    submissions: { id: string; choice: number }[],
  ) => Promise<Record<string, boolean>>;
  /** Whole rows for the editor. Refused by the database for anyone but staff. */
  loadAdminBank: () => Promise<Question[] | null>;
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
  /** The shared bank's taxonomy, from the server. Never its content. */
  const [custom, setCustom] = useState<QuestionIndexEntry[]>([]);
  /** Read from localStorage after mount, like every other stored preference. */
  const [localDrafts, setLocalDrafts] = useState<Question[]>([]);
  /**
   * Content for the questions this browser has actually been shown.
   *
   * Kept as one flat map rather than per-session lists because the same question
   * is reached from three places — practice, review and a mock — and fetching it
   * again on each would spend a rate-limited request to learn something already
   * in memory. It is deliberately not persisted: this is where the product's
   * content lives while it is on screen, and it should not outlive the tab.
   */
  const [fetched, setQuestions] = useState<Record<string, Question>>({});
  /**
   * Ids already fetched or in flight, so two components mounting at once — the
   * practice runner and its question navigator, say — do not each ask for the
   * same page. A ref rather than state: nothing renders from it, and it has to be
   * correct synchronously between two calls in the same tick.
   */
  const inFlight = useRef<Set<string>>(new Set());
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
   * Loads the profile behind the current Supabase session.
   *
   * The outcome distinguishes "not signed in" from "could not ask", and that
   * distinction is the whole point of the type. Both used to come back as null,
   * so a profile request that failed for any reason — the database asleep on a
   * free plan, a dropped connection, a deploy mid-request — signed the student
   * out of a session that was still perfectly valid. They saw the login screen
   * and reasonably concluded the app forgets them.
   */
  const loadProfile = useCallback(async (): Promise<
    { ok: true; account: Account } | { ok: false; signedOut: boolean }
  > => {
    let response: Response;
    try {
      response = await apiFetch("/api/profile");
    } catch {
      return { ok: false, signedOut: false };
    }
    if (!response.ok) {
      // 401 is the server saying this token is nobody. Anything else — 5xx,
      // 503 when Supabase is unconfigured — is the server failing to answer.
      return { ok: false, signedOut: response.status === 401 };
    }
    const body = (await response.json()) as ProfileResponse;
    const p = body.profile;
    return {
      ok: true,
      account: {
        id: p.id,
        name: p.name?.trim() || (p.email ?? "").split("@")[0] || "Student",
        email: p.email ?? "",
        grade: p.grade ?? "",
        role: p.role,
        createdAt: Date.now(),
        targetScore: p.targetScore,
        avatarUrl: p.avatarUrl ?? "",
      },
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
    setCustom(loadQuestionIndex());
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

    async function adopt(user: { id: string; email?: string; metaName?: string } | null) {
      setBankReady(false);
      setAuthBusy(true);
      const loaded = user ? await loadProfile() : ({ ok: false, signedOut: true } as const);
      if (!live) return;

      let profile: Account | null = null;
      if (loaded.ok) {
        profile = loaded.account;
      } else if (user && !loaded.signedOut) {
        /*
         * The session is good but the profile could not be fetched. Rather than
         * throw the student back to the login screen, carry on from what the
         * session itself already says. A reload, or the next auth event, picks
         * up the real row.
         *
         * Role falls back to student: the admin surfaces are the one thing that
         * must not be guessed generously, and every one of them is enforced by
         * the server anyway, so the worst case here is an admin who has to
         * reload before the admin link appears.
         */
        profile = {
          id: user.id,
          name: user.metaName?.trim() || (user.email ?? "").split("@")[0] || "Student",
          email: user.email ?? "",
          grade: "",
          role: "student",
          createdAt: Date.now(),
          targetScore: 1400,
          avatarUrl: "",
        };
      }

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

      // The shared bank's taxonomy — not its content, which is fetched per
      // screen. The database is the record here, not a merge target: an admin
      // deleting a question must remove it for everyone, so a successful fetch
      // replaces the local cache outright.
      try {
        const entries = await fetchIndex();
        if (!live || !entries) return;
        setCustom(entries);
        saveQuestionIndex(entries);
      } catch {
        // Offline: the cached index stays in use.
      } finally {
        if (live) setBankReady(true);
      }
    }

    /** What adopt() needs from a session, so the two callers agree on it. */
    const identify = (session: { user: { id: string; email?: string; user_metadata?: Record<string, unknown> } } | null) =>
      session
        ? {
            id: session.user.id,
            email: session.user.email,
            metaName:
              typeof session.user.user_metadata?.name === "string"
                ? (session.user.user_metadata.name as string)
                : undefined,
          }
        : null;

    // A session left in localStorage by the pre-cookie build is moved into the
    // cookie first, so the check below finds it instead of concluding that a
    // signed-in student is a stranger.
    void adoptLegacySession()
      .then(() => client.auth.getSession())
      .then(({ data: s }) => adopt(identify(s.session)));

    // Covers sign-in, sign-out, token refresh and the recovery link landing —
    // including sign-out performed in another tab.
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (!live) return;
      if (event === "TOKEN_REFRESHED") return;
      void adopt(identify(session));
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
    () => [
      ...SEED_QUESTIONS.map(toIndexEntry),
      ...custom,
      ...localDrafts.map(toIndexEntry),
    ],
    [custom, localDrafts],
  );

  /*
   * Local drafts are already whole, so they are laid over the fetched content
   * rather than fetched.
   *
   * They never went to the database and never will, so there is nothing to fetch
   * them from — without this an admin trying a generated draft in practice would
   * meet an empty prompt. They carry their own `answer` and `explanation` too,
   * which is correct: the point of a draft is to read it end to end before
   * deciding whether the bank should have it.
   *
   * Derived, not synchronised into state by an effect. An effect would be a second
   * copy of the same facts and a render to keep it in step, and there is nothing
   * here that React cannot compute from what it already has.
   */
  const questions = useMemo(() => {
    if (localDrafts.length === 0) return fetched;
    const merged = { ...fetched };
    for (const draft of localDrafts) merged[draft.id] = draft;
    return merged;
  }, [fetched, localDrafts]);

  /**
   * Fetch content for these ids, skipping anything already held or on its way.
   *
   * Callers ask freely and often — a runner asks on every navigation — so the
   * cheap path has to be doing nothing at all, and it is: an id already in the
   * map costs a set lookup.
   */
  const loadQuestions = useCallback<Ctx["loadQuestions"]>(async (ids) => {
    const wanted = ids.filter(
      (id) =>
        id &&
        // Local drafts live in this browser and nowhere else — see `keepLocally`,
        // which gives them their own id namespace precisely so they can be told
        // apart from database rows. Asking the server for one is a wasted request
        // that can only ever come back empty.
        !id.startsWith("local-") &&
        !inFlight.current.has(id),
    );
    if (wanted.length === 0) return;
    for (const id of wanted) inFlight.current.add(id);

    const fetched = await fetchBodies(wanted);

    if (fetched.length > 0) {
      setQuestions((previous) => {
        const next = { ...previous };
        for (const question of fetched) next[question.id] = question;
        return next;
      });
    }
    /*
     * Ids the server did not return are released rather than left marked.
     * Otherwise one failed page — a rate limit, a dropped connection — would be
     * remembered as "already fetched" and the question would stay blank until
     * the tab was reloaded.
     */
    const arrived = new Set(fetched.map((question) => question.id));
    for (const id of wanted) if (!arrived.has(id)) inFlight.current.delete(id);
  }, []);

  /**
   * Grade one choice, and keep what the server revealed.
   *
   * The answer and the explanation are merged into the content map so that
   * everything downstream — the choice styling, the explanation panel, the tutor —
   * carries on reading them off the question, exactly as it did when they arrived
   * with it. The difference is when they arrive, not where they live.
   */
  const checkAnswer = useCallback<Ctx["checkAnswer"]>(async (questionId, choice) => {
    const verdict = await grade(questionId, choice);
    if (!verdict) return null;

    setQuestions((previous) => {
      const held = previous[questionId];
      if (!held) return previous;
      return {
        ...previous,
        [questionId]: {
          ...held,
          answer: verdict.answer,
          explanation: verdict.explanation ?? held.explanation,
        },
      };
    });
    return verdict;
  }, []);

  /** The mock's tally. Nothing is revealed and nothing is merged. */
  const scoreAnswers = useCallback<Ctx["scoreAnswers"]>(
    (submissions) => score(submissions),
    [],
  );

  const loadAdminBank = useCallback<Ctx["loadAdminBank"]>(() => fetchAdminBank(), []);

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
  const persistCustom = useCallback((next: QuestionIndexEntry[]) => {
    setCustom(next);
    saveQuestionIndex(next);
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

  /** Pulls the shared bank's taxonomy back from the database, replacing the cache. */
  const refreshBank = useCallback(async () => {
    const entries = await fetchIndex();
    if (!entries) return;
    setCustom(entries);
    saveQuestionIndex(entries);
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
      const marked: Question = {
        ...question,
        id: localId,
        custom: true,
        authorEmail: question.authorEmail ?? account?.email,
        createdAt: previous?.createdAt ?? question.createdAt ?? Date.now(),
      };
      const exists = previous !== undefined;
      const entry = toIndexEntry(marked);
      persistCustom(
        exists ? custom.map((q) => (q.id === entry.id ? entry : q)) : [...custom, entry],
      );
      /*
       * The author already has the whole question in front of them, so it goes
       * into the content map directly rather than being fetched back. Without
       * this, saving and then previewing would spend a request to be told what
       * the editor just typed.
       */
      setQuestions((current) => ({ ...current, [localId]: marked }));
      inFlight.current.add(localId);

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
            saveQuestionIndex(next);
            return next;
          });
          setQuestions((current) => {
            const next = { ...current };
            delete next[localId];
            return next;
          });
          inFlight.current.delete(localId);
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
      // Forget the content as well, or a deleted question stays readable in this
      // tab for as long as it is open.
      setQuestions((current) => {
        const next = { ...current };
        for (const id of doomed) delete next[id];
        return next;
      });
      for (const id of doomed) inFlight.current.delete(id);
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
    (incoming) => {
      const marked = incoming.map((q) => ({ ...q, custom: true }));
      persistCustom(marked.map(toIndexEntry));
      setQuestions((current) => {
        const next = { ...current };
        for (const question of marked) next[question.id] = question;
        return next;
      });
      for (const question of marked) inFlight.current.add(question.id);
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
    questions,
    loadQuestions,
    checkAnswer,
    scoreAnswers,
    loadAdminBank,
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
