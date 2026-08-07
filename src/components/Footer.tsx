"use client";

import Link from "next/link";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { Modal } from "./motion";
import { Logo } from "./Logo";

export function Footer() {
  const { t } = useI18n();
  const { resetAll, account } = useApp();
  const [confirming, setConfirming] = useState(false);

  return (
    <>
      {/* Three columns on a grid rather than a wrapping flex row: with the
          attribution paragraph gone, a flex row left the two link stacks
          huddled against the brand block with a gulf to their right. The brand
          column takes the slack, so the links stay ruled to the right edge. */}
      <footer className="app-footer mt-20 border-t">
        <div className="max-w-5xl mx-auto px-5 py-12 grid gap-x-10 gap-y-9 text-[13px] sm:grid-cols-[minmax(0,1fr)_auto_auto]">
          <div className="max-w-[22rem]">
            <Logo />
            <p className="text-muted mt-3.5 leading-relaxed">{t("common.footer")}</p>
          </div>

          <nav className="flex flex-col gap-2.5">
            <p className="hero-footer-heading">{t("hero.footerNav")}</p>
            {[
              { href: "/practice", key: "nav.practice" },
              { href: "/mock", key: "nav.mock" },
              { href: "/review", key: "nav.review" },
              { href: "/progress", key: "nav.progress" },
            ].map((link) => (
              <Link key={link.href} href={link.href} className="hero-footer-link">
                {t(link.key)}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col items-start gap-2.5">
            <p className="hero-footer-heading">{t("hero.footerAccount")}</p>
            <Link href={account ? "/account" : "/signup"} className="hero-footer-link">
              {account ? account.name : t("landing.start")}
            </Link>
            <button
              className="hero-footer-link hover:!text-danger text-left"
              onClick={() => setConfirming(true)}
            >
              {t("common.reset")}
            </button>
          </div>
        </div>
      </footer>

      <Modal open={confirming} onClose={() => setConfirming(false)}>
        <div className="panel p-6" style={{ boxShadow: "var(--overlay)" }}>
          <p className="text-[15px] leading-relaxed">{t("common.resetConfirm")}</p>
          <div className="flex gap-2 mt-6">
            <button className="btn flex-1" onClick={() => setConfirming(false)}>
              {t("admin.cancel")}
            </button>
            <button
              className="btn flex-1"
              style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
              onClick={() => {
                resetAll();
                setConfirming(false);
              }}
            >
              {t("admin.delete")}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
