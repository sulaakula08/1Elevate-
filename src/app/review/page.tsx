"use client";

import { useMemo, useState } from "react";
import { SAT, getSubject, subjectsFor } from "@/data/exams";
import type { Difficulty, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { difficultyColor, reviewQueue } from "@/lib/stats";
import { PracticeRunner } from "@/components/PracticeRunner";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { RichText } from "@/lib/math/markdown";
import { Reveal } from "@/components/motion";
import { SectionGate } from "@/components/SectionGate";

/** How many questions one sitting draws. The queue is a list; a session is short. */
const SESSION = 15;

const LEVELS: Difficulty[] = [1, 2, 3];

export default function ReviewPage() {
  return (
    <RequireAccount>
      <SectionGate section="review">
        <ReviewInner />
      </SectionGate>
    </RequireAccount>
  );
}

/** What the attempt log says about one queued question. */
type Record_ = { wrong: number; correct: number; last: number };

function ReviewInner() {
  const { t, tx } = useI18n();
  const { data, bank } = useApp();
  const [running, setRunning] = useState(false);

  const [section, setSection] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [level, setLevel] = useState<Difficulty | null>(null);

  // Recomputed after the session, so mastered questions drop out of the list.
  const queue = useMemo(() => reviewQueue(data, bank), [data, bank]);

  /**
   * One pass over the log for the whole queue.
   *
   * The queue itself only says which questions are due; what a student wants to
   * know before starting is which ones keep catching them, and that is a count
   * of wrong answers rather than a position in a list.
   */
  const records = useMemo(() => {
    const map = new Map<string, Record_>();
    for (const attempt of data.attempts) {
      const entry = map.get(attempt.questionId) ?? { wrong: 0, correct: 0, last: 0 };
      if (attempt.correct) entry.correct += 1;
      else entry.wrong += 1;
      entry.last = Math.max(entry.last, attempt.at);
      map.set(attempt.questionId, entry);
    }
    return map;
  }, [data.attempts]);

  /**
   * The filter options, taken from the queue rather than from the taxonomy.
   *
   * Offering every domain the SAT has would fill this page with rows reading
   * "0" — the useful list is the handful a student is actually getting wrong,
   * with how many each is holding.
   */
  const options = useMemo(() => {
    const inSection = section ? queue.filter((q) => q.subjectId === section) : queue;
    const domains = new Map<string, number>();
    for (const q of inSection) {
      const key = q.domain ?? "—";
      domains.set(key, (domains.get(key) ?? 0) + 1);
    }

    // Skills narrow to the chosen domain, because a skill only means something
    // inside one: "Boundaries" belongs to Standard English Conventions or it
    // belongs to nothing.
    const inDomain = domain ? inSection.filter((q) => (q.domain ?? "—") === domain) : inSection;
    const skills = new Map<string, number>();
    for (const q of inDomain) {
      const key = q.skill ?? q.topic;
      skills.set(key, (skills.get(key) ?? 0) + 1);
    }

    const sort = (map: Map<string, number>) =>
      [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));

    return { domains: sort(domains), skills: sort(skills) };
  }, [queue, section, domain]);

  const shown = useMemo(
    () =>
      queue.filter((q) => {
        if (section && q.subjectId !== section) return false;
        if (domain && (q.domain ?? "—") !== domain) return false;
        if (skill && (q.skill ?? q.topic) !== skill) return false;
        if (level && q.difficulty !== level) return false;
        return true;
      }),
    [queue, section, domain, skill, level],
  );

  const subjects = subjectsFor(SAT.exam);
  const filtersOn = section !== null || domain !== null || skill !== null || level !== null;

  function clear() {
    setSection(null);
    setDomain(null);
    setSkill(null);
    setLevel(null);
  }

  if (running && shown.length > 0) {
    return (
      <PracticeRunner
        questions={shown.slice(0, SESSION)}
        mode="review"
        title={t("review.title")}
        onExit={() => setRunning(false)}
      />
    );
  }

  if (queue.length === 0) {
    return (
      <div className="container-app">
        <PageTitle sub={t("review.desc")}>{t("review.title")}</PageTitle>
        <EmptyState
          tone="positive"
          title={t("review.emptyTitle")}
          action={{ href: "/practice", label: t("nav.practice") }}
        >
          {t("review.empty")}
        </EmptyState>
      </div>
    );
  }

  // The one thing a queue this size is really telling you. Named rather than
  // left for the student to count off the list themselves.
  const worst = options.skills[0];

  return (
    <div className="container-app pb-8">
      <PageTitle sub={t("review.desc")}>{t("review.title")}</PageTitle>

      <div className="rv-summary">
        <span>
          <span className="num text-h3 font-medium">{queue.length}</span>
          <span className="block text-micro text-muted mt-0.5">{t("review.due")}</span>
        </span>
        <span>
          <span className="num text-h3 font-medium">{options.skills.length}</span>
          <span className="block text-micro text-muted mt-0.5">{t("review.skillsDue")}</span>
        </span>
        {worst && (
          <span className="min-w-0">
            <span className="block truncate font-medium">{worst[0]}</span>
            <span className="block text-micro text-muted mt-0.5">
              {t("review.weakest")} · <span className="num">{worst[1]}</span>
            </span>
          </span>
        )}
        <button
          className="btn btn-primary ml-auto shrink-0"
          onClick={() => setRunning(true)}
          disabled={shown.length === 0}
        >
          {t("review.start")} · {Math.min(shown.length, SESSION)}
        </button>
      </div>

      {/* ---------------- filters ---------------- */}
      <div className="mt-6 space-y-3">
        <Row label={t("study.filterSection")}>
          <Chip
            on={section === null}
            onClick={() => {
              setSection(null);
              setDomain(null);
              setSkill(null);
            }}
          >
            {t("study.allSections")}
            <span className="qb-count">{queue.length}</span>
          </Chip>
          {subjects.map((subject) => {
            const count = queue.filter((q) => q.subjectId === subject.id).length;
            if (count === 0) return null;
            return (
              <Chip
                key={subject.id}
                on={section === subject.id}
                onClick={() => {
                  setSection(subject.id);
                  // A domain belongs to one section; keeping it across a switch
                  // would filter to nothing and look like an empty queue.
                  setDomain(null);
                  setSkill(null);
                }}
              >
                {tx(subject.name)}
                <span className="qb-count">{count}</span>
              </Chip>
            );
          })}
        </Row>

        <Row label={t("review.filterDomain")}>
          <Chip
            on={domain === null}
            onClick={() => {
              setDomain(null);
              setSkill(null);
            }}
          >
            {t("review.allDomains")}
          </Chip>
          {options.domains.map(([name, count]) => (
            <Chip
              key={name}
              on={domain === name}
              onClick={() => {
                setDomain(name);
                setSkill(null);
              }}
            >
              {name}
              <span className="qb-count">{count}</span>
            </Chip>
          ))}
        </Row>

        <Row label={t("review.filterSkill")}>
          <Chip on={skill === null} onClick={() => setSkill(null)}>
            {t("review.allSkills")}
          </Chip>
          {options.skills.map(([name, count]) => (
            <Chip key={name} on={skill === name} onClick={() => setSkill(name)}>
              {name}
              <span className="qb-count">{count}</span>
            </Chip>
          ))}
        </Row>

        <Row label={t("quiz.difficulty")}>
          <Chip on={level === null} onClick={() => setLevel(null)}>
            {t("diff.all")}
          </Chip>
          {LEVELS.map((value) => {
            const count = queue.filter((q) => q.difficulty === value).length;
            if (count === 0) return null;
            return (
              <Chip
                key={value}
                on={level === value}
                onClick={() => setLevel(value)}
                tone={difficultyColor(value)}
              >
                {t(`diff.${value}`)}
                <span className="qb-count">{count}</span>
              </Chip>
            );
          })}
        </Row>

        {filtersOn && (
          <button className="btn btn-sm" onClick={clear}>
            {t("study.clearFilters")}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState>{t("study.noMatch")}</EmptyState>
      ) : (
        <ul className="mt-8 border-t">
          {shown.map((question, i) => (
            <Reveal as="li" key={question.id} delay={Math.min(i, 8) * 40}>
              <Item question={question} record={records.get(question.id)} />
            </Reveal>
          ))}
        </ul>
      )}
    </div>
  );
}

/** One queued question: where it comes from, how badly, and what it says. */
function Item({ question, record }: { question: Question; record?: Record_ }) {
  const { t, tx } = useI18n();
  const subject = getSubject(question.subjectId);

  return (
    <div className="py-4 border-b">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-sm font-medium">{question.skill ?? question.topic}</span>
        {question.domain && <span className="text-micro text-faint">{question.domain}</span>}
        {subject && <span className="text-micro text-faint">{tx(subject.name)}</span>}

        <span
          className="badge ml-auto shrink-0"
          style={{
            ["--tone" as string]: difficultyColor(question.difficulty),
            ["--tone-soft" as string]: `color-mix(in srgb, ${difficultyColor(
              question.difficulty,
            )} 12%, transparent)`,
          }}
        >
          {t(`diff.${question.difficulty}`)}
        </span>
      </div>

      <RichText
        className="mt-1.5 block text-sm text-muted line-clamp-2 leading-relaxed"
        text={tx(question.prompt)}
      />

      {/* Why it is here, in the two numbers that decide the order. */}
      {record && (
        <p className="mt-1.5 text-micro text-faint">
          <span className="num">{record.wrong}</span> {t("review.timesWrong")}
          {record.correct > 0 && (
            <>
              {" · "}
              <span className="num">{record.correct}</span> {t("review.timesRight")}
            </>
          )}
          {record.last > 0 && <> · {new Date(record.last).toLocaleDateString()}</>}
        </p>
      )}
    </div>
  );
}

/** One labelled row of filter chips, matching the question bank's. */
function Row({ label, children }: { label: string; children: React.ReactNode }) {
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
  tone?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`chip ${on && !tone ? "chip-on" : ""}`}
      aria-pressed={on}
      onClick={onClick}
      style={
        on && tone
          ? { background: tone, borderColor: tone, color: "#fff" }
          : tone
            ? { borderColor: `color-mix(in srgb, ${tone} 40%, var(--line-strong))` }
            : undefined
      }
    >
      {children}
    </button>
  );
}
