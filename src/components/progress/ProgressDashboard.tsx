"use client";

import { useMemo, useState } from "react";
import type { Account } from "@/lib/storage";
import { buildAnalytics } from "@/lib/analytics";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { reviewQueue } from "@/lib/stats";
import { EmptyState, PageTitle } from "@/components/ui";
import { Consistency, Records } from "./Consistency";
import { DifficultyBreakdown, SpeedAccuracy } from "./DifficultySpeed";
import { MasteryLegend, MasteryMap } from "./MasteryMap";
import { MockHistory } from "./MockHistory";
import { NextFocus, Opportunities, OpportunityTotal } from "./Opportunities";
import { PeriodComparison, Insights } from "./PeriodInsights";
import { ProgressHero } from "./ProgressHero";
import { Act, Chapter, ChapterNav, useMediaQuery } from "./primitives";
import { SectionBalance } from "./SectionBalance";
import { Trajectory } from "./Trajectory";

/**
 * The progress page, composed.
 *
 * Four acts, not eleven sections. The first pass gave every section the same
 * eyebrow, the same grey sentence and the same hairline, so a page with eleven
 * genuinely different things to say read as one long report. The acts are the
 * questions a student actually arrives with:
 *
 *   Standing   where am I, which way am I going, and what does that mean
 *   Skills     which half is weaker, which parts of it, and what it is costing
 *   Habits     why am I losing points, and am I turning up
 *   Mocks      and what happens under a clock
 *
 * Within an act, importance is carried by tier: a stage for the four signature
 * sections, open ground for the supporting ones, a strip for the detail.
 *
 * On a phone the four acts become four destinations rather than ten thousand
 * pixels of scroll — see ChapterNav. The first destination holds the standing,
 * the trajectory, the insights and the next action, so nothing needed to decide
 * what to do next is behind an interaction.
 *
 * Every section still reads from one analytics object, built once.
 */

type Act = "overview" | "skills" | "habits" | "mocks";

export function ProgressDashboard({ account }: { account: Account }) {
  const { t } = useI18n();
  const { data, bank, bankReady } = useApp();

  /*
   * One clock for the whole page, pinned on mount: every window, streak and
   * comparison is measured from the same instant, so two panels can never
   * disagree about where "the last 30 days" ends.
   */
  const [now] = useState(() => Date.now());
  const [act, setAct] = useState<Act>("overview");
  /** Null until measured, so the first frame lays out as the wide composition. */
  const phone = useMediaQuery("(max-width: 47.99rem)");
  const paged = phone === true;

  const analytics = useMemo(
    () =>
      buildAnalytics({
        attempts: data.attempts,
        mocks: data.mocks,
        bank,
        targetScore: account.targetScore,
        now,
      }),
    [account.targetScore, bank, data.attempts, data.mocks, now],
  );

  const queueLength = useMemo(() => reviewQueue(data, bank).length, [bank, data]);

  if (!analytics.any) {
    return (
      <div className="container-app">
        <PageTitle>{t("progress.title")}</PageTitle>
        <EmptyState
          tone="progress"
          title={t("progress.noDataTitle")}
          action={{ href: "/practice", label: t("nav.practice") }}
        >
          {t("progress.noData")}
        </EmptyState>
      </div>
    );
  }

  /* ---------------- the sections, each written once ---------------- */

  const command = (
    <Chapter tier={1} id="pg-command" title={t("pg.standing")}>
      <ProgressHero analytics={analytics} targetScore={account.targetScore} now={now} />
      {/* Inside the same stage, under a hairline that stops short of its edges:
          "where am I" and "which way am I going" are one thought. */}
      <div className="pg-stage-split">
        <Trajectory trend={analytics.trend} />
      </div>
    </Chapter>
  );

  const insights =
    analytics.insights.length > 0 ? (
      <Chapter tier={2} id="pg-insights" title={t("pg.insights")}>
        <Insights insights={analytics.insights} />
      </Chapter>
    ) : null;

  const opportunities = (
    <Chapter
      tier={1}
      id="pg-losing"
      title={t("pg.losing")}
      deck={
        analytics.opportunityTotal.domains > 0 ? undefined : t("pg.losingDeckEmpty")
      }
    >
      <div className="pg-opp-layout">
        <div className="pg-opp-total">
          <OpportunityTotal analytics={analytics} />
        </div>
        <div className="pg-opp-list">
          <Opportunities analytics={analytics} />
        </div>
        <div className="pg-opp-focus min-w-0">
          <h3 className="pg-zone">{t("pg.next")}</h3>
          <NextFocus analytics={analytics} queueLength={queueLength} />
        </div>
      </div>
    </Chapter>
  );

  const balance = (
    <Chapter tier={2} id="pg-sections" title={t("pg.sections")}>
      <SectionBalance analytics={analytics} />
    </Chapter>
  );

  const mastery = (
    <Chapter
      tier={1}
      id="pg-mastery"
      title={t("pg.mastery")}
      deck={t("pg.masteryDeck")}
      tools={<MasteryLegend />}
    >
      <MasteryMap domains={analytics.domains} bankReady={bankReady} />
    </Chapter>
  );

  const pacing = (
    <Chapter tier={2} id="pg-speed" title={t("pg.pacing")}>
      <div className="pg-aside">
        <DifficultyBreakdown levels={analytics.levels} />
        <SpeedAccuracy speed={analytics.speed} />
      </div>
    </Chapter>
  );

  const consistency = (
    <Chapter tier={2} id="pg-consistency" title={t("pg.consistency")}>
      <Consistency activity={analytics.activity} />
    </Chapter>
  );

  const records = (
    <Chapter tier={3} id="pg-records" title={t("pg.records")}>
      <Records milestones={analytics.milestones} />
      <PeriodComparison period={analytics.period} />
    </Chapter>
  );

  const mocks = analytics.mocks ? (
    <Chapter tier={1} id="pg-mocks" title={t("pg.mocks")}>
      <MockHistory mocks={analytics.mocks} targetScore={account.targetScore} />
    </Chapter>
  ) : null;

  /* ---------------- composition ---------------- */

  return (
    <div className="container-app pg">
      <PageTitle sub={paged ? undefined : t("pg.lead")}>{t("progress.title")}</PageTitle>

      {paged && (
        <ChapterNav
          value={act}
          onChange={setAct}
          options={[
            { value: "overview", label: t("pg.navOverview") },
            { value: "skills", label: t("pg.navSkills") },
            { value: "habits", label: t("pg.navHabits") },
            { value: "mocks", label: t("pg.navMocks") },
          ]}
        />
      )}

      {paged ? (
        <>
          {act === "overview" && (
            <>
              {command}
              {insights}
              {opportunities}
            </>
          )}
          {act === "skills" && (
            <>
              {balance}
              {mastery}
            </>
          )}
          {act === "habits" && (
            <>
              {pacing}
              {consistency}
              {records}
            </>
          )}
          {act === "mocks" && (mocks ?? <p className="pg-deck">{t("pg.mockNone")}</p>)}
        </>
      ) : (
        <>
          {command}
          {insights}

          <Act>{t("pg.actSkills")}</Act>
          {balance}
          {mastery}
          {opportunities}

          <Act>{t("pg.actHabits")}</Act>
          {pacing}
          {consistency}
          {records}

          {mocks && (
            <>
              <Act>{t("pg.actMocks")}</Act>
              {mocks}
            </>
          )}
        </>
      )}
    </div>
  );
}
