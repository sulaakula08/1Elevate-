import type { Difficulty, ExamId, Question } from "@/data/types";

export const SCHEMA_VERSION = 1;

export type Role = "student" | "admin";

export type Account = {
  id: string;
  /** Display name, also used as the login handle. Matched case-insensitively. */
  name: string;
  /** Collected at signup so the profile feels real; also accepted at login. */
  email: string;
  /** Free text: school grade, university year, "graduate", … */
  grade: string;
  pinHash: string;
  role: Role;
  createdAt: number;
  /** Score the student is aiming for, on the 400–1600 scale. */
  targetScore: number;
};

export type QuizMode = "practice" | "mock" | "review";

export type Attempt = {
  questionId: string;
  subjectId: string;
  exam: ExamId;
  topic: string;
  /** 1–3. Optional because attempts recorded before this field existed lack it. */
  difficulty?: Difficulty;
  chosen: number;
  correct: boolean;
  mode: QuizMode;
  /** Epoch ms. */
  at: number;
  /** Time spent on the question, ms. */
  ms: number;
};

export type MockSectionResult = {
  subjectId: string;
  correct: number;
  total: number;
};

export type MockResult = {
  id: string;
  exam: ExamId;
  at: number;
  sections: MockSectionResult[];
  correct: number;
  total: number;
  /** SAT: 400–1600. ЕНТ: points on the 140-point scale. */
  score: number;
  /** Question ids answered incorrectly, for the review queue. */
  wrong: string[];
};

export type UserData = {
  attempts: Attempt[];
  mocks: MockResult[];
};

export const EMPTY_USER_DATA: UserData = { attempts: [], mocks: [] };

/** Storage namespace. `allprep.*` was the pre-rename prefix — see migrateKeys. */
const NS = "elevate";
const LEGACY_NS = "allprep";

const K = {
  version: `${NS}.version`,
  accounts: `${NS}.accounts`,
  session: `${NS}.session`,
  custom: `${NS}.customQuestions`,
  theme: `${NS}.theme`,
  tour: `${NS}.tourDone`,
  user: (id: string) => `${NS}.user.${id}`,
};

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    return raw === null ? fallback : (JSON.parse(raw) as T);
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode) — the app keeps working in memory.
  }
}

/**
 * Copies data written under the old `allprep.*` prefix to the current one, so a
 * student who used the app before the rename keeps their profile and progress.
 * Runs once: the legacy keys are removed after a successful copy.
 */
export function migrateKeys() {
  if (typeof window === "undefined") return;
  try {
    const legacy = Object.keys(window.localStorage).filter((k) =>
      k.startsWith(`${LEGACY_NS}.`),
    );
    if (legacy.length === 0) return;
    for (const oldKey of legacy) {
      const newKey = `${NS}.${oldKey.slice(LEGACY_NS.length + 1)}`;
      // Never overwrite data already written under the new prefix.
      if (window.localStorage.getItem(newKey) === null) {
        const value = window.localStorage.getItem(oldKey);
        if (value !== null) window.localStorage.setItem(newKey, value);
      }
      window.localStorage.removeItem(oldKey);
    }
  } catch {
    // Storage unavailable — nothing to migrate, and the app still works.
  }
}

export function ensureVersion() {
  if (typeof window === "undefined") return;
  const v = read<number>(K.version, 0);
  if (v !== SCHEMA_VERSION) write(K.version, SCHEMA_VERSION);
}

/* ---------------- accounts ---------------- */

export function loadAccounts(): Account[] {
  // Fill in fields added after an account was first written, so profiles made
  // by an older build keep working. Profiles created when the app also covered
  // ЕНТ may carry a non-SAT target score; clamp those onto the SAT scale.
  const stored = read<Account[]>(K.accounts, []);
  const normalised = stored.map((account) => {
    const target = account.targetScore ?? 1400;
    return {
      ...account,
      email: account.email ?? "",
      grade: account.grade ?? "",
      targetScore: target >= 400 && target <= 1600 ? target : 1400,
    };
  });
  // Write the normalisation back so storage and the UI never disagree.
  if (JSON.stringify(normalised) !== JSON.stringify(stored)) write(K.accounts, normalised);
  return normalised;
}

export function saveAccounts(accounts: Account[]) {
  write(K.accounts, accounts);
}

export function loadSession(): string | null {
  return read<string | null>(K.session, null);
}

export function saveSession(accountId: string | null) {
  write(K.session, accountId);
}

/** SHA-256 of the PIN. Obfuscation for a local build, not real auth. */
export async function hashPin(pin: string): Promise<string> {
  const bytes = new TextEncoder().encode(`allprep:${pin}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/* ---------------- per-user data ---------------- */

export function loadUserData(accountId: string): UserData {
  const data = read<UserData>(K.user(accountId), EMPTY_USER_DATA);
  return { attempts: data.attempts ?? [], mocks: data.mocks ?? [] };
}

export function saveUserData(accountId: string, data: UserData) {
  write(K.user(accountId), data);
}

/* ---------------- custom questions (shared bank) ---------------- */

export function loadCustomQuestions(): Question[] {
  return read<Question[]>(K.custom, []);
}

export function saveCustomQuestions(questions: Question[]) {
  write(K.custom, questions);
}

/* ---------------- theme ---------------- */

export function loadTheme(): "light" | "dark" | null {
  return read<"light" | "dark" | null>(K.theme, null);
}

export function saveTheme(theme: "light" | "dark") {
  write(K.theme, theme);
}

/* ---------------- product tour ---------------- */

export function loadTourDone(): boolean {
  return read<boolean>(K.tour, false);
}

export function saveTourDone(done: boolean) {
  write(K.tour, done);
}

/* ---------------- reset ---------------- */

export function resetEverything() {
  if (typeof window === "undefined") return;
  const doomed = Object.keys(window.localStorage).filter(
    (k) => k.startsWith(`${NS}.`) || k.startsWith(`${LEGACY_NS}.`),
  );
  doomed.forEach((k) => window.localStorage.removeItem(k));
}

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}
