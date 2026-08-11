"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";

/**
 * Hides a section while it is being worked on.
 *
 * Wrapped around a page's content, so the page itself does not have to know
 * anything about maintenance — and so a closed section still renders the app
 * shell, the sidebar and the navigation. A student who lands on it can read why
 * and go somewhere else, rather than meeting a blank screen or a crash.
 *
 * Closed means closed, including for the people who closed it. Staff used to
 * pass straight through to the working page with a warning above it, which made
 * "closed" impossible to check: the owner would shut a section, look at it, see
 * it, and have no idea whether a student could. They now meet the same screen a
 * student does and can step past it deliberately — closing a section is usually
 * something you do *because* it is broken, and the people fixing it still need
 * a way in.
 */

type Status = { closed: boolean; message: string | null };
type StatusMap = Record<string, Status>;

/**
 * One fetch per page load, shared by every gate on it. Without this, a page
 * containing two gated regions would ask twice, and navigating between sections
 * would ask again on each.
 */
let inFlight: Promise<StatusMap> | null = null;

function loadStatus(): Promise<StatusMap> {
  if (!inFlight) {
    inFlight = apiFetch("/api/sections")
      .then((response) => (response.ok ? response.json() : { sections: {} }))
      .then((body: { sections?: StatusMap }) => body.sections ?? {})
      // Fail open: an unreachable endpoint must not take a working section down.
      .catch(() => ({}) as StatusMap);
  }
  return inFlight;
}

/** Lets the owner's own toggle take effect without a reload. */
export function forgetSectionStatus() {
  inFlight = null;
}

/**
 * Which sections are closed, for anything that is not a gate — the navigation,
 * mainly, which should not offer a student a door that will not open.
 */
export function useSectionStatus(): { sections: StatusMap; checked: boolean } {
  const [sections, setSections] = useState<StatusMap>({});
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    let live = true;
    void loadStatus().then((map) => {
      if (!live) return;
      setSections(map);
      setChecked(true);
    });
    return () => {
      live = false;
    };
  }, []);

  return { sections, checked };
}

/** Which destination belongs to which closable section. */
const SECTION_OF: Record<string, string> = {
  "/practice": "practice",
  "/mock": "mock",
  "/review": "review",
  "/community": "community",
  "/progress": "progress",
};

/**
 * The navigation entries that currently lead nowhere.
 *
 * A closed section that is still listed in the rail is a door a student can
 * keep walking into. They are dropped from the navigation entirely; staff keep
 * them, because they are the ones who have to go and look.
 */
export function useClosedHrefs(): Set<string> {
  const { sections } = useSectionStatus();
  const closed = new Set<string>();
  for (const [href, key] of Object.entries(SECTION_OF)) {
    if (sections[key]?.closed) closed.add(href);
  }
  return closed;
}

export function SectionGate({
  section,
  children,
}: {
  section: string;
  children: React.ReactNode;
}) {
  const { t } = useI18n();
  const { account } = useApp();
  const [status, setStatus] = useState<Status | null>(null);
  const [checked, setChecked] = useState(false);
  /** Staff only, and never remembered: stepping past is a per-visit decision. */
  const [override, setOverride] = useState(false);

  useEffect(() => {
    let live = true;
    void loadStatus().then((map) => {
      if (!live) return;
      setStatus(map[section] ?? null);
      setChecked(true);
    });
    return () => {
      live = false;
    };
  }, [section]);

  const staff = account?.role === "admin" || account?.role === "owner";

  /*
   * Nothing at all until the answer is in.
   *
   * This used to render the section while the request was in flight, to avoid a
   * flash of "unavailable" on every load. The cost was that a closed section
   * was briefly a working one: long enough to tap a card and start a session
   * that should not have been startable. A closed section has to be closed from
   * the first frame, so the wait is empty instead. It is one request against a
   * response already on its way to the same page.
   */
  if (!checked) return null;

  // `staff &&` and not just `override`: the bypass is checked against the role
  // here, rather than trusting that the button which sets it was never shown.
  if (!status?.closed || (override && staff)) {
    return (
      <>
        {status?.closed && (
          <p className="notice notice-warn mb-5">
            {t("closed.staffNotice")}
            {status.message ? ` — ${status.message}` : ""}
          </p>
        )}
        {children}
      </>
    );
  }

  return (
    <div className="container-app py-16">
      <div className="panel p-8 sm:p-10 max-w-lg mx-auto text-center">
        <span className="closed-mark" aria-hidden>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path
              d="M12 3.6 20.4 18a1.1 1.1 0 0 1-.95 1.65H4.55A1.1 1.1 0 0 1 3.6 18L12 3.6Z"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path d="M12 9.4v3.9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            <circle cx="12" cy="16.2" r="0.95" fill="currentColor" />
          </svg>
        </span>

        <h1 className="display mt-5 text-[24px]">{t("closed.title")}</h1>
        <p className="lede mt-3 text-[15px]">{status.message || t("closed.body")}</p>

        <div className="mt-7 flex flex-wrap justify-center gap-2">
          <Link href="/" className="btn btn-primary">
            {t("closed.home")}
          </Link>
          {/* The way back in for whoever has to fix it, stated as what it is:
              this page is shut, and you are choosing to look anyway. */}
          {staff && (
            <button type="button" className="btn" onClick={() => setOverride(true)}>
              {t("closed.openAnyway")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
