"use client";

import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";

/**
 * The one theme control, used everywhere a theme control belongs.
 *
 * Previously each surface drew its own: the marketing bar used the text glyphs
 * "☀" and "☾", which are font-dependent characters rather than icons — thin,
 * misaligned, and missing entirely on some systems — and the app shell had none
 * at all once the rail's button became Settings. One component, one icon set,
 * one behaviour.
 *
 * The icon shows the theme the button will switch *to*, which is the convention
 * the rest of the app already follows.
 */
export function ThemeToggle({ className = "" }: { className?: string }) {
  const { toggleTheme } = useApp();
  const { t } = useI18n();
  const label = t("nav.toggleTheme");

  return (
    <button
      type="button"
      className={`bar-btn ${className}`}
      onClick={toggleTheme}
      aria-label={label}
      title={label}
    >
      {/* Both icons are present on the server and the first client render. CSS
          chooses the one that matches the pre-paint `data-theme` attribute,
          so a stored dark theme cannot hydrate against light-theme markup. */}
      <span className="theme-toggle-icon theme-toggle-sun" aria-hidden>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
          <circle cx="12" cy="12" r="4.1" stroke="currentColor" strokeWidth="1.6" />
          <path
            d="M12 2.8v2.1M12 19.1v2.1M2.8 12h2.1M19.1 12h2.1M5.5 5.5l1.5 1.5M17 17l1.5 1.5M5.5 18.5L7 17M17 7l1.5-1.5"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </svg>
      </span>
      <span className="theme-toggle-icon theme-toggle-moon" aria-hidden>
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" aria-hidden>
          <path
            d="M20 14.4A8.4 8.4 0 1 1 9.6 4a6.9 6.9 0 0 0 10.4 10.4Z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </span>
    </button>
  );
}
