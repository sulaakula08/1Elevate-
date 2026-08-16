"use client";

import Link from "next/link";
import { SAT, subjectGradient, subjectsFor } from "@/data/exams";
import type { Account } from "@/lib/storage";
import { useApp } from "@/lib/app-state";
import { bankStats, statsFor } from "@/lib/bank-stats";
import { useI18n } from "@/lib/i18n";
import { maxScore, overall, pct, reviewQueue, weakTopics } from "@/lib/stats";
import { SubjectIllustration } from "./landing/SubjectIllustration";
import { CountUp, ProgressBar, Reveal } from "./motion";
import { ExamCountdown } from "./dashboard/ExamCountdown";
import { StudyActivity } from "./dashboard/StudyActivity";
import { CommunityPreview } from "./community/CommunityPreview";
import { useUnreleasedHrefs } from "@/lib/unreleased";

/** Slightly darker second stop, so each card is a gradient of its own hue. */
export function Dashboard({ account }: { account: Account }) {
  const { t, tx } = useI18n();
  const { data, bank } = useApp();
  const communityHidden = useUnreleasedHrefs().has("/community");

  const exam = SAT.exam;
  const examAttempts = data.attempts.filter((a) => a.exam === exam);
  const stats = overall(examAttempts);
  const totals = bankStats(bank);
  const queue = reviewQueue(data, bank);
  const weak = weakTopics(examAttempts, 2, 3);
  const lastMock = [...data.mocks].reverse().find((m) => m.exam === exam);
  const fresh = stats.total === 0;

  /*
   * Counted against the questions in the bank today, not against the whole
   * attempt log.
   *
   * Matching on subjectId alone counted answers to questions that have since
   * been deleted, while the denominator was the bank's current size — so a
   * student with older history saw "36 of 2 solved, 1800%". The numerator and
   * the denominator have to be drawn from the same set or the ratio is
   * meaningless.
   */
  const bankIds = new Map<string, Set<string>>();
  for (const question of bank) {
    const ids = bankIds.get(question.subjectId) ?? new Set<string>();
    ids.add(question.id);
    bankIds.set(question.subjectId, ids);
  }

  const solvedBySubject = new Map<string, number>();
  for (const [subjectId, ids] of bankIds) {
    const solved = new Set(
      data.attempts.filter((a) => a.correct && ids.has(a.questionId)).map((a) => a.questionId),
    );
    solvedBySubject.set(subjectId, solved.size);
  }

  /**
   * One shape for every metric. `rule` is a 0–1 progress value where the number
   * has a ceiling worth drawing; the rest carry a hint instead, because a bar
   * against an invented maximum is decoration pretending to be data.
   */
  const metrics = [
    {
      label: t("plan.answered"),
      value: stats.total,
      suffix: "",
      hint: `${t("plan.ofBank")} ${totals.total}`,
      rule: totals.total ? Math.min(1, stats.total / totals.total) : 0,
    },
    {
      label: t("plan.accuracy"),
      value: fresh ? 0 : Math.round(stats.accuracy * 100),
      suffix: fresh ? "" : "%",
      hint: fresh ? t("plan.noAttempts") : `${stats.correct} / ${stats.total}`,
      rule: fresh ? null : stats.accuracy,
    },
    {
      label: t("plan.queue"),
      value: queue.length,
      suffix: "",
      hint: queue.length === 0 ? t("plan.queueClear") : undefined,
      rule: null,
      action: queue.length > 0 ? { href: "/review", label: t("an.openQueue") } : undefined,
    },
  ];

  /**
   * The one thing to do next, chosen from what the student actually has in
   * front of them rather than invented. Order matters: a non-empty review queue
   * beats new practice, because the queue is made of questions already known to
   * be weak. Nothing here is personalised beyond what the data says.
   */
  const next =
    queue.length > 0
      ? {
          title: t("home.nextReview"),
          meta: t("home.nextReviewMeta"),
          cta: t("home.nextReviewCta"),
          href: "/review",
        }
      : totals.total > 0
        ? {
            title: t("home.nextPractice"),
            meta: t("home.nextPracticeMeta"),
            cta: t("home.nextPracticeCta"),
            href: "/practice",
          }
        : data.mocks.length === 0 && totals.total === 0
          ? // The empty-bank state used to send the student to Community, which
            // is the one place they now cannot go. Sent to their own progress
            // instead — a dead end on the day the app has least to show is the
            // worst possible one.
            communityHidden
            ? {
                title: t("home.nextPending"),
                meta: t("home.nextPendingAloneMeta"),
                cta: t("home.nextPendingAloneCta"),
                href: "/progress",
              }
            : {
                title: t("home.nextPending"),
                meta: t("home.nextPendingMeta"),
                cta: t("home.nextPendingCta"),
                href: "/community",
              }
          : {
              title: t("home.nextMock"),
              meta: t("home.nextMockMeta"),
              cta: t("home.startMock"),
              href: "/mock",
            };

  return (
    /*
     * Five sections, each opened by a small uppercase label and nothing else.
     *
     * The page used to run h2 + a brand-coloured icon + a button on every
     * section, which gave four different regions the same shout and left the
     * primary action competing with a heading that said "Question Bank". The
     * labels are now the quietest type on the page and the content is the
     * loudest, so hierarchy comes from what is in a section rather than from the
     * furniture around it.
     */
    <div className="container-app dash">
      {/* ---------------- level 1: what do I do now ---------------- */}
      <section className="dash-section">
        <p className="t-label">{t("home.today")}</p>
        <div className="pl-next">
          <div className="pl-next-copy">
            <h1 className="pl-next-title">{next.title}</h1>
            <p className="pl-next-meta">{next.meta}</p>
          </div>
          <Link href={next.href} className="pl-next-cta">
            {next.cta} <span aria-hidden>›</span>
          </Link>
        </div>
      </section>

      {/* ---------------- subjects: the other way in ---------------- */}
      <section className="dash-section">
        <div className="dash-head">
          <p className="t-label">{t("home.subjects")}</p>
          <Link href="/practice" className="dash-more">
            {t("bank.allSubjects")} <span aria-hidden>›</span>
          </Link>
        </div>

        {/* Two up only from lg. Between 640 and 1024 two columns gave each card
            about 310px — narrower than the same card on a phone, so a tablet
            showed less than a handset. One full-width card per row keeps the
            scene and the title on every screen that is not a desktop. */}
        <div className="grid lg:grid-cols-2 gap-3">
          {subjectsFor(exam).map((subject, i) => {
            const total = statsFor(totals, subject.id).total;
            const solved = solvedBySubject.get(subject.id) ?? 0;
            // Clamped: a ratio above 1 is always a counting mistake, and showing
            // 1800% teaches a student nothing except that the app is broken.
            const share = total ? Math.min(1, solved / total) : 0;
            return (
              <Reveal key={subject.id} delay={i * 70}>
                <Link
                  href="/practice"
                  className="bank-card"
                  style={subjectGradient(subject.id) as React.CSSProperties}
                >
                  {/* Text zone. The card is a grid, so nothing here can be
                      reached by the artwork beside it. */}
                  <span className="block min-w-0">
                    <span className="block bank-title">{tx(subject.name)}</span>

                    {/*
                      One statement of progress, not three.

                      The card used to print "0 of 0", "0%" and a filled bar —
                      the same fact three ways — and then an "Open ›" pill on a
                      surface that is already entirely a link. The count is the
                      honest figure when a bank is empty (a percentage of nothing
                      is not information), and the bar carries the proportion.

                      Each group stays on one line: at tablet widths the row was
                      breaking inside "0 of 0" and stacking the words.
                    */}
                    <span className="bank-stats">
                      <span className="num whitespace-nowrap">
                        {solved} {t("bank.of")} {total}
                      </span>
                      <span className="whitespace-nowrap">{t("bank.solved")}</span>
                      {total > 0 && (
                        <span className="num ml-auto font-semibold">{pct(share)}</span>
                      )}
                    </span>

                    <span className="block bank-track mt-2.5">
                      <span className="block bank-fill" style={{ width: `${share * 100}%` }} />
                    </span>
                  </span>

                  {/* The shared 2D subject illustration, clipped to its own
                      column and dropped when the card is too narrow to carry it. */}
                  <span className="bank-art">
                    <SubjectIllustration
                      kind={subject.id === "sat-math" ? "math" : "verbal"}
                    />
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- level 2 + 3: where am I, and am I consistent ----------------
          The score, the four supporting figures and the activity strip were
          three separate regions — a four-cell stat row, a bordered goal panel
          and a heading with one line of text under it. They answer one question
          between them, so they are one section: the score leads at display size,
          the figures sit beside it as a ruled list rather than as four equal
          columns, and the quarter of activity closes it. */}
      <section className="dash-section">
        <div className="dash-head">
          <p className="t-label">{t("home.progress")}</p>
          <Link href="/progress" className="dash-more">
            {t("an.viewAll")} <span aria-hidden>›</span>
          </Link>
        </div>

        <div className="dash-progress">
          {/*
            With no mock sat, there is no score — and a display-sized em dash
            where the number goes reads as a rendering fault, not as "not
            measured yet". So the target becomes the figure until there is a real
            one to replace it. The target is the student's own number, so nothing
            here is invented; only the label changes.
          */}
          <div className="dash-score">
            <p className="dash-score-row">
              <span className="num dash-score-value" data-zero={!lastMock}>
                {lastMock ? lastMock.score : account.targetScore}
              </span>
              <span className="dash-score-target">
                {lastMock ? (
                  <>
                    {t("home.ofTarget")} <span className="num">{account.targetScore}</span>
                  </>
                ) : (
                  t("home.targetLabel")
                )}
              </span>
            </p>

            <ProgressBar
              value={lastMock ? Math.min(1, lastMock.score / account.targetScore) : 0}
              tone="accent"
              className="mt-4"
            />

            <p className="dash-score-note">
              {lastMock ? t("home.bestMock") : t("home.noMockYet")} · {tx(SAT.name)}{" "}
              {t("common.total")} <span className="num">{maxScore(exam)}</span>
            </p>

            {/* Supporting figures as one inline ruled row, not four columns of
                headline numbers and not four cards. They are facts that qualify
                the score above them, so they are set at the weight of facts. */}
            <dl className="dash-metrics">
              {metrics.map((metric) => (
                <div key={metric.label} className="dash-metric">
                  <dt>
                    <span className="dash-metric-label">{metric.label}</span>
                    {metric.hint && <span className="dash-metric-hint">{metric.hint}</span>}
                  </dt>
                  <dd className="num dash-metric-value" data-zero={metric.value === 0}>
                    <CountUp value={metric.value} suffix={metric.suffix} />
                  </dd>
                </div>
              ))}
            </dl>

            <div className="dash-score-foot">
              <ExamCountdown inline />
              <Link href="/mock" className="btn btn-primary btn-sm">
                {t("home.startMock")}
              </Link>
            </div>
          </div>

          {/* Thirteen columns of 13px is about 217px wide: natural in this
              narrow column, and lost in the score column where it left a wide
              void to its right. Alone here, the two columns end up close enough
              in height that neither leaves a dead rectangle. */}
          <div className="dash-activity">
            <div className="dash-head dash-head-tight">
              <p className="t-label">{t("home.activity")}</p>
              <span className="text-micro text-faint">{t("home.actQuarter")}</span>
            </div>
            <StudyActivity attempts={data.attempts} />
          </div>
        </div>
      </section>

      {/* ---------------- level 4: what should I work on ---------------- */}
      {weak.length > 0 && (
        <section className="dash-section">
          <p className="t-label">{t("home.focus")}</p>
          <ul className="dash-focus">
            {weak.map((bucket) => (
              <li key={bucket.key}>
                <Link href="/practice" className="dash-focus-row">
                  <span className="dash-focus-name">{bucket.key}</span>
                  <span className="num dash-focus-pct">{pct(bucket.accuracy)}</span>
                  <ProgressBar
                    value={bucket.accuracy}
                    tone={bucket.accuracy < 0.5 ? "danger" : "accent"}
                    className="dash-focus-rule"
                  />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* ---------------- level 5: social signal ----------------
          Gone entirely until community launches. A preview of a feed nobody can
          open is an advert with a dead link on the end of it, and every row in
          it goes to /community. */}
      {!communityHidden && <CommunityPreview />}
    </div>
  );
}
