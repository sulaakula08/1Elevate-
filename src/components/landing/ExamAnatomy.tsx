"use client";

import Link from "next/link";
import { useRef } from "react";
import { useReducedMotion } from "motion/react";
import { SAT, SUBJECTS, getSubject, subjectGradient } from "@/data/exams";
import { domainsFor } from "@/data/taxonomy";
import { useI18n } from "@/lib/i18n";
import { SubjectIllustration } from "./SubjectIllustration";
import { useCountTo, useEntered, useScrollStage, useScrollVar } from "./scroll";

/**
 * The exam, and then the two sections it is made of, as one composition.
 *
 * These used to be two things: a claim about timing inside a feature grid, and a
 * pair of subject cards under a heading of their own. Splitting them meant the
 * page said "real SAT structure" in one place and showed the two sections in
 * another, with nothing joining them.
 *
 * Here the timeline is built from `SAT.sections` — the same blueprint the mock
 * runner reads — and every segment is as wide as its share of the sitting, so
 * the graphic is a scale drawing rather than five equal boxes. The subject cards
 * below sit on the same five-column grid: Reading & Writing under the two RW
 * modules, Math under the two Math modules, the break spanning the gutter
 * between them. Nothing labels that alignment and nobody has to notice it, but
 * it is why the section reads as one object.
 *
 * The WebGL scenes are the ones the signed-in dashboard uses, kept because they
 * are the best thing on the old page and because they now have somewhere to
 * belong: the exam resolves into its two sections, and each section has a
 * surface. They still boot lazily and still render one still frame under reduced
 * motion.
 */

/** Ten minutes, as `BreakScreen` implements it. */
const BREAK_MINUTES = 10;

type Segment = {
  id: string;
  subjectId: string | null;
  label: string;
  minutes: number;
  count: number | null;
};

/**
 * The sitting, in order, with the break inserted where the mock inserts it —
 * between the last Reading and Writing module and the first Math one.
 */
function buildSegments(): Segment[] {
  const out: Segment[] = [];
  SAT.sections.forEach((section, i) => {
    const previous = SAT.sections[i - 1];
    if (previous && previous.subjectId !== section.subjectId) {
      out.push({
        id: "break",
        subjectId: null,
        label: "",
        minutes: BREAK_MINUTES,
        count: null,
      });
    }
    out.push({
      id: `${section.subjectId}-${section.module}`,
      subjectId: section.subjectId,
      label: String(section.module),
      minutes: section.minutes,
      count: section.count,
    });
  });
  return out;
}

/**
 * Index of the segment that `fraction` of the way through the sitting falls in.
 *
 * The sitting is measured in minutes, so a fraction of the timeline's *width* is
 * a fraction of its *time* — which is the property that lets the playhead and the
 * highlight agree.
 */
function segmentAt(fraction: number, segments: Segment[]): number {
  const total = segments.reduce((sum, segment) => sum + segment.minutes, 0);
  let elapsed = 0;
  for (let i = 0; i < segments.length; i += 1) {
    elapsed += segments[i].minutes;
    if (fraction <= elapsed / total) return i;
  }
  return segments.length - 1;
}

export function ExamAnatomy() {
  const { t, tx } = useI18n();
  const reduced = useReducedMotion();
  const track = useRef<HTMLDivElement>(null);
  const entered = useEntered(track, { threshold: 0.25 });

  useScrollVar(track, { range: "through", property: "--p", enabled: !reduced });

  const segments = buildSegments();

  /*
   * Which module the playhead is over.
   *
   * Not `useScrollStage(track, segments.length)`, which would give each segment an
   * equal slice of the scroll — and the segments are deliberately not equal. The
   * playhead is drawn at `--p × width`, and the widths are proportional to
   * minutes, so an evenly-divided stage index puts the highlight on the break
   * while the line is still over Reading & Writing. The graphic would be
   * contradicting itself in the one place it is making a claim about time.
   *
   * So: measure in twentieths, then look up which segment that fraction of the
   * sitting actually falls in. Twenty is enough that the highlight changes within
   * a few percent of the line crossing the boundary, and still only twenty state
   * changes across the whole section.
   */
  const bucket = useScrollStage(track, 20, { range: "through", enabled: !reduced });
  const live = segmentAt((bucket + 0.5) / 20, segments);

  const totalQuestions = SAT.sections.reduce((sum, section) => sum + section.count, 0);
  const totalMinutes = SAT.sections.reduce((sum, section) => sum + section.minutes, 0);
  const longestModule = Math.max(...segments.map((segment) => segment.minutes));
  const questions = useCountTo(totalQuestions, entered, { duration: reduced ? 0 : 900 });

  /* The grid both the timeline and the subject cards are laid out on. Written
     once, as a string, because the whole alignment depends on the two using
     exactly the same track sizes. The break is allowed to shrink no further than
     a legible glyph. */
  const columns = segments
    .map((segment) =>
      segment.subjectId ? `${segment.minutes}fr` : `minmax(3.25rem, ${segment.minutes}fr)`,
    )
    .join(" ");

  const activeSegment = segments[live];

  return (
    <section id="sat-anatomy" className="lp-exam" aria-labelledby="lp-exam-title">
      <span className="lp-exam-bleed" aria-hidden />

      <header className="lp-exam-head">
        <p className="t-label">{t("lp.examEyebrow")}</p>
        <h2 id="lp-exam-title" className="lp-exam-title">
          {t("lp.examTitle")}
        </h2>
        <p className="lp-exam-sub">{t("lp.examSub")}</p>
      </header>

      <div className="lp-exam-track" ref={track}>
        <div className="lp-exam-clock">
          {/* The readout states the length of the module the playhead is over —
              a real number that changes as you move through the sitting, rather
              than a decorative clock counting down to nothing. */}
          <span className="lp-exam-clock-value num" key={activeSegment?.id}>
            {String(activeSegment?.minutes ?? 0).padStart(2, "0")}:00
          </span>
          <span className="lp-exam-clock-label">
            {activeSegment?.subjectId
              ? `${tx(getSubject(activeSegment.subjectId)?.name ?? { en: "" })} · ${t(
                  "lp.examModule",
                )} ${activeSegment.label}`
              : t("lp.examBreak")}
          </span>
        </div>

        <ol
          className="lp-exam-line"
          style={{ ["--cols" as string]: columns }}
          aria-label={t("lp.examTimeline")}
        >
          {/* One playhead, scroll-linked, drawn over the whole row. */}
          <span className="lp-exam-playhead" aria-hidden />

          {segments.map((segment, i) => {
            const subject = segment.subjectId ? getSubject(segment.subjectId) : null;
            const isBreak = !segment.subjectId;
            return (
              <li
                key={segment.id}
                className="lp-exam-seg"
                data-break={isBreak ? "" : undefined}
                data-on={i === live ? "" : undefined}
                style={{
                  ["--n" as string]: i,
                  /* This segment's length against the longest one.
                     On wide screens the grid's `fr` units already carry the
                     proportion and the bar simply fills its column. On a phone
                     the timeline becomes a stack of full-width rows, and the
                     bar has to carry the proportion itself — a scale drawing
                     has to stay a scale drawing when it turns vertical. */
                  ["--share" as string]: (segment.minutes / longestModule).toFixed(3),
                  ["--tone" as string]: subject
                    ? `var(--s-${subject.color})`
                    : "var(--line-strong)",
                }}
              >
                <p className="lp-exam-seg-name">
                  {isBreak ? (
                    t("lp.examBreak")
                  ) : (
                    <>
                      <span className="lp-exam-seg-subject">
                        {subject ? tx(subject.name) : ""}
                      </span>
                      <span className="lp-exam-seg-module">
                        {t("lp.examModule")} {segment.label}
                      </span>
                    </>
                  )}
                </p>

                {/* The bar is what assembles. It scales from its left edge on
                    scroll, so five bars of the right relative widths draw
                    themselves across the sitting in the order they happen. */}
                <span className="lp-exam-bar" aria-hidden />

                <p className="lp-exam-seg-meta num">
                  {segment.count !== null && (
                    <>
                      {segment.count}
                      {t("lp.examQuestionsShort")}
                      <span aria-hidden> · </span>
                    </>
                  )}
                  {segment.minutes} {t("common.minutes")}
                </p>
              </li>
            );
          })}
        </ol>

        <dl className="lp-exam-total">
          <div>
            <dt className="lp-exam-total-value num">{questions}</dt>
            <dd className="lp-exam-total-label">{t("lp.examTotalQuestions")}</dd>
          </div>
          <div>
            <dt className="lp-exam-total-value num">
              {Math.floor(totalMinutes / 60)} h {totalMinutes % 60}
            </dt>
            <dd className="lp-exam-total-label">{t("lp.examTotalTime")}</dd>
          </div>
          <div>
            <dt className="lp-exam-total-value num">
              {SAT.minScore}–{SAT.maxScore}
            </dt>
            <dd className="lp-exam-total-label">{t("lp.examScored")}</dd>
          </div>
        </dl>
      </div>

      {/* ---------------- the two sections ---------------- */}
      <h3 className="lp-subjects-title">{t("lp.subjectsTitle")}</h3>

      <div className="lp-subjects" style={{ ["--cols" as string]: columns }}>
        {SUBJECTS.map((subject) => {
          const isMath = subject.id === "sat-math";
          const domains = domainsFor(subject.id);
          return (
            <Link
              key={subject.id}
              href="/signup"
              className={`bank-card showcase-card sc-subject lp-subject lp-subject-${
                isMath ? "math" : "rw"
              }`}
              style={subjectGradient(subject.id) as React.CSSProperties}
            >
              <SubjectIllustration kind={isMath ? "math" : "verbal"} />
              <span className="sc-scrim" aria-hidden />

              <span className="sc-body">
                <span className="sc-mark" aria-hidden>
                  {subject.glyph}
                </span>
                <span className="sc-name">{tx(subject.name)}</span>
                <span className="sc-blurb">
                  {t(isMath ? "showcase.mathBlurb" : "showcase.rwBlurb")}
                </span>

                {/* The four official domains, which is the honest answer to
                    "what is in here" — and unlike a question count it does not
                    read "0" on a fresh install. */}
                <span className="lp-subject-domains">
                  <span className="lp-subject-domains-label">{t("lp.subjectsDomains")}</span>
                  {domains.map((domain) => (
                    <span key={domain.name} className="lp-subject-domain">
                      {domain.name}
                    </span>
                  ))}
                </span>

                <span className="lp-subject-go">
                  {t("lp.subjectOpen")} <span aria-hidden>→</span>
                </span>
              </span>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
