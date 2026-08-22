import { NextResponse } from "next/server";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * What the product is actually being used for, for an admin.
 *
 * Counted in the database rather than fetched and counted here: every figure
 * below that is a total uses a HEAD request with an exact count, so the payload
 * stays a few hundred bytes however large the tables get. The two figures that
 * genuinely need rows — how many distinct people were active, and the signup
 * curve — read one narrow column over a bounded window.
 *
 * Reading other people's rows is exactly what the admin branch of the read
 * policies allows, so this route does not need service-role access. It does
 * refuse a student explicitly: the policies would return a list of one, and a
 * dashboard quietly reporting "1 user" to a student would be worse than an
 * error.
 */

const WEEK = 7 * 86_400_000;
const WINDOW_DAYS = 30;
/** A month of attempt timestamps is enough for activity, and bounds the read. */
const ACTIVITY_CAP = 20_000;

function notConfigured() {
  return NextResponse.json(
    { error: "Supabase is not configured. See DATABASE.md." },
    { status: 503 },
  );
}

function dayKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();

  const token = tokenFrom(request);
  if (!token) return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  const client = userClient(token);
  if (!client) return notConfigured();

  const { data: auth, error: authError } = await client.auth.getUser();
  if (authError || !auth.user) {
    return NextResponse.json({ error: "Sign in first." }, { status: 401 });
  }

  const { data: me } = await client
    .from("profiles")
    .select("role")
    .eq("id", auth.user.id)
    .maybeSingle();

  const role = (me as { role?: string } | null)?.role;
  if (role !== "admin" && role !== "owner") {
    return NextResponse.json({ error: "Admins only." }, { status: 403 });
  }

  const now = Date.now();
  const since = (ms: number) => new Date(now - ms).toISOString();

  /** One exact count, no rows. */
  const countOf = async (
    table: string,
    apply?: (q: ReturnType<typeof buildBase>) => ReturnType<typeof buildBase>,
  ): Promise<number> => {
    const base = buildBase(table);
    const { count, error } = await (apply ? apply(base) : base);
    if (error) {
      console.error(`[admin/stats] count(${table}) failed:`, error.message);
      return 0;
    }
    return count ?? 0;
  };

  // Bound to a local, so the closure does not have to re-prove that the client
  // survived the null check above.
  const db = client;

  /*
   * `id` rather than `*`: every counted table grants `authenticated` full
   * table-level SELECT except `custom_questions`, which since Phase B grants
   * only a fixed taxonomy column list — `*` there fails closed (count comes
   * back null, logged above, and countOf reports 0 rather than fabricate a
   * number). `id` is in that column list and exists on every table here, so
   * one exact-count column works for all of them without needing a
   * per-table override.
   */
  function buildBase(table: string) {
    return db.from(table).select("id", { count: "exact", head: true });
  }

  const [
    users,
    usersWeek,
    usersMonth,
    attempts,
    attemptsWeek,
    practice,
    review,
    mock,
    mocks,
    questions,
    feedbackTotal,
    feedbackOpen,
  ] = await Promise.all([
    countOf("profiles"),
    countOf("profiles", (q) => q.gte("created_at", since(WEEK))),
    countOf("profiles", (q) => q.gte("created_at", since(WEEK * 4))),
    countOf("attempts"),
    countOf("attempts", (q) => q.gte("at", since(WEEK))),
    countOf("attempts", (q) => q.eq("mode", "practice")),
    countOf("attempts", (q) => q.eq("mode", "review")),
    countOf("attempts", (q) => q.eq("mode", "mock")),
    countOf("mocks"),
    countOf("custom_questions"),
    countOf("feedback"),
    countOf("feedback", (q) => q.is("handled_at", null)),
  ]);

  /* ---------------- activity, per person and per day ---------------- */

  const { data: recent } = await client
    .from("attempts")
    .select("account_id, at")
    .gte("at", since(WINDOW_DAYS * 86_400_000))
    .order("at", { ascending: false })
    .limit(ACTIVITY_CAP);

  const rows = (recent ?? []) as { account_id: string; at: string }[];
  const activeWeek = new Set<string>();
  const activeMonth = new Set<string>();
  const perDay = new Map<string, number>();

  for (const row of rows) {
    const at = new Date(row.at).getTime();
    activeMonth.add(row.account_id);
    if (at >= now - WEEK) activeWeek.add(row.account_id);
    const key = dayKey(at);
    perDay.set(key, (perDay.get(key) ?? 0) + 1);
  }

  const days = Array.from({ length: 14 }, (_, i) => {
    const key = dayKey(now - (13 - i) * 86_400_000);
    return { day: key, count: perDay.get(key) ?? 0 };
  });

  /* ---------------- signups, per day ---------------- */

  const { data: signups } = await client
    .from("profiles")
    .select("created_at")
    .gte("created_at", since(WINDOW_DAYS * 86_400_000))
    .limit(5000);

  const signupPerDay = new Map<string, number>();
  for (const row of (signups ?? []) as { created_at: string }[]) {
    const key = dayKey(new Date(row.created_at).getTime());
    signupPerDay.set(key, (signupPerDay.get(key) ?? 0) + 1);
  }
  const joins = Array.from({ length: 14 }, (_, i) => {
    const key = dayKey(now - (13 - i) * 86_400_000);
    return { day: key, count: signupPerDay.get(key) ?? 0 };
  });

  /* ---------------- all of it, by month ----------------
     The fortnight charts answer "what is happening now"; this answers "what has
     happened since we started", which is a different question and the one an
     admin asks when deciding whether the product is growing. Three narrow
     column reads bucketed by calendar month — cheap, because none of them pulls
     a row body, and month buckets keep the payload to a couple of dozen entries
     however long the project runs. */

  const monthKey = (ms: number) => {
    const d = new Date(ms);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const [allAttempts, allMocks, allProfiles] = await Promise.all([
    db.from("attempts").select("at").order("at", { ascending: true }).limit(100_000),
    db.from("mocks").select("at").order("at", { ascending: true }).limit(20_000),
    db
      .from("profiles")
      .select("created_at")
      .order("created_at", { ascending: true })
      .limit(20_000),
  ]);

  const months = new Map<
    string,
    { month: string; answers: number; mocks: number; joins: number }
  >();
  const bump = (key: string, field: "answers" | "mocks" | "joins") => {
    const entry = months.get(key) ?? { month: key, answers: 0, mocks: 0, joins: 0 };
    entry[field] += 1;
    months.set(key, entry);
  };

  for (const row of (allAttempts.data ?? []) as { at: string }[]) {
    bump(monthKey(new Date(row.at).getTime()), "answers");
  }
  for (const row of (allMocks.data ?? []) as { at: string }[]) {
    bump(monthKey(new Date(row.at).getTime()), "mocks");
  }
  for (const row of (allProfiles.data ?? []) as { created_at: string }[]) {
    bump(monthKey(new Date(row.created_at).getTime()), "joins");
  }

  // Every month between the first record and now, including the empty ones: a
  // gap in the history is information, and a list that silently skips it reads
  // as continuous activity.
  const firstKeys = [...months.keys()].sort();
  const history: { month: string; answers: number; mocks: number; joins: number }[] = [];
  if (firstKeys.length > 0) {
    const [startYear, startMonth] = firstKeys[0].split("-").map(Number);
    const cursor = new Date(startYear, startMonth - 1, 1);
    const end = new Date();
    while (cursor <= end) {
      const key = monthKey(cursor.getTime());
      history.push(months.get(key) ?? { month: key, answers: 0, mocks: 0, joins: 0 });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  /* ---------------- roles, and how the bank was built ---------------- */

  const { data: roleRows } = await client.from("profiles").select("role").limit(5000);
  const roles = { student: 0, admin: 0, owner: 0 } as Record<string, number>;
  for (const row of (roleRows ?? []) as { role: string }[]) {
    if (row.role in roles) roles[row.role] += 1;
  }

  /*
   * Counted in the database, not here.
   *
   * This was `select created_by ... limit 5000`, deduplicated in TypeScript.
   * `created_by` is no longer selectable by a signed-in role — a student has no
   * business knowing who writes the bank — so that select now fails, and it fails
   * silently: the error was destructured away and the figure read zero.
   * `question_author_count` is the admin-gated doorway, and it is exact rather
   * than capped at the first five thousand rows.
   */
  const { data: authorCount } = await client.rpc("question_author_count");
  const authors = typeof authorCount === "number" ? authorCount : 0;

  return NextResponse.json({
    users: { total: users, week: usersWeek, month: usersMonth, roles },
    active: { week: activeWeek.size, month: activeMonth.size },
    usage: {
      attempts,
      attemptsWeek,
      byMode: { practice, review, mock },
      mocks,
      // Whether the sample is complete matters when reading the activity chart,
      // so the client is told rather than left to assume.
      capped: rows.length >= ACTIVITY_CAP,
    },
    bank: { questions, authors },
    feedback: { total: feedbackTotal, open: feedbackOpen },
    days,
    joins,
    history,
  });
}
