"use client";

import { useI18n } from "@/lib/i18n";
import { IconChat, IconClock, IconTrend } from "../illustrations";

/**
 * One lead feature with a product visual, then three supporting ones as a ruled
 * row.
 *
 * What was here before was four identical cards in a 2×2 grid, each an icon tile
 * above a bold line above a grey paragraph — the most template-like artifact in
 * the product, and a layout that says all four things matter equally. They do
 * not: the adaptive bank is the reason the rest works, so it gets the space, the
 * surface and the only illustration. The other three get a sentence each.
 *
 * The visual is built from the product's own vocabulary — topic names, the
 * difficulty dots and the status words the Question Bank actually filters on —
 * rather than an abstract graphic, so it shows the thing instead of decorating
 * the claim.
 */
export function Features() {
  const { t } = useI18n();

  const rows = [
    { topic: t("landing.f1Row1"), level: 3, status: t("landing.f1RowWrong"), missed: true },
    { topic: t("landing.f1Row2"), level: 2, status: t("landing.f1RowWrong"), missed: true },
    { topic: t("landing.f1Row3"), level: 1, status: t("landing.f1RowNew"), missed: false },
  ];

  const supporting = [
    { icon: <IconClock size={20} />, title: t("landing.f2Title"), text: t("landing.f2Text") },
    { icon: <IconChat size={20} />, title: t("landing.f3Title"), text: t("landing.f3Text") },
    { icon: <IconTrend size={20} />, title: t("landing.f4Title"), text: t("landing.f4Text") },
  ];

  return (
    <section className="py-16 sm:py-20" data-motion="features">
      <div className="max-w-2xl">
        <p className="t-label">{t("landing.featuresEyebrow")}</p>
        <h2 className="t-h1 mt-3">{t("landing.featuresTitle")}</h2>
      </div>

      {/* ---- the lead feature ---- */}
      <div className="lp-lead mt-10">
        <div className="lp-lead-copy">
          <p className="t-label">{t("landing.f1Eyebrow")}</p>
          <h3 className="t-h2 mt-3">{t("landing.f1Title")}</h3>
          <p className="text-body text-muted mt-4 leading-relaxed">{t("landing.f1Text")}</p>
          <ul className="mt-6 flex flex-col gap-3">
            {[t("landing.f1Point1"), t("landing.f1Point2"), t("landing.f1Point3")].map((point) => (
              <li key={point} className="flex gap-3 text-sm leading-relaxed">
                <span aria-hidden className="lp-lead-tick" />
                <span>{point}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="lp-lead-visual" aria-hidden>
          <p className="t-label">{t("landing.f1Sample")}</p>
          <ul className="mt-4 flex flex-col gap-2">
            {rows.map((row) => (
              <li key={row.topic} className="lp-q-row">
                <span className="lp-q-dot" data-level={row.level} />
                <span className="lp-q-topic">{row.topic}</span>
                <span className={`lp-q-status ${row.missed ? "lp-q-status-missed" : ""}`}>
                  {row.status}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* ---- three supporting features, hairline-ruled, no containers ---- */}
      <div className="lp-support mt-14">
        {supporting.map((feature) => (
          <div key={feature.title} className="lp-support-item">
            <span className="lp-support-icon">{feature.icon}</span>
            <h3 className="text-body font-medium mt-3">{feature.title}</h3>
            <p className="text-sm text-muted mt-2 leading-relaxed">{feature.text}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
