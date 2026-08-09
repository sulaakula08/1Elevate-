"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { streak } from "@/lib/stats";
import { Logo } from "./Logo";
import { NotificationsBell } from "./NotificationsBell";
import {
  NavAdmin,
  NavCommunity,
  NavFeedback,
  NavHome,
  NavMock,
  NavMore,
  NavPractice,
  NavProgress,
  NavReview,
  NavSettings,
} from "./NavIcons";

/**
 * Same keys the rail uses. A destination that is "Question Bank" on a laptop and
 * "Practice" on a phone is two products; these are one.
 */
const TABS = [
  { href: "/", short: "nav.home", Icon: NavHome },
  { href: "/practice", short: "nav.practice", Icon: NavPractice },
  { href: "/mock", short: "nav.mock", Icon: NavMock },
  { href: "/review", short: "nav.review", Icon: NavReview },
  { href: "/community", short: "nav.community", Icon: NavCommunity },
];

/** Compact header for signed-in phones — the sidebar's job is done by the tabs. */
export function MobileHeader() {
  const { account, data } = useApp();
  const days = streak(data.attempts);

  return (
    <header
      className="mobile-header md:hidden sticky top-0 z-30 border-b"
      style={{ background: "var(--background)" }}
    >
      <div className="px-4 h-14 flex items-center gap-2">
        <Link href="/" aria-label="1Elevate">
          <Logo compact />
        </Link>

        <div className="ml-auto flex items-center gap-1.5">
          {days > 0 && (
            <span
              className="badge h-8 px-2.5"
              style={{
                ["--tone" as string]: "var(--brand)",
                ["--tone-soft" as string]: "var(--brand-soft)",
              }}
            >
              🔥 <span className="num">{days}</span>
            </span>
          )}

          <NotificationsBell />

          <Link
            href="/account"
            className="grid place-items-center w-8 h-8 rounded-[var(--radius-pill)] text-2xs font-semibold shrink-0"
            style={{ background: "var(--ink)", color: "var(--ink-contrast)" }}
            aria-label={account?.name}
          >
            {account?.name.slice(0, 2).toUpperCase()}
          </Link>
        </div>
      </div>
    </header>
  );
}

/** Bottom tab bar plus a sheet for the overflow destinations. */
export function MobileTabs() {
  const { t } = useI18n();
  const { account, signOut } = useApp();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  return (
    <>
      <nav className="tabbar md:hidden" aria-label="Primary">
        {TABS.map(({ href, short, Icon }) => (
          <Link
            key={href}
            href={href}
            className={`tabbar-item ${isActive(href) ? "tabbar-item-on" : ""}`}
          >
            <Icon size={21} />
            <span className="truncate max-w-full px-1">{t(short)}</span>
          </Link>
        ))}
        <button
          className={`tabbar-item ${open ? "tabbar-item-on" : ""}`}
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
        >
          <NavMore size={21} />
          <span className="truncate max-w-full px-1">{t("nav.more")}</span>
        </button>
      </nav>

      <div className="md:hidden h-16" aria-hidden />

      {open && (
        <>
          <div
            className="md:hidden fixed inset-0 z-30 fade-in"
            style={{ background: "color-mix(in srgb, #0b0b0d 40%, transparent)" }}
            onClick={() => setOpen(false)}
          />
          <div className="md:hidden fixed inset-x-0 bottom-16 z-40 fade-up px-3 pb-2" role="dialog">
            <div className="panel p-2" style={{ boxShadow: "var(--overlay)" }}>
              {[
                { href: "/progress", key: "nav.progress", Icon: NavProgress },
                { href: "/feedback", key: "nav.feedback", Icon: NavFeedback },
                { href: "/settings", key: "nav.settings", Icon: NavSettings },
                { href: "/account", key: "nav.profile", Icon: NavHome },
                ...(account && account.role !== "student"
                  ? [{ href: "/admin", key: "nav.admin", Icon: NavAdmin }]
                  : []),
              ].map(({ href, key, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-[var(--radius-sm)] text-body"
                  style={{ color: isActive(href) ? "var(--accent)" : "var(--foreground)" }}
                >
                  <Icon size={19} />
                  {t(key)}
                </Link>
              ))}
              <button
                className="w-full flex items-center gap-3 px-3 py-3 text-body"
                style={{ color: "var(--danger)" }}
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
              >
                {t("auth.signOut")}
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
}
