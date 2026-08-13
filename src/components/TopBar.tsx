"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { EnvironmentBadge } from "./EnvironmentBadge";
import { Logo } from "./Logo";
import { ThemeToggle } from "./ThemeToggle";
import {
  NavAdmin,
  NavHome,
  NavMock,
  NavMore,
  NavPractice,
  NavProgress,
  NavReview,
} from "./NavIcons";

/** Primary destinations. `short` is used where space is tight. */
const LINKS = [
  { href: "/", key: "nav.home", short: "nav.home", Icon: NavHome },
  { href: "/practice", key: "nav.practice", short: "nav.practice", Icon: NavPractice },
  { href: "/mock", key: "nav.mock", short: "nav.mock", Icon: NavMock },
  { href: "/review", key: "nav.review", short: "nav.review", Icon: NavReview },
  { href: "/progress", key: "nav.progress", short: "nav.progress", Icon: NavProgress },
];

/** Four tabs + "more" fit a phone; the rest live in the sheet. */
const MOBILE_TABS = LINKS.slice(0, 4);

export function TopBar() {
  const { t } = useI18n();
  const { account, signOut, ready } = useApp();
  const pathname = usePathname();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
        <div className="max-w-5xl mx-auto px-5 sm:px-8 h-14 flex items-center gap-2">
          <Link href="/" className="shrink-0" aria-label="1Elevate">
            <span className="hidden sm:block">
              <Logo />
            </span>
            <span className="sm:hidden">
              <Logo compact />
            </span>
          </Link>

          <EnvironmentBadge />

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
            <div className="hidden sm:flex items-center min-w-0">
              <span className="hero-nav-tagline">{t("hero.navTagline")}</span>
              <nav className="hero-nav-links hidden md:flex" aria-label="Landing page">
                <a href="#sample-question">{t("hero.navProduct")}</a>
                <a href="#proof">{t("hero.navMethod")}</a>
              </nav>
            </div>
          )}

          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />

            {(ready || pathname === "/") &&
              (account ? (
                <div className="relative" ref={menuRef}>
                  <button
                    onClick={() => setMenuOpen((open) => !open)}
                    className="grid place-items-center w-9 h-9 rounded-[var(--radius-pill)] text-2xs font-semibold transition-opacity duration-200 hover:opacity-85"
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
                        <p className="text-sm font-medium truncate">{account.name}</p>
                        {account.email && (
                          <p className="text-micro text-faint truncate">{account.email}</p>
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
                      {account.role !== "student" && (
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
                /*
                  The bar never offers the page you are already on. Standing on
                  /login and being shown a "Sign in" button — with the form for
                  it directly below — is the kind of detail that makes an
                  interface feel unproofread.
                */
                <div className="flex items-center gap-1 ml-1">
                  {pathname !== "/login" && (
                    <Link href="/login" className="inline-flex btn btn-ghost btn-sm">
                      {t("auth.signIn")}
                    </Link>
                  )}
                  {pathname !== "/signup" && (
                    <Link href="/signup" className="btn btn-primary btn-sm">
                      {t("landing.start")}
                    </Link>
                  )}
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
                    { href: "/account", key: "nav.profile", Icon: NavHome },
                    ...(account && account.role !== "student"
                      ? [{ href: "/admin", key: "nav.admin", Icon: NavAdmin }]
                      : []),
                  ].map(({ href, key, Icon }) => (
                    <Link
                      key={href}
                      href={href}
                      onClick={() => setSheetOpen(false)}
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
