"use client";

import { useI18n } from "@/lib/i18n";

/**
 * A cell's rule depends on where it lands in the grid, and the grid is two
 * columns on phones and four from `sm` up. Opening a row means no left rule;
 * being past the first row means a top one — expressed per breakpoint so the
 * hairlines stay a single continuous cross at both widths.
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
 * What a visitor is actually getting.
 *
 * This band used to count the live bank and print the result in four large
 * brand-coloured numerals. On an empty bank that rendered as "0 questions ·
 * 0 questions · 0 questions", so the first quantitative claim the product made
 * about itself was a row of zeros — and the size of a question bank is a poor
 * promise anyway, since nobody chooses a prep product by row count. These four
 * statements are true on day one and stay true, and none of them is a number
 * that can collapse.
 */
export function Stats() {
  const { t } = useI18n();

  const cells = [
    { id: "blueprint", title: t("landing.p1Title"), text: t("landing.p1Text") },
    { id: "timing", title: t("landing.p2Title"), text: t("landing.p2Text") },
    { id: "explained", title: t("landing.p3Title"), text: t("landing.p3Text") },
    { id: "queue", title: t("landing.p4Title"), text: t("landing.p4Text") },
  ];

  return (
    <section className="border-y py-2">
      <p className="t-label px-5 sm:px-6 pt-4">{t("landing.promiseEyebrow")}</p>
      <dl className="grid grid-cols-2 sm:grid-cols-4 mt-2">
        {cells.map((cell, i) => (
          <div key={cell.id} className={`px-5 sm:px-6 py-5 ${dividers(i)}`}>
            <dt className="text-body font-medium">{cell.title}</dt>
            <dd className="text-sm text-muted mt-1.5 leading-relaxed">{cell.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
