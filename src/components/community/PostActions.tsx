"use client";

import type { CommunityReactionKind } from "@/data/community";
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
        {t("community.actionComment")}
        {commentCount > 0 && <span className="num cm-action-count">{commentCount}</span>}
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
