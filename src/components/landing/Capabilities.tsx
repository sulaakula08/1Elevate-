"use client";

import { useRef, useState } from "react";
import { useReducedMotion } from "motion/react";
import { SUBJECTS, getSubject, subjectColor } from "@/data/exams";
import {
  BANK_PREVIEW_ROWS,
  LOOP_MISS_QUESTION,
  PROGRESS_PREVIEW,
} from "@/data/landing-sample";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/math/markdown";
import { TutorAvatar } from "../TutorAvatar";
import { useCountTo, useEntered, usePointerVars } from "./scroll";

/**
 * The three surfaces a student actually spends time on, each given the
 * composition its content asks for rather than a card the same size as the
 * others.
 *
 *   the bank    a wide working list with live filters. It is the only genuinely
 *               interactive thing in the middle of the page, and it is here
 *               because "filter to the skill you keep missing" is a claim you can
 *               either read or try.
 *   explanation two overlapping cards, the front one carrying a real exchange
 *               with the tutor. Offset and layered, because that is what it is:
 *               something that opens on top of the question.
 *   review      a full-width chart. Five skills, weakest first, bars that grow
 *               to their real fractions on arrival.
 *
 * Three identical feature cards would have been a third of the code. They would
 * also have said that the three things matter equally and work the same way,
 * which is false in both halves.
 */
export function Capabilities() {
  const { t } = useI18n();

  return (
    <section id="product" className="lp-caps" aria-labelledby="lp-caps-title">
      <header className="lp-caps-head" data-motion="section-head">
        <p className="t-label">{t("lp.capsEyebrow")}</p>
        <h2 id="lp-caps-title" className="lp-caps-title">
          {t("lp.capsTitle")}
        </h2>
        <p className="lp-caps-sub">{t("lp.capsSub")}</p>
      </header>

      <BankSurface />
      <ExplanationSurface />
      <ReviewSurface />
    </section>
  );
}

/* ============================== 1 — the bank ============================== */

const STATE_COPY = {
  missed: "lp.stateMissed",
  unseen: "lp.stateUnseen",
  solved: "lp.stateSolved",
} as const;

function BankSurface() {
  const { t, tx } = useI18n();
  const [filter, setFilter] = useState<string | null>(null);

  const matches = (subjectId: string) => filter === null || subjectId === filter;
  const showing = BANK_PREVIEW_ROWS.filter((row) => matches(row.subjectId)).length;

  return (
    <article className="lp-cap lp-cap-bank">
      <div className="lp-cap-copy">
        <p className="t-label lp-cap-label">{t("lp.cap1Label")}</p>
        <h3 className="lp-cap-title">{t("lp.cap1Title")}</h3>
        <p className="lp-cap-text">{t("lp.cap1Text")}</p>
        <p className="lp-cap-try">{t("lp.cap1Try")}</p>
      </div>

      <div className="lp-cap-surface lp-bank">
        <div className="lp-bank-bar">
          <div className="lp-bank-chips" role="group" aria-label={t("study.filterSection")}>
            <button
              type="button"
              className={`chip ${filter === null ? "chip-on" : ""}`}
              aria-pressed={filter === null}
              onClick={() => setFilter(null)}
            >
              {t("lp.cap1All")}
              <span className="qb-count">{BANK_PREVIEW_ROWS.length}</span>
            </button>
            {SUBJECTS.map((subject) => {
              const count = BANK_PREVIEW_ROWS.filter((row) => row.subjectId === subject.id).length;
              return (
                <button
                  key={subject.id}
                  type="button"
                  className={`chip ${filter === subject.id ? "chip-on" : ""}`}
                  aria-pressed={filter === subject.id}
                  onClick={() => setFilter(subject.id)}
                >
                  {tx(subject.name)}
                  <span className="qb-count">{count}</span>
                </button>
              );
            })}
          </div>
          <p className="lp-bank-showing num" aria-live="polite">
            {showing} {t("lp.bankShowing")}
          </p>
        </div>

        {/*
          Filtered rows collapse rather than disappear.
          Every row is exactly `--row-h` tall, which is the one thing that makes
          a max-height transition honest: the value it animates to is the value
          the row actually has, so nothing clips at the end and nothing has to be
          measured. Rows stay mounted, so the list can be filtered twice in a
          second without a single element being created.
        */}
        <ul className="lp-bank-list">
          {BANK_PREVIEW_ROWS.map((row) => {
            const on = matches(row.subjectId);
            const subject = getSubject(row.subjectId);
            return (
              <li
                key={`${row.skill}-${row.difficulty}`}
                className="lp-bank-row"
                data-off={on ? undefined : ""}
                aria-hidden={!on}
                style={{ ["--tone" as string]: subjectColor(row.subjectId) }}
              >
                <span className="lp-bank-tone" aria-hidden />
                <span className="lp-bank-skill">{row.skill}</span>
                <span className="lp-bank-domain">{row.domain}</span>
                <span className="lp-bank-subject">{subject ? tx(subject.name) : ""}</span>
                <span className="lp-bank-level" data-level={row.difficulty}>
                  {t(`diff.${row.difficulty}`)}
                </span>
                <span className="lp-bank-state" data-state={row.state}>
                  {t(STATE_COPY[row.state])}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

/* ========================== 2 — the explanation ========================== */

function ExplanationSurface() {
  const { t, tx } = useI18n();
  const stack = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();

  // Pointer parallax on the two cards. Six pixels of travel, and only where
  // there is a real pointer — enough for the stack to feel like it has depth,
  // not enough to notice as an effect.
  usePointerVars(stack, { enabled: !reduced });

  const wrong = LOOP_MISS_QUESTION.choices[2];
  const right = LOOP_MISS_QUESTION.choices[LOOP_MISS_QUESTION.answer];

  return (
    <article className="lp-cap lp-cap-explain">
      <div className="lp-cap-copy">
        <p className="t-label lp-cap-label">{t("lp.cap2Label")}</p>
        <h3 className="lp-cap-title">{t("lp.cap2Title")}</h3>
        <p className="lp-cap-text">{t("lp.cap2Text")}</p>
      </div>

      <div className="lp-cap-surface lp-xp" ref={stack}>
        {/* Back card: the question, reduced to the two choices that matter. */}
        <div className="lp-xp-back">
          <p className="t-label">{LOOP_MISS_QUESTION.skill}</p>
          <RichText
            className="lp-xp-prompt"
            text={tx(LOOP_MISS_QUESTION.prompt)}
          />
          <div className="lp-xp-choices">
            <span className="q-choice q-choice-wrong lp-xp-choice">
              <span className="q-mark" aria-hidden>
                ✕
              </span>
              <RichText className="q-text" text={tx(wrong)} />
            </span>
            <span className="q-choice q-choice-right lp-xp-choice">
              <span className="q-mark" aria-hidden>
                ✓
              </span>
              <RichText className="q-text" text={tx(right)} />
            </span>
          </div>
        </div>

        {/* Front card: the explanation, and the follow-up it takes. */}
        <div className="lp-xp-front">
          <p className="label-xs">{t("quiz.explanation")}</p>
          <RichText
            className="lp-xp-body"
            text={tx(LOOP_MISS_QUESTION.explanation)}
            block
          />

          <div className="lp-xp-thread">
            <p className="lp-xp-ask">{t("lp.cap2Ask")}</p>
            <div className="lp-xp-reply">
              <TutorAvatar mood="talking" size={24} />
              <div>
                <p className="lp-xp-who">{t("lp.cap2Tutor")}</p>
                <p className="lp-xp-said">{t("lp.cap2Reply")}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

/* ========================= 3 — review & progress ========================= */

function ReviewSurface() {
  const { t } = useI18n();
  const scope = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  const entered = useEntered(scope, { threshold: 0.2 });

  const figures = [
    { id: "queue", value: PROGRESS_PREVIEW.queue, label: t("lp.cap3Queue") },
    { id: "skills", value: PROGRESS_PREVIEW.skills, label: t("lp.cap3Skills") },
    { id: "streak", value: PROGRESS_PREVIEW.streak, label: t("lp.cap3Streak") },
  ];

  return (
    <article className="lp-cap lp-cap-review" ref={scope}>
      <div className="lp-cap-copy">
        <p className="t-label lp-cap-label">{t("lp.cap3Label")}</p>
        <h3 className="lp-cap-title">{t("lp.cap3Title")}</h3>
        <p className="lp-cap-text">{t("lp.cap3Text")}</p>

        <dl className="lp-rv-figures">
          {figures.map((figure, i) => (
            <Counter
              key={figure.id}
              value={figure.value}
              label={figure.label}
              run={entered}
              index={i}
              instant={Boolean(reduced)}
            />
          ))}
        </dl>
      </div>

      <div className="lp-cap-surface lp-rv">
        <p className="t-label lp-rv-cap">{t("lp.cap3Weakest")}</p>
        <ul className="lp-rv-chart">
          {PROGRESS_PREVIEW.rows.map((row, i) => {
            const accuracy = row.correct / row.total;
            return (
              <li key={row.skill} className="lp-rv-row" style={{ ["--i" as string]: i }}>
                <span className="lp-rv-name">{row.skill}</span>
                <span className="lp-rv-track">
                  {/* Width is a scale on a full-width bar, not a width: a
                      transform animates on the compositor and a width does not,
                      and five bars growing at once is exactly when that matters. */}
                  <span
                    className="lp-rv-fill"
                    data-low={accuracy < 0.5 ? "" : undefined}
                    style={{ ["--w" as string]: entered ? accuracy : 0 }}
                  />
                </span>
                <span className="lp-rv-pct num">{Math.round(accuracy * 100)}%</span>
                <span className="lp-rv-count num">
                  {row.correct}/{row.total}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </article>
  );
}

function Counter({
  value,
  label,
  run,
  index,
  instant,
}: {
  value: number;
  label: string;
  run: boolean;
  index: number;
  instant: boolean;
}) {
  const shown = useCountTo(value, run, { duration: instant ? 0 : 800 + index * 180 });
  return (
    <div className="lp-rv-figure">
      <dt className="lp-rv-figure-value num">{shown}</dt>
      <dd className="lp-rv-figure-label">{label}</dd>
    </div>
  );
}
