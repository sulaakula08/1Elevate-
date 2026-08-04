"use client";

import { useMemo, useState } from "react";
import { SAT, subjectColor, subjectColorSoft, subjectsFor } from "@/data/exams";
import type { Difficulty, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { bySubject, difficultyColor, difficultyColorSoft, pct, shuffle } from "@/lib/stats";
import { PracticeRunner } from "@/components/PracticeRunner";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { ProgressBar, Reveal } from "@/components/motion";

const SESSION_SIZE = 10;
const LEVELS: Difficulty[] = [1, 2, 3];

export default function PracticePage() {
  return (
    <RequireAccount>
      <PracticeInner />
    </RequireAccount>
  );
}

function PracticeInner() {
  const { t, tx } = useI18n();
  const { bank, data } = useApp();
  const [session, setSession] = useState<{ questions: Question[]; title: string } | null>(null);
  /** null = mixed difficulty, which is how the real exams present questions. */
  const [level, setLevel] = useState<Difficulty | null>(null);

  const subjects = subjectsFor(SAT.exam);

  const accuracyBySubject = useMemo(() => {
    const map = new Map<string, { accuracy: number; total: number }>();
    for (const bucket of bySubject(data.attempts)) {
      map.set(bucket.key, { accuracy: bucket.accuracy, total: bucket.total });
    }
    return map;
  }, [data.attempts]);

  /** Per subject: how many questions exist at each level. */
  const counts = useMemo(() => {
    const map = new Map<string, { total: number; byLevel: Record<Difficulty, number> }>();
    for (const subject of subjects) {
      const pool = bank.filter((q) => q.subjectId === subject.id);
      map.set(subject.id, {
        total: pool.length,
        byLevel: {
          1: pool.filter((q) => q.difficulty === 1).length,
          2: pool.filter((q) => q.difficulty === 2).length,
          3: pool.filter((q) => q.difficulty === 3).length,
        },
      });
    }
    return map;
  }, [bank, subjects]);

  /** Total available at the selected level, across the exam's subjects. */
  const availableAtLevel = subjects.reduce((sum, s) => {
    const c = counts.get(s.id);
    if (!c) return sum;
    return sum + (level ? c.byLevel[level] : c.total);
  }, 0);

  function start(subjectId: string, title: string) {
    let pool = bank.filter((q) => q.subjectId === subjectId);
    if (level) pool = pool.filter((q) => q.difficulty === level);
    if (pool.length === 0) return;

    // Weight the draw towards questions answered wrong or never seen.
    const wrongIds = new Set(data.attempts.filter((a) => !a.correct).map((a) => a.questionId));
    const seenIds = new Set(data.attempts.map((a) => a.questionId));
    const priority = pool.filter((q) => wrongIds.has(q.id) || !seenIds.has(q.id));
    const rest = pool.filter((q) => !priority.includes(q));
    let questions = [...shuffle(priority), ...shuffle(rest)].slice(0, SESSION_SIZE);
    // Mixed sessions ramp up: easy first, hard last, like a warm-up.
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
        onRestart={() => {
          const subjectId = session.questions[0]?.subjectId;
          if (subjectId) start(subjectId, session.title);
        }}
      />
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <PageTitle sub={t("practice.pickSubject")}>{t("practice.title")}</PageTitle>

      {/* ---------------- difficulty filter ---------------- */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="label-xs mr-1">{t("quiz.difficulty")}</span>
        <button
          onClick={() => setLevel(null)}
          className={`chip ${level === null ? "chip-on" : ""}`}
          aria-pressed={level === null}
        >
          {t("diff.all")}
        </button>
        {LEVELS.map((value) => {
          const on = level === value;
          const total = subjects.reduce((sum, s) => sum + (counts.get(s.id)?.byLevel[value] ?? 0), 0);
          return (
            <button
              key={value}
              onClick={() => setLevel(value)}
              className="chip"
              aria-pressed={on}
              style={
                on
                  ? {
                      background: difficultyColorSoft(value),
                      borderColor: difficultyColor(value),
                      color: difficultyColor(value),
                    }
                  : undefined
              }
            >
              {t(`diff.${value}`)}
              <span className="num text-[11px] opacity-60">{total}</span>
            </button>
          );
        })}
      </div>

      {availableAtLevel === 0 ? (
        <EmptyState>{t("diff.noneAtLevel")}</EmptyState>
      ) : (
        <ul className="grid sm:grid-cols-2 gap-3 mt-5">
          {subjects.map((subject, i) => {
            const c = counts.get(subject.id)!;
            const count = level ? c.byLevel[level] : c.total;
            const stats = accuracyBySubject.get(subject.id);
            const name = tx(subject.name);
            return (
              <Reveal as="li" key={subject.id} delay={i * 55}>
                <div
                  className="card-tone p-4 h-full flex flex-col gap-3.5"
                  style={{
                    ["--tone" as string]: subjectColor(subject.id),
                    ["--tone-soft" as string]: subjectColorSoft(subject.id),
                  }}
                >
                  <div className="flex items-start gap-3">
                    <span className="glyph">{subject.glyph}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[15.5px] font-medium leading-tight truncate">{name}</p>
                      <p className="text-[12.5px] text-muted mt-1">
                        {count} {t("practice.questions")}
                        {stats && (
                          <>
                            {" · "}
                            <span className="num">{pct(stats.accuracy)}</span>
                          </>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* difficulty mix for this subject */}
                  <div className="flex items-center gap-1.5">
                    {LEVELS.map((value) => (
                      <span
                        key={value}
                        className="flex items-center gap-1 text-[11px]"
                        style={{ color: difficultyColor(value) }}
                        title={t(`diff.${value}`)}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ background: difficultyColor(value) }}
                        />
                        <span className="num">{c.byLevel[value]}</span>
                      </span>
                    ))}
                    {stats && (
                      <span className="ml-auto flex-1 max-w-[7rem]">
                        <ProgressBar
                          value={stats.accuracy}
                          tone={stats.accuracy < 0.5 ? "danger" : "accent"}
                        />
                      </span>
                    )}
                  </div>

                  <button
                    className="btn btn-sm mt-auto w-full"
                    disabled={count === 0}
                    onClick={() => start(subject.id, name)}
                    style={
                      count > 0
                        ? {
                            borderColor: subjectColor(subject.id),
                            color: subjectColor(subject.id),
                          }
                        : undefined
                    }
                  >
                    {t("practice.start")}
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
