"use client";

import { useState } from "react";
import type { CommunityComment } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { useCommunity } from "@/lib/community-state";
import { useSendDelay } from "@/lib/send-delay";
import { NOUNS, pluralize } from "@/lib/plural";
import { timeAgo } from "@/lib/community-time";
import { Avatar } from "./Avatar";

const PREVIEW_COUNT = 2;

function CommentRow({ comment }: { comment: CommunityComment }) {
  return (
    <div className="flex items-start gap-2.5">
      <Avatar author={comment.author} size={26} />
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-medium">{comment.author.name}</span>{" "}
          <span className="text-muted">{comment.text}</span>
        </p>
        <p className="text-2xs text-faint mt-0.5">{timeAgo(comment.createdAt)}</p>
      </div>
    </div>
  );
}

/**
 * Lightweight comments: a preview of the first two, an expand link, and — once
 * expanded — the rest plus a single-line reply box. Not a full thread system,
 * per AGENTS §8 ("do not build an enormous comment system in Milestone 1").
 */
export function CommentsSection({
  postId,
  comments,
  open,
  onExpand,
}: {
  postId: string;
  comments: CommunityComment[];
  open: boolean;
  onExpand: () => void;
}) {
  const { t } = useI18n();
  const { addComment } = useCommunity();
  const { pending, send } = useSendDelay();
  const [draft, setDraft] = useState("");

  if (comments.length === 0 && !open) return null;

  const visible = open ? comments : comments.slice(0, PREVIEW_COUNT);
  const remaining = comments.length - PREVIEW_COUNT;

  const submit = () => {
    if (!draft.trim() || pending) return;
    send(() => {
      addComment(postId, draft);
      setDraft("");
    });
  };

  return (
    <div className="cm-comments">
      {visible.map((comment) => (
        <CommentRow key={comment.id} comment={comment} />
      ))}

      {comments.length === 0 && open && (
        <p className="text-sm text-faint">{t("community.noComments")}</p>
      )}

      {!open && remaining > 0 && (
        <button type="button" className="cm-view-all" onClick={onExpand}>
          {t("community.viewAllComments")} ({pluralize(comments.length, NOUNS.comment)})
        </button>
      )}

      {open && (
        <form
          className="flex items-center gap-2 pt-1"
          onSubmit={(event) => {
            event.preventDefault();
            submit();
          }}
        >
          <input
            type="text"
            className="field cm-comment-field"
            placeholder={t("community.commentPlaceholder")}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={t("community.commentPlaceholder")}
          />
          <button
            type="submit"
            className="btn btn-sm shrink-0"
            disabled={!draft.trim() || pending}
          >
            {pending ? t("community.sending") : t("community.commentSend")}
          </button>
        </form>
      )}
    </div>
  );
}
