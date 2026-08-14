"use client";

import Link from "next/link";
import { useI18n } from "@/lib/i18n";
import { isUnreleased } from "@/lib/sections";
import { useCanSeeUnreleased } from "@/lib/unreleased";

/**
 * Sections that exist but are not open to students yet.
 *
 * The sibling of SectionGate, and deliberately not the same thing. That gate is
 * the owner's maintenance switch: a runtime state, reversible from the admin
 * panel, that shuts a section for staff as well because you usually close a
 * section precisely when it is broken. This one is a property of the build —
 * community is finished enough for the people making it and not finished enough
 * to show anyone else — so it inverts both of those. It is fixed in code, and
 * staff pass straight through it rather than having to step past a warning on
 * every visit.
 *
 * Both gates apply to the community page at once, and they compose correctly:
 * an owner who closes community for maintenance closes it for everyone who could
 * see it at all, which is the sensible reading of the two together.
 */

/**
 * Wraps a section that has not launched.
 *
 * Placed inside RequireAccount, which has already settled `ready` and produced
 * an account — so the role read here is the real one and there is no frame in
 * which an unreleased section renders to a student before the check catches up.
 */
export function ComingSoonGate({
  section,
  children,
}: {
  section: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const canSee = useCanSeeUnreleased();

  if (!isUnreleased(section)) return <>{children}</>;

  if (canSee) {
    return (
      <>
        {/* Staff are looking at something students cannot reach. Saying so is
            the difference between testing a section and forgetting it is not
            live yet. */}
        <p className="notice notice-warn mb-5">{t("soon.staffNotice")}</p>
        {children}
      </>
    );
  }

  return (
    <div className="container-app py-16">
      <div className="panel p-8 sm:p-10 max-w-lg mx-auto text-center">
        <span className="soon-mark" aria-hidden>
          {/* A clock, not a warning triangle: nothing is wrong here, it is
              simply not time yet. The triangle belongs to the closed screen,
              where something actually is broken. */}
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <circle cx="12" cy="12" r="8.4" stroke="currentColor" strokeWidth="1.7" />
            <path
              d="M12 7.3V12l3 1.9"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>

        <h1 className="display mt-5 text-[24px]">{t("soon.title")}</h1>
        <p className="lede mt-3 text-[15px]">{t("soon.body")}</p>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            {t("soon.home")}
          </Link>
          <Link href="/practice" className="btn">
            {t("nav.practice")}
          </Link>
        </div>
      </div>
    </div>
  );
}
