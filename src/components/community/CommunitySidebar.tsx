"use client";

import { TRENDING_TAGS, WEEKLY_CHALLENGE, WEEKLY_LEADERS } from "@/data/community";
import { useI18n } from "@/lib/i18n";
import { ProgressBar } from "@/components/motion";

/**
 * Right-rail context modules. Leaderboard and Challenges have no real feature
 * behind them yet, so their CTAs are disabled previews rather than links into
 * pages that don't exist — see AGENTS §9.
 */
export function CommunitySidebar() {
  const { t } = useI18n();

  return (
    <div className="space-y-4">
      <section className="panel p-4">
        <p className="label-xs mb-3">{t("community.sidebarLeaders")}</p>
        <ol className="space-y-2.5">
          {WEEKLY_LEADERS.map((leader, i) => (
            <li key={leader.name} className="flex items-center gap-2.5 text-[13.5px]">
              <span className="num text-faint w-4 shrink-0">{i + 1}</span>
              <span className="truncate flex-1">{leader.name}</span>
              <span className="num text-muted shrink-0">{leader.xp.toLocaleString("ru-RU")} XP</span>
            </li>
          ))}
        </ol>
        <button type="button" className="btn btn-sm mt-3.5 w-full" disabled title={t("community.sidebarViewLeaderboard")}>
          {t("community.sidebarViewLeaderboard")}
        </button>
      </section>

      <section className="panel p-4">
        <p className="label-xs mb-2">{t("community.sidebarChallenge")}</p>
        <p className="text-[14.5px] font-medium">{WEEKLY_CHALLENGE.title}</p>
        <p className="text-[12.5px] text-muted mt-0.5">{WEEKLY_CHALLENGE.description}</p>
        <div className="mt-3">
          <div className="flex items-baseline justify-between text-[12.5px] mb-1.5">
            <span className="num font-medium">
              {WEEKLY_CHALLENGE.current} / {WEEKLY_CHALLENGE.target}
            </span>
          </div>
          <ProgressBar value={WEEKLY_CHALLENGE.current / WEEKLY_CHALLENGE.target} tone="accent" />
        </div>
        <button type="button" className="btn btn-sm mt-3.5 w-full" disabled title={t("community.sidebarChallengeContinue")}>
          {t("community.sidebarChallengeContinue")}
        </button>
      </section>

      <section className="panel p-4">
        <p className="label-xs mb-3">{t("community.sidebarTrending")}</p>
        <div className="flex flex-wrap gap-1.5">
          {TRENDING_TAGS.map((tag) => (
            <span key={tag} className="badge">
              {tag}
            </span>
          ))}
        </div>
      </section>
    </div>
  );
}
