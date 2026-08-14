"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "./app-state";
import { useI18n } from "./i18n";
import { useCommunity } from "./community-state";
import { useSettings } from "./settings";
import { useUnreleasedHrefs } from "./unreleased";
import { loadSeenNotifications, saveSeenNotifications } from "./storage";
import { reviewQueue, streak } from "./stats";

/**
 * The notification list, derived rather than stored.
 *
 * Nothing here is a push message and nothing is written to a table: every item
 * is computed from data the app already holds, so there is no separate feed to
 * keep in step with reality and no way for a notification to outlive the thing
 * it is about. A read queue that empties makes its notification disappear,
 * which is the correct behaviour and would take a background job to achieve any
 * other way.
 *
 * Unread is "happened since you last opened the list". Items with no timestamp
 * of their own — a review queue, a streak about to lapse — are dated to the
 * moment they became true, so they can go unread once and then settle.
 */

export type NotificationKind = "community" | "task" | "account";

export type AppNotification = {
  id: string;
  kind: NotificationKind;
  title: string;
  body?: string;
  /** Epoch ms. Drives both ordering and the unread cut-off. */
  at: number;
  href: string;
};

const DAY = 86_400_000;

export function useNotifications() {
  const { t } = useI18n();
  const { account, data, bank } = useApp();
  const { posts } = useCommunity();
  const { settings } = useSettings();
  const communityHidden = useUnreleasedHrefs().has("/community");

  const [seenAt, setSeenAt] = useState(0);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSeenAt(loadSeenNotifications());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const items = useMemo<AppNotification[]>(() => {
    if (!account || !settings.notifications) return [];
    const out: AppNotification[] = [];

    /* ---------------- community ----------------
       Replies to posts this account wrote. Matched on the author id, so a post
       from before ids were carried simply does not match — better than guessing
       from a display name two students could share.

       Skipped wholesale while community is unreleased: every one of these links
       to /community, and a notification a student cannot follow is worse than no
       notification — it advertises a section, then refuses them at the door. */
    for (const post of communityHidden ? [] : posts) {
      if (post.author.id !== account.id) continue;
      for (const comment of post.comments) {
        if (comment.author.id === account.id) continue;
        out.push({
          id: `c-${comment.id}`,
          kind: "community",
          title: `${comment.author.name} ${t("notif.replied")}`,
          body: comment.text,
          at: comment.createdAt,
          href: "/community",
        });
      }

      const reactions = post.reactions.helpful + post.reactions.congrats;
      if (reactions > 0) {
        out.push({
          id: `r-${post.id}-${reactions}`,
          kind: "community",
          title: `${reactions} ${t("notif.reactions")}`,
          body: post.text ?? post.explanation?.title ?? post.question?.prompt,
          // The post's own time: a reaction count carries no timestamp, and
          // dating it "now" would make it permanently unread.
          at: post.createdAt,
          href: "/community",
        });
      }
    }

    /* ---------------- tasks ---------------- */
    const queue = reviewQueue(data, bank);
    if (queue.length > 0) {
      // Dated to the newest wrong answer: the queue became worth mentioning
      // then. Falling back to the newest attempt of any kind rather than to the
      // current time keeps this memo pure — and a queue with no attempts behind
      // it cannot exist anyway.
      const newestWrong = data.attempts.reduce(
        (latest, a) => (!a.correct ? Math.max(latest, a.at) : latest),
        0,
      );
      const newestAny = data.attempts.reduce((latest, a) => Math.max(latest, a.at), 0);
      out.push({
        id: `q-${queue.length}`,
        kind: "task",
        title: `${queue.length} ${t("notif.inQueue")}`,
        body: t("notif.inQueueBody"),
        at: newestWrong || newestAny,
        href: "/review",
      });
    }

    /* ---------------- the account's own streak ----------------
       Only when it is real and today is still empty: a streak notice that fires
       after the day's practice is noise. */
    const days = streak(data.attempts);
    const practisedToday = data.attempts.some((a) => a.at >= startOfToday());
    if (days > 0 && !practisedToday) {
      out.push({
        id: `s-${days}-${dayStamp()}`,
        kind: "account",
        title: `${t("notif.streakAt")} ${days}`,
        body: t("notif.streakBody"),
        at: startOfToday(),
        href: "/practice",
      });
    }

    return out.sort((a, b) => b.at - a.at).slice(0, 30);
  }, [account, bank, communityHidden, data, posts, settings.notifications, t]);

  const unread = useMemo(() => items.filter((item) => item.at > seenAt).length, [items, seenAt]);

  /** Called when the panel opens: everything currently listed becomes read. */
  const markSeen = useCallback(() => {
    const at = Date.now();
    saveSeenNotifications(at);
    setSeenAt(at);
  }, []);

  return { items, unread, markSeen, enabled: settings.notifications };
}

function startOfToday(): number {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Day-stamped id, so a streak reminder is one notification per day, not per render. */
function dayStamp(): string {
  return String(Math.floor(Date.now() / DAY));
}
