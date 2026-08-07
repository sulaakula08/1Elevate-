import type { CommunityComment, CommunityPost, CommunityReactionKind } from "@/data/community";
import { newId } from "./storage";

/** Same `elevate.*` namespace as the rest of the app — see lib/storage.ts. */
const K = {
  reactions: "elevate.community.reactions",
  saved: "elevate.community.saved",
  comments: "elevate.community.comments",
  localPosts: "elevate.community.posts",
};

/** postId -> which reaction kinds the current student has toggled on. */
export type ReactionState = Record<string, Partial<Record<CommunityReactionKind, boolean>>>;
/** postId -> comments the current student added locally, on top of the seed set. */
export type LocalCommentState = Record<string, CommunityComment[]>;

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
    // Storage full or blocked — the session keeps working in memory.
  }
}

export function loadReactions(): ReactionState {
  return read<ReactionState>(K.reactions, {});
}

export function saveReactions(state: ReactionState) {
  write(K.reactions, state);
}

export function loadSaved(): string[] {
  return read<string[]>(K.saved, []);
}

export function saveSaved(ids: string[]) {
  write(K.saved, ids);
}

export function loadLocalComments(): LocalCommentState {
  return read<LocalCommentState>(K.comments, {});
}

export function saveLocalComments(state: LocalCommentState) {
  write(K.comments, state);
}

export function loadLocalPosts(): CommunityPost[] {
  return read<CommunityPost[]>(K.localPosts, []);
}

export function saveLocalPosts(posts: CommunityPost[]) {
  write(K.localPosts, posts);
}

export function newCommunityId(prefix: string): string {
  return newId(prefix);
}
