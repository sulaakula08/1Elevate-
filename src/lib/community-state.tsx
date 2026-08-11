"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  type CommunityAuthor,
  type CommunityPost,
  type CommunityPostType,
  type CommunityReactionKind,
  type AchievementPostData,
  type ExplanationPostData,
  type ProgressPostData,
  type QuestionPostData,
  type ResourcePostData,
  type StudyUpdatePostData,
} from "@/data/community";
import { useApp } from "./app-state";
import { apiFetch } from "./supabase/client";

/**
 * The community feed, backed by the database.
 *
 * This replaces a localStorage store and a set of seeded demo authors. Those
 * were the right way to prove the card layouts before there was anywhere to put
 * a post, but they meant every student saw only their own writing and a cast of
 * people who do not exist. Posts, reactions, comments and saves are now rows,
 * so one student's question genuinely reaches another's screen.
 *
 * The context surface is deliberately unchanged — same fields, same signatures —
 * so every component under components/community keeps working untouched. Only
 * where the data comes from has changed.
 *
 * Writes are optimistic: the card updates immediately and the request follows.
 * A reaction that fails to reach the server is rolled back rather than left
 * showing a state the database does not have.
 */

/** A post plus the current student's own reaction and save state. */
export type CommunityPostView = CommunityPost & {
  userReactions: Partial<Record<CommunityReactionKind, boolean>>;
  saved: boolean;
};

const AVATAR_TONES = ["indigo", "violet", "blue", "teal", "green", "amber", "rose", "cyan"];

/** Same hash the API uses, so a person's colour matches across the app. */
function toneFor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

export type CreatePostInput = {
  type: CommunityPostType;
  text: string;
  subjectId?: string;
  topic?: string;
  question?: Partial<QuestionPostData>;
  progress?: Partial<ProgressPostData>;
  achievement?: Partial<AchievementPostData>;
  explanation?: Partial<ExplanationPostData>;
  studyUpdate?: Partial<StudyUpdatePostData>;
  resource?: Partial<ResourcePostData>;
};

/** Why a student is reporting something. Mirrors the check constraint on community_reports.reason. */
export type ReportReason =
  | "harassment"
  | "spam"
  | "inappropriate"
  | "misinformation"
  | "other";

export type ReportTarget = { type: "post" | "comment"; id: string };

type Ctx = {
  ready: boolean;
  posts: CommunityPostView[];
  toggleReaction: (postId: string, kind: CommunityReactionKind) => void;
  toggleSave: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  createPost: (input: CreatePostInput) => void;
  /** Withdraw your own post. Resolves false when the server refused. */
  deletePost: (postId: string) => Promise<boolean>;
  /** Withdraw your own reply. */
  deleteComment: (postId: string, commentId: string) => Promise<boolean>;
  /** Report someone else's post or reply. Never changes what is on screen. */
  reportContent: (
    target: ReportTarget,
    reason: ReportReason,
    details?: string,
  ) => Promise<boolean>;
};

const CommunityContext = createContext<Ctx | null>(null);

type ReactionState = Record<string, Partial<Record<CommunityReactionKind, boolean>>>;

/**
 * Turns composer input into the type-specific block stored in the post's jsonb
 * payload. The shape is exactly what the card components already read, so the
 * feed renders a post that came back from the database identically to one that
 * was just written.
 */
function payloadFor(input: CreatePostInput): Record<string, unknown> {
  const text = input.text.trim();
  switch (input.type) {
    /* An ordinary post has no structured block — its words are the whole post,
       and they travel in the row's own `text` column. Listed explicitly rather
       than left to the `default`, which falls through to `resource` and would
       quietly turn every post into a shared resource. */
    case "post":
      return {};
    case "question":
      return {
        question: {
          subjectId: input.subjectId || "sat-math",
          prompt: input.question?.prompt || text,
          myAnswer: input.question?.myAnswer,
          correctAnswer: input.question?.correctAnswer,
          explanationCount: 0,
        },
      };
    case "progress":
      return {
        progress: {
          fromScore: input.progress?.fromScore ?? 0,
          toScore: input.progress?.toScore ?? 0,
          mathScore: input.progress?.mathScore,
          readingWritingScore: input.progress?.readingWritingScore,
          mockLabel: input.progress?.mockLabel,
        },
      };
    case "achievement":
      return {
        achievement: {
          emoji: input.achievement?.emoji || "🏅",
          title: input.achievement?.title || text,
          detail: input.achievement?.detail,
          startScore: input.achievement?.startScore,
          currentScore: input.achievement?.currentScore,
        },
      };
    case "explanation":
      return {
        explanation: {
          subjectId: input.subjectId || "sat-math",
          title: input.explanation?.title || text,
          body: input.explanation?.body || "",
        },
      };
    case "study-update":
      return {
        studyUpdate: {
          subjectId: input.subjectId || "sat-math",
          questionsCompleted: input.studyUpdate?.questionsCompleted ?? 0,
          accuracy: input.studyUpdate?.accuracy ?? 0,
          accuracyDelta: input.studyUpdate?.accuracyDelta,
        },
      };
    case "resource":
    default:
      return {
        resource: {
          title: input.resource?.title || text,
          note: input.resource?.note || "",
          subjectId: input.subjectId,
        },
      };
  }
}

export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { account } = useApp();
  const [ready, setReady] = useState(false);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [reactions, setReactions] = useState<ReactionState>({});
  const [saved, setSaved] = useState<string[]>([]);

  const accountId = account?.id ?? null;

  const load = useCallback(async () => {
    const response = await apiFetch("/api/community");
    if (!response.ok) return null;
    return (await response.json()) as {
      posts: CommunityPost[];
      reactions: ReactionState;
      saved: string[];
    };
  }, []);

  // The feed belongs to the signed-in student: their saves and their own
  // reactions are part of it, so it is refetched whenever the account changes
  // rather than carried across a sign-out.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    let live = true;

    if (!accountId) {
      setPosts([]);
      setReactions({});
      setSaved([]);
      setReady(true);
      return;
    }

    void (async () => {
      const feed = await load();
      if (!live) return;
      if (feed) {
        setPosts(feed.posts);
        setReactions(feed.reactions);
        setSaved(feed.saved);
      }
      setReady(true);
    })();

    return () => {
      live = false;
    };
  }, [accountId, load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleReaction = useCallback<Ctx["toggleReaction"]>(
    (postId, kind) => {
      if (!accountId) return;
      const wasOn = reactions[postId]?.[kind] ?? false;
      const on = !wasOn;

      // Optimistic: flip the flag and move the count with it, so the number the
      // student sees always agrees with the button they just pressed.
      setReactions((previous) => ({
        ...previous,
        [postId]: { ...previous[postId], [kind]: on },
      }));
      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                reactions: {
                  ...post.reactions,
                  [kind]: Math.max(0, post.reactions[kind] + (on ? 1 : -1)),
                },
              }
            : post,
        ),
      );

      void apiFetch("/api/community", {
        method: "POST",
        body: JSON.stringify({ action: "toggleReaction", postId, kind, on }),
      }).then((response) => {
        if (response.ok) return;
        // Roll back rather than leave the card showing a state the database
        // never accepted.
        setReactions((previous) => ({
          ...previous,
          [postId]: { ...previous[postId], [kind]: wasOn },
        }));
        setPosts((previous) =>
          previous.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  reactions: {
                    ...post.reactions,
                    [kind]: Math.max(0, post.reactions[kind] + (on ? -1 : 1)),
                  },
                }
              : post,
          ),
        );
      });
    },
    [accountId, reactions],
  );

  const toggleSave = useCallback<Ctx["toggleSave"]>(
    (postId) => {
      if (!accountId) return;
      const wasSaved = saved.includes(postId);
      const on = !wasSaved;

      setSaved((previous) =>
        on ? [...previous, postId] : previous.filter((id) => id !== postId),
      );

      void apiFetch("/api/community", {
        method: "POST",
        body: JSON.stringify({ action: "toggleSave", postId, on }),
      }).then((response) => {
        if (response.ok) return;
        setSaved((previous) =>
          wasSaved ? [...previous, postId] : previous.filter((id) => id !== postId),
        );
      });
    },
    [accountId, saved],
  );

  const addComment = useCallback<Ctx["addComment"]>(
    (postId, text) => {
      const trimmed = text.trim();
      if (!trimmed || !account) return;

      const author: CommunityAuthor = {
        id: account.id,
        name: account.name,
        context: account.grade || undefined,
        colorSeed: toneFor(account.id),
      };
      // A temporary id so React has a stable key before the server answers; it
      // is replaced with the real one on success.
      const tempId = `pending-${Date.now()}`;

      setPosts((previous) =>
        previous.map((post) =>
          post.id === postId
            ? {
                ...post,
                comments: [
                  ...post.comments,
                  { id: tempId, author, text: trimmed, createdAt: Date.now() },
                ],
              }
            : post,
        ),
      );

      void apiFetch("/api/community", {
        method: "POST",
        body: JSON.stringify({ action: "addComment", postId, text: trimmed }),
      }).then(async (response) => {
        if (!response.ok) {
          setPosts((previous) =>
            previous.map((post) =>
              post.id === postId
                ? { ...post, comments: post.comments.filter((c) => c.id !== tempId) }
                : post,
            ),
          );
          return;
        }
        const body = (await response.json()) as { id: string; createdAt: number };
        setPosts((previous) =>
          previous.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  comments: post.comments.map((c) =>
                    c.id === tempId ? { ...c, id: body.id, createdAt: body.createdAt } : c,
                  ),
                }
              : post,
          ),
        );
      });
    },
    [account],
  );

  const createPost = useCallback<Ctx["createPost"]>(
    (input) => {
      if (!account) return;

      void (async () => {
        const response = await apiFetch("/api/community", {
          method: "POST",
          body: JSON.stringify({
            action: "createPost",
            type: input.type,
            exam: "sat",
            topic: input.topic || undefined,
            text: input.text.trim() || undefined,
            payload: payloadFor(input),
          }),
        });
        if (!response.ok) return;

        // Refetch rather than splice the new post in by hand: the server is the
        // one that knows its id, its timestamp and how it looks to everyone
        // else, and a post is published rarely enough that a round trip costs
        // nothing.
        const feed = await load();
        if (!feed) return;
        setPosts(feed.posts);
        setReactions(feed.reactions);
        setSaved(feed.saved);
      })();
    },
    [account, load],
  );

  /*
   * Deleting is pessimistic, unlike every other write here.
   *
   * A reaction that fails to save is worth showing immediately and rolling back,
   * because the cost of being briefly wrong is a number that flickers. A post
   * that vanishes and comes back is different: the student has just been told
   * their post is gone, and taking that back is worse than a moment's wait. So
   * the row goes only once the server confirms it.
   */
  const deletePost = useCallback<Ctx["deletePost"]>(async (postId) => {
    const response = await apiFetch(`/api/community?id=${encodeURIComponent(postId)}`, {
      method: "DELETE",
    });
    if (!response.ok) return false;
    setPosts((previous) => previous.filter((post) => post.id !== postId));
    return true;
  }, []);

  const deleteComment = useCallback<Ctx["deleteComment"]>(async (postId, commentId) => {
    const response = await apiFetch(
      `/api/community?commentId=${encodeURIComponent(commentId)}`,
      { method: "DELETE" },
    );
    if (!response.ok) return false;
    setPosts((previous) =>
      previous.map((post) =>
        post.id === postId
          ? { ...post, comments: post.comments.filter((c) => c.id !== commentId) }
          : post,
      ),
    );
    return true;
  }, []);

  /*
   * Reporting deliberately touches no state at all. The content stays exactly
   * where it is — one student's report is not a decision, and a flow that hid the
   * post as soon as somebody objected to it would hand every argument to whoever
   * complained first. An admin decides; this only tells them.
   */
  const reportContent = useCallback<Ctx["reportContent"]>(
    async (target, reason, details) => {
      const response = await apiFetch("/api/community", {
        method: "POST",
        body: JSON.stringify({
          action: "report",
          targetType: target.type,
          targetId: target.id,
          reason,
          details: details?.trim() || undefined,
        }),
      });
      return response.ok;
    },
    [],
  );

  const view = useMemo<CommunityPostView[]>(
    () =>
      posts.map((post) => ({
        ...post,
        userReactions: reactions[post.id] ?? {},
        saved: saved.includes(post.id),
      })),
    [posts, reactions, saved],
  );

  const value: Ctx = {
    ready,
    posts: view,
    toggleReaction,
    toggleSave,
    addComment,
    createPost,
    deletePost,
    deleteComment,
    reportContent,
  };

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): Ctx {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used inside <CommunityProvider>");
  return ctx;
}
