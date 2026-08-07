"use client";

import Link from "next/link";
import type { CommunityPostView } from "@/lib/community-state";
import { useCommunity } from "@/lib/community-state";
import { useI18n } from "@/lib/i18n";
import { timeAgo } from "@/lib/community-time";
import { Avatar } from "./Avatar";

/** One-line summary per post type — the Home preview never renders the full typed content components, only a compact hook. */
function summarize(post: CommunityPostView): string {
  switch (post.type) {
    case "progress": {
      const { fromScore, toScore } = post.progress!;
      return `${fromScore} → ${toScore} (+${toScore - fromScore})`;
    }
    case "question":
      return post.question!.prompt;
    case "achievement":
      return `${post.achievement!.emoji} ${post.achievement!.title}`;
    case "explanation":
      return post.explanation!.title;
    case "study-update":
      return `${post.studyUpdate!.questionsCompleted} · ${Math.round(post.studyUpdate!.accuracy * 100)}%`;
    case "resource":
      return post.resource!.title;
    default:
      return post.text ?? "";
  }
}

function PreviewCard({ post }: { post: CommunityPostView }) {
  return (
    <Link href="/community" className="card card-hover cm-preview-card">
      <div className="flex items-center gap-2">
        <Avatar author={post.author} size={26} />
        <span className="text-[13px] font-medium truncate">{post.author.name}</span>
        <span className="num text-[11.5px] text-faint ml-auto shrink-0">{timeAgo(post.createdAt)}</span>
      </div>
      <p className="text-[13.5px] text-muted mt-2 leading-snug cm-preview-clamp">{summarize(post)}</p>
    </Link>
  );
}

/** Compact 2-post teaser for the Home dashboard — see AGENTS §10. Home stays learning-first; this is a hook, not a feed. */
export function CommunityPreview() {
  const { t } = useI18n();
  const { ready, posts } = useCommunity();

  if (!ready || posts.length === 0) return null;

  const progressPost = posts.find((p) => p.type === "progress");
  const questionPost = posts.find((p) => p.type === "question");
  const chosen = [progressPost, questionPost].filter((p): p is CommunityPostView => Boolean(p));
  const preview = chosen.length >= 2 ? chosen.slice(0, 2) : posts.slice(0, 2);

  return (
    <section>
      <div className="flex items-center gap-2.5">
        <h2 className="text-[19px] sm:text-[21px] font-semibold tracking-[-0.02em]">
          {t("community.homeTitle")}
        </h2>
        <Link href="/community" className="btn btn-sm ml-auto shrink-0">
          {t("community.homeSeeAll")} <span aria-hidden>›</span>
        </Link>
      </div>
      <div className="mt-4 grid sm:grid-cols-2 gap-3">
        {preview.map((post) => (
          <PreviewCard key={post.id} post={post} />
        ))}
      </div>
    </section>
  );
}
