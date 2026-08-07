"use client";

import Link from "next/link";
import { SUBJECTS, subjectColor } from "@/data/exams";
import type { Question } from "@/data/types";
import { statsFor, bankStats } from "@/lib/bank-stats";
import { useI18n } from "@/lib/i18n";
import { NOUNS, pluralize } from "@/lib/plural";
import { Reveal } from "../motion";
import { SubjectScene } from "../three/SubjectScene";

/**
 * The two SAT sections, each with its own WebGL scene: a coordinate field for
 * Math, a resolving page of text for Reading & Writing. The scenes are lazy and
 * only boot when a card scrolls into view.
 *
 * The scene renders whatever it likes behind the copy, so the card cannot get
 * its contrast from the tone gradient alone — `.sc-scrim` puts a fixed floor
 * under the text block and the type sits on top of that, never on the scene.
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
          const subjectStats = statsFor(stats, subject.id);
          return (
            <Reveal key={subject.id} delay={i * 90}>
              <Link
                href="/signup"
                className="bank-card showcase-card sc-subject h-full"
                style={{
                  ["--tone" as string]: subjectColor(subject.id),
                  ["--tone-2" as string]: `color-mix(in srgb, ${subjectColor(
                    subject.id,
                  )} 62%, #1b1033)`,
                }}
              >
                <SubjectScene kind={isMath ? "math" : "verbal"} />
                <span className="sc-scrim" aria-hidden />

                <span className="sc-body">
                  <span className="sc-mark" aria-hidden>
                    {subject.glyph}
                  </span>

                  <span className="sc-name">{tx(subject.name)}</span>
                  <span className="sc-blurb">
                    {t(isMath ? "showcase.mathBlurb" : "showcase.rwBlurb")}
                  </span>
                  <span className="sc-meta num">
                    {pluralize(subjectStats.total, NOUNS.question)}
                    {" · "}
                    {pluralize(subjectStats.topics, NOUNS.topic)}
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
