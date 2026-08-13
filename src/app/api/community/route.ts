import { NextResponse } from "next/server";
import type { CommunityPost, CommunityPostType } from "@/data/community";
import { supabaseConfigured, tokenFrom, userClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * The community feed.
 *
 * Authorship is taken from the access token and never from the request body, so
 * a post cannot be published under another student's name whatever the client
 * sends. Everything else — who may read, who may delete — is decided by the
 * policies in schema.sql rather than here.
 *
 * Author names come from the public_profiles view, not from profiles. The
 * profiles read policy correctly limits a student to their own row, which would
 * make every other name in the feed null; the view exposes id and display name
 * and nothing else. Names are fetched in one follow-up query rather than as an
 * embedded join, because PostgREST embedding through a view depends on
 * relationship detection that is easy to break and hard to notice.
 */

/* Mirrors the check constraint on community_posts.type. */
const POST_TYPES: CommunityPostType[] = [
  "post",
  "question",
  "progress",
  "achievement",
  "explanation",
  "study-update",
  "resource",
];

const FEED_LIMIT = 60;
const MAX_TEXT = 4000;

/* Mirrors the check constraint on community_reports.reason. */
const REPORT_REASONS = ["harassment", "spam", "inappropriate", "misinformation", "other"];
const MAX_DETAILS = 1000;

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

/** Stable avatar tone per author, so a person looks the same in every card. */
const TONES = ["indigo", "violet", "blue", "teal", "green", "amber", "rose", "cyan"];
function toneFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return TONES[hash % TONES.length];
}

type PostRow = {
  id: string;
  author_id: string;
  type: string;
  exam: string;
  topic: string | null;
  text: string | null;
  payload: Record<string, unknown> | null;
  created_at: string;
};

export async function GET(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();
  const { client, user } = found;

  /*
   * `is("hidden_at", null)` as well as the read policy, and not instead of it.
   *
   * The policy already hides moderated content from a student. It deliberately
   * does NOT hide it from an admin, because the moderation queue has to be able
   * to read what it is moderating — which would otherwise mean an admin, and
   * only an admin, kept seeing hidden posts in the ordinary feed. The filter here
   * is what makes the feed mean the same thing for everyone; the policy is what
   * makes it true even if this line is ever dropped.
   */
  const { data: postRows, error } = await client
    .from("community_posts")
    .select("id, author_id, type, exam, topic, text, payload, created_at")
    .is("hidden_at", null)
    .order("created_at", { ascending: false })
    .limit(FEED_LIMIT);

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[community]", error);
    return NextResponse.json({ error: "Could not load the feed." }, { status: 502 });
  }

  const posts = (postRows ?? []) as PostRow[];
  if (posts.length === 0) {
    /*
     * Still worth one query for the follow list. An empty feed does not imply an
     * empty follow list, and the Following tab tells those two apart to choose
     * its empty state: "you have not followed anyone" reads as a mistake when the
     * truth is that the people you follow simply have not posted.
     */
    const { data: follows } = await client
      .from("community_follows")
      .select("following_id")
      .eq("follower_id", user.id);
    return NextResponse.json({
      posts: [],
      reactions: {},
      saved: [],
      following: (follows ?? []).map((f) => f.following_id as string),
    });
  }

  const ids = posts.map((p) => p.id);

  // Reactions and comments for exactly these posts, plus the caller's own
  // saves. Four small queries beat one embedded select that silently returns
  // nulls the moment a relationship stops being detected.
  const [reactionsRes, commentsRes, savesRes, followsRes] = await Promise.all([
    client.from("community_reactions").select("post_id, account_id, kind").in("post_id", ids),
    client
      .from("community_comments")
      .select("id, post_id, author_id, text, created_at")
      .in("post_id", ids)
      .is("hidden_at", null)
      .order("created_at", { ascending: true }),
    client.from("community_saves").select("post_id").eq("account_id", user.id),
    /*
     * Who the caller follows. Every row the read policy will return is already
     * one of theirs, so the `eq` is belt-and-braces rather than the security —
     * but it also means this is the caller's whole follow list and not just the
     * authors on this page, which is what lets the client answer "am I following
     * this person?" for a post that arrives later without a second round trip.
     */
    client.from("community_follows").select("following_id").eq("follower_id", user.id),
  ]);

  const reactionRows = (reactionsRes.data ?? []) as {
    post_id: string;
    account_id: string;
    kind: "helpful" | "congrats";
  }[];
  const commentRows = (commentsRes.data ?? []) as {
    id: string;
    post_id: string;
    author_id: string;
    text: string;
    created_at: string;
  }[];

  // Every author on screen, in one lookup.
  const authorIds = [
    ...new Set([...posts.map((p) => p.author_id), ...commentRows.map((c) => c.author_id)]),
  ];
  const { data: profileRows } = await client
    .from("public_profiles")
    .select("id, display_name")
    .in("id", authorIds);

  const names = new Map((profileRows ?? []).map((p) => [p.id as string, p.display_name as string]));
  const authorFor = (id: string) => ({
    id,
    name: names.get(id) ?? "Student",
    colorSeed: toneFor(id),
  });

  const commentsByPost = new Map<string, CommunityPost["comments"]>();
  for (const row of commentRows) {
    const list = commentsByPost.get(row.post_id) ?? [];
    list.push({
      id: row.id,
      author: authorFor(row.author_id),
      text: row.text,
      createdAt: new Date(row.created_at).getTime(),
    });
    commentsByPost.set(row.post_id, list);
  }

  const counts = new Map<string, { helpful: number; congrats: number }>();
  /** Which reactions the caller has on, keyed the way the client store is. */
  const mine: Record<string, Partial<Record<"helpful" | "congrats", boolean>>> = {};
  for (const row of reactionRows) {
    const entry = counts.get(row.post_id) ?? { helpful: 0, congrats: 0 };
    entry[row.kind] += 1;
    counts.set(row.post_id, entry);
    if (row.account_id === user.id) {
      mine[row.post_id] = { ...mine[row.post_id], [row.kind]: true };
    }
  }

  const shaped: CommunityPost[] = posts.map((row) => ({
    id: row.id,
    type: row.type as CommunityPostType,
    author: authorFor(row.author_id),
    createdAt: new Date(row.created_at).getTime(),
    exam: row.exam as CommunityPost["exam"],
    topic: row.topic ?? undefined,
    text: row.text ?? undefined,
    ...(row.payload ?? {}),
    reactions: counts.get(row.id) ?? { helpful: 0, congrats: 0 },
    comments: commentsByPost.get(row.id) ?? [],
  }));

  return NextResponse.json({
    posts: shaped,
    reactions: mine,
    saved: (savesRes.data ?? []).map((s) => s.post_id as string),
    following: (followsRes.data ?? []).map((f) => f.following_id as string),
  });
}

/**
 * One endpoint, several actions, because they are all "write something small to
 * the feed" and splitting them into four routes would repeat the same twenty
 * lines of auth four times.
 */
export async function POST(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();
  const { client, user } = found;

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const action = String(body.action ?? "");

  /* ---------------- publish ---------------- */

  if (action === "createPost") {
    const type = String(body.type ?? "");
    if (!POST_TYPES.includes(type as CommunityPostType)) {
      return NextResponse.json({ error: "Unknown post type." }, { status: 400 });
    }

    const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
    const payload =
      body.payload && typeof body.payload === "object" && !Array.isArray(body.payload)
        ? (body.payload as Record<string, unknown>)
        : {};

    // A post with neither words nor a structured block is an empty card.
    if (!text && Object.keys(payload).length === 0) {
      return NextResponse.json({ error: "Write something first." }, { status: 400 });
    }

    const { data, error } = await client
      .from("community_posts")
      .insert({
        author_id: user.id,
        type,
        exam: typeof body.exam === "string" ? body.exam : "sat",
        topic: typeof body.topic === "string" && body.topic ? body.topic.slice(0, 120) : null,
        text: text || null,
        payload,
      })
      .select("id")
      .single();

    if (error) {
      if (process.env.NODE_ENV !== "production") console.error("[community]", error);
      return NextResponse.json({ error: "Could not publish." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, id: data.id });
  }

  /* ---------------- react ---------------- */

  if (action === "toggleReaction") {
    const postId = String(body.postId ?? "");
    const kind = String(body.kind ?? "");
    if (!postId || (kind !== "helpful" && kind !== "congrats")) {
      return NextResponse.json({ error: "Which post, and which reaction?" }, { status: 400 });
    }

    if (body.on === false) {
      await client
        .from("community_reactions")
        .delete()
        .eq("post_id", postId)
        .eq("account_id", user.id)
        .eq("kind", kind);
      return NextResponse.json({ ok: true, on: false });
    }

    // The composite primary key makes this idempotent, so a double tap or a
    // retry after a dropped connection cannot inflate the count.
    const { error } = await client
      .from("community_reactions")
      .upsert(
        { post_id: postId, account_id: user.id, kind },
        { onConflict: "post_id,account_id,kind", ignoreDuplicates: true },
      );
    if (error) {
      if (process.env.NODE_ENV !== "production") console.error("[community]", error);
      return NextResponse.json({ error: "Could not react." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, on: true });
  }

  /* ---------------- save ---------------- */

  if (action === "toggleSave") {
    const postId = String(body.postId ?? "");
    if (!postId) return NextResponse.json({ error: "Which post?" }, { status: 400 });

    if (body.on === false) {
      await client
        .from("community_saves")
        .delete()
        .eq("post_id", postId)
        .eq("account_id", user.id);
      return NextResponse.json({ ok: true, on: false });
    }
    await client
      .from("community_saves")
      .upsert(
        { post_id: postId, account_id: user.id },
        { onConflict: "post_id,account_id", ignoreDuplicates: true },
      );
    return NextResponse.json({ ok: true, on: true });
  }

  /* ---------------- follow ---------------- */

  /*
   * Follow and unfollow, shaped exactly like toggleSave because it is the same
   * kind of thing: a private edge owned by the caller.
   *
   * `follower_id` comes from the access token and never from the body, so the
   * request says only who is being followed. That is the whole impersonation
   * defence at this layer, and the insert policy repeats it in the database.
   *
   * Self-following is not checked here. The check constraint refuses it, and
   * catching 23514 is a better contract than a duplicate rule in TypeScript that
   * can drift from the one Postgres enforces.
   */
  if (action === "toggleFollow") {
    const targetId = String(body.targetId ?? "");
    if (!targetId) return NextResponse.json({ error: "Follow whom?" }, { status: 400 });

    if (body.on === false) {
      await client
        .from("community_follows")
        .delete()
        .eq("follower_id", user.id)
        .eq("following_id", targetId);
      return NextResponse.json({ ok: true, on: false });
    }

    const { error } = await client
      .from("community_follows")
      .upsert(
        { follower_id: user.id, following_id: targetId },
        { onConflict: "follower_id,following_id", ignoreDuplicates: true },
      );

    if (error) {
      // 23514 is community_follows_no_self: someone aimed a follow at their own
      // id. The UI never offers it, so this is a forged request rather than a
      // mistake, and it gets a plain refusal instead of a 502.
      if (error.code === "23514") {
        return NextResponse.json({ error: "You cannot follow yourself." }, { status: 400 });
      }
      // 23503 is the foreign key: the target is not a real profile.
      if (error.code === "23503") {
        return NextResponse.json({ error: "No such student." }, { status: 404 });
      }
      if (process.env.NODE_ENV !== "production") console.error("[community]", error);
      return NextResponse.json({ error: "Could not follow." }, { status: 502 });
    }
    return NextResponse.json({ ok: true, on: true });
  }

  /* ---------------- comment ---------------- */

  if (action === "addComment") {
    const postId = String(body.postId ?? "");
    const text = typeof body.text === "string" ? body.text.trim().slice(0, MAX_TEXT) : "";
    if (!postId || !text) {
      return NextResponse.json({ error: "Write a comment first." }, { status: 400 });
    }

    const { data, error } = await client
      .from("community_comments")
      .insert({ post_id: postId, author_id: user.id, text })
      .select("id, created_at")
      .single();

    if (error) {
      if (process.env.NODE_ENV !== "production") console.error("[community]", error);
      return NextResponse.json({ error: "Could not comment." }, { status: 502 });
    }
    return NextResponse.json({
      ok: true,
      id: data.id,
      createdAt: new Date(data.created_at).getTime(),
    });
  }

  /* ---------------- report ---------------- */

  /*
   * Reporting is the one write here that is about someone else's row, so it is
   * worth being explicit about what it does and does not do: it inserts a report
   * and nothing more. It does not hide, delete or touch the target in any way —
   * that is a decision only an admin makes, through the moderation endpoint. A
   * reporting flow that removed content on submission would be a heckler's veto.
   */
  if (action === "report") {
    const targetType = String(body.targetType ?? "");
    const targetId = String(body.targetId ?? "");
    const reason = String(body.reason ?? "");

    if (targetType !== "post" && targetType !== "comment") {
      return NextResponse.json({ error: "Report a post or a comment." }, { status: 400 });
    }
    if (!targetId) {
      return NextResponse.json({ error: "Which one?" }, { status: 400 });
    }
    if (!REPORT_REASONS.includes(reason)) {
      return NextResponse.json({ error: "Pick a reason." }, { status: 400 });
    }

    const details =
      typeof body.details === "string" && body.details.trim()
        ? body.details.trim().slice(0, MAX_DETAILS)
        : null;

    const { error } = await client.from("community_reports").insert({
      reporter_id: user.id,
      target_type: targetType,
      target_id: targetId,
      reason,
      details,
    });

    if (error) {
      // 23505 is the unique index on (reporter, target): this person has already
      // reported this thing. Answered as success, because from the reporter's
      // side the outcome is the one they wanted — the team has their report —
      // and telling them off for tapping twice adds nothing.
      if (error.code === "23505") {
        return NextResponse.json({ ok: true, already: true });
      }
      if (process.env.NODE_ENV !== "production") console.error("[community]", error);
      return NextResponse.json({ error: "Could not send that report." }, { status: 502 });
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}

/**
 * Withdraw a post (`?id=`) or a reply (`?commentId=`).
 *
 * The policy decides whether the caller may — author or admin, checked against
 * the row rather than against anything the request said. What this handler adds
 * is telling the truth about the outcome.
 *
 * A DELETE that matches no row is not an error in Postgres: it deletes nothing
 * and reports success. So a student calling this with another student's post id
 * used to get `200 {ok:true}` while the post stayed exactly where it was, and the
 * client, believing it, removed the card from the feed until the next reload.
 * Nothing leaked and nothing was destroyed — the policy held — but the API
 * asserted something false, and a security test pointed at it would have passed.
 *
 * `.select("id")` makes the delete return the rows it actually removed, so an
 * empty result is distinguishable from a successful one and answers 403.
 */
export async function DELETE(request: Request) {
  if (!supabaseConfigured()) return notConfigured();
  const found = await caller(request);
  if (!found) return unauthorized();

  const params = new URL(request.url).searchParams;
  const postId = params.get("id");
  const commentId = params.get("commentId");

  if (!postId && !commentId) {
    return NextResponse.json({ error: "Which post or comment?" }, { status: 400 });
  }

  const table = commentId ? "community_comments" : "community_posts";
  const targetId = commentId ?? postId!;

  const { data, error } = await found.client
    .from(table)
    .delete()
    .eq("id", targetId)
    .select("id");

  if (error) {
    if (process.env.NODE_ENV !== "production") console.error("[community]", error);
    return NextResponse.json({ error: "Could not delete." }, { status: 502 });
  }

  // Nothing removed: either it was never there, or it is not the caller's to
  // remove. Both get the same answer, because distinguishing them would confirm
  // the existence of a row the caller has no business knowing about.
  if (!data || data.length === 0) {
    return NextResponse.json({ error: "That is not yours to delete." }, { status: 403 });
  }

  return NextResponse.json({ ok: true });
}
