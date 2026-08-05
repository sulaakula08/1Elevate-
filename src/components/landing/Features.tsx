"use client";

import { useI18n } from "@/lib/i18n";
import { IconChat, IconClock, IconRule, IconTrend } from "../illustrations";

/**
 * ScrollTrigger pins this section and scrubs the cards in. Reveal is
 * deliberately absent: its IntersectionObserver would set opacity on the same
 * nodes GSAP is tweening, and the last writer would win at random.
 */
export function Features() {
  const { t } = useI18n();

  const features = [
    { icon: <IconRule />, title: t("landing.f1Title"), text: t("landing.f1Text") },
    { icon: <IconClock />, title: t("landing.f2Title"), text: t("landing.f2Text") },
    { icon: <IconChat />, title: t("landing.f3Title"), text: t("landing.f3Text") },
    { icon: <IconTrend />, title: t("landing.f4Title"), text: t("landing.f4Text") },
  ];

  return (
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
              ["--tone" as string]: "var(--brand)",
              ["--tone-soft" as string]: "var(--brand-soft)",
            }}
          >
            <span className="glyph" style={{ color: "var(--brand)" }}>
              {feature.icon}
            </span>
            <h3 className="mt-4 text-[16.5px] font-medium">{feature.title}</h3>
            <p className="mt-2 text-[14.5px] leading-relaxed text-muted">{feature.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
