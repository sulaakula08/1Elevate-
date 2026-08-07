"use client";

import { SUBJECTS } from "@/data/exams";
import type { Question } from "@/data/types";
import { bankStats, statsFor } from "@/lib/bank-stats";
import { useI18n } from "@/lib/i18n";
import { NOUNS, plural } from "@/lib/plural";
import { CountUp, Reveal } from "../motion";

/**
 * A cell's rule depends on where it lands in the grid, and the grid is two
 * columns on phones and four from `sm` up. Opening a row means no left rule;
 * being past the first row means a top one — expressed per breakpoint so the
 * hairlines stay a single continuous cross at both widths, whatever the subject
 * list grows to.
 */
function dividers(i: number): string {
  return [
    i % 2 === 0 ? "" : "border-l",
    i % 4 === 0 ? "sm:border-l-0" : "sm:border-l",
    i < 2 ? "" : "border-t",
    i < 4 ? "sm:border-t-0" : "sm:border-t",
  ].join(" ");
}

/**
 * Landing statistics: the size of the bank, how it splits across the two SAT
 * sections, and the shape of a full mock.
 *
 * Every number is counted from the bank that is actually rendered, and the noun
 * under it is agreed with that number at runtime — so a bank that grows to 101
  * one question reads "question", not "questions", without anyone editing this file.
 */
export function Stats({ bank }: { bank: Question[] }) {
  const { t, tx } = useI18n();
  const stats = bankStats(bank);

  const cells = [
    {
      id: "total",
      value: stats.total,
      noun: plural(stats.total, NOUNS.question),
      context: t("showcase.statInBank"),
    },
    ...SUBJECTS.map((subject) => {
      const total = statsFor(stats, subject.id).total;
      return {
        id: subject.id,
        value: total,
        noun: plural(total, NOUNS.question),
        context: tx(subject.name),
      };
    }),
    {
      id: "mock",
      value: stats.mockModules,
      noun: plural(stats.mockModules, NOUNS.module),
      context: t("showcase.statInMock"),
    },
  ];

  return (
    <section className="panel overflow-hidden">
      <dl className="grid grid-cols-2 sm:grid-cols-4">
        {cells.map((cell, i) => (
          // column-reverse: the number leads visually, while the DOM keeps the
          // term before its description, which is the order a screen reader
          // needs to make sense of the pair.
          <Reveal
            key={cell.id}
            delay={i * 70}
            className={`flex flex-col-reverse justify-end gap-1.5 px-5 py-7 sm:px-6 ${dividers(i)}`}
          >
            <dt>
              <span className="block text-[13px] text-muted">{cell.noun}</span>
              <span className="label-xs block mt-1">{cell.context}</span>
            </dt>
            <dd className="num text-3xl font-semibold" style={{ color: "var(--brand)" }}>
              <CountUp value={cell.value} />
            </dd>
          </Reveal>
        ))}
      </dl>
    </section>
  );
}
