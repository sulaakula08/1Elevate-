"use client";

import Link from "next/link";
import { useState } from "react";
import { EXAMS, getSubject, subjectColor, subjectColorSoft } from "@/data/exams";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { QuestionView } from "@/components/QuestionView";
import { Reveal } from "@/components/motion";
import { TOUR_EVENT } from "@/components/Tour";
import { NavMock, NavPractice, NavReview, NavTutorial } from "@/components/NavIcons";

/** A throwaway question so the tutorial can demonstrate the real surface. */
const DEMO: Question = {
  id: "demo-1",
  exam: "sat",
  subjectId: "sat-math",
  topic: "Percentages",
  domain: "Problem-Solving and Data Analysis",
  difficulty: 1,
  prompt: {
    en: "A tablet costs $90. During a sale the price falls by 15%. What is the sale price?",
  },
  choices: [{ en: "$72.00" }, { en: "$76.50" }, { en: "$78.50" }, { en: "$85.00" }],
  answer: 1,
  explanation: {
    en: "15% of 90 is 13.50, so the price is 90 − 13.50 = $76.50. Faster: 90 × 0.85.",
  },
};

export default function TutorialPage() {
  const { t, tx } = useI18n();
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);

  const features = [
    {
      Icon: NavPractice,
      color: "var(--s-violet)",
      soft: "var(--s-violet-soft)",
      title: t("tour.t2"),
      body: t("tour.d2"),
      href: "/practice",
    },
    {
      Icon: NavMock,
      color: "var(--s-blue)",
      soft: "var(--s-blue-soft)",
      title: t("tour.t3"),
      body: t("tour.d3"),
      href: "/mock",
    },
    {
      Icon: NavTutorial,
      color: "var(--s-teal)",
      soft: "var(--s-teal-soft)",
      title: t("tour.t4"),
      body: t("tour.d4"),
      href: "/practice",
    },
    {
      Icon: NavReview,
      color: "var(--s-rose)",
      soft: "var(--s-rose-soft)",
      title: t("tour.t5"),
      body: t("tour.d5"),
      href: "/progress",
    },
  ];

  return (
    <div className="max-w-3xl mx-auto pb-16">
      <section className="relative pt-10 pb-8">
        <div className="glow" aria-hidden />
        <div className="relative">
          <p className="label-xs fade-in">{t("nav.tutorial")}</p>
          <h1 className="display fade-up mt-3 text-[2rem] sm:text-[2.75rem]">
            {t("tutorial.title")}
          </h1>
          <p className="lede fade-up mt-4 max-w-xl" style={{ animationDelay: "80ms" }}>
            {t("tutorial.sub")}
          </p>
          <button
            className="btn btn-primary mt-6 fade-up"
            style={{ animationDelay: "140ms" }}
            onClick={() => window.dispatchEvent(new Event(TOUR_EVENT))}
          >
            {t("tutorial.startTour")}
          </button>
        </div>
      </section>

      {/* ---------------- what each part does ---------------- */}
      <section className="grid sm:grid-cols-2 gap-3">
        {features.map((feature, i) => (
          <Reveal key={feature.title} delay={i * 70}>
            <Link
              href={feature.href}
              className="card-tone p-5 h-full block"
              style={{ ["--tone" as string]: feature.color, ["--tone-soft" as string]: feature.soft }}
            >
              <span className="glyph" style={{ color: feature.color }}>
                <feature.Icon size={19} />
              </span>
              <h2 className="mt-3.5 text-[16px] font-medium">{feature.title}</h2>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-muted">{feature.body}</p>
            </Link>
          </Reveal>
        ))}
      </section>

      {/* ---------------- demo question ---------------- */}
      <section className="mt-12">
        <Reveal>
          <p className="label-xs">{t("tutorial.demoTitle")}</p>
          <p className="mt-2 text-[13.5px] text-muted">{t("tutorial.demoHint")}</p>

          <div className="panel p-5 sm:p-6 mt-5">
            <div className="flex items-center gap-2.5 mb-5">
              <span
                className="badge"
                style={{
                  ["--tone" as string]: "var(--s-indigo)",
                  ["--tone-soft" as string]: "var(--s-indigo-soft)",
                }}
              >
                {DEMO.topic}
              </span>
              <span className="text-[11px] text-faint">ЕНТ · {t("quiz.difficulty")} ●</span>
            </div>

            <QuestionView
              question={DEMO}
              selected={selected}
              onSelect={setSelected}
              revealed={revealed}
              disabled={revealed}
            />

            <div className="mt-6 flex items-center gap-3">
              {revealed && (
                <span
                  className="text-[13.5px] fade-in"
                  style={{
                    color: selected === DEMO.answer ? "var(--success)" : "var(--danger)",
                  }}
                >
                  {selected === DEMO.answer ? t("quiz.correct") : t("quiz.incorrect")}
                </span>
              )}
              <div className="ml-auto flex gap-2">
                {!revealed ? (
                  <button
                    className="btn btn-primary btn-sm"
                    disabled={selected === null}
                    onClick={() => setRevealed(true)}
                  >
                    {t("quiz.check")}
                  </button>
                ) : (
                  <>
                    <button
                      className="btn btn-sm"
                      onClick={() => {
                        setRevealed(false);
                        setSelected(null);
                      }}
                    >
                      {t("quiz.again")}
                    </button>
                    <Link href="/practice" className="btn btn-primary btn-sm">
                      {t("practice.start")}
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>
        </Reveal>
      </section>

      {/* ---------------- formats ---------------- */}
      <section className="mt-12">
        <Reveal>
          <p className="label-xs">{t("tutorial.formatTitle")}</p>
          <ul className="mt-4 space-y-3">
            {EXAMS.map((blueprint) => (
              <li key={blueprint.exam} className="panel p-5">
                <div className="flex items-baseline gap-3">
                  <span className="text-[16px] font-medium">{tx(blueprint.name)}</span>
                  <span className="num ml-auto text-[13px] text-muted">
                    {blueprint.minScore}–{blueprint.maxScore}
                  </span>
                </div>
                <p className="mt-2 text-[13.5px] leading-relaxed text-muted">
                  {blueprint.exam === "sat" ? t("tutorial.satFormat") : t("tutorial.entFormat")}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {blueprint.sections.map((section, i) => {
                    const subject = getSubject(section.subjectId);
                    return (
                      <li
                        key={`${section.subjectId}-${i}`}
                        className="flex items-baseline gap-3 text-[13px]"
                      >
                        <span
                          className="glyph glyph-sm"
                          style={{
                            ["--tone" as string]: subjectColor(section.subjectId),
                            ["--tone-soft" as string]: subjectColorSoft(section.subjectId),
                          }}
                        >
                          {subject?.glyph}
                        </span>
                        <span>{subject ? tx(subject.name) : section.subjectId}</span>
                        {section.module && (
                          <span className="text-faint">
                            · {t("mock.module")} {section.module}
                          </span>
                        )}
                        <span className="num ml-auto text-muted shrink-0">
                          {section.count} · {section.minutes} {t("common.minutes")}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-[12.5px] leading-relaxed text-faint">
            {t("tutorial.sourceNote")}
          </p>
        </Reveal>
      </section>
    </div>
  );
}
