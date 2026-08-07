"use client";

import { useMemo, useState } from "react";
import { SAT, subjectColor, subjectColorSoft, subjectsFor } from "@/data/exams";
import type { Difficulty, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { bankStats, statsFor } from "@/lib/bank-stats";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";
import { difficultyColor, pct, reviewQueue, shuffle } from "@/lib/stats";
import { PracticeRunner } from "@/components/PracticeRunner";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { ProgressBar, Reveal } from "@/components/motion";

const SESSION_SIZE = 10;
const LEVELS: Difficulty[] = [1, 2, 3];

/** Where a question stands for this student. Derived from attempts, never stored. */
type Status = "all" | "new" | "wrong" | "done";

export default function PracticePage() {
  return (
    <RequireAccount>
      <BankInner />
    </RequireAccount>
  );
}

function BankInner() {
  const { t, tx } = useI18n();
  const { bank, data } = useApp();
  const [session, setSession] = useState<{ questions: Question[]; title: string } | null>(null);
  /** null = every section / mixed difficulty, which is how the real exam presents them. */
  const [section, setSection] = useState<string | null>(null);
  const [level, setLevel] = useState<Difficulty | null>(null);
  const [status, setStatus] = useState<Status>("all");

  const subjects = subjectsFor(SAT.exam);
  const stats = useMemo(() => bankStats(bank), [bank]);

  /**
   * One pass over the attempt log instead of a scan per question: the bank is
   * small today, but this page filters on every keystroke of the controls.
   */
  const seen = useMemo(() => {
    const map = new Map<string, { tries: number; wrong: number; correct: number }>();
    for (const attempt of data.attempts) {
      const entry = map.get(attempt.questionId) ?? { tries: 0, wrong: 0, correct: 0 };
      entry.tries += 1;
      if (attempt.correct) entry.correct += 1;
      else entry.wrong += 1;
      map.set(attempt.questionId, entry);
    }
    return map;
  }, [data.attempts]);

  const queued = useMemo(
    () => new Set(reviewQueue(data, bank).map((q) => q.id)),
    [data, bank],
  );

  const matches = useMemo(() => {
    return (question: Question) => {
      if (section && question.subjectId !== section) return false;
      if (level && question.difficulty !== level) return false;
      const record = seen.get(question.id);
      if (status === "new") return !record;
      if (status === "wrong") return Boolean(record?.wrong);
      if (status === "done") return Boolean(record && record.wrong === 0);
      return true;
    };
  }, [section, level, status, seen]);

  const pool = useMemo(() => bank.filter(matches), [bank, matches]);

  function start(subjectId: string | null, title: string) {
    const draw = pool.filter((q) => (subjectId ? q.subjectId === subjectId : true));
    if (draw.length === 0) return;

    // Weight the draw towards questions answered wrong or never seen, then ramp
    // easy → hard when no single level was chosen. Both behaviours predate this
    // redesign and are the reason a session feels targeted rather than random.
    const priority = draw.filter((q) => !seen.has(q.id) || (seen.get(q.id)?.wrong ?? 0) > 0);
    const rest = draw.filter((q) => !priority.includes(q));
    let questions = [...shuffle(priority), ...shuffle(rest)].slice(0, SESSION_SIZE);
    if (!level) questions = [...questions].sort((a, b) => a.difficulty - b.difficulty);
    setSession({ questions, title });
  }

  if (session) {
    return (
      <PracticeRunner
        questions={session.questions}
        mode="practice"
        title={session.title}
        onExit={() => setSession(null)}
        onRestart={() => start(session.questions[0]?.subjectId ?? null, session.title)}
      />
    );
  }

  const filtersOn = section !== null || level !== null || status !== "all";

  return (
    <div className="max-w-3xl mx-auto pb-8">
      <PageTitle sub={t("study.bankSub")}>{t("study.bankTitle")}</PageTitle>

      {/* ---------------- filters ---------------- */}
      <div className="space-y-3">
        <Filter label={t("study.filterSection")}>
          <Chip on={section === null} onClick={() => setSection(null)}>
            {t("study.allSections")}
            <span className="qb-count">{stats.total}</span>
          </Chip>
          {subjects.map((subject) => (
            <Chip
              key={subject.id}
              on={section === subject.id}
              onClick={() => setSection(subject.id)}
            >
              {tx(subject.name)}
              <span className="qb-count">{statsFor(stats, subject.id).total}</span>
            </Chip>
          ))}
        </Filter>

        <Filter label={t("quiz.difficulty")}>
          <Chip on={level === null} onClick={() => setLevel(null)}>
            {t("diff.all")}
          </Chip>
          {LEVELS.map((value) => (
            <Chip
              key={value}
              on={level === value}
              onClick={() => setLevel(value)}
              tone={difficultyColor(value)}
            >
              {t(`diff.${value}`)}
              <span className="qb-count">{stats.byLevel[value]}</span>
            </Chip>
          ))}
        </Filter>

        <Filter label={t("study.filterStatus")}>
          {(
            [
              ["all", t("study.statusAll")],
              ["new", t("study.statusNew")],
              ["wrong", t("study.statusWrong")],
              ["done", t("study.statusDone")],
            ] as [Status, string][]
          ).map(([value, label]) => (
            <Chip key={value} on={status === value} onClick={() => setStatus(value)}>
              {label}
            </Chip>
          ))}
        </Filter>
      </div>

      {/* ---------------- result ---------------- */}
      <div className="mt-6 flex items-baseline gap-3">
        <p className="text-[14px]">
          <span className="num font-semibold">{pluralize(pool.length, NOUNS.question)}</span>
        </p>
        {queued.size > 0 && (
          <p className="text-[13px] text-muted">
            <span className="num">{queued.size}</span> {t("study.inReview")}
          </p>
        )}
        {filtersOn && (
          <button
            className="btn btn-sm ml-auto"
            onClick={() => {
              setSection(null);
              setLevel(null);
              setStatus("all");
            }}
          >
            {t("diff.all")}
          </button>
        )}
      </div>

      {pool.length === 0 ? (
        <EmptyState>{t("study.noMatch")}</EmptyState>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3 mt-4">
          {subjects
            .filter((subject) => !section || subject.id === section)
            .map((subject, i) => {
              const available = pool.filter((q) => q.subjectId === subject.id);
              const subjectTotal = statsFor(stats, subject.id).total;
              const attempted = available.filter((q) => seen.has(q.id));
              const solved = new Set(
                data.attempts
                  .filter((a) => a.subjectId === subject.id && a.correct)
                  .map((a) => a.questionId),
              ).size;
              const tries = data.attempts.filter((a) => a.subjectId === subject.id);
              const accuracy = tries.length
                ? tries.filter((a) => a.correct).length / tries.length
                : null;
              const name = tx(subject.name);

              const mix = LEVELS.map((value) => ({
                value,
                count: available.filter((q) => q.difficulty === value).length,
              }));

              return (
                <Reveal as="li" key={subject.id} delay={i * 55}>
                  <div
                    className="card-tone p-5 h-full flex flex-col gap-4"
                    style={{
                      ["--tone" as string]: subjectColor(subject.id),
                      ["--tone-soft" as string]: subjectColorSoft(subject.id),
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <span className="glyph" aria-hidden>
                        {subject.glyph}
                      </span>
                      <div className="min-w-0 flex-1">
                        <h2 className="text-[16px] font-semibold leading-tight">{name}</h2>
                        <p className="text-[12.5px] text-muted mt-1">
                          {pluralize(available.length, NOUNS.question)}
                          {available.length !== subjectTotal && (
                            <span className="text-faint"> / {subjectTotal}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Progress, then the level mix — what is left to do, and how
                        hard it gets. */}
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2 text-[12.5px] text-muted">
                        <span className="num">
                          {solved} / {subjectTotal}
                        </span>
                        <span>{t("study.solvedOf")}</span>
                        {accuracy !== null && (
                          <span className="num ml-auto">
                            {pct(accuracy)} {t("study.accuracy")}
                          </span>
                        )}
                      </div>
                      <ProgressBar
                        value={subjectTotal ? solved / subjectTotal : 0}
                        tone="accent"
                      />
                    </div>

                    <div className="space-y-2">
                      <div className="qb-mix" role="img" aria-label={t("study.mixTitle")}>
                        {mix.map(({ value, count }) => (
                          <span
                            key={value}
                            className="qb-mix-seg"
                            style={{
                              width: `${available.length ? (count / available.length) * 100 : 0}%`,
                              background: difficultyColor(value),
                            }}
                          />
                        ))}
                      </div>
                      <p className="qb-legend">
                        {mix.map(({ value, count }) => (
                          <span key={value}>
                            <span
                              className="qb-legend-dot"
                              style={{ background: difficultyColor(value) }}
                            />
                            {t(`diff.${value}`)} <span className="num">{count}</span>
                          </span>
                        ))}
                      </p>
                    </div>

                    <button
                      className="btn btn-primary btn-sm mt-auto w-full"
                      disabled={available.length === 0}
                      onClick={() => start(subject.id, name)}
                    >
                      {attempted.length > 0 ? t("study.resumeSession") : t("study.startSession")}
                    </button>
                  </div>
                </Reveal>
              );
            })}
        </ul>
      )}
    </div>
  );
}

/** One labelled row of filter chips. */
function Filter({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="qb-filter-row">
      <span className="label-xs w-full sm:w-20 sm:shrink-0">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  on,
  onClick,
  tone,
  children,
}: {
  on: boolean;
  onClick: () => void;
  /** Selected chips in the difficulty row take that level's colour. */
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`chip ${on && !tone ? "chip-on" : ""}`}
      aria-pressed={on}
      onClick={onClick}
      style={on && tone ? { background: tone, borderColor: tone, color: "#fff" } : undefined}
    >
      {children}
    </button>
  );
}
