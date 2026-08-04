"use client";

import Link from "next/link";
import { SUBJECTS, subjectColor, subjectColorSoft } from "@/data/exams";
import { SEED_QUESTIONS } from "@/data";
import { useI18n } from "@/lib/i18n";
import { HeroLines, IconChat, IconClock, IconRule, IconTrend } from "./illustrations";
import { CountUp, Reveal } from "./motion";
import { LogoAnimation } from "./LogoAnimation";

export function Landing({ customCount }: { customCount: number }) {
  const { t, tx } = useI18n();
  const questionCount = SEED_QUESTIONS.length + customCount;

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

  const stats = [
    { value: questionCount, suffix: "", label: t("landing.statQuestions"), color: "var(--s-indigo)" },
    { value: SUBJECTS.length, suffix: "", label: t("landing.statSubjects"), color: "var(--s-violet)" },
    { value: 3, suffix: "", label: t("landing.statLangs"), color: "var(--s-teal)" },
    { value: 0, suffix: "₸", label: t("landing.statPrice"), color: "var(--s-green)" },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      {/* ---------------- hero ---------------- */}
      <section className="relative pt-10 sm:pt-16 pb-14">
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

            {/* The wordmark performs: 1 hops over "elevate", it becomes 1600. */}
            <div className="mt-5 -ml-1">
              <LogoAnimation />
            </div>

            <h1
              className="display fade-up mt-4 text-[1.75rem] sm:text-[2.25rem] lg:text-[2.5rem]"
              style={{ animationDelay: "60ms" }}
            >
              {t("landing.titleA")} <span className="text-grad">{t("landing.titleB")}</span>
            </h1>

            <p className="lede fade-up mt-6 max-w-lg" style={{ animationDelay: "140ms" }}>
              {t("landing.sub")}
            </p>

            <div className="fade-up mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "220ms" }}>
              <Link href="/signup" className="btn btn-primary btn-lg">
                {t("landing.start")}
              </Link>
              <Link href="/login" className="btn btn-lg">
                {t("landing.haveAccount")}
              </Link>
            </div>

            <p className="fade-in mt-4 text-[13px] text-faint" style={{ animationDelay: "320ms" }}>
              {t("landing.noCard")}
            </p>
          </div>

          <div className="fade-in" style={{ animationDelay: "180ms" }}>
            <HeroLines className="w-full h-auto" />
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

      {/* ---------------- features ---------------- */}
      <section className="py-20">
        <Reveal className="max-w-xl">
          <p className="label-xs">{t("landing.featuresEyebrow")}</p>
          <h2 className="display mt-4 text-3xl sm:text-[2.5rem]">{t("landing.featuresTitle")}</h2>
        </Reveal>

        <div className="mt-12 grid sm:grid-cols-2 gap-3">
          {features.map((feature, i) => (
            <Reveal key={feature.title} delay={i * 80}>
              <article
                className="card-tone p-5 h-full"
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
            </Reveal>
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

      {/* ---------------- subjects ---------------- */}
      <section className="py-20 border-t">
        <Reveal>
          <p className="label-xs">{t("landing.subjectsTitle")}</p>
          <ul className="mt-6 flex flex-wrap gap-2.5">
            {SUBJECTS.map((subject) => (
              <li
                key={subject.id}
                className="flex items-center gap-2.5 pl-1.5 pr-3.5 py-1.5 rounded-full border"
                style={{ borderColor: "var(--line)" }}
              >
                <span
                  className="glyph glyph-sm"
                  style={{
                    ["--tone" as string]: subjectColor(subject.id),
                    ["--tone-soft" as string]: subjectColorSoft(subject.id),
                  }}
                >
                  {subject.glyph}
                </span>
                <span className="text-[14px]">{tx(subject.name)}</span>
                <span className="num text-[10px] text-faint uppercase">{subject.exam}</span>
              </li>
            ))}
          </ul>
        </Reveal>
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
