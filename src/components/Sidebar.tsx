"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SAT } from "@/data/exams";
import type { Account } from "@/lib/storage";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { streak } from "@/lib/stats";
import { Logo } from "./Logo";
import {
  NavAdmin,
  NavHome,
  NavMock,
  NavPractice,
  NavProgress,
  NavReview,
  NavTutorial,
} from "./NavIcons";

type Item = { href: string; key: string; Icon: (p: { size?: number }) => React.ReactElement };

const TOP: Item[] = [{ href: "/", key: "nav.home", Icon: NavHome }];

const PRACTICE: Item[] = [
  { href: "/practice", key: "nav.bank", Icon: NavPractice },
  { href: "/mock", key: "nav.mock", Icon: NavMock },
  { href: "/review", key: "nav.review", Icon: NavReview },
];

const PROGRESS: Item[] = [{ href: "/progress", key: "nav.progress", Icon: NavProgress }];
const LEARN: Item[] = [{ href: "/tutorial", key: "nav.tutorial", Icon: NavTutorial }];

/**
 * Desktop navigation rail: brand, exam switcher, grouped links, account row.
 *
 * Collapsing keeps every destination reachable rather than hiding them behind a
 * menu — the icons stay, the labels go, and each link keeps a title so the rail
 * is still legible at 4rem wide.
 */
export function Sidebar({
  account,
  collapsed = false,
  onToggle,
}: {
  account: Account;
  collapsed?: boolean;
  onToggle?: () => void;
}) {
  const { t, tx } = useI18n();
  const { data, theme, toggleTheme } = useApp();
  const pathname = usePathname();
  const days = streak(data.attempts);

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const renderGroup = (label: string | null, items: Item[]) => (
    <>
      {label && !collapsed && <p className="side-group">{label}</p>}
      {items.map(({ href, key, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`side-link ${isActive(href) ? "side-link-on" : ""}`}
          title={collapsed ? t(key) : undefined}
        >
          <Icon size={18} />
          {!collapsed && <span className="truncate">{t(key)}</span>}
        </Link>
      ))}
    </>
  );

  return (
    <aside className={`sidebar hidden md:flex ${collapsed ? "sidebar-tight" : ""}`}>
      <div className="side-head">
        {!collapsed && (
          <Link href="/" className="min-w-0" aria-label="1Elevate">
            <Logo />
          </Link>
        )}
        {onToggle && (
          <button
            type="button"
            className="bar-btn side-toggle"
            onClick={onToggle}
            aria-pressed={collapsed}
            aria-label={collapsed ? t("side.expand") : t("side.collapse")}
            title={collapsed ? t("side.expand") : t("side.collapse")}
          >
            {/* A panel with a chevron: the icon says "rail", the chevron says
                which way it will move. */}
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
              <rect
                x="3.2"
                y="4.2"
                width="17.6"
                height="15.6"
                rx="3"
                stroke="currentColor"
                strokeWidth="1.6"
              />
              <path d="M9.4 4.2v15.6" stroke="currentColor" strokeWidth="1.6" />
              <path
                d={collapsed ? "M13.6 9.6l2.8 2.4-2.8 2.4" : "M16.8 9.6L14 12l2.8 2.4"}
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>

      {/* the one exam, and where the student stands on its scale */}
      {collapsed ? (
        <div
          className="side-exam-tight"
          title={`${tx(SAT.name)} · ${account.targetScore} / ${SAT.maxScore}`}
        >
          <span className="num">{account.targetScore}</span>
        </div>
      ) : (
        <div className="px-1.5 pb-3 mb-1 border-b">
          <p className="text-[13px] font-medium">{tx(SAT.name)}</p>
          <p className="num text-[11px] text-faint mt-0.5">
            {t("home.targetScore")} {account.targetScore} / {SAT.maxScore}
          </p>
        </div>
      )}

      <nav className="flex flex-col gap-0.5">
        {renderGroup(null, TOP)}
        {renderGroup(t("side.practice"), PRACTICE)}
        {renderGroup(t("side.progress"), PROGRESS)}
        {renderGroup(t("side.learn"), LEARN)}
        {account.role !== "student" &&
          renderGroup(t("side.manage"), [{ href: "/admin", key: "nav.admin", Icon: NavAdmin }])}
      </nav>

      {/* account row */}
      <div
        className={`mt-auto pt-3 border-t flex gap-2.5 ${
          collapsed ? "flex-col items-center" : "items-center"
        }`}
      >
        <Link
          href="/account"
          className={`flex items-center gap-2.5 min-w-0 rounded-lg hover:bg-surface-2 transition-colors ${
            collapsed ? "p-1" : "flex-1 px-1 py-1.5"
          }`}
          title={collapsed ? account.name : undefined}
        >
          <span
            className="grid place-items-center w-8 h-8 rounded-full text-[11px] font-semibold shrink-0"
            style={{ background: "var(--ink)", color: "var(--ink-contrast)" }}
          >
            {account.name.slice(0, 2).toUpperCase()}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-[13px] font-medium truncate">{account.name}</span>
              <span className="block text-[11px] text-faint">
                {days > 0 ? `🔥 ${days}` : (account.email || "SAT")}
              </span>
            </span>
          )}
        </Link>
        {/* Theme, not settings. This slot used to hold a cog that linked to
            /account — the same destination as the name beside it — so the only
            thing it could do was look like a control and then navigate. The
            avatar already goes to the profile; this switches the theme.

            Rendered in both states — collapsing the rail should not take the
            theme switch away, so on a tight rail it stacks under the avatar. */}
        <button
          type="button"
          className="bar-btn shrink-0"
          onClick={toggleTheme}
          aria-label={t(theme === "dark" ? "nav.lightMode" : "nav.darkMode")}
          title={t(theme === "dark" ? "nav.lightMode" : "nav.darkMode")}
        >
          {theme === "dark" ? (
            // Sun: switching to light.
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
              <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.6" />
              <path
                d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            // Moon: switching to dark.
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
              <path
                d="M20 14.4A8.4 8.4 0 1 1 9.6 4a6.9 6.9 0 0 0 10.4 10.4Z"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </button>
      </div>
    </aside>
  );
}
