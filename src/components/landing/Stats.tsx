"use client";

import type { Question } from "@/data/types";
import { bankStats } from "@/lib/bank-stats";
import { useI18n } from "@/lib/i18n";
import { CountUp, Reveal } from "../motion";

/** Landing statistics. Every number is counted from the real bank. */
export function Stats({ bank }: { bank: Question[] }) {
  const { t } = useI18n();
  const stats = bankStats(bank);

  const cells = [
    { value: stats.total, suffix: "", label: t("landing.statQuestions") },
    { value: stats.bySubject.length, suffix: "", label: t("landing.statSubjects") },
  ];

  return (
    <section className="panel overflow-hidden">
      <dl className="grid grid-cols-2 sm:grid-cols-4">
        {cells.map((cell, i) => (
          <Reveal key={cell.label} delay={i * 70}>
            <div
              className={`py-7 px-5 sm:px-6 ${i % 2 === 1 ? "border-l" : ""} ${
                i > 0 ? "sm:border-l" : ""
              } ${i > 1 ? "border-t sm:border-t-0" : ""}`}
            >
              <dd className="num text-3xl font-semibold" style={{ color: "var(--brand)" }}>
                <CountUp value={cell.value} suffix={cell.suffix} />
              </dd>
              <dt className="text-[13px] text-muted mt-1.5">{cell.label}</dt>
            </div>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
