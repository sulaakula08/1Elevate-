import { NextResponse } from "next/server";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The moderation queue: what students have reported, and what an admin does
 * about it.
 *
 * Authorisation is the database's, exactly as everywhere else in this app, and
 * that is worth stating precisely because "admin only" is easy to implement in
 * the wrong place. There is no role check in this file. Instead:
 *
 *   * GET relies on the read policy on community_reports. A student may read
 *     their own reports and nobody else's, so a student who calls this endpoint
 *     gets back only reports they filed themselves — not an error, but not other
 *     people's business either. The grouping below then has nothing to show them.
 *   * POST relies on moderate_hide() and moderate_dismiss(), which raise 42501
 *     unless is_admin() passes. A student calling POST is refused by Postgres,
 *     not by an `if` in this handler.
 *
 * So there is no second permission system here to drift out of step with the
 * first, and pointing a normal user's token at this route achieves nothing even
 * if the admin page that hides the panel were bypassed entirely.
 */

/** How many open targets the queue shows. A moderation backlog past this is a staffing problem. */
const QUEUE_LIMIT = 100;
/** Enough of the content to judge it by, without pasting an essay into the queue. */
const PREVIEW_CHARS = 400;

function notConfigured() {
  return NextResponse.json(
    { error: "Supabase is not configured. See DATABASE.md." },
    { status: 503 },
  );
}

function unauthorized() {
  return NextResponse.json({ error: "Sign in first." }, { status: 401 });
}

async function caller(request: Request) {
  const token = tokenFrom(request);
  if (!token) return null;
  const client = userClient(token);
  if (!client) return null;
  const { data, error } = await client.auth.getUser();
  if (error || !data.user) return null;
  return { client, user: data.user };
}

type ReportRow = {
  id: string;
  target_type: "post" | "comment";
  target_id: string;
  reason: string;
  details: string | null;
  status: string;
  created_at: string;
};

/** One row in the queue: a piece of content plus every report filed against it. */
export type ModerationItem = {
  targetType: "post" | "comment";
  targetId: string;
  /** The content itself, or null when it has already been deleted outright. */
  preview: string | null;
  authorName: string | null;
  authorId: string | null;
  /** Already hidden by an admin — the action on offer becomes "put it back". */
  hidden: boolean;
  /** Present for a comment, so an admin can see what it was replying to. */
  parentPreview?: string | null;
  reasons: string[];
  details: string[];
  reportCount: number;
  firstReportedAt: number;
  lastReportedAt: number;
  status: "open" | "resolved";
};

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();
  const { client } = found;

  const showResolved = new URL(request.url).searchParams.get("status") === "all";

  let query = client
    .from("community_reports")
    .select("id, target_type, target_id, reason, details, status, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  if (!showResolved) query = query.eq("status", "open");

  const { data: reportRows, error } = await query;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[moderation]", error);
    return NextResponse.json({ error: "Could not load the queue." }, { status: 502 });
  }

  const reports = (reportRows ?? []) as ReportRow[];
  if (reports.length === 0) return NextResponse.json({ items: [] });

  /*
   * Grouped by target, not listed by report.
   *
   * Five people reporting one post is one decision for an admin, not five. A
   * flat list of reports would make them act on the same content five times and
   * would bury a single serious report under a pile of duplicates of something
   * trivial — and how many people reported a thing is the signal, so it is
   * surfaced as a count on the one row.
   */
  const groups = new Map<string, ReportRow[]>();
  for (const row of reports) {
    const key = `${row.target_type}:${row.target_id}`;
    const list = groups.get(key) ?? [];
    list.push(row);
    groups.set(key, list);
  }

  const postIds = reports.filter((r) => r.target_type === "post").map((r) => r.target_id);
  const commentIds = reports.filter((r) => r.target_type === "comment").map((r) => r.target_id);

  /*
   * The reported content itself. An admin reads these through the same policies
   * as everyone else, which is why hidden rows come back at all: the read policy
   * on both tables is `hidden_at is null or is_admin()`. A student who somehow
   * reached this endpoint would get nulls here and nothing to act on.
   */
  const [postsRes, commentsRes] = await Promise.all([
    postIds.length > 0
      ? client
          .from("community_posts")
          .select("id, author_id, type, text, payload, hidden_at")
          .in("id", [...new Set(postIds)])
      : Promise.resolve({ data: [] }),
    commentIds.length > 0
      ? client
          .from("community_comments")
          .select("id, author_id, text, post_id, hidden_at")
          .in("id", [...new Set(commentIds)])
      : Promise.resolve({ data: [] }),
  ]);

  type PostRow = {
    id: string;
    author_id: string;
    type: string;
    text: string | null;
    payload: Record<string, unknown> | null;
    hidden_at: string | null;
  };
  type CommentRow = {
    id: string;
    author_id: string;
    text: string;
    post_id: string;
    hidden_at: string | null;
  };

  const posts = new Map(((postsRes.data ?? []) as PostRow[]).map((p) => [p.id, p]));
  const comments = new Map(((commentsRes.data ?? []) as CommentRow[]).map((c) => [c.id, c]));

  // The post a reported comment sits under, for context. Only the ones not
  // already fetched above.
  const parentIds = [
    ...new Set(
      [...comments.values()].map((c) => c.post_id).filter((id) => !posts.has(id)),
    ),
  ];
  const parents = new Map<string, string>();
  if (parentIds.length > 0) {
    const { data } = await client
      .from("community_posts")
      .select("id, text, payload")
      .in("id", parentIds);
    for (const row of (data ?? []) as { id: string; text: string | null; payload: Record<string, unknown> | null }[]) {
      parents.set(row.id, textOf(row.text, row.payload));
    }
  }

  const authorIds = [
    ...new Set([
      ...[...posts.values()].map((p) => p.author_id),
      ...[...comments.values()].map((c) => c.author_id),
    ]),
  ];
  const names = new Map<string, string>();
  if (authorIds.length > 0) {
    const { data } = await client
      .from("public_profiles")
      .select("id, display_name")
      .in("id", authorIds);
    for (const row of (data ?? []) as { id: string; display_name: string }[]) {
      names.set(row.id, row.display_name);
    }
  }

  const items: ModerationItem[] = [];
  for (const [key, rows] of groups) {
    const [targetType, targetId] = key.split(":") as ["post" | "comment", string];
    const times = rows.map((r) => new Date(r.created_at).getTime());

    const post = targetType === "post" ? posts.get(targetId) : undefined;
    const comment = targetType === "comment" ? comments.get(targetId) : undefined;
    const content = post ?? comment;

    items.push({
      targetType,
      targetId,
      // Null when the author deleted it themselves after it was reported. The
      // queue still shows the row so the report can be closed rather than
      // sitting open forever against something that no longer exists.
      preview: content
        ? targetType === "post"
          ? textOf(post!.text, post!.payload)
          : comment!.text.slice(0, PREVIEW_CHARS)
        : null,
      authorId: content?.author_id ?? null,
      authorName: content ? (names.get(content.author_id) ?? null) : null,
      hidden: Boolean(content?.hidden_at),
      parentPreview: comment ? (parents.get(comment.post_id) ?? null) : undefined,
      reasons: [...new Set(rows.map((r) => r.reason))],
      details: rows.map((r) => r.details).filter((d): d is string => Boolean(d)),
      reportCount: rows.length,
      firstReportedAt: Math.min(...times),
      lastReportedAt: Math.max(...times),
      status: rows.some((r) => r.status === "open") ? "open" : "resolved",
    });
  }

  // Most-reported first, then most recent: the thing five people flagged an hour
  // ago is what an admin should be looking at.
  items.sort(
    (a, b) => b.reportCount - a.reportCount || b.lastReportedAt - a.lastReportedAt,
  );

  return NextResponse.json({ items: items.slice(0, QUEUE_LIMIT) });
}

/** The words of a post, whatever type it is, trimmed to a preview. */
function textOf(text: string | null, payload: Record<string, unknown> | null): string {
  if (text?.trim()) return text.trim().slice(0, PREVIEW_CHARS);

  // A structured post keeps its words in the payload. Pulled out by hand rather
  // than JSON.stringify'd, so an admin reads a sentence and not a blob.
  const block = payload ?? {};
  const candidates = [
    (block.question as { prompt?: string } | undefined)?.prompt,
    (block.explanation as { title?: string } | undefined)?.title,
    (block.achievement as { title?: string } | undefined)?.title,
    (block.resource as { title?: string } | undefined)?.title,
  ];
  const first = candidates.find((c) => typeof c === "string" && c.trim());
  return first ? first.trim().slice(0, PREVIEW_CHARS) : "—";
}

/**
 * Act on a target: hide it, put it back, or decide there was nothing wrong.
 *
 * Both branches go through a SECURITY DEFINER function that checks is_admin()
 * before it writes, and that check is the authorisation for this endpoint. It
 * also settles the target's open reports in the same statement, so the queue
 * cannot end up holding open reports against content that is already hidden.
 */
export async function POST(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  let body: { action?: unknown; targetType?: unknown; targetId?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body.action ?? "");
  const targetType = String(body.targetType ?? "");
  const targetId = String(body.targetId ?? "");

  if (targetType !== "post" && targetType !== "comment") {
    return NextResponse.json({ error: "Post or comment?" }, { status: 400 });
  }
  if (!targetId) {
    return NextResponse.json({ error: "Which one?" }, { status: 400 });
  }

  const rpc =
    action === "dismiss"
      ? found.client.rpc("moderate_dismiss", {
          p_target_type: targetType,
          p_target_id: targetId,
        })
      : action === "hide" || action === "unhide"
        ? found.client.rpc("moderate_hide", {
            p_target_type: targetType,
            p_target_id: targetId,
            p_hidden: action === "hide",
          })
        : null;

  if (!rpc) return NextResponse.json({ error: "Unknown action." }, { status: 400 });

  const { error } = await rpc;

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[moderation]", error);
    // The function raises 42501 for a caller who is not an admin. Passed through
    // as 403 rather than 502, because it is an answer and not a fault.
    if (error.code === "42501") {
      return NextResponse.json({ error: "Only an admin can do that." }, { status: 403 });
    }
    if (error.code === "P0002") {
      return NextResponse.json({ error: "That content no longer exists." }, { status: 404 });
    }
    return NextResponse.json({ error: "Could not apply that." }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
