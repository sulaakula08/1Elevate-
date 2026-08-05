"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Reveal } from "../motion";

/** Last screen before the fold ends: one restatement, one action. */
export function Closing() {
  const { t } = useI18n();

  return (
    <section className="py-24 border-t text-center">
      <Reveal>
        <h2 className="display mx-auto max-w-xl text-3xl sm:text-[2.5rem]">
          {t("landing.ctaTitle")}
        </h2>
        <p className="lede mt-5 mx-auto max-w-md">{t("landing.ctaText")}</p>
        <Link href="/signup" className="btn btn-primary btn-lg mt-8">
          {t("landing.start")}
        </Link>
      </Reveal>
    </section>
  );
}
