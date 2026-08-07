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
import { CommunitySidebar } from "@/components/community/CommunitySidebar";
import { EmptyFeedState } from "@/components/community/EmptyFeedState";

export default function CommunityPage() {
  return (
    <RequireAccount>
      <CommunityInner />
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
      <div className="grid xl:grid-cols-[minmax(0,42rem)_18rem] gap-8 items-start">
        <div className="min-w-0 max-w-2xl">
          <div className="pt-8 pb-5">
            <h1 className="display fade-up text-[1.75rem] sm:text-[2.1rem]">{t("community.title")}</h1>
            <p className="fade-in mt-2 text-[14.5px] text-muted">{t("community.subtitle")}</p>
          </div>

          <FeedTabs active={tab} onChange={setTab} />

          <div className="mt-4">
            <CreatePostCard onOpen={openComposer} />
          </div>

          <div className="mt-4 space-y-4 pb-16">
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

        <aside className="hidden xl:block sticky top-6 pt-8">
          <CommunitySidebar />
        </aside>
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
