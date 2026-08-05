"use client";

import Link from "next/link";
import { SUBJECTS, subjectColor } from "@/data/exams";
import type { Question } from "@/data/types";
import { statsFor, bankStats } from "@/lib/bank-stats";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "../motion";
import { SubjectScene } from "../three/SubjectScene";

/**
 * The two SAT sections, each with its own WebGL scene: a coordinate field for
 * Math, a resolving page of text for Reading & Writing. The scenes are lazy and
 * only boot when a card scrolls into view.
 */
export function Subjects({ bank }: { bank: Question[] }) {
  const { t, tx } = useI18n();
  const stats = bankStats(bank);

  return (
    <section className="py-20 border-t">
      <Reveal>
        <p className="label-xs">{t("landing.subjectsTitle")}</p>
        <h2 className="display mt-4 max-w-xl text-3xl sm:text-[2.5rem]">
          {t("landing.subjectsHeadline")}
        </h2>
      </Reveal>

      <div className="mt-10 grid sm:grid-cols-2 gap-4">
        {SUBJECTS.map((subject, i) => {
          const isMath = subject.id === "sat-math";
          const total = statsFor(stats, subject.id).total;
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
  );
}
