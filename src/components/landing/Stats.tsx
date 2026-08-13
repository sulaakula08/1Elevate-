"use client";

import { SAT } from "@/data/exams";
import { useI18n } from "@/lib/i18n";

/** Compact proof based on the implemented SAT blueprint and learning loop. */
export function Stats() {
  const { t } = useI18n();
  const rwQuestions = SAT.sections
    .filter((section) => section.subjectId === "sat-rw")
    .reduce((sum, section) => sum + section.count, 0);
  const mathQuestions = SAT.sections
    .filter((section) => section.subjectId === "sat-math")
    .reduce((sum, section) => sum + section.count, 0);
  const rwMinutes = SAT.sections.find((section) => section.subjectId === "sat-rw")?.minutes ?? 32;
  const mathMinutes = SAT.sections.find((section) => section.subjectId === "sat-math")?.minutes ?? 35;

  const cells = [
    {
      id: "blueprint",
      value: `${rwQuestions} RW · ${mathQuestions} Math`,
      text: t("hero.proofFormat"),
      numeric: true,
    },
    {
      id: "timing",
      value: `${rwMinutes} min · ${mathMinutes} min`,
      text: t("hero.proofTiming"),
      numeric: true,
    },
    {
      id: "loop",
      value: t("hero.proofLoop"),
      text: t("hero.proofReview"),
      numeric: false,
    },
  ];

  return (
    <section id="proof" className="lp-proof" aria-labelledby="proof-title">
      <h2 id="proof-title" className="sr-only">{t("hero.proofLabel")}</h2>
      <dl className="lp-proof-grid">
        {cells.map((cell) => (
          <div key={cell.id} className="lp-proof-item">
            <dt className={`lp-proof-value ${cell.numeric ? "num" : ""}`}>{cell.value}</dt>
            <dd className="lp-proof-text">{cell.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
