"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { Logo } from "./Logo";

/** A compact marketing footer: product orientation, then the two account paths. */
export function Footer({ landing = false }: { landing?: boolean }) {
  const { t } = useI18n();

  return (
    <footer className={`app-footer border-t${landing ? " app-footer-landing" : ""}`}>
      <div className="app-footer-inner marketing-frame mx-auto px-5 sm:px-8 py-12 text-sm">
        <div className="app-footer-brand">
          <Link href="/" aria-label="1Elevate">
            <Logo />
          </Link>
          <p className="text-muted mt-3.5 leading-relaxed">{t("common.footer")}</p>
        </div>

        <nav className="app-footer-nav" aria-label={t("lp.footerExplore")}>
          <p className="hero-footer-heading">{t("lp.footerExplore")}</p>
          {[
            { href: "/about", key: "lp.footerAbout" },
            { href: "/#method", key: "lp.footerMethod" },
            { href: "/#sample-question", key: "lp.footerPreview" },
            { href: "/#sat-anatomy", key: "lp.footerExam" },
          ].map((link) => (
            <Link key={link.href} href={link.href} className="hero-footer-link">
              {t(link.key)}
            </Link>
          ))}
        </nav>

        <nav className="app-footer-nav" aria-label={t("hero.footerAccount")}>
          <p className="hero-footer-heading">{t("hero.footerAccount")}</p>
          <Link href="/signup" className="hero-footer-link">
            {t("landing.start")}
          </Link>
          <Link href="/login" className="hero-footer-link">
            {t("auth.signIn")}
          </Link>
        </nav>

        <div className="app-footer-meta">
          <span>1Elevate</span>
          <span>{t("lp.footerBlueprint")}</span>
        </div>
      </div>
    </footer>
  );
}
