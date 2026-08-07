"use client";

import { useRef } from "react";
import { useI18n } from "@/lib/i18n";

export type FeedTabId = "for-you" | "following" | "questions" | "wins";

const TABS: { id: FeedTabId; key: string }[] = [
  { id: "for-you", key: "community.tabForYou" },
  { id: "following", key: "community.tabFollowing" },
  { id: "questions", key: "community.tabQuestions" },
  { id: "wins", key: "community.tabWins" },
];

/** Lightweight pill tabs — reuses the app's .chip control rather than a new nav pattern. Horizontally scrollable on narrow screens. */
export function FeedTabs({
  active,
  onChange,
}: {
  active: FeedTabId;
  onChange: (id: FeedTabId) => void;
}) {
  const { t } = useI18n();
  const listRef = useRef<HTMLDivElement>(null);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key !== "ArrowRight" && event.key !== "ArrowLeft") return;
    event.preventDefault();
    const index = TABS.findIndex((tab) => tab.id === active);
    const next = event.key === "ArrowRight" ? (index + 1) % TABS.length : (index - 1 + TABS.length) % TABS.length;
    onChange(TABS[next].id);
    const btn = listRef.current?.querySelectorAll<HTMLButtonElement>("[role='tab']")[next];
    btn?.focus();
  };

  return (
    <div
      ref={listRef}
      role="tablist"
      aria-label={t("community.title")}
      className="cm-tabs"
      onKeyDown={onKeyDown}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          tabIndex={active === tab.id ? 0 : -1}
          className={`chip shrink-0 ${active === tab.id ? "chip-on" : ""}`}
          onClick={() => onChange(tab.id)}
        >
          {t(tab.key)}
        </button>
      ))}
    </div>
  );
}
