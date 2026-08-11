"use client";

import { useState } from "react";
import type { CommunityComment } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { useApp } from "@/lib/app-state";
import { ConfirmDialog } from "@/components/ui";
import { useCommunity } from "@/lib/community-state";
import { useSendDelay } from "@/lib/send-delay";
import { NOUNS, pluralize } from "@/lib/plural";
import { timeAgo } from "@/lib/community-time";
import { Avatar } from "./Avatar";
import { PostMenu, type MenuAction } from "./PostMenu";
import { ReportDialog } from "./ReportDialog";

const PREVIEW_COUNT = 2;

/**
 * One reply, with the same two-option menu a post has.
 *
 * The menu is the reason this row holds state at all. It used to be a pure
 * presentational function, and the dialogs could have been hoisted to the
 * section — but then one open dialog would have to remember which of twenty
 * replies it belonged to. Per-row state is the smaller thing.
 */
function CommentRow({ postId, comment }: { postId: string; comment: CommunityComment }) {
  const { t } = useI18n();
  const { account } = useApp();
  const { deleteComment } = useCommunity();
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [failed, setFailed] = useState(false);

  const isMine = Boolean(
    account?.id && comment.author.id && comment.author.id === account.id,
  );
  /* A reply that has not reached the server yet has a temporary id, and there is
     nothing at that id to delete or report. The menu waits. */
  const pending = comment.id.startsWith("pending-");

  const actions: MenuAction[] = pending
    ? []
    : isMine
      ? [
          {
            key: "delete",
            label: t("community.deleteComment"),
            danger: true,
            onSelect: () => setConfirmingDelete(true),
          },
        ]
      : comment.author.id
        ? [
            {
              key: "report",
              label: t("community.reportComment"),
              onSelect: () => setReporting(true),
            },
          ]
        : [];

  async function confirmDelete() {
    setDeleting(true);
    const ok = await deleteComment(postId, comment.id);
    setDeleting(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    setConfirmingDelete(false);
  }

  return (
    <div className="cm-comment-row">
      <Avatar author={comment.author} size={26} />
      <div className="min-w-0">
        <p className="text-sm">
          <span className="font-medium">{comment.author.name}</span>{" "}
          <span className="text-muted">{comment.text}</span>
        </p>
        <p className="text-2xs text-faint mt-0.5">{timeAgo(comment.createdAt)}</p>
      </div>

      <PostMenu
        actions={actions}
        label={t(isMine ? "community.menuYourComment" : "community.menuComment")}
      />

      {confirmingDelete && (
        <ConfirmDialog
          title={t("community.deleteCommentConfirmTitle")}
          body={
            failed ? (
              <span className="text-danger">{t("community.deleteFailed")}</span>
            ) : (
              t("community.deleteConfirmBody")
            )
          }
          confirmLabel={t("community.deleteConfirm")}
          cancelLabel={t("community.composerCancel")}
          danger
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onCancel={() => {
            setConfirmingDelete(false);
            setFailed(false);
          }}
        />
      )}

      {reporting && (
        <ReportDialog
          target={{ type: "comment", id: comment.id }}
          onClose={() => setReporting(false)}
        />
      )}
    </div>
  );
}

/**
 * Lightweight comments: a preview of the first two, an expand link, and — once
 * expanded — the rest plus a single-line reply box. Not a full thread system,
 * per AGENTS §8 ("do not build an enormous comment system in Milestone 1").
 */
export function CommentsSection({
  isQuestion = false,
  postId,
  comments,
  open,
  onExpand,
}: {
  /* A reply to a question is an explanation everywhere else in the post — the
     action, the count and the empty state all say so — so the composer that
     writes one has to agree. Same data, same component, one word. */
  isQuestion?: boolean;
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
        <CommentRow key={comment.id} postId={postId} comment={comment} />
      ))}

      {comments.length === 0 && open && (
        <p className="text-sm text-faint">{t(isQuestion ? "community.noExplanations" : "community.noComments")}</p>
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
            placeholder={t(isQuestion ? "community.explanationPlaceholder" : "community.commentPlaceholder")}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            aria-label={t(isQuestion ? "community.explanationPlaceholder" : "community.commentPlaceholder")}
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
