"use client";

import { useCallback, useMemo, useState } from "react";
import { SAT, getSubject, subjectColor, subjectColorSoft } from "@/data/exams";
import type { Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { buildMockSets, type MockSet } from "@/lib/mock-sets";
import { fillMissingQuestions } from "@/lib/generation/client";
import { generatedIds, recordProvenance } from "@/lib/generation/provenance";
import { fillRequests, shortfall } from "@/lib/generation/shortfall";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";
import type { Attempt, MockResult, MockSectionResult } from "@/lib/storage";
import { maxScore, pct, scaleScore, sectionScore } from "@/lib/stats";
import { MockRunner, type MockAnswers, type MockSection } from "@/components/MockRunner";
import { MockLoader } from "@/components/test/MockLoader";
import { QuestionView } from "@/components/QuestionView";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { CountUp, ProgressBar, Reveal } from "@/components/motion";
import { ProgressMark, SuccessTick } from "@/components/illustrations";
import { SectionGate } from "@/components/SectionGate";

export default function MockPage() {
  return (
    <RequireAccount>
      <SectionGate section="mock">
        <MockInner />
      </SectionGate>
    </RequireAccount>
  );
}

/**
 * A dealt test with display names on its modules. `MockSet` carries the deal;
 * the name needs the translator, so it is applied in the component.
 */
type NamedSet = Omit<MockSet, "sections" | "alternates"> & {
  sections: MockSection[];
  alternates: Map<string, MockSection>;
};

/** What the student has already done with one numbered test. */
type SetHistory = { best: number; sittings: number; last: number };

type Report = {
  result: Omit<MockResult, "id">;
  sections: MockSection[];
  answers: MockAnswers;
};

function MockInner() {
  const { t, tx } = useI18n();
  const {
    account,
    bank,
    data,
    recordAttempts,
    recordMock,
    saveQuestion,
    questions: content,
    scoreAnswers,
    checkAnswer,
  } = useApp();
  const [sections, setSections] = useState<MockSection[] | null>(null);
  /**
   * Which numbered test is on screen.
   *
   * Carried beside the modules rather than inside them: the number belongs to
   * the sitting, and MockSection is the shape MockRunner consumes. Undefined for
   * a shortened test, which is not one of the numbered ones.
   */
  const [runningSet, setRunningSet] = useState<number | undefined>(undefined);
  /**
   * The harder second modules of the test on screen.
   *
   * Held beside `sections` for the same reason the number is: the runner needs
   * them to route, and they are not part of the plan it renders.
   */
  const [runningAlternates, setRunningAlternates] = useState<
    Map<string, MockSection> | undefined
  >(undefined);
  /**
   * Modules dealt and waiting behind the loading screen. Built at the click, not
   * when the loader finishes, so the test a student is shown is the one that was
   * dealt from the bank they were looking at.
   */
  const [starting, setStarting] = useState<MockSection[] | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [filling, setFilling] = useState(false);
  const [made, setMade] = useState(0);
  const [fillNote, setFillNote] = useState<string | null>(null);
  /** The sitting is over and the server is marking it. */
  const [scoring, setScoring] = useState(false);

  const exam = SAT.exam;
  const blueprint = SAT;
  /*
   * Whether this account may top the bank up.
   *
   * Generation is staff-only at the route now (see /api/generate), so offering a
   * student the button would only get them a 403. The same role test the rail and
   * the account page use, rather than a new notion of staff.
   */
  const staff = Boolean(account && account.role !== "student");
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

  /**
   * Every test the bank can currently deal, numbered and stable.
   *
   * The dealing itself lives in lib/mock-sets, which owns the one property that
   * makes a numbered test worth anything: Test 3 is the same Test 3 on every
   * device and every day. All this does is put the display name on each module,
   * which needs the translator and therefore cannot live in a pure module.
   */
  const sets = useMemo<NamedSet[]>(() => {
    const name = (subjectId: string, module: number) => {
      const subject = getSubject(subjectId);
      return `${subject ? tx(subject.name) : subjectId} · ${t("mock.module")} ${module}`;
    };
    return buildMockSets(bank, blueprint).map((set) => ({
      ...set,
      sections: set.sections.map((section) => ({
        ...section,
        name: name(section.subjectId, section.module),
      })),
      alternates: new Map(
        [...set.alternates].map(([subjectId, section]) => [
          subjectId,
          { ...section, name: name(section.subjectId, section.module) },
        ]),
      ),
    }));
  }, [bank, blueprint, t, tx]);

  /**
   * What the student has already done with each numbered test.
   *
   * The three rows on this page used to differ only by their number, which is
   * what made them feel like filler. A test's history is the thing that actually
   * distinguishes it: whether it has been sat, what it is worth beating, and
   * when. One pass over the mocks builds all of it.
   */
  const historyBySet = useMemo(() => {
    const history = new Map<number, { best: number; sittings: number; last: number }>();
    for (const mock of data.mocks) {
      if (mock.setIndex === undefined) continue;
      const entry = history.get(mock.setIndex);
      if (entry) {
        entry.best = Math.max(entry.best, mock.score);
        entry.sittings += 1;
        entry.last = Math.max(entry.last, mock.at);
      } else {
        history.set(mock.setIndex, { best: mock.score, sittings: 1, last: mock.at });
      }
    }
    return history;
  }, [data.mocks]);

  /** Every question the student has answered anywhere, for the "new to you" count. */
  const answered = useMemo(
    () => new Set(data.attempts.map((attempt) => attempt.questionId)),
    [data.attempts],
  );

  /** Everything one click has to remember about the test being started. */
  const startSet = useCallback((set: NamedSet) => {
    setRunningSet(set.complete ? set.index : undefined);
    setRunningAlternates(set.alternates.size > 0 ? set.alternates : undefined);
    setStarting(set.sections);
  }, []);

  const plannedTotal = blueprint.sections.reduce((sum, s) => sum + s.count, 0);
  const plan = sets[0]?.sections ?? [];
  const availableTotal = plan.reduce((sum, s) => sum + s.questions.length, 0);
  /* Testing time, which is the number the College Board publishes and the one
     the timer runs on. The break is drawn in the timeline but not counted here —
     nobody sits a 144-minute SAT. */
  const sittingMinutes = plan.reduce((sum, s) => sum + s.minutes, 0);

  const finish = useCallback(
    async (
      built: MockSection[],
      answers: MockAnswers,
      msSpent: number,
      routes: Record<string, "lower" | "upper"> = {},
    ) => {
      const sectionResults: MockSectionResult[] = [];
      const attempts: Attempt[] = [];
      const wrong: string[] = [];
      const totalQuestions = built.reduce((sum, s) => sum + s.questions.length, 0);
      const msPerQuestion = totalQuestions ? Math.round(msSpent / totalQuestions) : 0;
      const now = Date.now();

      /*
       * The whole sitting, marked by the server in one request.
       *
       * This was `chosen === question.answer` per question, which is only possible
       * if the browser is holding all 98 answers — during the exam. The tally that
       * comes back carries correctness and nothing else, which is all a score
       * report is built from.
       */
      setScoring(true);
      const marks = await scoreAnswers(
        built.flatMap((section) =>
          section.questions.map((question) => ({
            id: question.id,
            choice: answers[question.id] ?? -1,
          })),
        ),
      );

      for (const section of built) {
        let correct = 0;
        for (const question of section.questions) {
          const chosen = answers[question.id];
          const isCorrect = marks[question.id] === true;
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

      /*
       * Two section scores, then their sum — the shape of a real SAT score.
       *
       * Only when the test actually routed. A shortened or non-adaptive test has
       * no routes, and scoring it as though a student had been held to the easier
       * form would understate it; that falls back to the flat estimate.
       */
      const routed = Object.keys(routes).length > 0;
      const bySubject = new Map<string, { correct: number; total: number }>();
      for (const result of sectionResults) {
        const entry = bySubject.get(result.subjectId) ?? { correct: 0, total: 0 };
        entry.correct += result.correct;
        entry.total += result.total;
        bySubject.set(result.subjectId, entry);
      }
      const score = routed
        ? Math.max(
            blueprint.minScore,
            Math.min(
              blueprint.maxScore,
              [...bySubject.entries()].reduce(
                (sum, [subjectId, tally]) =>
                  sum + sectionScore(tally.correct, tally.total, routes[subjectId] === "upper"),
                0,
              ),
            ),
          )
        : scaleScore(exam, correctTotal, totalQuestions);

      const result: Omit<MockResult, "id"> = {
        exam,
        setIndex: runningSet,
        at: now,
        sections: sectionResults,
        correct: correctTotal,
        total: totalQuestions,
        score,
        wrong,
      };

      recordAttempts(attempts);
      recordMock(result);

      /*
       * Reveal the missed questions, and only those.
       *
       * The report walks the student through what they got wrong, which needs the
       * right choice and the worked solution — so each one is submitted for
       * grading, which is what returns them. Nothing is revealed for a question
       * they answered correctly, and nothing was revealed at any point during the
       * sitting itself.
       */
      if (wrong.length > 0) {
        /*
         * A few at a time, not all at once.
         *
         * A student who got everything wrong has 98 reveals to make, and
         * `Promise.all` over the lot meant 98 simultaneous requests, each taking
         * two round trips at the rate limiter. That is a self-inflicted spike on
         * the one screen where the work is already done and nobody is waiting on a
         * particular question — eight in flight keeps it quick without asking the
         * counter to serialise a hundred conflicting upserts on one row.
         */
        const REVEAL_AT_ONCE = 8;
        for (let i = 0; i < wrong.length; i += REVEAL_AT_ONCE) {
          await Promise.all(
            wrong
              .slice(i, i + REVEAL_AT_ONCE)
              .map((id) => checkAnswer(id, answers[id] ?? -1)),
          );
        }
      }

      setScoring(false);
      setSections(null);
      setReport({ result, sections: built, answers });
    },
    [
      blueprint.maxScore,
      blueprint.minScore,
      checkAnswer,
      exam,
      recordAttempts,
      recordMock,
      runningSet,
      scoreAnswers,
    ],
  );

  /*
   * Marking.
   *
   * Scoring is a server round trip now, plus one reveal per missed question, so
   * there is a real moment between the last answer and the report. Saying so beats
   * leaving the student looking at a question they have already submitted.
   */
  if (scoring) {
    return (
      <div className="container-read py-24 text-center fade-in" aria-live="polite" aria-busy="true">
        <p className="label-xs">{t("mock.marking")}</p>
        <p className="lede mt-3">{t("mock.markingNote")}</p>
        <div className="skeleton h-2 w-40 mx-auto mt-8 rounded-[var(--radius-pill)]" />
      </div>
    );
  }

  if (sections) {
    return (
      <MockRunner
        sections={sections}
        alternates={runningAlternates}
        onFinish={(answers, msSpent, sat, routes) => finish(sat, answers, msSpent, routes)}
        onExit={() => setSections(null)}
      />
    );
  }

  if (starting) {
    return (
      <MockLoader
        onReady={() => {
          setSections(starting);
          setStarting(null);
        }}
      />
    );
  }

  if (report) {
    /*
     * The missed questions, as far as their content has been revealed.
     *
     * `content` is the app store's copy: the prompts arrived when each module was
     * sat, and the answers and explanations were added by the reveal at the end of
     * `finish`. A question whose reveal failed is dropped from the walkthrough
     * rather than rendered half-marked.
     */
    const wrongQuestions: Question[] = report.result.wrong
      .map((id) => content[id])
      .filter(
        (question): question is Question =>
          Boolean(question) && typeof question.answer === "number",
      );
    const hitGoal = report.result.score >= account!.targetScore;

    return (
      <div className="container-read pb-20">
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
          <p className="mt-2 text-sm text-muted">
            / {maxScore(exam)} · {t("home.targetScore")}{" "}
            <span className="num">{account!.targetScore}</span>
          </p>
          <div className="max-w-xs mx-auto mt-6">
            <ProgressBar value={report.result.score / Math.max(1, account!.targetScore)} />
          </div>
          <p className="num mt-4 text-sm text-faint">
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
                    <span className="text-sm min-w-0 truncate">{label}</span>
                    <span className="num ml-auto text-sm text-muted">
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
    <div className="container-app">
      <PageTitle sub={t("plan.mockSub")}>{t("plan.mockTitle")}</PageTitle>

      {plan.length === 0 ? (
        <EmptyState title={t("practice.emptyTitle")}>{t("practice.empty")}</EmptyState>
      ) : (
        <>
          {/*
            The brief: what this sitting is, and its shape as an event. Three
            boxed spec tiles used to stand here — "Questions 98", "Duration 134
            min", "Score scale 400–1600" — which described a two-hour exam the
            way a settings page describes itself. A mock has a shape: four
            modules and a break, back to back, and the timeline is the honest
            picture of it.
          */}
          <section className="mock-brief" aria-label={t("mock.sitting")}>
            <div className="mock-brief-top">
              <dl className="mock-brief-specs">
                <div>
                  <dt>{t("plan.mockTotal")}</dt>
                  <dd className="num">
                    <CountUp value={availableTotal} />
                    {!complete && <span className="text-faint"> / {plannedTotal}</span>}
                  </dd>
                </div>
                <div>
                  <dt>{t("plan.mockDuration")}</dt>
                  <dd className="num">
                    {Math.floor(sittingMinutes / 60)}
                    <em>{t("mock.hoursShort")}</em>
                    {String(sittingMinutes % 60).padStart(2, "0")}
                    <em>{t("common.minutes")}</em>
                  </dd>
                </div>
                <div>
                  <dt>{t("plan.mockScale")}</dt>
                  <dd className="num">
                    {blueprint.minScore}–{blueprint.maxScore}
                  </dd>
                </div>
              </dl>
              <p className="mock-brief-note">{t("mock.blueprintNote")}</p>
            </div>

            <Sitting plan={plan} />
          </section>

          {/* ---------------- the tests ----------------
              One row per numbered test, each its own button. This replaces a
              single "Begin test" that reshuffled the whole bank: a student who
              sat it twice met the same questions in a new order and could not
              tell whether a better score meant they had improved or the deal had
              been kinder. Numbered, disjoint tests make a second sitting mean
              something, and a best score gives them something to beat. */}
          <p className="label-xs mt-8">
            {sets.length > 1
              ? `${t("mock.testsAvailable")} · ${sets.length}`
              : `${t("plan.mockModules")} · ${pluralize(plan.length, NOUNS.module)}`}
          </p>

          <ol className="mock-sets mt-3">
            {sets.map((set, i) => (
              <Reveal as="li" key={set.index} delay={Math.min(i, 6) * 45}>
                <SetCard
                  set={set}
                  history={historyBySet.get(set.index)}
                  answered={answered}
                  target={account!.targetScore}
                  maximum={blueprint.maxScore}
                  disabled={filling || set.total === 0}
                  onStart={() => startSet(set)}
                />
              </Reveal>
            ))}
          </ol>

          {sets[0]?.adaptive && (
            <p className="mt-4 text-sm leading-relaxed text-muted">{t("mock.adaptiveBody")}</p>
          )}

          {/* Whether the test is whole, and — if not — what can be done about it.
              Framed as a capability rather than as a defect report: a student
              reading this should understand the option, not doubt the product. */}
          <div className="mt-6">
            {complete ? (
              <p className="text-sm text-muted">
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
                <p className="pl-notice-body">
                  {staff ? t("plan.mockShortBody") : t("plan.mockShortBodyStudent")}
                </p>

                <div className="pl-notice-actions">
                  {staff && (
                    <button
                      className="btn btn-primary btn-sm"
                      disabled={filling}
                      onClick={fill}
                    >
                      {filling
                        ? `${t("plan.mockGenerating")} ${made > 0 ? made : ""}`.trim()
                        : `${t("plan.mockGenerate")} · ${gap.missing}`}
                    </button>
                  )}
                  {/* The student's route through a short bank, and now the only
                      one they are offered. It becomes the primary action for
                      them, since there is nothing beside it to be secondary to. */}
                  <button
                    className={`btn btn-sm ${staff ? "" : "btn-primary"}`}
                    disabled={filling}
                    onClick={() => sets[0] && startSet(sets[0])}
                  >
                    {t("plan.mockShortenedOk")}
                  </button>
                </div>

                {fillNote && <p className="pl-notice-body">{fillNote}</p>}
              </div>
            )}
          </div>

        </>
      )}

      {/*
        Past sittings. This carried four rules for two rows of content — a
        section border, a list border, a border under every item — plus ten rem
        of air above it, so a student with one result met a page of ruled empty
        space. One rule above the section, hairlines only between rows, and the
        score set as the number it is.
      */}
      <section className="mt-10 pt-8 border-t">
        <p className="label-xs">{t("mock.history")}</p>
        {data.mocks.length === 0 ? (
          <EmptyState compact title={t("mock.noHistoryTitle")}>{t("mock.noHistory")}</EmptyState>
        ) : (
          <ul className="mock-past mt-3">
            {[...data.mocks].reverse().map((mock) => (
              <li key={mock.id}>
                <span className="mock-past-date">
                  {new Date(mock.at).toLocaleDateString()}
                </span>
                <span className="mock-past-count num">
                  {mock.correct}/{mock.total}
                </span>
                <span className="mock-past-score num">
                  {mock.score}
                  <span>/{maxScore(mock.exam)}</span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}


/**
 * One numbered test, as a card that says something about itself.
 *
 * Three rows reading "Test 1 · 98 questions · 134 min" carry one bit of
 * information between them — the number — and a page of them is why this screen
 * felt like filler. Two things here genuinely differ per test and are worth the
 * room:
 *
 *   the history — sat or not, the best score, how far that is from the target
 *   and when it was last sat, which is the only reason to pick one test over
 *   another once you have started sitting them;
 *
 *   the deal — how many of the test's questions are new to the student, and the
 *   easy/medium/hard mix the deal happened to give it. Numbered tests are
 *   disjoint, so this really is different per test rather than decoration.
 *
 * The tone rotates with the index so a row of three is not one flat colour. That
 * part is decoration, and it is the only part that is.
 */
function SetCard({
  set,
  history,
  answered,
  target,
  maximum,
  disabled,
  onStart,
}: {
  set: NamedSet;
  history: SetHistory | undefined;
  answered: Set<string>;
  target: number;
  maximum: number;
  disabled: boolean;
  onStart: () => void;
}) {
  const { t } = useI18n();

  const questions = set.sections.flatMap((section) => section.questions);
  const mix = [1, 2, 3].map(
    (level) => questions.filter((question) => question.difficulty === level).length,
  );
  const mixTotal = mix.reduce((sum, count) => sum + count, 0) || 1;

  return (
    <button
      className="mock-set"
      data-state={history ? "sat" : "fresh"}
      disabled={disabled}
      onClick={onStart}
      style={{ ["--tone" as string]: `var(--mock-tone-${(set.index - 1) % 3})` }}
    >
      <span className="mock-set-head">
        <span className="mock-set-number num" aria-hidden>
          {set.complete ? set.index : "—"}
        </span>
        <span className="mock-set-body">
          <span className="mock-set-name">
            {set.complete ? `${t("mock.testNumber")} ${set.index}` : t("mock.shortenedTest")}
          </span>
          <span className="mock-set-meta">
            {pluralize(set.total, NOUNS.question)} · {set.minutes} {t("common.minutes")}
          </span>
        </span>
      </span>

      {/* The score line, or the reason there isn't one yet. */}
      {history ? (
        <span className="mock-set-score">
          <span className="mock-set-score-label">{t("mock.bestScore")}</span>
          <span className="mock-set-score-value num">{history.best}</span>
          <span className="mock-set-score-scale num">
            {Math.max(0, target - history.best) > 0
              ? `+${target - history.best} ${t("mock.beatBy")}`
              : `${history.best}/${maximum}`}
          </span>
          <span className="mock-set-bar" aria-hidden>
            <span style={{ width: `${Math.min(100, (history.best / maximum) * 100)}%` }} />
            <em style={{ left: `${Math.min(100, (target / maximum) * 100)}%` }} />
          </span>
        </span>
      ) : (
        <span className="mock-set-score" data-empty="">
          <span className="mock-set-score-label">{t("mock.neverSat")}</span>
        </span>
      )}

      {/*
        The deal itself, one cell per question, in the order the test serves
        them. A three-segment percentage bar stood here and read as a stripe of
        gradient — indistinguishable from decoration, and it threw away the one
        thing worth knowing: where in the sitting the hard questions fall. Shade
        is difficulty; a ringed cell is one this student has already met in
        practice. Numbered tests are disjoint, so no two maps are alike.
      */}
      <span className="mock-set-map">
        <span className="mock-set-cells" aria-hidden>
          {questions.map((question) => (
            <span
              key={question.id}
              data-level={question.difficulty}
              data-seen={answered.has(question.id) ? "" : undefined}
            />
          ))}
        </span>
        <span className="mock-set-legend">
          {mix.map((count, level) => (
            <span key={level}>
              <em data-level={level + 1} aria-hidden />
              {t(`diff.${level + 1}`)}{" "}
              <span className="num">{Math.round((count / mixTotal) * 100)}%</span>
            </span>
          ))}
        </span>
      </span>

      <span className="mock-set-foot">
        <span className="mock-set-cta">
          {history ? t("mock.sitAgain") : t("mock.startTest")}
          <span aria-hidden>→</span>
        </span>
        {history && (
          <span className="mock-set-when">
            {t("mock.lastSat")} {new Date(history.last).toLocaleDateString()} ·{" "}
            {history.sittings === 1
              ? t("mock.oneSitting")
              : `${history.sittings} ${t("mock.sittings")}`}
          </span>
        )}
      </span>
    </button>
  );
}


/** The break between the two sections of the real test. */
const BREAK_MINUTES = 10;

/**
 * The sitting as a timeline: four modules and the break, drawn to length.
 *
 * This replaces a list of four rows that each said a subject name and a pair of
 * numbers. The list was accurate and told you nothing you could feel — that the
 * Math modules are the long ones, that the break falls exactly halfway, that the
 * thing you are about to start runs past the two-hour mark. Widths come from the
 * minutes, so the picture cannot disagree with the plan.
 *
 * The clock is elapsed time from the start of the sitting, not the time of day:
 * a student reads "1:04" as "an hour in", which is the number that matters when
 * you are deciding whether to begin.
 */
function Sitting({ plan }: { plan: MockSection[] }) {
  const { t, tx } = useI18n();

  type Segment = {
    key: string;
    kind: "module" | "break";
    subjectId?: string;
    label: string;
    detail?: string;
    minutes: number;
    /** Elapsed minutes at which this segment starts. */
    at: number;
  };

  const segments: Segment[] = [];
  let elapsed = 0;
  plan.forEach((section, index) => {
    // The break sits where the section changes, which is where the real test
    // puts it — derived from the plan rather than hard-coded to a position.
    const previous = plan[index - 1];
    if (previous && previous.subjectId !== section.subjectId) {
      segments.push({
        key: "break",
        kind: "break",
        label: t("mock.break"),
        minutes: BREAK_MINUTES,
        at: elapsed,
      });
      elapsed += BREAK_MINUTES;
    }
    const subject = getSubject(section.subjectId);
    segments.push({
      key: `${section.subjectId}-${section.module}`,
      kind: "module",
      subjectId: section.subjectId,
      label: `${subject ? tx(subject.name) : section.subjectId} ${section.module}`,
      detail: pluralize(section.questions.length, NOUNS.question),
      minutes: section.minutes,
      at: elapsed,
    });
    elapsed += section.minutes;
  });

  const total = elapsed;
  const clock = (minutes: number) =>
    `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;

  return (
    <div className="mock-time">
      <p className="mock-time-head">
        <span>{t("mock.sitting")}</span>
        <span className="num">
          {clock(total)} {t("mock.startToFinish")}
        </span>
      </p>

      <ol className="mock-time-track">
        {segments.map((segment) => (
          <li
            key={segment.key}
            className="mock-time-seg"
            data-kind={segment.kind}
            /* The minutes go in as a custom property rather than straight into
               flex-grow, so the hover state can scale them: a segment you point
               at takes a little more of the track and the others give way. */
            style={{
              ["--min" as string]: segment.minutes,
              ...(segment.subjectId
                ? { ["--tone" as string]: subjectColor(segment.subjectId) }
                : {}),
            }}
          >
            <span className="mock-time-bar" aria-hidden />
            <span className="mock-time-label">
              <strong>{segment.label}</strong>
              <span className="num">
                {segment.minutes} {t("common.minutes")}
                {segment.detail && <> · {segment.detail}</>}
              </span>
            </span>
            <span className="mock-time-at num" aria-hidden>
              {clock(segment.at)}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
