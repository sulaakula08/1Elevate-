"use client";

import { useRef } from "react";
import Link from "next/link";
import { SAT, SUBJECTS, subjectColor } from "@/data/exams";
import { SEED_QUESTIONS } from "@/data";
import { useI18n } from "@/lib/i18n";
import { IconChat, IconClock, IconRule, IconTrend } from "./illustrations";
import { HeroScoreCard } from "./HeroScoreCard";
import { CountUp, Reveal } from "./motion";
import { LogoAnimation } from "./LogoAnimation";
import { SplitChars } from "./SplitChars";
import { useLandingMotion } from "./useLandingMotion";
import { SubjectScene } from "./three/SubjectScene";

export function Landing({ customCount }: { customCount: number }) {
  const { t, tx } = useI18n();
  const questionCount = SEED_QUESTIONS.length + customCount;

  // GSAP is scoped to this subtree, so its selectors can never reach the app
  // shell or another route's markup.
  const scope = useRef<HTMLDivElement>(null);
  useLandingMotion(scope);

  const features = [
    {
      icon: <IconRule />,
      title: t("landing.f1Title"),
      text: t("landing.f1Text"),
      color: "var(--s-violet)",
      soft: "var(--s-violet-soft)",
    },
    {
      icon: <IconClock />,
      title: t("landing.f2Title"),
      text: t("landing.f2Text"),
      color: "var(--s-blue)",
      soft: "var(--s-blue-soft)",
    },
    {
      icon: <IconChat />,
      title: t("landing.f3Title"),
      text: t("landing.f3Text"),
      color: "var(--s-teal)",
      soft: "var(--s-teal-soft)",
    },
    {
      icon: <IconTrend />,
      title: t("landing.f4Title"),
      text: t("landing.f4Text"),
      color: "var(--s-rose)",
      soft: "var(--s-rose-soft)",
    },
  ];

  const steps = [
    { title: t("landing.s1Title"), text: t("landing.s1Text") },
    { title: t("landing.s2Title"), text: t("landing.s2Text") },
    { title: t("landing.s3Title"), text: t("landing.s3Text") },
  ];

  // Every figure here is something the product can actually back up: the bank
  // size, the two SAT sections, and the published shape of the exam itself.
  const stats = [
    { value: questionCount, suffix: "", label: t("landing.statQuestions"), color: "var(--s-indigo)" },
    { value: SUBJECTS.length, suffix: "", label: t("landing.statSubjects"), color: "var(--s-violet)" },
    { value: SAT.sections.length, suffix: "", label: t("landing.statModules"), color: "var(--s-teal)" },
    {
      value: SAT.sections.reduce((sum, s) => sum + s.minutes, 0),
      suffix: "",
      label: t("landing.statMinutes"),
      color: "var(--s-green)",
    },
  ];

  return (
    <div className="max-w-5xl mx-auto" ref={scope}>
      {/* ---------------- hero ---------------- */}
      <section className="relative pt-10 sm:pt-16 pb-14" data-motion="hero">
        <div className="glow" aria-hidden />
        <div className="relative grid lg:grid-cols-[1fr_0.85fr] gap-12 lg:gap-16 items-center">
          <div>
            <span
              className="badge fade-in"
              style={{
                ["--tone" as string]: "var(--s-teal)",
                ["--tone-soft" as string]: "var(--s-teal-soft)",
              }}
            >
              {t("landing.badge")}
            </span>

            {/* One dominant headline. The wordmark performs beneath it, at brand
                scale rather than headline scale, so 1600 never competes for the
                role of page title.

                GSAP drives the hero, so these elements carry no fade-up class —
                two animation systems on one element fight over its transform.
                aria-label holds the real sentence; the per-character spans in
                SplitChars are aria-hidden. */}
            <h1
              className="display split mt-5 text-[2.5rem] sm:text-[3.25rem] lg:text-[3.75rem]"
              data-motion="headline"
              aria-label={`${t("landing.titleA")} ${t("landing.titleB")}`}
            >
              <SplitChars text={t("landing.titleA")} />
              <br />
              {/* The second line animates as one block rather than per character:
                  background-clip: text paints in the parent's background layer,
                  and a transformed child (which every .ch becomes under GSAP)
                  gets its own layer above it — so a split gradient line renders
                  as invisible glyphs. One transform on the span keeps it. */}
              <span className="text-grad inline-block" data-motion="headline-b">
                {t("landing.titleB")}
              </span>
            </h1>

            <p className="lede mt-5 max-w-lg" data-motion="lede">
              {t("landing.sub")}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-3">
              <Link href="/signup" className="btn btn-primary btn-lg" data-motion="action">
                {t("landing.start")}
              </Link>
              <Link href="/login" className="btn btn-lg" data-motion="action">
                {t("landing.haveAccount")}
              </Link>
            </div>

            <p className="mt-4 text-[13px] text-faint" data-motion="fine-print">
              {t("landing.noCard")}
            </p>

            <div className="fade-in mt-9 pt-7 border-t" style={{ animationDelay: "380ms" }}>
              <LogoAnimation size="clamp(2rem, 5.5vw, 2.75rem)" />
              <p className="text-[12px] text-faint mt-2">{t("landing.markCaption")}</p>
            </div>
          </div>

          {/* Two wrappers, because two animations write y to the card: the intro
              rise (time-based) and the parallax drift (scroll-based). On one
              element they would overwrite each other; nested, each owns its own
              transform and the browser composes them. */}
          <div data-motion="hero-card" style={{ willChange: "transform" }}>
            <div data-motion="hero-card-in">
              <HeroScoreCard className="w-full h-auto" />
            </div>
          </div>
        </div>
      </section>

      {/* ---------------- stats ---------------- */}
      <section className="panel overflow-hidden">
        <dl className="grid grid-cols-2 sm:grid-cols-4">
          {stats.map((stat, i) => (
            <Reveal key={stat.label} delay={i * 70}>
              {/* 2 columns on mobile, 4 on desktop — hairlines only between cells. */}
              <div
                className={`py-7 px-5 sm:px-6 ${i % 2 === 1 ? "border-l" : ""} ${
                  i > 0 ? "sm:border-l" : ""
                } ${i > 1 ? "border-t sm:border-t-0" : ""}`}
              >
                <dd className="num text-3xl font-semibold" style={{ color: stat.color }}>
                  <CountUp value={stat.value} suffix={stat.suffix} />
                </dd>
                <dt className="text-[13px] text-muted mt-1.5">{stat.label}</dt>
              </div>
            </Reveal>
          ))}
        </dl>
      </section>

      {/* ---------------- features (pinned) ----------------
          ScrollTrigger pins this section and scrubs the cards in. Reveal is gone
          from here on purpose: its IntersectionObserver would set opacity on the
          same nodes GSAP is tweening, and the last writer would win at random.
          The pin needs a fixed-height subject, so the section itself is the
          trigger and the inner wrapper is what gets measured. */}
      <section className="py-20" data-motion="features">
        <div className="max-w-xl" data-motion="features-heading">
          <p className="label-xs">{t("landing.featuresEyebrow")}</p>
          <h2 className="display mt-4 text-3xl sm:text-[2.5rem]">{t("landing.featuresTitle")}</h2>
        </div>

        <div className="mt-12 grid sm:grid-cols-2 gap-3">
          {features.map((feature) => (
            <article
              key={feature.title}
              className="card-tone p-5 h-full"
              data-motion="feature-card"
              style={{
                ["--tone" as string]: feature.color,
                ["--tone-soft" as string]: feature.soft,
              }}
            >
              <span className="glyph" style={{ color: feature.color }}>
                {feature.icon}
              </span>
              <h3 className="mt-4 text-[16.5px] font-medium">{feature.title}</h3>
              <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{feature.text}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- how it works ---------------- */}
      <section className="py-20 border-t">
        <Reveal className="max-w-xl">
          <p className="label-xs">{t("landing.howEyebrow")}</p>
          <h2 className="display mt-4 text-3xl sm:text-[2.5rem]">{t("landing.howTitle")}</h2>
        </Reveal>

        <ol className="mt-12">
          {steps.map((step, i) => (
            <Reveal as="li" key={step.title} delay={i * 80}>
              <div className="grid sm:grid-cols-[3rem_1fr] gap-x-6 gap-y-2 py-7 border-t">
                <span className="num text-[15px] text-faint">0{i + 1}</span>
                <div className="max-w-xl">
                  <h3 className="text-[17px] font-medium">{step.title}</h3>
                  <p className="mt-1.5 text-[15px] leading-relaxed text-muted">{step.text}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </section>

      {/* ---------------- the two sections ----------------
          Each card carries its own WebGL scene: a coordinate field for Math, a
          resolving page of text for Reading & Writing. The scenes are lazy and
          only boot when a card scrolls into view. */}
      <section className="py-20 border-t">
        <Reveal>
          <p className="label-xs">{t("landing.subjectsTitle")}</p>
          <h2 className="display mt-4 max-w-xl text-3xl sm:text-[2.5rem]">
            {t("landing.subjectsHeadline")}
          </h2>
        </Reveal>

        <div className="mt-10 grid sm:grid-cols-2 gap-4">
          {SUBJECTS.map((subject, i) => {
            const total = SEED_QUESTIONS.filter((q) => q.subjectId === subject.id).length;
            const isMath = subject.id === "sat-math";
            return (
              <Reveal key={subject.id} delay={i * 90}>
                <Link
                  href="/signup"
                  className="bank-card showcase-card"
                  style={{
                    ["--tone" as string]: subjectColor(subject.id),
                    ["--tone-2" as string]: `color-mix(in srgb, ${subjectColor(
                      subject.id,
                    )} 62%, #1b1033)`,
                  }}
                >
                  <SubjectScene kind={isMath ? "math" : "verbal"} />

                  <span className="relative block">
                    <span
                      className="glyph glyph-sm"
                      style={{
                        ["--tone" as string]: "rgba(255,255,255,0.22)",
                        ["--tone-soft" as string]: "rgba(255,255,255,0.16)",
                      }}
                    >
                      {subject.glyph}
                    </span>

                    <span className="block mt-4 text-[21px] font-semibold tracking-[-0.02em]">
                      {tx(subject.name)}
                    </span>
                    <span className="block mt-2 text-[14px] leading-relaxed opacity-85 max-w-[26ch]">
                      {t(isMath ? "landing.mathBlurb" : "landing.verbalBlurb")}
                    </span>
                    <span className="num block mt-5 text-[12.5px] opacity-75">
                      {total} {t("landing.statQuestions")}
                    </span>
                  </span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------------- closing ---------------- */}
      <section className="py-24 border-t text-center">
        <Reveal>
          <h2 className="display mx-auto max-w-xl text-3xl sm:text-[2.5rem]">
            {t("landing.ctaTitle")}
          </h2>
          <p className="lede mt-5 mx-auto max-w-md">{t("landing.ctaText")}</p>
          <Link href="/signup" className="btn btn-primary btn-lg mt-8">
            {t("landing.start")}
          </Link>
        </Reveal>
      </section>
    </div>
  );
}
