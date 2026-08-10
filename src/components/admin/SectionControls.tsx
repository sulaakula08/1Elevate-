"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";
import { forgetSectionStatus } from "@/components/SectionGate";
import { ConfirmDialog } from "@/components/ui";
import { SwipeRow } from "@/components/motion/SwipeRow";

/**
 * The owner's maintenance switches.
 *
 * Closing asks for confirmation and offers a message, because the message is
 * the whole point: "Community is unavailable" tells a student nothing they
 * cannot already see, while "back in about an hour" tells them whether to wait.
 * Clicking reopen is immediate — there is nothing to be careful about in making
 * the product work again.
 *
 * A row can also be swiped: right reopens, left closes. A gesture is easier to
 * trigger by accident than a button, and this one takes a section away from
 * every student at once, so a swipe never applies anything — either direction
 * only opens the confirmation, and the row springs back while it is up.
 */

const SECTIONS: { key: string; label: string }[] = [
  { key: "community", label: "Community" },
  { key: "practice", label: "Question bank" },
  { key: "mock", label: "Mock test" },
  { key: "review", label: "Review" },
  { key: "progress", label: "Progress" },
];

type Status = { closed: boolean; message: string | null };

export function SectionControls() {
  const { t } = useI18n();
  const { account } = useApp();
  const [status, setStatus] = useState<Record<string, Status>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The section awaiting confirmation, and which way it is about to go. */
  const [pending, setPending] = useState<
    { key: string; label: string; closing: boolean } | null
  >(null);
  const [draft, setDraft] = useState("");

  const isOwner = account?.role === "owner";

  const load = useCallback(async () => {
    const response = await apiFetch("/api/sections");
    if (!response.ok) return;
    const body = (await response.json()) as { sections: Record<string, Status> };
    setStatus(body.sections ?? {});
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function apply(key: string, closed: boolean, message: string | null) {
    setBusy(key);
    setError(null);
    const response = await apiFetch("/api/sections", {
      method: "POST",
      body: JSON.stringify({ key, closed, message }),
    });
    setBusy(null);
    setPending(null);
    setDraft("");

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? t("closed.saveFailed"));
      return;
    }
    setStatus((prev) => ({ ...prev, [key]: { closed, message } }));
    // The gate caches its answer for the page, so drop it or the owner's own
    // screens keep showing the state from before the toggle.
    forgetSectionStatus();
  }

  const closedCount = SECTIONS.filter((s) => status[s.key]?.closed).length;

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="display text-[22px]">{t("closed.adminTitle")}</h2>
        <p className="text-[13px] text-muted">
          {closedCount === 0 ? t("closed.allOpen") : `${closedCount} ${t("closed.nClosed")}`}
        </p>
      </div>
      <p className="mt-2 text-[13.5px] text-muted max-w-2xl">{t("closed.adminBody")}</p>

      {!isOwner && <p className="notice mt-4">{t("closed.ownerOnly")}</p>}
      {error && (
        <p className="notice notice-error mt-4" role="alert">
          {error}
        </p>
      )}

      <ul className="mt-5 border-t">
        {SECTIONS.map((section) => {
          const current = status[section.key];
          const closed = current?.closed ?? false;
          return (
            <li key={section.key} className="border-b">
              <SwipeRow
                disabled={!isOwner || busy === section.key}
                hint={
                  closed
                    ? t("closed.swipeHintClosed")
                    : t("closed.swipeHintOpen")
                }
                onSwipe={(direction) => {
                  // Swiping the way it already is means nothing.
                  if (direction === "right" && !closed) return "revert";
                  if (direction === "left" && closed) return "revert";
                  setDraft("");
                  setPending({ ...section, closing: direction === "left" });
                  // The dialog takes over; the row goes back where it was.
                  return "revert";
                }}
              >
                <div className="flex flex-wrap items-center gap-3 py-3.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium">{section.label}</p>
                    {closed && current?.message && (
                  <p className="text-[13px] text-muted truncate">{current.message}</p>
                    )}
                  </div>

                  <span
                    className="chip shrink-0"
                    style={{
                  ["--tone" as string]: closed ? "var(--danger)" : "var(--success)",
                    }}
                  >
                    {t(closed ? "closed.stateClosed" : "closed.stateOpen")}
                  </span>

                {isOwner && (
                  <button
                    type="button"
                    className="btn btn-sm shrink-0"
                    disabled={busy === section.key}
                    onClick={() => {
                      if (closed) {
                        void apply(section.key, false, null);
                      } else {
                        setDraft("");
                        setPending({ ...section, closing: true });
                      }
                    }}
                  >
                    {busy === section.key
                      ? "…"
                      : t(closed ? "closed.reopen" : "closed.close")}
                  </button>
                )}
                </div>
              </SwipeRow>
            </li>
          );
        })}
      </ul>

      {pending && (
        <ConfirmDialog
          title={`${t(pending.closing ? "closed.confirmTitle" : "closed.reopenTitle")} ${
            pending.label
          }?`}
          body={
            pending.closing ? (
              <>
                <span className="block">{t("closed.confirmBody")}</span>
                {/* The message is the point of closing at all — see the note at
                    the top of this file — so it is asked for here and nowhere
                    else. Reopening has nothing to explain. */}
                <label className="block mt-4">
                  <span className="label">{t("closed.messageLabel")}</span>
                  <input
                    className="field"
                    value={draft}
                    placeholder={t("closed.messagePlaceholder")}
                    onChange={(e) => setDraft(e.target.value)}
                  />
                </label>
              </>
            ) : (
              <span className="block">{t("closed.reopenBody")}</span>
            )
          }
          confirmLabel={t(pending.closing ? "closed.close" : "closed.reopen")}
          danger={pending.closing}
          onConfirm={() =>
            void apply(pending.key, pending.closing, pending.closing ? draft.trim() || null : null)
          }
          onCancel={() => setPending(null)}
        />
      )}
    </section>
  );
}
