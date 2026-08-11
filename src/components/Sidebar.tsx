"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { SAT } from "@/data/exams";
import type { Account } from "@/lib/storage";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { streak } from "@/lib/stats";
import { Logo } from "./Logo";
import { useClosedHrefs } from "./SectionGate";
import {
  NavAdmin,
  NavCommunity,
  NavFeedback,
  NavHome,
  NavMock,
  NavPractice,
  NavProgress,
  NavReview,
} from "./NavIcons";

type Item = { href: string; key: string; Icon: (p: { size?: number }) => React.ReactElement };

/*
 * Three clusters, no headings.
 *
 * The rail carried five uppercase group labels — PRACTICE, COMMUNITY, PROGRESS,
 * LEARN, MANAGE — for eight destinations, two of those groups holding a single
 * link each. That is more label than navigation, and "LEARN" sat above
 * Feedback, which is not learning. Eight items in three spaced clusters are
 * read in one pass without a single word of chrome; the last cluster is ruled
 * off because it is tools rather than study.
 */
const HOME: Item[] = [{ href: "/", key: "nav.home", Icon: NavHome }];

const STUDY: Item[] = [
  { href: "/practice", key: "nav.practice", Icon: NavPractice },
  { href: "/mock", key: "nav.mock", Icon: NavMock },
  { href: "/review", key: "nav.review", Icon: NavReview },
];

const TRACK: Item[] = [
  { href: "/community", key: "nav.community", Icon: NavCommunity },
  { href: "/progress", key: "nav.progress", Icon: NavProgress },
];

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
  const { data } = useApp();
  const pathname = usePathname();
  const days = streak(data.attempts);
  const closed = useClosedHrefs();
  const staff = account.role !== "student";

  const isActive = (href: string) =>
    href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);

  const renderGroup = (items: Item[]) =>
    items
      // A student is not shown a way into a section that will refuse them.
      .filter(({ href }) => staff || !closed.has(href))
      .map(({ href, key, Icon }) => (
        <Link
          key={href}
          href={href}
          className={`side-link ${isActive(href) ? "side-link-on" : ""}`}
          title={collapsed ? t(key) : undefined}
          aria-current={isActive(href) ? "page" : undefined}
        >
          <Icon size={18} />
          {!collapsed && <span className="truncate">{t(key)}</span>}
          {/* Staff see what they closed, from wherever they are. */}
          {closed.has(href) && !collapsed && (
            <span className="side-closed" title={t("closed.title")} aria-hidden />
          )}
        </Link>
      ));

  return (
    <aside className={`sidebar hidden md:flex ${collapsed ? "sidebar-tight" : ""}`}>
      <div className={`side-head ${collapsed ? "side-head-tight" : ""}`}>
        {/* The mark stays when the rail collapses. Losing it left a 4rem column
            of anonymous icons with nothing saying whose product this is. */}
        <Link href="/" className="min-w-0" aria-label="1Elevate">
          <Logo compact={collapsed} />
        </Link>
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

      {/* The exam and where the student stands on its scale. Nothing at all when
          the rail is collapsed: 4rem fits the number but not the label, and
          "1400" on its own says nothing. The target lives on /account and in the
          dashboard goal panel, both of which explain it. */}
      {!collapsed && (
        <div className="px-1.5 pb-3 mb-1 border-b">
          <p className="text-sm font-medium">{tx(SAT.name)}</p>
          <p className="text-2xs text-faint mt-0.5">
            {t("home.targetScore")} <span className="num">{account.targetScore}</span> /{" "}
            <span className="num">{SAT.maxScore}</span>
          </p>
        </div>
      )}

      <nav className="side-nav">
        <div className="side-cluster">{renderGroup(HOME)}</div>
        <div className="side-cluster">{renderGroup(STUDY)}</div>
        <div className="side-cluster">{renderGroup(TRACK)}</div>
        <div className="side-cluster side-cluster-tools">
          {renderGroup([
            { href: "/feedback", key: "nav.feedback", Icon: NavFeedback },
            ...(account.role !== "student"
              ? [{ href: "/admin", key: "nav.admin", Icon: NavAdmin }]
              : []),
          ])}
        </div>
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
            className="grid place-items-center w-8 h-8 rounded-[var(--radius-pill)] text-2xs font-semibold shrink-0"
            style={{ background: "var(--ink)", color: "var(--ink-contrast)" }}
          >
            {account.name.slice(0, 2).toUpperCase()}
          </span>
          {!collapsed && (
            <span className="min-w-0">
              <span className="block text-sm font-medium truncate">{account.name}</span>
              <span className="block text-2xs text-faint">
                {days > 0 ? `🔥 ${days}` : (account.email || "SAT")}
              </span>
            </span>
          )}
        </Link>
        {/* Settings, not a single toggle. The theme switch that used to live
            here is one preference among several now, and a rail with one
            preference on it and the rest hidden is a worse map than a door. */}
        <Link
          href="/settings"
          className="bar-btn shrink-0"
          aria-label={t("nav.settings")}
          title={t("nav.settings")}
        >
          {/* Sliders, not a cog and definitely not a sun: the old icon was a
              circle with eight radiating lines, which is a sun in every other
              interface a student uses. Three faders read as "settings" with no
              ambiguity, and stay legible at 17px. */}
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
            <path
              d="M4 7.5h9M17.5 7.5H20M4 16.5h4M12.5 16.5H20M4 12h13M20 12h0"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
            />
            <circle cx="15" cy="7.5" r="2.1" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="10.5" cy="16.5" r="2.1" stroke="currentColor" strokeWidth="1.6" />
            <circle cx="18.6" cy="12" r="1.4" stroke="currentColor" strokeWidth="1.6" />
          </svg>
        </Link>
      </div>
    </aside>
  );
}
