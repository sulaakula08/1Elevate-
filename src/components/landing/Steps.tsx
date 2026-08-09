"use client";

import { useI18n } from "@/lib/i18n";
import { Reveal } from "../motion";

/** Three steps to a first mock score. */
export function Steps() {
  const { t } = useI18n();

  const steps = [
    { title: t("landing.s1Title"), text: t("landing.s1Text") },
    { title: t("landing.s2Title"), text: t("landing.s2Text") },
    { title: t("landing.s3Title"), text: t("landing.s3Text") },
  ];

  return (
    <section className="py-16 sm:py-20 border-t">
      <Reveal className="max-w-xl">
        <p className="t-label">{t("landing.howEyebrow")}</p>
        <h2 className="t-h1 mt-3">{t("landing.howTitle")}</h2>
      </Reveal>

      <ol className="mt-10">
        {steps.map((step, i) => (
          <Reveal as="li" key={step.title} delay={i * 80}>
            <div className="grid sm:grid-cols-[3rem_1fr] gap-x-6 gap-y-2 py-7 border-t">
              <span className="num text-body text-faint">0{i + 1}</span>
              <div className="max-w-xl">
                <h3 className="text-h3 font-medium">{step.title}</h3>
                <p className="mt-1.5 text-body leading-relaxed text-muted">{step.text}</p>
              </div>
            </div>
          </Reveal>
        ))}
      </ol>
    </section>
  );
}
