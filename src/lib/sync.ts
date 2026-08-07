"use client";

import type { Attempt, MockResult, UserData } from "./storage";
import { apiFetch } from "./supabase/client";

/**
 * Keeps practice history in step between this browser and Supabase.
 *
 * The design is offline-first and additive:
 *
 *   - localStorage stays the render source, so the dashboard paints instantly
 *     and the app keeps working with no network.
 *   - Every write goes to the local cache first and is then pushed. A failed
 *     push is queued, not lost, and retried on the next load or when the
 *     browser comes back online.
 *   - Sign-in merges both sides rather than letting either win. A student who
 *     practised offline on a laptop and then signs in on a phone ends up with
 *     the union, never with one device silently overwriting the other.
 *
 * Nothing here deletes. Attempts are append-only and mocks are keyed by id, so
 * the worst outcome of a bug is a repeated push, which the upsert absorbs.
 */

/* ---------------- identity ---------------- */

/**
 * Attempts have no id — the table uses a bigserial the client never sees — so
 * dedup needs a natural key. Question, timestamp and mode together are unique
 * in practice: the same question cannot be answered twice in the same
 * millisecond in the same mode.
 */
export function attemptKey(a: Attempt): string {
  return `${a.questionId}|${a.at}|${a.mode}`;
}

function dedupeAttempts(list: Attempt[]): Attempt[] {
  const seen = new Set<string>();
  const out: Attempt[] = [];
  for (const attempt of list) {
    const key = attemptKey(attempt);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(attempt);
  }
  return out;
}

function dedupeMocks(list: MockResult[]): MockResult[] {
  const byId = new Map<string, MockResult>();
  for (const mock of list) byId.set(mock.id, mock);
  return [...byId.values()];
}

/* ---------------- the outbox ---------------- */

/**
 * Rows written while offline, or whose push failed. Kept per account so signing
 * into a different account on a shared browser cannot flush someone else's
 * unsent work into the wrong history.
 */
type Outbox = { attempts: Attempt[]; mocks: MockResult[] };

const OUTBOX_KEY = (accountId: string) => `elevate.outbox.${accountId}`;
const EMPTY_OUTBOX: Outbox = { attempts: [], mocks: [] };

function readOutbox(accountId: string): Outbox {
  try {
    const raw = window.localStorage.getItem(OUTBOX_KEY(accountId));
    if (!raw) return EMPTY_OUTBOX;
    const parsed = JSON.parse(raw) as Partial<Outbox>;
    return { attempts: parsed.attempts ?? [], mocks: parsed.mocks ?? [] };
  } catch {
    return EMPTY_OUTBOX;
  }
}

function writeOutbox(accountId: string, outbox: Outbox) {
  try {
    if (outbox.attempts.length === 0 && outbox.mocks.length === 0) {
      window.localStorage.removeItem(OUTBOX_KEY(accountId));
      return;
    }
    window.localStorage.setItem(OUTBOX_KEY(accountId), JSON.stringify(outbox));
  } catch {
    // Storage full or blocked. The rows stay in the in-memory cache and will be
    // picked up by the next full merge instead.
  }
}

export function clearOutbox(accountId: string) {
  writeOutbox(accountId, EMPTY_OUTBOX);
}

/* ---------------- pushing ---------------- */

/** POST limits from the route handlers. */
const ATTEMPT_BATCH = 100;
const MOCK_BATCH = 50;

function chunk<T>(list: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

async function postAttempts(attempts: Attempt[]): Promise<boolean> {
  for (const batch of chunk(attempts, ATTEMPT_BATCH)) {
    const response = await apiFetch("/api/attempts", {
      method: "POST",
      body: JSON.stringify({ attempts: batch }),
    });
    if (!response.ok) return false;
  }
  return true;
}

async function postMocks(mocks: MockResult[]): Promise<boolean> {
  for (const batch of chunk(mocks, MOCK_BATCH)) {
    const response = await apiFetch("/api/mocks", {
      method: "POST",
      body: JSON.stringify({ mocks: batch }),
    });
    if (!response.ok) return false;
  }
  return true;
}

/**
 * Sends new rows, queueing whatever fails.
 *
 * Deliberately not awaited by the UI: recording an answer must never block on
 * the network. Returns once the attempt has been made either way.
 */
export async function push(
  accountId: string,
  incoming: { attempts?: Attempt[]; mocks?: MockResult[] },
): Promise<void> {
  if (typeof window === "undefined") return;

  const outbox = readOutbox(accountId);
  // Anything already queued goes with this send, so the queue drains as soon as
  // connectivity returns rather than only on a full reload.
  const attempts = dedupeAttempts([...outbox.attempts, ...(incoming.attempts ?? [])]);
  const mocks = dedupeMocks([...outbox.mocks, ...(incoming.mocks ?? [])]);

  if (attempts.length === 0 && mocks.length === 0) return;

  const attemptsOk = attempts.length === 0 || (await postAttempts(attempts));
  const mocksOk = mocks.length === 0 || (await postMocks(mocks));

  writeOutbox(accountId, {
    attempts: attemptsOk ? [] : attempts,
    mocks: mocksOk ? [] : mocks,
  });
}

/* ---------------- merging ---------------- */

export type MergeResult = {
  data: UserData;
  /** True when the server could not be reached; the caller keeps local data. */
  offline: boolean;
  /** How many local-only rows were uploaded, for the one-time migration notice. */
  uploaded: number;
};

/**
 * Reconciles this browser's cache with the account's server history.
 *
 * Runs on sign-in and on first load of an existing session. Local rows the
 * server does not have are uploaded — that is what migrates a student's
 * pre-Supabase practice history — and server rows this browser does not have
 * are adopted.
 */
export async function merge(accountId: string, local: UserData): Promise<MergeResult> {
  let remoteAttempts: Attempt[] = [];
  let remoteMocks: MockResult[] = [];

  try {
    const [aRes, mRes] = await Promise.all([
      apiFetch("/api/attempts"),
      apiFetch("/api/mocks"),
    ]);
    // 401 means the session went away mid-flight; 503 means Supabase is not
    // configured. Neither is a reason to discard what is already on the device.
    if (!aRes.ok || !mRes.ok) {
      return { data: local, offline: true, uploaded: 0 };
    }
    remoteAttempts = ((await aRes.json()) as { attempts: Attempt[] }).attempts ?? [];
    remoteMocks = ((await mRes.json()) as { mocks: MockResult[] }).mocks ?? [];
  } catch {
    return { data: local, offline: true, uploaded: 0 };
  }

  const remoteAttemptKeys = new Set(remoteAttempts.map(attemptKey));
  const remoteMockIds = new Set(remoteMocks.map((m) => m.id));

  const outbox = readOutbox(accountId);
  const localAttempts = dedupeAttempts([...local.attempts, ...outbox.attempts]);
  const localMocks = dedupeMocks([...local.mocks, ...outbox.mocks]);

  const missingAttempts = localAttempts.filter((a) => !remoteAttemptKeys.has(attemptKey(a)));
  const missingMocks = localMocks.filter((m) => !remoteMockIds.has(m.id));

  let uploaded = 0;
  if (missingAttempts.length > 0 || missingMocks.length > 0) {
    const attemptsOk =
      missingAttempts.length === 0 || (await postAttempts(missingAttempts));
    const mocksOk = missingMocks.length === 0 || (await postMocks(missingMocks));

    if (attemptsOk && mocksOk) {
      uploaded = missingAttempts.length + missingMocks.length;
      clearOutbox(accountId);
    } else {
      // Keep whatever did not make it for the next attempt.
      writeOutbox(accountId, {
        attempts: attemptsOk ? [] : missingAttempts,
        mocks: mocksOk ? [] : missingMocks,
      });
    }
  } else {
    clearOutbox(accountId);
  }

  // The union, newest first — the server copy of a row wins on ties only
  // because it is listed first, and the two are identical by construction.
  const attempts = dedupeAttempts([...remoteAttempts, ...localAttempts]).sort(
    (a, b) => a.at - b.at,
  );
  const mocks = dedupeMocks([...remoteMocks, ...localMocks]).sort((a, b) => a.at - b.at);

  return { data: { ...local, attempts, mocks }, offline: false, uploaded };
}
