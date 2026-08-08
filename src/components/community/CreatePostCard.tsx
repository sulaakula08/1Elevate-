"use client";

import type { CommunityPostType } from "@/data/community";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { POST_TYPE_ICON } from "./icons";

const QUICK_ACTIONS: { type: CommunityPostType; labelKey: string }[] = [
  { type: "question", labelKey: "community.postTypeQuestion" },
  { type: "progress", labelKey: "community.postTypeProgress" },
  { type: "achievement", labelKey: "community.postTypeAchievement" },
];

/** Collapsed composer entry point — expands into ComposerModal on click, never shows a bare textarea inline (see AGENTS §5). */
export function CreatePostCard({ onOpen }: { onOpen: (type: CommunityPostType | null) => void }) {
  const { t } = useI18n();
  const { account } = useApp();

  return (
    <div className="panel p-3.5 cm-composer-entry">
      <button type="button" className="cm-composer-prompt" onClick={() => onOpen(null)}>
        <span
          className="grid place-items-center w-9 h-9 rounded-full text-[12px] font-semibold shrink-0"
          style={{ background: "var(--ink)", color: "var(--ink-contrast)" }}
          aria-hidden
        >
          {account?.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="text-[14px] text-muted">{t("community.composerPrompt")}</span>
      </button>

      <div className="flex items-center gap-1.5 mt-3 pt-3 border-t overflow-x-auto">
        {QUICK_ACTIONS.map((action) => (
          <button
            key={action.type}
            type="button"
            className="chip shrink-0"
            onClick={() => onOpen(action.type)}
          >
            {(() => {
              const Icon = POST_TYPE_ICON[action.type];
              return <Icon size={16} />;
            })()}
            {t(action.labelKey)}
          </button>
        ))}
      </div>
    </div>
  );
}
