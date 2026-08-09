"use client";

import type { CommunityPostType, CommunityReactionKind } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { IconComment, IconCongrats, IconHelpful, IconSave } from "./icons";

/**
 * Drawn icons rather than emoji. Emoji render in the platform's own style, at
 * its own weight and colour, so 💡 and 👏 sat next to the line-drawn comment
 * and save icons as if pasted in from somewhere else — and neither could show
 * a pressed state. These share the icon set's geometry and fill when active.
 */
const REACTION_ICON: Record<CommunityReactionKind, typeof IconHelpful> = {
  helpful: IconHelpful,
  congrats: IconCongrats,
};

/**
 * The three interactions every post shares. `reactionKind` is chosen by the
 * caller from the post type (see PostCard) — helpful for content that
 * teaches something, congrats for a personal win — so only one reaction ever
 * shows, per AGENTS §7 ("do not add 10 different emoji reactions").
 */
export function PostActions({
  postType,
  reactionKind,
  reactionCount,
  reacted,
  onToggleReaction,
  commentCount,
  commentsOpen,
  onToggleComments,
  saved,
  onToggleSave,
}: {
  postType: CommunityPostType;
  reactionKind: CommunityReactionKind;
  reactionCount: number;
  reacted: boolean;
  onToggleReaction: () => void;
  commentCount: number;
  commentsOpen: boolean;
  onToggleComments: () => void;
  saved: boolean;
  onToggleSave: () => void;
}) {
  const { t } = useI18n();
  const reactionLabel = t(
    reactionKind === "helpful" ? "community.reactionHelpful" : "community.reactionCongrats",
  );
  const ReactionIcon = REACTION_ICON[reactionKind];
  /*
   * A reply to a question is an explanation, and calling it "Comment" made the
   * most valuable contribution in the product sound like small talk. The data
   * model is untouched — these are the same comments, named for what they are
   * on the post type that asked for them.
   */
  const isQuestion = postType === "question";
  /* With no replies yet the noun has nothing to count and "explanations" on its
     own read as a broken label, so an unanswered question asks for the verb
     instead — which is also the more useful thing to offer. */
  const commentLabel = t(
    commentCount === 0
      ? isQuestion
        ? "community.actionExplain"
        : "community.actionComment"
      : isQuestion
        ? commentCount === 1
          ? "community.actionExplanation"
          : "community.actionExplanations"
        : commentCount === 1
          ? "community.actionCommentOne"
          : "community.actionCommentMany",
  );

  return (
    <div className="flex items-center gap-1.5 pt-1 -ml-2">
      <button
        type="button"
        className={`cm-action ${reacted ? "cm-action-on" : ""}`}
        aria-pressed={reacted}
        onClick={onToggleReaction}
      >
        <ReactionIcon size={16} filled={reacted} />
        {reactionLabel}
        {reactionCount > 0 && <span className="num cm-action-count">{reactionCount}</span>}
      </button>

      <button
        type="button"
        className={`cm-action ${commentsOpen ? "cm-action-on" : ""}`}
        aria-expanded={commentsOpen}
        onClick={onToggleComments}
      >
        <IconComment size={16} filled={commentsOpen} />
        {commentCount > 0 && <span className="num cm-action-count">{commentCount}</span>}
        {commentLabel}
      </button>

      <button
        type="button"
        className={`cm-action cm-action-icon ${saved ? "cm-action-on" : ""}`}
        aria-pressed={saved}
        aria-label={t(saved ? "community.actionSaved" : "community.actionSave")}
        title={t(saved ? "community.actionSaved" : "community.actionSave")}
        onClick={onToggleSave}
      >
        <IconSave size={16} filled={saved} />
      </button>
    </div>
  );
}
