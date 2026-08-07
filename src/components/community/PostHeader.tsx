"use client";

import type { CommunityAuthor } from "@/data/community";
import { timeAgo } from "@/lib/community-time";
import { Avatar } from "./Avatar";

/** Avatar, name, optional school/exam context and a relative timestamp — every post type shares this. */
export function PostHeader({
  author,
  createdAt,
  size = 36,
}: {
  author: CommunityAuthor;
  createdAt: number;
  size?: number;
}) {
  return (
    <div className="flex items-center gap-2.5">
      <Avatar author={author} size={size} />
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium truncate">{author.name}</p>
        <p className="text-[12px] text-faint truncate">
          {author.context && <span>{author.context} · </span>}
          <span className="num">{timeAgo(createdAt)}</span>
        </p>
      </div>
    </div>
  );
}
