"use client";

import { useCallback, useState } from "react";
import { SAT, getSubject, subjectColor, subjectColorSoft } from "@/data/exams";
import type { Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
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
  const { account, bank, data, recordAttempts, recordMock } = useApp();
  const [sections, setSections] = useState<MockSection[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);

  const exam = SAT.exam;
  const blueprint = SAT;

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

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle sub={tx(blueprint.description)}>{t("mock.title")}</PageTitle>

      {plan.length === 0 ? (
        <EmptyState>{t("practice.empty")}</EmptyState>
      ) : (
        <>
          {availableTotal < plannedTotal && (
            <p className="text-[13px] mb-6" style={{ color: "var(--warning)" }}>
              {t("mock.notEnough")}
            </p>
          )}

          <p className="label-xs">{t("mock.structure")}</p>
          <ol className="mt-4 space-y-2">
            {plan.map((section, i) => (
              <Reveal as="li" key={`${section.subjectId}-${i}`} delay={i * 50}>
                <div
                  className="flex items-center gap-3 p-3.5 rounded-[10px] border"
                  style={{
                    borderColor: "var(--line)",
                    ["--tone" as string]: subjectColor(section.subjectId),
                    ["--tone-soft" as string]: subjectColorSoft(section.subjectId),
                  }}
                >
                  <span className="glyph glyph-sm">{i + 1}</span>
                  <span className="text-[14.5px] min-w-0 truncate">{section.name}</span>
                  <span className="num ml-auto text-[12.5px] text-muted text-right shrink-0">
                    {section.questions.length} · {section.minutes} {t("common.minutes")}
                  </span>
                </div>
              </Reveal>
            ))}
          </ol>
          <p className="num mt-4 text-[13px] text-faint">
            {t("common.total")}: {availableTotal} {t("practice.questions")} ·{" "}
            {plan.reduce((sum, s) => sum + s.minutes, 0)} {t("common.minutes")}
          </p>

          <button className="btn btn-primary btn-lg mt-8" onClick={() => setSections(buildSections())}>
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
