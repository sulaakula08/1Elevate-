"use client";

import { useState } from "react";
import type { CommunityPostType, CommunityReactionKind } from "@/data/community";
import { useCommunity, type CommunityPostView } from "@/lib/community-state";
import { PostHeader } from "./PostHeader";
import { PostActions } from "./PostActions";
import { CommentsSection } from "./CommentsSection";
import { QuestionPostContent } from "./QuestionPostContent";
import { ProgressPostContent } from "./ProgressPostContent";
import { AchievementPostContent } from "./AchievementPostContent";
import { ExplanationPostContent } from "./ExplanationPostContent";
import { StudyUpdatePostContent } from "./StudyUpdatePostContent";
import { ResourcePostContent } from "./ResourcePostContent";

/** Content-sharing types ask for help; personal-milestone types get congratulated. See AGENTS §7. */
const REACTION_BY_TYPE: Record<CommunityPostType, CommunityReactionKind> = {
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
  const { toggleReaction, toggleSave } = useCommunity();
  const [commentsOpen, setCommentsOpen] = useState(false);
  const reactionKind = REACTION_BY_TYPE[post.type];

  return (
    /*
     * `data-type` drives a coloured spine on the left edge — one mechanism,
     * applied consistently, so a question reads as something to answer and a win
     * reads as something to celebrate before you have read a word of either.
     * Every other property of the card stays identical, which is what keeps a
     * mixed feed calm.
     */
    <article className="cm-post" data-type={post.type}>
      <PostHeader author={post.author} createdAt={post.createdAt} />
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
        postId={post.id}
        comments={post.comments}
        open={commentsOpen}
        onExpand={() => setCommentsOpen(true)}
      />
    </article>
  );
}
