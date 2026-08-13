"use client";

import { useState } from "react";
import type { CommunityPostType, CommunityReactionKind } from "@/data/community";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { ConfirmDialog } from "@/components/ui";
import { useCommunity, type CommunityPostView } from "@/lib/community-state";
import { PostMenu, type MenuAction } from "./PostMenu";
import { ReportDialog } from "./ReportDialog";
import { PostHeader } from "./PostHeader";
import { PostActions } from "./PostActions";
import { CommentsSection } from "./CommentsSection";
import { QuestionPostContent } from "./QuestionPostContent";
import { ProgressPostContent } from "./ProgressPostContent";
import { AchievementPostContent } from "./AchievementPostContent";
import { ExplanationPostContent } from "./ExplanationPostContent";
import { StudyUpdatePostContent } from "./StudyUpdatePostContent";
import { ResourcePostContent } from "./ResourcePostContent";
import { GenericPostContent } from "./GenericPostContent";

/** Content-sharing types ask for help; personal-milestone types get congratulated. See AGENTS §7. */
const REACTION_BY_TYPE: Record<CommunityPostType, CommunityReactionKind> = {
  /* An ordinary post is usually a thought or a tip, so it earns "helpful"
     rather than congratulations. */
  post: "helpful",
  question: "helpful",
  explanation: "helpful",
  resource: "helpful",
  progress: "congrats",
  achievement: "congrats",
  "study-update": "congrats",
};

/** Routes a post to its typed content component — the only place that switches on `post.type`. */
function PostBody({ post }: { post: CommunityPostView }) {
  switch (post.type) {
    case "post":
      return <GenericPostContent text={post.text} />;
    case "question":
      return <QuestionPostContent text={post.text} data={post.question!} topic={post.topic} />;
    case "progress":
      return <ProgressPostContent data={post.progress!} text={post.text} />;
    case "achievement":
      return <AchievementPostContent data={post.achievement!} />;
    case "explanation":
      return <ExplanationPostContent data={post.explanation!} topic={post.topic} />;
    case "study-update":
      return <StudyUpdatePostContent data={post.studyUpdate!} text={post.text} />;
    case "resource":
      return <ResourcePostContent data={post.resource!} topic={post.topic} />;
    default:
      return null;
  }
}

export function PostCard({ post }: { post: CommunityPostView }) {
  const { t } = useI18n();
  const { account } = useApp();
  const { toggleReaction, toggleSave, deletePost, isFollowing, toggleFollow } = useCommunity();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteFailed, setDeleteFailed] = useState(false);
  const reactionKind = REACTION_BY_TYPE[post.type];

  /*
   * "Mine" needs both ids to exist. CommunityAuthor.id is optional — seeded demo
   * content has no id at all — so a truthiness check would make every anonymous
   * author's post look like the reader's own and offer to delete it. The server
   * would refuse, but the menu should never have said it.
   */
  const isMine = Boolean(account?.id && post.author.id && post.author.id === account.id);
  const authorId = post.author.id;
  const followed = isFollowing(authorId);

  /*
   * Follow lives in the menu rather than on the card.
   *
   * A Follow button on every post is the single change that would make this feed
   * read like a professional network: four of them down one column, each shouting
   * for a decision about a person while you are trying to read what they wrote.
   * In the menu it costs nothing until someone goes looking for it, and the
   * byline carries the state instead.
   */
  const actions: MenuAction[] = isMine
    ? [
        {
          key: "delete",
          label: t("community.deletePost"),
          danger: true,
          onSelect: () => setConfirmingDelete(true),
        },
      ]
    : authorId
      ? [
          {
            key: "follow",
            label: followed
              ? `${t("community.unfollow")} ${post.author.name}`
              : `${t("community.follow")} ${post.author.name}`,
            onSelect: () => toggleFollow(authorId),
          },
          { key: "report", label: t("community.reportPost"), onSelect: () => setReporting(true) },
        ]
      : /* Nobody to follow or report: seeded content has no account behind it. */ [];

  async function confirmDelete() {
    setDeleting(true);
    const ok = await deletePost(post.id);
    setDeleting(false);
    if (!ok) {
      setDeleteFailed(true);
      return;
    }
    // No need to close the dialog on success: the post it belonged to is gone
    // from the feed, and this component with it.
    setConfirmingDelete(false);
  }

  return (
    /*
     * `data-type` drives a coloured spine on the left edge — one mechanism,
     * applied consistently, so a question reads as something to answer and a win
     * reads as something to celebrate before you have read a word of either.
     * Every other property of the card stays identical, which is what keeps a
     * mixed feed calm.
     */
    <article className="cm-post" data-type={post.type}>
      <PostHeader
        author={post.author}
        createdAt={post.createdAt}
        following={followed}
        menu={
          <PostMenu
            actions={actions}
            label={t(isMine ? "community.menuYourPost" : "community.menuPost")}
          />
        }
      />
      <div className="mt-2.5">
        <PostBody post={post} />
      </div>
      <PostActions
        postType={post.type}
        reactionKind={reactionKind}
        reactionCount={post.reactions[reactionKind]}
        reacted={Boolean(post.userReactions[reactionKind])}
        onToggleReaction={() => toggleReaction(post.id, reactionKind)}
        commentCount={post.comments.length}
        commentsOpen={commentsOpen}
        onToggleComments={() => setCommentsOpen((v) => !v)}
        saved={post.saved}
        onToggleSave={() => toggleSave(post.id)}
      />
      <CommentsSection
        isQuestion={post.type === "question"}
        postId={post.id}
        comments={post.comments}
        open={commentsOpen}
        onExpand={() => setCommentsOpen(true)}
      />

      {confirmingDelete && (
        <ConfirmDialog
          title={t("community.deletePostConfirmTitle")}
          body={
            deleteFailed ? (
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
            setDeleteFailed(false);
          }}
        />
      )}

      {reporting && (
        <ReportDialog
          target={{ type: "post", id: post.id }}
          onClose={() => setReporting(false)}
        />
      )}
    </article>
  );
}
