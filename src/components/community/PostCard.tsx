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
    <article className="card cm-post">
      <PostHeader author={post.author} createdAt={post.createdAt} />
      <div className="mt-3">
        <PostBody post={post} />
      </div>
      <PostActions
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
