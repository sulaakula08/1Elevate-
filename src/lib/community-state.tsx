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
  COMMUNITY_POSTS,
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
import {
  type LocalCommentState,
  type ReactionState,
  loadLocalComments,
  loadLocalPosts,
  loadReactions,
  loadSaved,
  newCommunityId,
  saveLocalComments,
  saveLocalPosts,
  saveReactions,
  saveSaved,
} from "./community-store";

/** A post plus the current student's own reactions/comments merged on top of the seed baseline. */
export type CommunityPostView = CommunityPost & {
  userReactions: Partial<Record<CommunityReactionKind, boolean>>;
  saved: boolean;
};

const AVATAR_TONES = ["violet", "blue", "indigo", "cyan", "teal", "amber", "rose"] as const;

/** Everything the composer collects, one shared shape across all six post types. */
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

type Ctx = {
  ready: boolean;
  posts: CommunityPostView[];
  toggleReaction: (postId: string, kind: CommunityReactionKind) => void;
  toggleSave: (postId: string) => void;
  addComment: (postId: string, text: string) => void;
  createPost: (input: CreatePostInput) => void;
};

const CommunityContext = createContext<Ctx | null>(null);

/** Deterministic tone from a string, so the same author always gets the same avatar colour. */
function toneFor(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) >>> 0;
  return AVATAR_TONES[hash % AVATAR_TONES.length];
}

/**
 * Local/mock community state layered on the real Supabase-authenticated
 * identity from useApp(): author info for anything created here (posts,
 * comments) is derived from the signed-in `account`, so a real backend can
 * later replace only the storage/fetch boundary below without touching how
 * identity flows into a post.
 */
export function CommunityProvider({ children }: { children: React.ReactNode }) {
  const { account } = useApp();
  const [ready, setReady] = useState(false);
  const [localPosts, setLocalPosts] = useState<CommunityPost[]>([]);
  const [reactions, setReactions] = useState<ReactionState>({});
  const [saved, setSaved] = useState<string[]>([]);
  const [localComments, setLocalComments] = useState<LocalCommentState>({});

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setLocalPosts(loadLocalPosts());
    setReactions(loadReactions());
    setSaved(loadSaved());
    setLocalComments(loadLocalComments());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleReaction = useCallback<Ctx["toggleReaction"]>((postId, kind) => {
    setReactions((previous) => {
      const current = previous[postId]?.[kind] ?? false;
      const next: ReactionState = {
        ...previous,
        [postId]: { ...previous[postId], [kind]: !current },
      };
      saveReactions(next);
      return next;
    });
  }, []);

  const toggleSave = useCallback<Ctx["toggleSave"]>((postId) => {
    setSaved((previous) => {
      const next = previous.includes(postId)
        ? previous.filter((id) => id !== postId)
        : [...previous, postId];
      saveSaved(next);
      return next;
    });
  }, []);

  const addComment = useCallback<Ctx["addComment"]>(
    (postId, text) => {
      const trimmed = text.trim();
      if (!trimmed) return;
      const commentAuthor: CommunityAuthor = account
        ? {
            name: account.name,
            context: account.grade || undefined,
            colorSeed: toneFor(account.id),
          }
        : { name: "You", colorSeed: "indigo" };
      setLocalComments((previous) => {
        const next: LocalCommentState = {
          ...previous,
          [postId]: [
            ...(previous[postId] ?? []),
            {
              id: newCommunityId("comment"),
              author: commentAuthor,
              text: trimmed,
              createdAt: Date.now(),
            },
          ],
        };
        saveLocalComments(next);
        return next;
      });
    },
    [account],
  );

  const createPost = useCallback<Ctx["createPost"]>(
    (input) => {
      if (!account) return;
      const postAuthor: CommunityAuthor = {
        name: account.name,
        context: [account.grade, `SAT ${account.targetScore}`].filter(Boolean).join(" · "),
        colorSeed: toneFor(account.id),
      };
      const base = {
        id: newCommunityId("post"),
        author: postAuthor,
        createdAt: Date.now(),
        exam: "sat" as const,
        topic: input.topic || undefined,
        text: input.text.trim() || undefined,
        reactions: { helpful: 0, congrats: 0 },
        comments: [],
        isLocal: true as const,
      };

      let post: CommunityPost;
      switch (input.type) {
        case "question":
          post = {
            ...base,
            type: "question",
            question: {
              subjectId: input.subjectId || "sat-math",
              prompt: input.question?.prompt || input.text.trim(),
              myAnswer: input.question?.myAnswer,
              correctAnswer: input.question?.correctAnswer,
              explanationCount: 0,
            },
          };
          break;
        case "progress":
          post = {
            ...base,
            type: "progress",
            progress: {
              fromScore: input.progress?.fromScore ?? 0,
              toScore: input.progress?.toScore ?? 0,
              mathScore: input.progress?.mathScore,
              readingWritingScore: input.progress?.readingWritingScore,
              mockLabel: input.progress?.mockLabel,
            },
          };
          break;
        case "achievement":
          post = {
            ...base,
            type: "achievement",
            achievement: {
              emoji: input.achievement?.emoji || "🏅",
              title: input.achievement?.title || input.text.trim(),
              detail: input.achievement?.detail,
              startScore: input.achievement?.startScore,
              currentScore: input.achievement?.currentScore,
            },
          };
          break;
        case "explanation":
          post = {
            ...base,
            type: "explanation",
            explanation: {
              subjectId: input.subjectId || "sat-math",
              title: input.explanation?.title || input.text.trim(),
              body: input.explanation?.body || "",
            },
          };
          break;
        case "study-update":
          post = {
            ...base,
            type: "study-update",
            studyUpdate: {
              subjectId: input.subjectId || "sat-math",
              questionsCompleted: input.studyUpdate?.questionsCompleted ?? 0,
              accuracy: input.studyUpdate?.accuracy ?? 0,
              accuracyDelta: input.studyUpdate?.accuracyDelta,
            },
          };
          break;
        case "resource":
        default:
          post = {
            ...base,
            type: "resource",
            resource: {
              title: input.resource?.title || input.text.trim(),
              note: input.resource?.note || "",
              subjectId: input.subjectId,
            },
          };
          break;
      }

      setLocalPosts((previous) => {
        const next = [post, ...previous];
        saveLocalPosts(next);
        return next;
      });
    },
    [account],
  );

  const posts = useMemo<CommunityPostView[]>(() => {
    const merged = [...localPosts, ...COMMUNITY_POSTS].sort((a, b) => b.createdAt - a.createdAt);
    return merged.map((post) => {
      const reactionState = reactions[post.id] ?? {};
      const extraComments = localComments[post.id] ?? [];
      return {
        ...post,
        reactions: {
          helpful: post.reactions.helpful + (reactionState.helpful ? 1 : 0),
          congrats: post.reactions.congrats + (reactionState.congrats ? 1 : 0),
        },
        comments: [...post.comments, ...extraComments],
        userReactions: reactionState,
        saved: saved.includes(post.id),
      };
    });
  }, [localPosts, reactions, localComments, saved]);

  const value: Ctx = { ready, posts, toggleReaction, toggleSave, addComment, createPost };

  return <CommunityContext.Provider value={value}>{children}</CommunityContext.Provider>;
}

export function useCommunity(): Ctx {
  const ctx = useContext(CommunityContext);
  if (!ctx) throw new Error("useCommunity must be used inside <CommunityProvider>");
  return ctx;
}
