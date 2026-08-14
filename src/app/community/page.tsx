"use client";

import { useMemo, useState } from "react";
import type { CommunityPostType } from "@/data/community";
import { useCommunity } from "@/lib/community-state";
import { useI18n } from "@/lib/i18n";
import { RequireAccount } from "@/components/ui";
import { FeedTabs, type FeedTabId } from "@/components/community/FeedTabs";
import { CreatePostCard } from "@/components/community/CreatePostCard";
import { ComposerModal } from "@/components/community/ComposerModal";
import { PostCard } from "@/components/community/PostCard";
import { EmptyFeedState } from "@/components/community/EmptyFeedState";
import { SectionGate } from "@/components/SectionGate";
import { ComingSoonGate } from "@/components/ComingSoon";

export default function CommunityPage() {
  return (
    <RequireAccount>
      {/* Two gates, outermost first. "Not launched" is the stronger statement —
          a student turned away here should be told the section is coming, not
          that it is temporarily down — and it is the one the owner's
          maintenance switch cannot override. */}
      <ComingSoonGate section="community">
        <SectionGate section="community">
          <CommunityInner />
        </SectionGate>
      </ComingSoonGate>
    </RequireAccount>
  );
}

function CommunityInner() {
  const { t } = useI18n();
  const { ready, posts, following } = useCommunity();
  const [tab, setTab] = useState<FeedTabId>("for-you");
  const [composerOpen, setComposerOpen] = useState(false);
  /* Always a concrete type now: the entry composer opens either an ordinary post
     or a question, and the "what would you like to share?" screen in between is
     gone. */
  const [composerType, setComposerType] = useState<CommunityPostType>("post");

  const openComposer = (type: CommunityPostType) => {
    setComposerType(type);
    setComposerOpen(true);
  };

  const filtered = useMemo(() => {
    switch (tab) {
      case "questions":
        return posts.filter((p) => p.type === "question");
      case "wins":
        return posts.filter((p) => p.type === "progress" || p.type === "achievement");
      case "following":
        /*
         * Filtered from the real follow rows, not from anything invented. Every
         * post type is included, so a question from someone you follow still
         * behaves like a question here.
         *
         * The filter runs over the same page of posts the other tabs use, which
         * is what makes this consistent with Questions and Wins — and what limits
         * it: a followed student whose newest post falls outside that page will
         * not appear. See the note beside FEED_LIMIT in the API route.
         */
        return posts.filter((p) => p.author.id && following.includes(p.author.id));
      case "for-you":
      default:
        return posts;
    }
  }, [posts, tab, following]);

  return (
    <>
      {/* One centred column. The right rail held a leaderboard, a weekly
          challenge and a trending list — all three were fixed demo content with
          no feature behind them, so they promised things the product does not
          do. With them gone the feed gets the whole width. */}
      <div className="container-read">
        <div className="min-w-0">
          {/* A compact entry. A display-sized title over "Learn together.
              Improve together." spent the first 140px of the page on a slogan
              before any student's work appeared; the title now sits on the same
              line as the tabs on desktop, and the feed starts near the top. */}
          <div className="cm-head">
            <h1 className="t-h2 shrink-0">{t("community.title")}</h1>
            <FeedTabs active={tab} onChange={setTab} />
          </div>

          <div className="mt-4">
            <CreatePostCard onOpen={openComposer} />
          </div>

          <div className="cm-feed mt-2 pb-16">
            {!ready ? (
              <>
                <div className="skeleton h-44 rounded-xl" />
                <div className="skeleton h-44 rounded-xl" />
              </>
            ) : filtered.length === 0 ? (
              <EmptyTab
                tab={tab}
                followsAnyone={following.length > 0}
                onAsk={() => openComposer("question")}
              />
            ) : (
              filtered.map((post) => <PostCard key={post.id} post={post} />)
            )}
          </div>
        </div>
      </div>

      {composerOpen && (
        <ComposerModal initialType={composerType} onClose={() => setComposerOpen(false)} />
      )}
    </>
  );
}

function EmptyTab({
  tab,
  followsAnyone,
  onAsk,
}: {
  tab: FeedTabId;
  /** Distinguishes the two ways the Following tab can be empty. */
  followsAnyone: boolean;
  onAsk: () => void;
}) {
  const { t } = useI18n();

  if (tab === "questions") {
    return (
      <EmptyFeedState
        title={t("community.emptyQuestionsTitle")}
        body={t("community.emptyQuestionsBody")}
        action={{ label: t("community.emptyQuestionsAction"), onClick: onAsk }}
      />
    );
  }
  if (tab === "wins") {
    return <EmptyFeedState title={t("community.emptyWinsTitle")} body={t("community.emptyWinsBody")} />;
  }
  /*
   * Two different facts, and telling them apart matters: "follow classmates to
   * fill this tab" is useless advice to someone who already follows four people,
   * and reads as though their follows were lost.
   */
  return followsAnyone ? (
    <EmptyFeedState
      title={t("community.emptyFollowingQuietTitle")}
      body={t("community.emptyFollowingQuietBody")}
    />
  ) : (
    <EmptyFeedState
      title={t("community.emptyFollowingTitle")}
      body={t("community.emptyFollowingBody")}
    />
  );
}
