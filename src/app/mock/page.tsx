"use client";

import { useCallback, useState } from "react";
import { SAT, getSubject, subjectColor, subjectColorSoft } from "@/data/exams";
import type { Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { fillMissingQuestions } from "@/lib/generation/client";
import { generatedIds, recordProvenance } from "@/lib/generation/provenance";
import { fillRequests, shortfall } from "@/lib/generation/shortfall";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";
import type { Attempt, MockResult, MockSectionResult } from "@/lib/storage";
import { maxScore, pct, scaleScore, shuffle } from "@/lib/stats";
import { MockRunner, type MockAnswers, type MockSection } from "@/components/MockRunner";
import { QuestionView } from "@/components/QuestionView";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { CountUp, ProgressBar, Reveal } from "@/components/motion";
import { ProgressMark, SuccessTick } from "@/components/illustrations";

export default function MockPage() {
  return (
    <RequireAccount>
      <MockInner />
    </RequireAccount>
  );
}

type Report = {
  result: Omit<MockResult, "id">;
  sections: MockSection[];
  answers: MockAnswers;
};

function MockInner() {
  const { t, tx } = useI18n();
  const { account, bank, data, recordAttempts, recordMock, saveQuestion } = useApp();
  const [sections, setSections] = useState<MockSection[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [filling, setFilling] = useState(false);
  const [made, setMade] = useState(0);
  const [fillNote, setFillNote] = useState<string | null>(null);

  const exam = SAT.exam;
  const blueprint = SAT;
  const gap = shortfall(bank, blueprint);

  /**
   * Tops the bank up to what a full test needs.
   *
   * Generation is server-side — the API key never reaches the browser — and
   * every draft is validated against the `Question` schema twice, once on the
   * route and once here, before it can reach a test. Whatever survives is
   * persisted through the same `saveQuestion` path the admin editor uses, so a
   * filled bank stays filled for the next attempt. Provenance is stored beside
   * the bank rather than inside `Question`, which keeps the shared question type
   * free of a concern only generated items have.
   *
   * Failure is never fatal: the modules simply stay short and the student is
   * told, which is the state the screen was already able to render.
   */
  const fill = useCallback(async () => {
    const requests = fillRequests(bank, blueprint);
    if (requests.length === 0) return;

    setFilling(true);
    setMade(0);
    setFillNote(null);
    try {
      const outcome = await fillMissingQuestions(requests, {
        takenIds: new Set(bank.map((q) => q.id)),
        onProgress: setMade,
      });
      for (const question of outcome.questions) saveQuestion(question);
      if (Object.keys(outcome.provenance).length) recordProvenance(outcome.provenance);

      setFillNote(
        outcome.status === "complete"
          ? t("plan.mockGenerated")
          : outcome.status === "unavailable"
            ? t("plan.mockGenUnavailable")
            : outcome.questions.length > 0
              ? t("plan.mockGenPartial")
              : t("plan.mockGenFailed"),
      );
    } catch (error) {
      if (process.env.NODE_ENV !== "production") console.error("[mock:fill]", error);
      setFillNote(t("plan.mockGenFailed"));
    } finally {
      setFilling(false);
    }
  }, [bank, blueprint, saveQuestion, t]);

  /** The four SAT modules, filled as far as the bank allows. */
  const buildSections = useCallback((): MockSection[] => {
    // The two modules of a subject must not repeat an item, so each subject
    // deals from its own shuffled deck.
    const decks = new Map<string, Question[]>();

    return blueprint.sections
      .map((section) => {
        if (!decks.has(section.subjectId)) {
          decks.set(
            section.subjectId,
            shuffle(bank.filter((q) => q.subjectId === section.subjectId)),
          );
        }
        const deck = decks.get(section.subjectId)!;
        const questions = deck.splice(0, section.count);
        const subject = getSubject(section.subjectId);
        const base = subject ? tx(subject.name) : section.subjectId;
        return {
          subjectId: section.subjectId,
          module: section.module,
          name: `${base} · ${t("mock.module")} ${section.module}`,
          // Shorten the clock proportionally when the bank is short on questions.
          minutes: Math.max(
            1,
            Math.round((section.minutes * questions.length) / Math.max(1, section.count)),
          ),
          questions,
        };
      })
      .filter((section) => section.questions.length > 0);
  }, [bank, blueprint, t, tx]);

  const plan = buildSections();
  const plannedTotal = blueprint.sections.reduce((sum, s) => sum + s.count, 0);
  const availableTotal = plan.reduce((sum, s) => sum + s.questions.length, 0);

  const finish = useCallback(
    (built: MockSection[], answers: MockAnswers, msSpent: number) => {
      const sectionResults: MockSectionResult[] = [];
      const attempts: Attempt[] = [];
      const wrong: string[] = [];
      const totalQuestions = built.reduce((sum, s) => sum + s.questions.length, 0);
      const msPerQuestion = totalQuestions ? Math.round(msSpent / totalQuestions) : 0;
      const now = Date.now();

      for (const section of built) {
        let correct = 0;
        for (const question of section.questions) {
          const chosen = answers[question.id];
          const isCorrect = chosen === question.answer;
          if (isCorrect) correct += 1;
          else wrong.push(question.id);
          attempts.push({
            questionId: question.id,
            subjectId: question.subjectId,
            exam: question.exam,
            topic: question.topic,
            difficulty: question.difficulty,
            // −1 marks a question left blank when the timer ran out.
            chosen: chosen ?? -1,
            correct: isCorrect,
            mode: "mock",
            at: now,
            ms: msPerQuestion,
          });
        }
        sectionResults.push({
          subjectId: section.subjectId,
          correct,
          total: section.questions.length,
        });
      }

      const correctTotal = sectionResults.reduce((sum, s) => sum + s.correct, 0);
      const score = scaleScore(exam, correctTotal, totalQuestions);

      const result: Omit<MockResult, "id"> = {
        exam,
        at: now,
        sections: sectionResults,
        correct: correctTotal,
        total: totalQuestions,
        score,
        wrong,
      };

      recordAttempts(attempts);
      recordMock(result);
      setSections(null);
      setReport({ result, sections: built, answers });
    },
    [exam, recordAttempts, recordMock],
  );

  if (sections) {
    return (
      <MockRunner
        sections={sections}
        onFinish={(answers, msSpent) => finish(sections, answers, msSpent)}
        onExit={() => setSections(null)}
      />
    );
  }

  if (report) {
    const wrongQuestions: Question[] = report.sections
      .flatMap((s) => s.questions)
      .filter((q) => report.result.wrong.includes(q.id));
    const hitGoal = report.result.score >= account!.targetScore;

    return (
      <div className="max-w-2xl mx-auto pt-12 pb-20">
        <div className="text-center fade-in">
          {hitGoal ? (
            <SuccessTick className="mx-auto" size={48} />
          ) : (
            <ProgressMark className="mx-auto" size={48} />
          )}
          <p className="label-xs mt-6">{t("mock.scoreReport")}</p>
          <p className="num mt-3 text-6xl font-medium">
            <CountUp value={report.result.score} />
          </p>
          <p className="mt-2 text-[14px] text-muted">
            / {maxScore(exam)} · {t("home.targetScore")}{" "}
            <span className="num">{account!.targetScore}</span>
          </p>
          <div className="max-w-xs mx-auto mt-6">
            <ProgressBar value={report.result.score / Math.max(1, account!.targetScore)} />
          </div>
          <p className="num mt-4 text-[14px] text-faint">
            {report.result.correct}/{report.result.total} ·{" "}
            {pct(report.result.total ? report.result.correct / report.result.total : 0)}
          </p>
        </div>

        <section className="mt-14">
          <p className="label-xs">{t("mock.perSection")}</p>
          {/* Section results share order with report.sections, which carries the
              display name (including the SAT module number). */}
          <ul className="mt-4 space-y-2.5">
            {report.result.sections.map((section, i) => {
              const accuracy = section.total ? section.correct / section.total : 0;
              const label = report.sections[i]?.name ?? section.subjectId;
              const subject = getSubject(section.subjectId);
              return (
                <li
                  key={`${section.subjectId}-${i}`}
                  className="card-tone p-4"
                  style={{
                    ["--tone" as string]: subjectColor(section.subjectId),
                    ["--tone-soft" as string]: subjectColorSoft(section.subjectId),
                  }}
                >
                  <div className="flex items-center gap-3">
                    {subject && <span className="glyph glyph-sm">{subject.glyph}</span>}
                    <span className="text-[14.5px] min-w-0 truncate">{label}</span>
                    <span className="num ml-auto text-[14px] text-muted">
                      {section.correct}/{section.total}
                    </span>
                  </div>
                  <ProgressBar
                    value={accuracy}
                    tone={accuracy < 0.5 ? "danger" : "accent"}
                    className="mt-3"
                  />
                </li>
              );
            })}
          </ul>
        </section>

        {wrongQuestions.length > 0 && (
          <section className="mt-14">
            <p className="label-xs">{t("mock.reviewMistakes")}</p>
            <div className="mt-6 space-y-12">
              {wrongQuestions.map((question) => (
                <div key={question.id} className="pt-8 border-t first:border-t-0 first:pt-0">
                  <p className="label-xs mb-4">{question.topic}</p>
                  <QuestionView
                    question={question}
                    selected={report.answers[question.id] ?? null}
                    onSelect={() => {}}
                    revealed
                    disabled
                  />
                </div>
              ))}
            </div>
          </section>
        )}

        <button className="btn mt-14" onClick={() => setReport(null)}>
          {t("common.back")}
        </button>
      </div>
    );
  }

  const complete = availableTotal >= plannedTotal;
  const generated = generatedIds();

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle sub={t("plan.mockSub")}>{t("plan.mockTitle")}</PageTitle>

      {plan.length === 0 ? (
        <EmptyState>{t("practice.empty")}</EmptyState>
      ) : (
        <>
          {/* What the test is, before what it is made of. */}
          <div className="pl-spec">
            <div className="pl-spec-cell">
              <p className="pl-spec-label">{t("plan.mockTotal")}</p>
              <p className="pl-spec-value">
                {availableTotal}
                {!complete && <span className="text-faint"> / {plannedTotal}</span>}
              </p>
            </div>
            <div className="pl-spec-cell">
              <p className="pl-spec-label">{t("plan.mockDuration")}</p>
              <p className="pl-spec-value">
                {plan.reduce((sum, s) => sum + s.minutes, 0)}{" "}
                <span className="text-[13px] font-normal text-muted">{t("common.minutes")}</span>
              </p>
            </div>
            <div className="pl-spec-cell">
              <p className="pl-spec-label">{t("plan.mockScale")}</p>
              <p className="pl-spec-value">
                {blueprint.minScore}–{blueprint.maxScore}
              </p>
            </div>
          </div>

          <p className="label-xs mt-8">
            {t("plan.mockModules")} · {pluralize(plan.length, NOUNS.module)}
          </p>
          <ol className="mt-3 space-y-2">
            {plan.map((section, i) => (
              <Reveal as="li" key={`${section.subjectId}-${i}`} delay={i * 50}>
                <div
                  className="pl-module"
                  style={{ ["--tone" as string]: subjectColor(section.subjectId) }}
                >
                  <span className="glyph glyph-sm" aria-hidden>
                    {i + 1}
                  </span>
                  <span className="pl-module-name">{section.name}</span>
                  <span className="pl-module-meta">
                    {pluralize(section.questions.length, NOUNS.question)} · {section.minutes}{" "}
                    {t("common.minutes")}
                  </span>
                </div>
              </Reveal>
            ))}
          </ol>

          {/* Whether the test is whole, and — if not — what can be done about it.
              Framed as a capability rather than as a defect report: a student
              reading this should understand the option, not doubt the product. */}
          <div className="mt-6">
            {complete ? (
              <p className="text-[13px] text-muted">
                ✓ {t("plan.mockReady")}
                {generated.size > 0 && (
                  <>
                    {" · "}
                    <span className="num">{generated.size}</span> {t("plan.aiInBank")}
                  </>
                )}
              </p>
            ) : (
              <div className="pl-notice">
                <p className="pl-notice-title">
                  <span className="pl-ai-badge">{t("plan.aiBadge")}</span>
                  {t("plan.mockPartial")}
                </p>
                <p className="pl-notice-body">{t("plan.mockShortBody")}</p>

                <div className="pl-notice-actions">
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={filling}
                    onClick={fill}
                  >
                    {filling
                      ? `${t("plan.mockGenerating")} ${made > 0 ? made : ""}`.trim()
                      : `${t("plan.mockGenerate")} · ${gap.missing}`}
                  </button>
                  <button
                    className="btn btn-sm"
                    disabled={filling}
                    onClick={() => setSections(buildSections())}
                  >
                    {t("plan.mockShortenedOk")}
                  </button>
                </div>

                {fillNote && <p className="pl-notice-body">{fillNote}</p>}
              </div>
            )}
          </div>

          <button
            className="btn btn-primary btn-lg mt-8"
            disabled={filling}
            onClick={() => setSections(buildSections())}
          >
            {t("mock.begin")}
          </button>
        </>
      )}

      <section className="mt-16 pt-10 border-t">
        <p className="label-xs">{t("mock.history")}</p>
        {data.mocks.length === 0 ? (
          <EmptyState>{t("mock.noHistory")}</EmptyState>
        ) : (
          <ul className="mt-4 border-t">
            {[...data.mocks].reverse().map((mock) => (
              <li key={mock.id} className="flex items-baseline gap-4 py-4 border-b text-[14px]">
                <span className="num text-[11px] text-faint uppercase w-8">{mock.exam}</span>
                <span className="text-muted">{new Date(mock.at).toLocaleDateString()}</span>
                <span className="num ml-auto text-[16px]">
                  {mock.score}
                  <span className="text-faint text-[13px]">/{maxScore(mock.exam)}</span>
                </span>
                <span className="num text-[13px] text-faint w-12 text-right">
                  {mock.correct}/{mock.total}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
