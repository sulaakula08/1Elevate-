"use client";

import type { CommunityPostType } from "@/data/community";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { POST_TYPE_ICON } from "./icons";

/**
 * The three things a student actually opens this page to do. Everything else
 * lives behind "More", which opens the same picker the prompt does.
 */
const QUICK_ACTIONS: { type: CommunityPostType; labelKey: string }[] = [
  { type: "question", labelKey: "community.quickAsk" },
  { type: "progress", labelKey: "community.quickProgress" },
  { type: "explanation", labelKey: "community.quickExplain" },
];

/**
 * Collapsed composer entry point — expands into ComposerModal on click, never
 * shows a bare textarea inline (see AGENTS §5).
 *
 * The avatar-plus-rounded-input-plus-chip-row arrangement this replaces is the
 * generic social composer, and on a phone its chip row scrolled sideways and cut
 * "Achievement" in half. The prompt now asks the question this product is for,
 * and the actions wrap instead of scrolling.
 */
export function CreatePostCard({ onOpen }: { onOpen: (type: CommunityPostType | null) => void }) {
  const { t } = useI18n();
  const { account } = useApp();

  return (
    <div className="cm-composer-entry">
      <button type="button" className="cm-composer-prompt" onClick={() => onOpen(null)}>
        <span
          className="grid place-items-center w-8 h-8 rounded-[var(--radius-pill)] text-micro font-semibold shrink-0"
          style={{ background: "var(--ink)", color: "var(--ink-contrast)" }}
          aria-hidden
        >
          {account?.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="text-body font-medium">{t("community.composerPrompt")}</span>
      </button>

      <div className="cm-composer-actions">
        {QUICK_ACTIONS.map((action) => {
          const Icon = POST_TYPE_ICON[action.type];
          return (
            <button
              key={action.type}
              type="button"
              className="cm-composer-action"
              onClick={() => onOpen(action.type)}
            >
              <Icon size={16} />
              {t(action.labelKey)}
            </button>
          );
        })}
        <button
          type="button"
          className="cm-composer-action cm-composer-more"
          onClick={() => onOpen(null)}
        >
          {t("community.quickMore")}
        </button>
      </div>
    </div>
  );
}
