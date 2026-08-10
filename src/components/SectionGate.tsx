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
 * Admins and the owner always pass through. Closing a section is what you do
 * *because* it is broken, so the people fixing it are exactly the ones who need
 * to keep opening it.
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

  // Render the section while the answer is in flight. The alternative is a
  // flash of "unavailable" on every page load, which is worse than a moment of
  // content on the rare occasion something is genuinely closed.
  if (!checked || !status?.closed || staff) {
    return (
      <>
        {status?.closed && staff && (
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

        <Link href="/" className="btn btn-primary mt-7">
          {t("closed.home")}
        </Link>
      </div>
    </div>
  );
}
