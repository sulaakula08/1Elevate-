"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useNotifications } from "@/lib/notifications";

/**
 * The bell, and the panel behind it.
 *
 * Opening the panel is what marks everything read — there is no separate "mark
 * all read" control, because a list this short is read by being looked at.
 * Renders nothing when notifications are switched off in settings, rather than
 * showing a bell that can only ever be empty.
 */
export function NotificationsBell({ className = "" }: { className?: string }) {
  const { t } = useI18n();
  const { items, unread, markSeen, enabled } = useNotifications();
  const [open, setOpen] = useState(false);
  const holder = useRef<HTMLDivElement>(null);

  // Escape and a click anywhere else close it, which is what every other
  // transient panel in the app does.
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onDown = (event: MouseEvent) => {
      if (!holder.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  if (!enabled) return null;

  const toggle = () => {
    setOpen((previous) => {
      if (!previous) markSeen();
      return !previous;
    });
  };

  return (
    <div ref={holder} className={`relative ${className}`}>
      <button
        type="button"
        className="bar-btn relative"
        onClick={toggle}
        aria-expanded={open}
        aria-label={
          unread > 0 ? `${t("notif.title")}: ${unread} ${t("notif.new")}` : t("notif.title")
        }
        title={t("notif.title")}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
          <path
            d="M6.5 10.2a5.5 5.5 0 0 1 11 0c0 3 .7 4.6 1.4 5.5.4.5 0 1.2-.6 1.2H5.7c-.7 0-1-.7-.6-1.2.7-.9 1.4-2.5 1.4-5.5Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
          <path d="M10 19.4a2.2 2.2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        {unread > 0 && (
          <span className="notif-dot num" aria-hidden>
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel scale-in" role="dialog" aria-label={t("notif.title")}>
          <div className="flex items-center gap-2 px-4 h-11 border-b">
            <p className="text-[13.5px] font-semibold">{t("notif.title")}</p>
            <Link
              href="/settings"
              className="text-[12px] text-muted ml-auto hover:underline"
              onClick={() => setOpen(false)}
            >
              {t("notif.settings")}
            </Link>
          </div>

          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-[13.5px] text-muted">{t("notif.empty")}</p>
          ) : (
            <ul className="max-h-[22rem] overflow-y-auto">
              {items.map((item) => (
                <li key={item.id} className="border-b last:border-b-0">
                  <Link
                    href={item.href}
                    className="block px-4 py-3 hover:bg-surface-2 transition-colors"
                    onClick={() => setOpen(false)}
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className="notif-kind"
                        style={{
                          ["--tone" as string]:
                            item.kind === "community"
                              ? "var(--s-violet)"
                              : item.kind === "task"
                                ? "var(--s-amber)"
                                : "var(--s-teal)",
                        }}
                      >
                        {t(`notif.kind.${item.kind}`)}
                      </span>
                      <span className="text-[12px] text-faint ml-auto shrink-0">
                        {relative(item.at, t)}
                      </span>
                    </div>
                    <p className="text-[13.5px] mt-1.5">{item.title}</p>
                    {item.body && (
                      <p className="text-[12.5px] text-muted mt-0.5 line-clamp-2">{item.body}</p>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

/** Coarse relative time — a notification does not need minutes-and-seconds. */
function relative(at: number, t: (key: string) => string): string {
  const minutes = Math.max(0, Math.round((Date.now() - at) / 60_000));
  if (minutes < 1) return t("notif.justNow");
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  return `${Math.round(hours / 24)}d`;
}
