"use client";

import type { CommunityReactionKind } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { IconComment, IconSave } from "./icons";

const REACTION_EMOJI: Record<CommunityReactionKind, string> = {
  helpful: "💡",
  congrats: "👏",
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
  const reactionLabel = t(reactionKind === "helpful" ? "community.reactionHelpful" : "community.reactionCongrats");

  return (
    <div className="flex items-center gap-1.5 pt-1 -ml-2">
      <button
        type="button"
        className={`cm-action ${reacted ? "cm-action-on" : ""}`}
        aria-pressed={reacted}
        onClick={onToggleReaction}
      >
        <span aria-hidden>{REACTION_EMOJI[reactionKind]}</span>
        {reactionLabel}
        {reactionCount > 0 && <span className="num cm-action-count">{reactionCount}</span>}
      </button>

      <button
        type="button"
        className={`cm-action ${commentsOpen ? "cm-action-on" : ""}`}
        aria-expanded={commentsOpen}
        onClick={onToggleComments}
      >
        <IconComment size={16} />
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
