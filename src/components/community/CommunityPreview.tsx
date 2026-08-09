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

/**
 * A row, not a card.
 *
 * On the dashboard this is a glance at other people studying, not a feed item,
 * and a bordered rounded rectangle gave it the same standing as the score block
 * above it. Hairlines and the author's name carrying the weight say "there are
 * people here" in a third of the space.
 */
function PreviewRow({ post }: { post: CommunityPostView }) {
  return (
    <li>
      <Link href="/community" className="cm-preview-row">
        <Avatar author={post.author} size={30} />
        <span className="min-w-0">
          <span className="cm-preview-name">{post.author.name}</span>
          <span className="cm-preview-text">{summarize(post)}</span>
        </span>
        <span className="num cm-preview-time">{timeAgo(post.createdAt)}</span>
      </Link>
    </li>
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
    <section className="dash-section">
      <div className="dash-head">
        <p className="t-label">{t("community.homeTitle")}</p>
        <Link href="/community" className="dash-more">
          {t("community.homeSeeAll")} <span aria-hidden>›</span>
        </Link>
      </div>
      <ul className="cm-preview-list">
        {preview.map((post) => (
          <PreviewRow key={post.id} post={post} />
        ))}
      </ul>
    </section>
  );
}
