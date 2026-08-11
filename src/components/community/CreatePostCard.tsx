"use client";

import type { CommunityPostType } from "@/data/community";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { POST_TYPE_ICON } from "./icons";

/**
 * Two ways in, and that is the whole design.
 *
 * This used to be a prompt plus four chips, and every one of them opened a
 * screen asking you to choose between Ask a Question, Share Progress, Explain
 * Something, Study Update, Achievement and Share Resource. A test user called it
 * intimidating, which it was: it made you learn the difference between an
 * explanation and a study update before you had written a word, and five of
 * those six are things the product should eventually write for you from real
 * study data.
 *
 * So there is one decision left, and it is the only one a person actually has:
 * am I saying something, or am I stuck. Each button goes straight to its form —
 * no picker in between.
 */
export function CreatePostCard({ onOpen }: { onOpen: (type: CommunityPostType) => void }) {
  const { t } = useI18n();
  const { account } = useApp();
  const AskIcon = POST_TYPE_ICON.question;

  return (
    <div className="cm-composer-entry">
      <button type="button" className="cm-composer-prompt" onClick={() => onOpen("post")}>
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
        <button
          type="button"
          className="cm-composer-action"
          onClick={() => onOpen("question")}
        >
          <AskIcon size={16} />
          {t("community.quickAsk")}
        </button>
      </div>
    </div>
  );
}
