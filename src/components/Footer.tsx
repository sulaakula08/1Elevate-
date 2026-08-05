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
      <footer className="mt-20 border-t">
        <div className="max-w-5xl mx-auto px-5 py-10 flex flex-wrap items-start gap-x-12 gap-y-6 text-[13px]">
          <div className="min-w-[14rem]">
            <Logo />
            <div className="h-2" />
            <p className="text-muted mt-1.5">
              {t("common.footer")}
            </p>
          </div>

          <nav className="flex flex-col gap-2">
            {[
              { href: "/practice", key: "nav.practice" },
              { href: "/mock", key: "nav.mock" },
              { href: "/review", key: "nav.review" },
              { href: "/progress", key: "nav.progress" },
            ].map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-muted hover:text-foreground transition-colors"
              >
                {t(link.key)}
              </Link>
            ))}
          </nav>

          <div className="flex flex-col gap-2">
            <Link
              href={account ? "/account" : "/signup"}
              className="text-muted hover:text-foreground transition-colors"
            >
              {account ? account.name : t("landing.start")}
            </Link>
            <button
              className="text-muted hover:text-danger transition-colors text-left"
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
