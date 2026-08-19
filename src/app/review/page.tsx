"use client";

import { useMemo, useRef, useState } from "react";
import { SAT, getSubject, subjectsFor } from "@/data/exams";
import type { Difficulty, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { difficultyColor, reviewQueue } from "@/lib/stats";
import { PracticeRunner } from "@/components/PracticeRunner";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";
import { RichText } from "@/lib/math/markdown";
import { Select } from "@/components/Select";
import { Reveal } from "@/components/motion";
import { QueueCleared } from "@/components/QueueCleared";
import { SectionGate } from "@/components/SectionGate";

/** How many questions one sitting draws. The queue is a list; a session is short. */
const SESSION = 15;

const LEVELS: Difficulty[] = [1, 2, 3];

/** How many rows the flat list shows before asking. */
const PAGE = 12;

/** The orders a queue is worth reading in. */
type SortKey = "missed" | "recent" | "hard";
const SORTS: SortKey[] = ["missed", "recent", "hard"];

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
  /**
   * How big the queue was when this sitting started, once it has emptied.
   *
   * Null means "show the ordinary empty state". It is set only on the way out
   * of a session that finished the queue off, which is the difference between
   * clearing it and never having had one — a new account has an empty queue
   * too, and congratulating them for that would make the celebration mean
   * nothing the day they earn it.
   */
  const [cleared, setCleared] = useState<number | null>(null);
  /** The queue length as the session began, captured before it starts shrinking. */
  const startedWith = useRef(0);
  /**
   * The questions this sitting is serving, frozen at the moment it started.
   *
   * It used to be `shown.slice(0, SESSION)`, recomputed on every render — and
   * the queue shrinks as the sitting goes on, because answering a question
   * right for the second time is exactly what removes it. So the list the
   * student was working through re-indexed underneath them mid-session, and
   * clearing the last one dropped the whole runner, results screen and all,
   * before they could see how they had done. A session is a fixed set of
   * questions; the queue behind it can do what it likes.
   */
  const [sitting, setSitting] = useState<Question[]>([]);

  const [section, setSection] = useState<string | null>(null);
  const [domain, setDomain] = useState<string | null>(null);
  const [skill, setSkill] = useState<string | null>(null);
  const [level, setLevel] = useState<Difficulty | null>(null);
  /** Shut by default: the queue is the page, the filters are a tool. */
  const [filtersOpen, setFiltersOpen] = useState(false);
  /**
   * How the queue is read.
   *
   * Grouped by skill is the default and the reason this page was rebuilt: a
   * student with seventy-three questions due was handed seventy-three rows of
   * prompt, when what they came to find out is which four or five things keep
   * catching them. Grouped, that is eight rows they can act on; the questions
   * are still there, one disclosure away.
   */
  const [grouped, setGrouped] = useState(true);
  const [sort, setSort] = useState<SortKey>("missed");
  /** Which skill groups are open. Empty is the resting state. */
  const [open, setOpen] = useState<Set<string>>(new Set());
  /** The flat list pages rather than running off the bottom of the screen. */
  const [page, setPage] = useState(PAGE);

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

  /**
   * The queue in the order the student asked for.
   *
   * `reviewQueue` already returns its own order — hardest first — and that is
   * what "missed" keeps. The other two are re-reads of the same list, not
   * different queues: the session always takes from the top of whatever is on
   * screen, so the order is a real control rather than a display preference.
   */
  const ordered = useMemo(() => {
    const list = [...shown];
    if (sort === "recent") {
      list.sort((a, b) => (records.get(b.id)?.last ?? 0) - (records.get(a.id)?.last ?? 0));
    } else if (sort === "hard") {
      list.sort((a, b) => b.difficulty - a.difficulty);
    }
    return list;
  }, [shown, sort, records]);

  /** The queue folded into its skills, biggest first. */
  const groups = useMemo(() => {
    const map = new Map<string, Question[]>();
    for (const question of ordered) {
      const key = question.skill ?? question.topic;
      const list = map.get(key);
      if (list) list.push(question);
      else map.set(key, [question]);
    }
    return [...map.entries()].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]));
  }, [ordered]);

  /** The exact questions the button below will serve, so the list can say so. */
  const session = useMemo(
    () => new Set(ordered.slice(0, SESSION).map((question) => question.id)),
    [ordered],
  );

  const subjects = subjectsFor(SAT.exam);
  const filtersOn = section !== null || domain !== null || skill !== null || level !== null;
  const activeCount = [domain, skill, level].filter((value) => value !== null).length;

  const toggleGroup = (key: string) =>
    setOpen((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  function clear() {
    setSection(null);
    setDomain(null);
    setSkill(null);
    setLevel(null);
  }

  if (running && sitting.length > 0) {
    return (
      <PracticeRunner
        questions={sitting}
        mode="review"
        title={t("review.title")}
        onExit={() => {
          setRunning(false);
          // The queue recomputes from `data` as answers are recorded, so by the
          // time this runs it already reflects the sitting. Nothing left and
          // something there when we started means it was just finished off.
          if (queue.length === 0 && startedWith.current > 0) setCleared(startedWith.current);
        }}
      />
    );
  }

  if (queue.length === 0) {
    return (
      <div className="container-app">
        <PageTitle sub={t("review.desc")}>{t("review.title")}</PageTitle>
        {cleared !== null ? (
          <QueueCleared count={cleared} onDismiss={() => setCleared(null)} />
        ) : (
          <EmptyState
            tone="positive"
            title={t("review.emptyTitle")}
            action={{ href: "/practice", label: t("nav.practice") }}
          >
            {t("review.empty")}
          </EmptyState>
        )}
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
          onClick={() => {
            startedWith.current = queue.length;
            setSitting(ordered.slice(0, SESSION));
            setRunning(true);
          }}
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

        {/*
          Domain, skill and difficulty are selects behind a disclosure, not chips.

          As chips they were three rows of them — sixteen skills, most holding one
          question — which filled the screen before the queue itself appeared and
          made a list of 73 questions look like a control panel. A select holds
          sixteen options in one line of layout, and the counts still come along in
          the labels. Section stays as chips: there are two of them, and it is the
          cut a student actually makes.
        */}
        <div className="rv-filter-bar">
          <button
            type="button"
            className={`btn btn-sm ${filtersOpen ? "is-on" : ""}`}
            aria-expanded={filtersOpen}
            onClick={() => setFiltersOpen((open) => !open)}
          >
            {t("review.narrow")}
            {activeCount > 0 && <span className="qb-count">{activeCount}</span>}
          </button>

          {/* What is currently on, even with the panel shut — a filter you cannot
              see is a filter you will not think to remove. */}
          {domain && (
            <button className="rv-pill" onClick={() => { setDomain(null); setSkill(null); }}>
              {domain === "—" ? t("review.noDomain") : domain} <span aria-hidden>✕</span>
            </button>
          )}
          {skill && (
            <button className="rv-pill" onClick={() => setSkill(null)}>
              {skill} <span aria-hidden>✕</span>
            </button>
          )}
          {level && (
            <button className="rv-pill" onClick={() => setLevel(null)}>
              {t(`diff.${level}`)} <span aria-hidden>✕</span>
            </button>
          )}
          {filtersOn && (
            <button className="rv-clear" onClick={clear}>
              {t("study.clearFilters")}
            </button>
          )}
        </div>

        {filtersOpen && (
          <div className="rv-filter-panel fade-in">
            <label className="block">
              <span className="label">{t("review.filterDomain")}</span>
              <Select
                label={t("review.filterDomain")}
                value={domain ?? ""}
                onChange={(next) => {
                  setDomain(next || null);
                  setSkill(null);
                }}
                options={[
                  { value: "", label: t("review.allDomains") },
                  ...options.domains.map(([name, count]) => ({
                    value: name,
                    // A question saved before domains existed has none; "—" as a
                    // label reads as a rendering fault rather than as a bucket.
                    label: name === "—" ? t("review.noDomain") : name,
                    hint: count,
                  })),
                ]}
              />
            </label>

            <label className="block">
              <span className="label">{t("review.filterSkill")}</span>
              <Select
                label={t("review.filterSkill")}
                value={skill ?? ""}
                onChange={(next) => setSkill(next || null)}
                options={[
                  { value: "", label: t("review.allSkills") },
                  ...options.skills.map(([name, count]) => ({
                    value: name,
                    label: name,
                    hint: count,
                  })),
                ]}
              />
            </label>

            <label className="block">
              <span className="label">{t("quiz.difficulty")}</span>
              <Select
                label={t("quiz.difficulty")}
                value={level === null ? "" : String(level)}
                onChange={(next) => setLevel(next ? (Number(next) as Difficulty) : null)}
                options={[
                  { value: "", label: t("diff.all") },
                  ...LEVELS.map((value) => ({
                    value: String(value),
                    label: t(`diff.${value}`),
                    hint: queue.filter((q) => q.difficulty === value).length,
                  })).filter((option) => option.hint > 0),
                ]}
              />
            </label>
          </div>
        )}
      </div>

      {/* ---------------- how the queue is read ----------------
          Two controls, both of which change what the session serves rather than
          only how it looks: the order decides which fifteen go first, and the
          grouping decides whether you are looking at questions or at skills. */}
      <div className="rv-view">
        <div className="rv-seg" role="group" aria-label={t("review.sortBy")}>
          {SORTS.map((key) => (
            <button
              key={key}
              type="button"
              className="rv-seg-btn"
              aria-pressed={sort === key}
              onClick={() => {
                setSort(key);
                setPage(PAGE);
              }}
            >
              {t(`review.sort${key[0].toUpperCase()}${key.slice(1)}`)}
            </button>
          ))}
        </div>

        <div className="rv-seg" role="group" aria-label={t("review.bySkill")}>
          <button
            type="button"
            className="rv-seg-btn"
            aria-pressed={grouped}
            onClick={() => setGrouped(true)}
          >
            {t("review.bySkill")}
          </button>
          <button
            type="button"
            className="rv-seg-btn"
            aria-pressed={!grouped}
            onClick={() => {
              setGrouped(false);
              setPage(PAGE);
            }}
          >
            {t("review.asList")}
          </button>
        </div>

        {grouped && groups.length > 1 && (
          <button
            type="button"
            className="rv-clear ml-auto"
            onClick={() =>
              setOpen(open.size === groups.length ? new Set() : new Set(groups.map(([k]) => k)))
            }
          >
            {open.size === groups.length ? t("review.collapseAll") : t("review.expandAll")}
          </button>
        )}
      </div>

      {shown.length === 0 ? (
        <EmptyState>{t("study.noMatch")}</EmptyState>
      ) : grouped ? (
        <ul className="rv-groups">
          {groups.map(([name, questions], i) => (
            <Reveal as="li" key={name} delay={Math.min(i, 8) * 45}>
              <SkillGroup
                name={name}
                questions={questions}
                records={records}
                session={session}
                open={open.has(name)}
                onToggle={() => toggleGroup(name)}
              />
            </Reveal>
          ))}
        </ul>
      ) : (
        <>
          <ul className="rv-list">
            {ordered.slice(0, page).map((question, i) => (
              <Reveal as="li" key={question.id} delay={Math.min(i, 8) * 40}>
                <Item
                  question={question}
                  record={records.get(question.id)}
                  inSession={session.has(question.id)}
                />
              </Reveal>
            ))}
          </ul>

          {/* The list stops rather than running off the bottom of the screen.
              Both ways on are here: one more page, or the lot. */}
          {page < ordered.length && (
            <div className="rv-more">
              <button className="btn btn-sm" onClick={() => setPage((n) => n + PAGE)}>
                {t("review.showMore")} · {Math.min(PAGE, ordered.length - page)}
              </button>
              <button className="rv-clear" onClick={() => setPage(ordered.length)}>
                {t("review.showAll")} · {ordered.length}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

/**
 * One skill, and the questions it is holding.
 *
 * Shut, it is a single row: the skill, how many are due under it, and a strip
 * of one mark per question shaded by difficulty — enough to tell "four easy
 * ones" from "one that keeps killing me" without opening anything. Open, it is
 * the list this page used to be, but only for the skill you asked about.
 *
 * The panel animates on `grid-template-rows`, which is the one way to get a
 * height transition out of content whose height nobody knows in advance.
 */
function SkillGroup({
  name,
  questions,
  records,
  session,
  open,
  onToggle,
}: {
  name: string;
  questions: Question[];
  records: Map<string, Record_>;
  session: Set<string>;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, tx } = useI18n();
  const subject = getSubject(questions[0].subjectId);
  const missed = questions.reduce((sum, q) => sum + (records.get(q.id)?.wrong ?? 0), 0);
  const due = session.size > 0 ? questions.filter((q) => session.has(q.id)).length : 0;

  return (
    <div className="rv-group" data-open={open ? "" : undefined}>
      <button type="button" className="rv-group-head" aria-expanded={open} onClick={onToggle}>
        <span className="rv-group-chev" aria-hidden>
          <svg viewBox="0 0 12 12" width="12" height="12">
            <path
              d="M4.5 2.5 8 6l-3.5 3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <span className="rv-group-name">
          <strong>{name}</strong>
          <span>
            {questions[0].domain ?? (subject ? tx(subject.name) : "")}
            {missed > 0 && (
              <>
                {" · "}
                <span className="num">{missed}</span> {t("review.timesWrong")}
              </>
            )}
          </span>
        </span>

        {/* One mark per question, shaded by difficulty; the filled ones are the
            questions the next sitting will actually serve. */}
        <span className="rv-group-marks" aria-hidden>
          {questions.slice(0, 12).map((question) => (
            <em
              key={question.id}
              data-level={question.difficulty}
              data-due={session.has(question.id) ? "" : undefined}
            />
          ))}
        </span>

        <span className="rv-group-count num">
          {questions.length}
          {due > 0 && <span className="rv-group-due">{due}</span>}
        </span>
      </button>

      <div className="rv-group-panel">
        <div>
          <ul>
            {questions.map((question) => (
              <li key={question.id}>
                <Item
                  question={question}
                  record={records.get(question.id)}
                  inSession={session.has(question.id)}
                  compact
                />
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}

/** One queued question: where it comes from, how badly, and what it says. */
function Item({
  question,
  record,
  inSession = false,
  compact = false,
}: {
  question: Question;
  record?: Record_;
  /** Marked when this is one of the questions the next sitting will serve. */
  inSession?: boolean;
  /** Inside a skill group, where the skill name is already on the row above. */
  compact?: boolean;
}) {
  const { t, tx } = useI18n();
  const subject = getSubject(question.subjectId);

  return (
    <div className="rv-item" data-session={inSession ? "" : undefined} data-compact={compact ? "" : undefined}>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        {!compact && (
          <span className="text-sm font-medium">{question.skill ?? question.topic}</span>
        )}
        {!compact && question.domain && (
          <span className="text-micro text-faint">{question.domain}</span>
        )}
        {!compact && subject && <span className="text-micro text-faint">{tx(subject.name)}</span>}
        {inSession && <span className="rv-session-tag">{t("review.inSession")}</span>}

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
