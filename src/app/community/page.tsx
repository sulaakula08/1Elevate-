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

export default function CommunityPage() {
  return (
    <RequireAccount>
      <SectionGate section="community">
        <CommunityInner />
      </SectionGate>
    </RequireAccount>
  );
}

function CommunityInner() {
  const { t } = useI18n();
  const { ready, posts } = useCommunity();
  const [tab, setTab] = useState<FeedTabId>("for-you");
  const [composerOpen, setComposerOpen] = useState(false);
  const [composerType, setComposerType] = useState<CommunityPostType | null>(null);

  const openComposer = (type: CommunityPostType | null) => {
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
        // No follow graph yet (see AGENTS §17 "Future-ready integration") — empty by design.
        return [];
      case "for-you":
      default:
        return posts;
    }
  }, [posts, tab]);

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
              <EmptyTab tab={tab} onAsk={() => openComposer("question")} />
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

function EmptyTab({ tab, onAsk }: { tab: FeedTabId; onAsk: () => void }) {
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
  return (
    <EmptyFeedState
      title={t("community.emptyFollowingTitle")}
      body={t("community.emptyFollowingBody")}
    />
  );
}
