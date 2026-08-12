"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { SAT, getSubject, subjectColor, subjectGradient, subjectsFor } from "@/data/exams";
import { SubjectScene } from "@/components/three/SubjectScene";
import type { Difficulty, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { bankStats, statsFor } from "@/lib/bank-stats";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";
import {
  difficultyColor,
  pct,
  reviewQueue,
  shuffle,
} from "@/lib/stats";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { ProgressBar, Reveal } from "@/components/motion";
import { SectionGate } from "@/components/SectionGate";
import { usePracticeSession } from "@/components/practice/PracticeSession";
import { practiceQuestionPath } from "@/lib/practice-routes";

/**
 * How many questions a session draws. `null` means "everything that matches the
 * filters", which is the default: a student who has narrowed the bank down to a
 * topic means to work through that topic, not through ten of it.
 *
 * The shorter lengths stay because a full section is 150+ questions, and a
 * quick set before school is a real way to use this.
 */
const SESSION_LENGTHS: (number | null)[] = [10, 20, 50, null];
const LEVELS: Difficulty[] = [1, 2, 3];

/** Where a question stands for this student. Derived from attempts, never stored. */
type Status = "all" | "new" | "wrong" | "done";

/** Sections is the exam's own shape; topics is how studying actually works. */
type View = "sections" | "topics";

type Record_ = { tries: number; wrong: number; correct: number };

export default function PracticePage() {
  return (
    <RequireAccount>
      <SectionGate section="practice">
        <BankInner />
      </SectionGate>
    </RequireAccount>
  );
}

function BankInner() {
  const { t, tx } = useI18n();
  const { bank, data } = useApp();
  const { startSession } = usePracticeSession();
  const router = useRouter();
  /** null = every section / mixed difficulty, which is how the real exam presents them. */
  const [section, setSection] = useState<string | null>(null);
  const [level, setLevel] = useState<Difficulty | null>(null);
  const [status, setStatus] = useState<Status>("all");
  const [view, setView] = useState<View>("sections");
  const [search, setSearch] = useState("");
  const [length, setLength] = useState<number | null>(null);
  /** Domains the student has folded open. Empty means "all closed but the first". */
  const [openDomains, setOpenDomains] = useState<Set<string>>(new Set());

  const subjects = subjectsFor(SAT.exam);
  const stats = useMemo(() => bankStats(bank), [bank]);

  /**
   * The counts every control below quotes, narrowed to the chosen section.
   *
   * Picking Math and still reading the whole bank's difficulty spread — 300
   * hard questions when Math holds 40 — described a bank the student was not
   * looking at. The section chips keep the unnarrowed totals, because that is
   * exactly what they are choosing between.
   */
  const scoped = useMemo(
    () => (section ? statsFor(stats, section) : stats),
    [stats, section],
  );

  /**
   * One pass over the attempt log instead of a scan per question: the bank is
   * small today, but this page filters on every keystroke of the controls.
   */
  const seen = useMemo(() => {
    const map = new Map<string, Record_>();
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

  /** Solved = answered correctly at least once. The bank's own progress measure. */
  const solvedIds = useMemo(
    () =>
      new Set(data.attempts.filter((a) => a.correct).map((a) => a.questionId)),
    [data.attempts],
  );

  /**
   * The pool arranged the way the College Board arranges its own content: four
   * domains per section, each holding the skills it tests. This is the view a
   * student actually needs — "I am weak at Advanced Math" is a sentence about a
   * domain, not about a section.
   */
  const domains = useMemo(() => {
    const term = search.trim().toLowerCase();
    const groups = new Map<
      string,
      {
        key: string;
        subjectId: string;
        total: number;
        solved: number;
        tries: number;
        correct: number;
        topics: Map<
          string,
          { key: string; total: number; solved: number; tries: number; correct: number }
        >;
      }
    >();

    for (const question of pool) {
      if (term && !`${question.topic} ${question.domain ?? ""}`.toLowerCase().includes(term)) {
        continue;
      }
      // A question without a domain still belongs somewhere: its topic is the
      // finest label it has, so it groups under the section instead.
      const domainKey = question.domain ?? tx(getSubject(question.subjectId)?.name) ?? "—";
      const group =
        groups.get(domainKey) ??
        {
          key: domainKey,
          subjectId: question.subjectId,
          total: 0,
          solved: 0,
          tries: 0,
          correct: 0,
          topics: new Map(),
        };

      const record = seen.get(question.id);
      const isSolved = solvedIds.has(question.id);
      group.total += 1;
      if (isSolved) group.solved += 1;
      group.tries += record?.tries ?? 0;
      group.correct += record?.correct ?? 0;

      const topic =
        group.topics.get(question.topic) ??
        { key: question.topic, total: 0, solved: 0, tries: 0, correct: 0 };
      topic.total += 1;
      if (isSolved) topic.solved += 1;
      topic.tries += record?.tries ?? 0;
      topic.correct += record?.correct ?? 0;
      group.topics.set(question.topic, topic);

      groups.set(domainKey, group);
    }

    return [...groups.values()]
      .map((group) => ({
        ...group,
        topicList: [...group.topics.values()].sort((a, b) => b.total - a.total),
      }))
      .sort((a, b) => b.total - a.total);
  }, [pool, search, seen, solvedIds, tx]);

  /**
   * Draws a session from the pool.
   *
   * Weight the draw towards questions answered wrong or never seen, then ramp
   * easy → hard when no single level was chosen. Both behaviours predate this
   * redesign and are the reason a session feels targeted rather than random.
   */
  function start(pick: (question: Question) => boolean, title: string) {
    const draw = pool.filter(pick);
    if (draw.length === 0) return;

    const priority = draw.filter((q) => !seen.has(q.id) || (seen.get(q.id)?.wrong ?? 0) > 0);
    const priorityIds = new Set(priority.map((q) => q.id));
    const rest = draw.filter((q) => !priorityIds.has(q.id));
    const ordered = [...shuffle(priority), ...shuffle(rest)];
    let questions = length === null ? ordered : ordered.slice(0, length);
    if (!level) questions = [...questions].sort((a, b) => a.difficulty - b.difficulty);
    const first = questions[0];
    const path = first ? practiceQuestionPath(first) : null;
    if (!path) return;
    startSession({ questions, title });
    router.push(path);
  }

  const filtersOn =
    section !== null || level !== null || status !== "all" || search !== "" || length !== null;
  const poolSolved = pool.filter((q) => solvedIds.has(q.id)).length;
  // The review queue, counted inside the current filters for the same reason.
  const queuedHere = pool.filter((q) => queued.has(q.id)).length;
  // Set membership, not a nested scan: this runs on every keystroke of the
  // topic search, over the whole attempt log.
  const poolIds = new Set(pool.map((q) => q.id));
  const poolTries = data.attempts.filter((a) => poolIds.has(a.questionId));
  const poolAccuracy = poolTries.length
    ? poolTries.filter((a) => a.correct).length / poolTries.length
    : null;

  return (
    <div className="container-app pb-8">
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

        {/* Difficulty chips carry the level's own colour as a dot, in both
            states — a filter you have to select to identify is not a filter. */}
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
              dot
            >
              {t(`diff.${value}`)}
              <span className="qb-count">{scoped.byLevel[value]}</span>
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

        <Filter label={t("study.filterLength")}>
          {SESSION_LENGTHS.map((value) => (
            <Chip
              key={value ?? "all"}
              on={length === value}
              onClick={() => setLength(value)}
            >
              {value === null ? t("study.lengthAll") : value}
            </Chip>
          ))}
        </Filter>
      </div>

      {/* ---------------- coverage ---------------- */}
      <div className="qb-cover mt-7">
        <CoverageRing solved={poolSolved} total={pool.length} />
        <div className="flex flex-wrap items-baseline gap-x-8 gap-y-3">
          <Stat
            label={t("study.solvedOf")}
            value={`${poolSolved}/${pool.length}`}
          />
          {poolAccuracy !== null && (
            <Stat label={t("study.accuracy")} value={pct(poolAccuracy)} />
          )}
          {queuedHere > 0 && (
            <Stat label={t("study.inReview")} value={String(queuedHere)} tone="var(--danger)" />
          )}
          <Stat label={t("study.topicsLabel")} value={String(scoped.topics)} />
        </div>
        {filtersOn && (
          <button
            className="btn btn-sm ml-auto"
            onClick={() => {
              setSection(null);
              setLevel(null);
              setStatus("all");
              setSearch("");
              setLength(null);
            }}
          >
            {t("study.clearFilters")}
          </button>
        )}
      </div>

      {/* ---------------- view switch ---------------- */}
      <div className="mt-7 flex flex-wrap items-center gap-3">
        <div className="qb-views" role="tablist" aria-label={t("study.viewLabel")}>
          {(
            [
              ["sections", t("study.viewSections")],
              ["topics", t("study.viewTopics")],
            ] as [View, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              role="tab"
              aria-selected={view === value}
              className={`qb-view ${view === value ? "qb-view-on" : ""}`}
              onClick={() => setView(value)}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "topics" && (
          <input
            className="field max-w-[16rem]"
            placeholder={t("study.searchTopics")}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        )}

        <p className="text-sm text-muted ml-auto">
          <span className="num font-semibold text-foreground">
            {pluralize(pool.length, NOUNS.question)}
          </span>
        </p>
      </div>

      {pool.length === 0 ? (
        <EmptyState>{t("study.noMatch")}</EmptyState>
      ) : view === "sections" ? (
        <ul className="grid sm:grid-cols-2 gap-3 mt-4">
          {subjects
            .filter((subject) => !section || subject.id === section)
            .map((subject, i) => {
              const available = pool.filter((q) => q.subjectId === subject.id);
              const subjectTotal = statsFor(stats, subject.id).total;
              const attempted = available.filter((q) => seen.has(q.id));
              /*
               * Counted against the questions that are actually in the bank
               * today, not against the whole attempt log.
               *
               * Matching on subjectId alone credited answers to questions that
               * have since been deleted, so a card could read "1 / 1 solved"
               * while the summary above it — which only ever counted live
               * questions — read "0 / 1". Two numbers for the same fact, and
               * the more flattering one was wrong.
               */
              const subjectIds = new Set(
                bank.filter((q) => q.subjectId === subject.id).map((q) => q.id),
              );
              const tries = data.attempts.filter((a) => subjectIds.has(a.questionId));
              const solved = new Set(
                tries.filter((a) => a.correct).map((a) => a.questionId),
              ).size;
              const name = tx(subject.name);

              return (
                <Reveal as="li" key={subject.id} delay={i * 55}>
                  <div
                    className="bank-card qb-subject-card"
                    style={subjectGradient(subject.id) as React.CSSProperties}
                  >
                    {/* Text zone. The card is a grid, so the artwork beside it
                        can never reach this column. */}
                    <span className="block min-w-0">
                      <span className="block bank-title">{name}</span>

                      <span className="bank-stats">
                        <span className="num whitespace-nowrap">
                          {solved} {t("bank.of")} {subjectTotal}
                        </span>
                        <span className="whitespace-nowrap">{t("bank.solved")}</span>
                        {subjectTotal > 0 && (
                          <span className="num ml-auto font-semibold">
                            {pct(subjectTotal ? Math.min(1, solved / subjectTotal) : 0)}
                          </span>
                        )}
                      </span>

                      <span className="block bank-track mt-2.5">
                        <span
                          className="block bank-fill"
                          style={{
                            width: `${subjectTotal ? Math.min(1, solved / subjectTotal) * 100 : 0}%`,
                          }}
                        />
                      </span>

                      <button
                        className="qb-start mt-4"
                        disabled={available.length === 0}
                        onClick={() => start((q) => q.subjectId === subject.id, name)}
                      >
                        {attempted.length > 0
                          ? t("study.resumeSession")
                          : t("study.startSession")}
                        <span aria-hidden>›</span>
                      </button>
                    </span>

                    {/* Art zone: the subject's own lit scene, the same one the
                        home cards use. It is what the card was missing — without
                        it a gradient card is just a coloured rectangle. */}
                    <span className="bank-art">
                      <SubjectScene kind={subject.id === "sat-math" ? "math" : "verbal"} />
                    </span>
                  </div>
                </Reveal>
              );
            })}
        </ul>
      ) : domains.length === 0 ? (
        <EmptyState>{t("study.noMatch")}</EmptyState>
      ) : (
        <ul className="space-y-2.5 mt-4">
          {domains.map((domain, i) => {
            // The first group opens by default: a screen of closed rows makes a
            // student click before they learn anything.
            const open = openDomains.size === 0 ? i === 0 : openDomains.has(domain.key);
            const accuracy = domain.tries ? domain.correct / domain.tries : null;
            return (
              <Reveal as="li" key={domain.key} delay={i * 45}>
                <div
                  className="qb-domain"
                  style={{ ["--tone" as string]: subjectColor(domain.subjectId) }}
                >
                  <button
                    className="qb-domain-head"
                    aria-expanded={open}
                    onClick={() =>
                      setOpenDomains((previous) => {
                        // First interaction has to materialise the implicit
                        // "first one open" state, or toggling row 1 does nothing.
                        const next = new Set(
                          previous.size === 0 ? [domains[0].key] : previous,
                        );
                        if (next.has(domain.key)) next.delete(domain.key);
                        else next.add(domain.key);
                        return next;
                      })
                    }
                  >
                    <span className="qb-domain-rule" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-semibold truncate">
                        {domain.key}
                      </span>
                      <span className="block text-micro text-muted mt-0.5">
                        {pluralize(domain.topicList.length, NOUNS.topic)} ·{" "}
                        <span className="num">
                          {domain.solved}/{domain.total}
                        </span>{" "}
                        {t("study.solvedOf")}
                        {accuracy !== null && (
                          <>
                            {" · "}
                            <span className="num">{pct(accuracy)}</span>
                          </>
                        )}
                      </span>
                    </span>
                    <span className="w-20 shrink-0 hidden sm:block">
                      <ProgressBar
                        value={domain.total ? domain.solved / domain.total : 0}
                        tone="accent"
                      />
                    </span>
                    <span
                      className="text-faint text-micro shrink-0 transition-transform"
                      style={{ transform: open ? "rotate(90deg)" : "none" }}
                      aria-hidden
                    >
                      ▸
                    </span>
                  </button>

                  {open &&
                    domain.topicList.map((topic) => {
                      const topicAccuracy = topic.tries ? topic.correct / topic.tries : null;
                      return (
                        <div key={topic.key} className="qb-topic">
                          <span className="min-w-0 flex-1 text-sm truncate">
                            {topic.key}
                          </span>
                          <Pips solved={topic.solved} total={topic.total} />
                          <span className="num text-micro text-muted w-14 text-right">
                            {topic.solved}/{topic.total}
                          </span>
                          <span className="num text-micro text-faint w-10 text-right">
                            {topicAccuracy === null ? "—" : pct(topicAccuracy)}
                          </span>
                          <button
                            className="btn btn-sm shrink-0"
                            onClick={() => start((q) => q.topic === topic.key, topic.key)}
                          >
                            {t("study.practiseTopic")}
                          </button>
                        </div>
                      );
                    })}
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
  dot,
  children,
}: {
  on: boolean;
  onClick: () => void;
  /** Chips in the difficulty row carry that level's colour. */
  tone?: string;
  /** Show the tone as a leading dot, so an unselected chip still reads. */
  dot?: boolean;
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
      {dot && tone && (
        <span
          className="qb-legend-dot"
          style={{ background: on ? "#fff" : tone, marginRight: 0 }}
          aria-hidden
        />
      )}
      {children}
    </button>
  );
}


function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <p className="num text-h3 font-medium" style={tone ? { color: tone } : undefined}>
        {value}
      </p>
      <p className="text-micro text-muted mt-0.5">{label}</p>
    </div>
  );
}

/** Four-state mastery ladder for a topic. See `.qb-pips` for why not a number. */
function Pips({ solved, total }: { solved: number; total: number }) {
  const ratio = total ? solved / total : 0;
  const filled = solved === 0 ? 0 : ratio >= 0.999 ? 4 : ratio >= 0.6 ? 3 : ratio >= 0.25 ? 2 : 1;
  const tone =
    filled === 4 ? "var(--lvl-1)" : filled >= 2 ? "var(--lvl-2)" : "var(--line-strong)";
  return (
    <span className="qb-pips" style={{ ["--tone" as string]: tone }} aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={`qb-pip ${i < filled ? "qb-pip-on" : ""}`} />
      ))}
    </span>
  );
}

/** Solved-out-of-total as a ring. The one number the page is really about. */
function CoverageRing({ solved, total }: { solved: number; total: number }) {
  const ratio = total ? solved / total : 0;
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  return (
    <div className="relative shrink-0" style={{ width: 64, height: 64 }}>
      <svg width="64" height="64" viewBox="0 0 64 64" style={{ transform: "rotate(-90deg)" }}>
        <circle cx="32" cy="32" r={radius} fill="none" stroke="var(--line)" strokeWidth="5" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke="var(--brand)"
          strokeWidth="5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - ratio)}
          style={{ transition: "stroke-dashoffset 600ms cubic-bezier(0.22,0.61,0.36,1)" }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center num text-sm font-semibold">
        {Math.round(ratio * 100)}%
      </span>
    </div>
  );
}
