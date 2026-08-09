"use client";

import type { CommunityAuthor } from "@/data/community";
import { timeAgo } from "@/lib/community-time";
import { Avatar } from "./Avatar";

/**
 * Name, then one line of student context, then the time.
 *
 * The context and the timestamp used to run together as a single grey string —
 * "RFMS · SAT 1460 · 22h ago" — which is the LinkedIn byline: affiliation,
 * credential and recency in one breath, and it made a study feed read like a
 * professional network. The time is a separate, quieter thing now, so what is
 * left beside the name is only who the person is.
 *
 * The context field is whatever the author set (a school, a target, or nothing)
 * and is rendered as-is. Nothing is derived or invented for it.
 */
export function PostHeader({
  author,
  createdAt,
  size = 34,
}: {
  author: CommunityAuthor;
  createdAt: number;
  size?: number;
}) {
  return (
    <div className="cm-author">
      <Avatar author={author} size={size} />
      <div className="min-w-0">
        <p className="cm-author-name">{author.name}</p>
        {author.context && <p className="cm-author-context">{author.context}</p>}
      </div>
      <time className="num cm-author-time">{timeAgo(createdAt)}</time>
    </div>
  );
}
