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

  const cells = [
    { id: "blueprint", value: `${rwQuestions} + ${mathQuestions}`, text: t("hero.proofFormat") },
    { id: "timing", value: "32 / 35 min", text: t("hero.proofTiming") },
    { id: "explained", value: t("hero.proofEveryChoice"), text: t("hero.proofExplained") },
    { id: "queue", value: t("hero.proofMistakes"), text: t("hero.proofReview") },
  ];

  return (
    <section id="proof" className="lp-proof" aria-labelledby="proof-title">
      <h2 id="proof-title" className="sr-only">{t("hero.proofLabel")}</h2>
      <dl className="lp-proof-grid">
        {cells.map((cell) => (
          <div key={cell.id} className="lp-proof-item">
            <dt className="lp-proof-value num">{cell.value}</dt>
            <dd className="lp-proof-text">{cell.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
