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
  const headerRef = useRef<HTMLElement>(null);

  /*
    The bar detaches over the first 120px rather than snapping at 4px. One
    custom property carries the state to CSS, which owns every visual decision:
    `--nav-p` runs 0 → 1 across that distance and drives the drop, the corner
    radius, the inset, the height, the translucency, the blur and the tagline
    fade — one number, so those moves cannot drift out of step with each other.

    Written to the element in a rAF rather than through React state: this fires
    on every scroll frame, and re-rendering a header with a menu and a nav in it
    sixty times a second to change an opacity is the wrong trade. `scrolled`
    stays a state because it flips once and gates a discrete transition.
  */
  useEffect(() => {
    let frame = 0;

    const apply = () => {
      frame = 0;
      const node = headerRef.current;
      if (!node) return;

      const y = window.scrollY;
      node.style.setProperty("--nav-p", Math.min(1, Math.max(0, y / 120)).toFixed(4));
      setScrolled(y > 4);
    };

    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(apply);
    };

    // Refreshing halfway down the page must paint the condensed state before
    // the visitor moves the wheel again.
    apply();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
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
        ref={headerRef}
        className="landing-topbar sticky top-0 z-40"
        data-scrolled={scrolled ? "" : undefined}
      >
        <div className="landing-topbar-inner marketing-frame mx-auto px-5 sm:px-8 flex items-center gap-2">
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
                <a href="#method">{t("hero.navMethod")}</a>
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
