"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useApp } from "./app-state";
import { useI18n } from "./i18n";
import { useCommunity } from "./community-state";
import { useSettings } from "./settings";
import { useUnreleasedHrefs } from "./unreleased";
import { loadSeenNotifications, saveSeenNotifications } from "./storage";
import { apiFetch } from "./supabase/client";
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

export type NotificationKind = "community" | "task" | "account" | "people";

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

type Signup = { id: string; name: string; email: string; at: number };

/**
 * People who have joined, for an admin.
 *
 * The only item in this list that cannot be computed from what the browser
 * already holds — a signup happens on someone else's device — so it is the one
 * that needs a request. Fetched once when an admin loads the app and again
 * whenever they come back to the tab, which is when a person actually looks at
 * the bell. Nothing is polled: an admin who leaves the tab open all day should
 * not generate a request a minute for news that keeps until they return.
 *
 * Anyone who is not an admin never makes the request at all, so the route's 403
 * is a backstop rather than something a student meets in normal use.
 */
function useRecentSignups(enabled: boolean): Signup[] {
  const [signups, setSignups] = useState<Signup[]>([]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    if (!enabled) {
      setSignups([]);
      return;
    }
    let live = true;

    const load = async () => {
      try {
        const response = await apiFetch("/api/admin/signups");
        if (!live || !response.ok) return;
        const body = (await response.json()) as { signups: Signup[] };
        setSignups(body.signups);
      } catch {
        // Offline, or the route is not deployed yet: the rest of the list still
        // works, and this is not worth an error message in a bell.
      }
    };

    void load();
    const onFocus = () => void load();
    window.addEventListener("focus", onFocus);
    return () => {
      live = false;
      window.removeEventListener("focus", onFocus);
    };
  }, [enabled]);
  /* eslint-enable react-hooks/set-state-in-effect */

  return signups;
}

export function useNotifications() {
  const { t } = useI18n();
  const { account, data, bank } = useApp();
  const { posts } = useCommunity();
  const { settings } = useSettings();
  const communityHidden = useUnreleasedHrefs().has("/community");

  const [seenAt, setSeenAt] = useState(0);

  const isAdmin = account?.role === "admin" || account?.role === "owner";
  const signups = useRecentSignups(Boolean(isAdmin) && settings.notifications);

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

    /* ---------------- new people, for admins ----------------
       One item per person rather than "4 new students this week": a count
       cannot be opened, and the name is the part an admin acts on — it is what
       they look up when a question arrives from someone they do not recognise.
       Their own signup is skipped, which otherwise greets every new admin with
       a notification about themselves. */
    for (const person of signups) {
      if (person.id === account.id) continue;
      out.push({
        id: `j-${person.id}`,
        kind: "people",
        title: `${person.name} ${t("notif.joined")}`,
        body: person.email,
        at: person.at,
        href: "/admin",
      });
    }

    return out.sort((a, b) => b.at - a.at).slice(0, 30);
  }, [account, bank, communityHidden, data, posts, settings.notifications, signups, t]);

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
