"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { streak } from "@/lib/stats";
import { Logo } from "./Logo";
import {
  NavAdmin,
  NavHome,
  NavMock,
  NavMore,
  NavPractice,
  NavProgress,
  NavReview,
  NavTutorial,
} from "./NavIcons";

/** Primary destinations. `short` is used where space is tight. */
const LINKS = [
  { href: "/", key: "nav.home", short: "nav.sHome", Icon: NavHome },
  { href: "/practice", key: "nav.practice", short: "nav.sPractice", Icon: NavPractice },
  { href: "/mock", key: "nav.sMock", short: "nav.sMock", Icon: NavMock },
  { href: "/review", key: "nav.sReview", short: "nav.sReview", Icon: NavReview },
  { href: "/progress", key: "nav.progress", short: "nav.progress", Icon: NavProgress },
];

/** Four tabs + "more" fit a phone; the rest live in the sheet. */
const MOBILE_TABS = LINKS.slice(0, 4);

export function TopBar() {
  const { t } = useI18n();
  const { account, theme, toggleTheme, signOut, ready, data } = useApp();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const days = streak(data.attempts);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Dismiss the account menu on outside click or Escape.
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const signedIn = ready && account;

  return (
    <>
      <header
        className="sticky top-0 z-40 transition-colors duration-300"
        style={{
          background: "var(--background)",
          borderBottom: `1px solid ${scrolled ? "var(--line)" : "transparent"}`,
        }}
      >
        <div className="max-w-5xl mx-auto px-4 sm:px-5 h-14 flex items-center gap-2">
          <Link href="/" className="shrink-0" aria-label="1Elevate">
            <span className="hidden sm:block">
              <Logo />
            </span>
            <span className="sm:hidden">
              <Logo compact />
            </span>
          </Link>

          {/*
            Icon-only pills until there's room for labels, so nothing ever wraps.
          */}
          {signedIn ? (
            <nav className="hidden md:flex items-center gap-0.5 ml-3" data-tour="nav">
              {LINKS.map(({ href, key, Icon }) => (
                <Link
                  key={href}
                  href={href}
                  title={t(key)}
                  aria-label={t(key)}
                  className={`nav-pill ${isActive(href) ? "nav-pill-on" : ""} px-2.5 lg:px-3`}
                >
                  <Icon size={18} />
                  <span className="hidden lg:inline">{t(key)}</span>
                </Link>
              ))}
            </nav>
          ) : (
            /* A visitor has no product navigation, so the left half of the bar
               would otherwise be a wordmark alone against a run of controls.
               The tagline gives the row a second beat and says what this is. */
            <span className="hero-nav-tagline hidden sm:inline-block">
              {t("hero.navTagline")}
            </span>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            {signedIn && days > 0 && (
              <span
                className="badge h-9 px-3"
                style={{
                  ["--tone" as string]: "var(--brand)",
                  ["--tone-soft" as string]: "var(--brand-soft)",
                }}
                title={t("progress.streak")}
              >
                🔥 <span className="num">{days}</span>
              </span>
            )}

            <button className="bar-btn" onClick={toggleTheme} aria-label="Toggle theme" title="Toggle theme">
              {theme === "dark" ? "☀" : "☾"}
            </button>

            {ready &&
              (account ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((open) => !open)}
                    className="grid place-items-center w-9 h-9 rounded-full text-[11px] font-semibold transition-opacity duration-200 hover:opacity-85"
                    style={{ background: "var(--ink)", color: "var(--ink-contrast)" }}
                    aria-haspopup="menu"
                    aria-expanded={menuOpen}
                    aria-label={account.name}
                    title={account.name}
                  >
                    {account.name.slice(0, 2).toUpperCase()}
                  </button>

                  {menuOpen && (
                    <div className="menu scale-in" role="menu">
                      <div className="px-2.5 py-2 border-b mb-1">
                        <p className="text-[13.5px] font-medium truncate">{account.name}</p>
                        {account.email && (
                          <p className="text-[12px] text-faint truncate">{account.email}</p>
                        )}
                      </div>

                      <Link
                        href="/account"
                        className="menu-item"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        <NavHome size={17} />
                        {t("nav.profile")}
                      </Link>
                      <Link
                        href="/tutorial"
                        className="menu-item"
                        role="menuitem"
                        onClick={() => setMenuOpen(false)}
                      >
                        <NavTutorial size={17} />
                        {t("nav.tutorial")}
                      </Link>
                      {account.role === "admin" && (
                        <Link
                          href="/admin"
                          className="menu-item"
                          role="menuitem"
                          onClick={() => setMenuOpen(false)}
                        >
                          <NavAdmin size={17} />
                          {t("nav.admin")}
                        </Link>
                      )}

                      <div className="border-t mt-1 pt-1">
                        <button
                          className="menu-item"
                          role="menuitem"
                          style={{ color: "var(--danger)" }}
                          onClick={() => {
                            setMenuOpen(false);
                            signOut();
                          }}
                        >
                          {t("auth.signOut")}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                /* Slightly wider gap than the icon controls to its left: these
                   two are one decision, not part of the utility cluster. */
                <div className="flex items-center gap-1 ml-1">
                  <Link href="/login" className="hidden sm:inline-flex btn btn-ghost btn-sm">
                    {t("auth.signIn")}
                  </Link>
                  <Link href="/signup" className="btn btn-primary btn-sm">
                    {t("landing.start")}
                  </Link>
                </div>
              ))}
          </div>
        </div>
      </header>

      {/* ---------------- mobile bottom tabs ---------------- */}
      {signedIn && (
        <>
          <nav className="tabbar md:hidden" aria-label="Primary">
            {MOBILE_TABS.map(({ href, short, Icon }) => (
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
              className={`tabbar-item ${sheetOpen ? "tabbar-item-on" : ""}`}
              onClick={() => setSheetOpen((open) => !open)}
              aria-expanded={sheetOpen}
            >
              <NavMore size={21} />
              <span className="truncate max-w-full px-1">{t("nav.more")}</span>
            </button>
          </nav>

          {/* spacer so content is never hidden behind the bar */}
          <div className="md:hidden h-16" aria-hidden />

          {sheetOpen && (
            <>
              <div
                className="md:hidden fixed inset-0 z-30 fade-in"
                style={{ background: "color-mix(in srgb, #0b0b0d 40%, transparent)" }}
                onClick={() => setSheetOpen(false)}
              />
              <div
                className="md:hidden fixed inset-x-0 bottom-16 z-40 fade-up px-3 pb-2"
                role="dialog"
              >
                <div className="panel p-2" style={{ boxShadow: "var(--overlay)" }}>
                  {[
                    { href: "/progress", key: "nav.progress", Icon: NavProgress },
                    { href: "/tutorial", key: "nav.tutorial", Icon: NavTutorial },
                    { href: "/account", key: "nav.profile", Icon: NavHome },
                    ...(account?.role === "admin"
                      ? [{ href: "/admin", key: "nav.admin", Icon: NavAdmin }]
                      : []),
                  ].map(({ href, key, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSheetOpen(false)}
                      className="flex items-center gap-3 px-3 py-3 rounded-[10px] text-[15px]"
                      style={{ color: isActive(href) ? "var(--accent)" : "var(--foreground)" }}
                    >
                      <Icon size={19} />
                      {t(key)}
                    </Link>
                  ))}
                  <button
                    className="w-full flex items-center gap-3 px-3 py-3 text-[15px]"
                    style={{ color: "var(--danger)" }}
                    onClick={() => {
                      setSheetOpen(false);
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
      )}
    </>
  );
}
