"use client";

import { useId, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { useCommunity, type ReportReason, type ReportTarget } from "@/lib/community-state";

/**
 * Reporting a post or a reply.
 *
 * Five reasons and an optional sentence. The list is short on purpose: a reporter
 * is usually upset and always in a hurry, and twenty categories turn a report
 * into a filing exercise that people abandon half way through. "Other" plus a
 * free-text box covers what the five do not, and an admin reads the sentence
 * anyway before acting.
 *
 * Built as its own dialog rather than through ConfirmDialog, because this one
 * asks a question with a required answer: the submit button stays disabled until
 * a reason is chosen, which a yes/no confirmation has no notion of. It borrows
 * that component's behaviour — Escape cancels, the backdrop cancels, focus opens
 * inside the panel — so the two feel like one pattern.
 */

const REASONS: ReportReason[] = [
  "harassment",
  "spam",
  "inappropriate",
  "misinformation",
  "other",
];

export function ReportDialog({
  target,
  onClose,
}: {
  target: ReportTarget;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { reportContent } = useCommunity();
  const groupId = useId();
  const detailsId = useId();

  const [reason, setReason] = useState<ReportReason | null>(null);
  const [details, setDetails] = useState("");
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  /** Set once the report is in. The dialog becomes an acknowledgement. */
  const [sent, setSent] = useState(false);

  async function submit() {
    if (!reason || busy) return;
    setBusy(true);
    setFailed(false);
    const ok = await reportContent(target, reason, details);
    setBusy(false);
    if (!ok) {
      setFailed(true);
      return;
    }
    setSent(true);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 fade-in"
      style={{ background: "color-mix(in srgb, var(--foreground) 32%, transparent)" }}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t(
          target.type === "post" ? "community.reportPostTitle" : "community.reportCommentTitle",
        )}
        className="panel scale-in w-full max-w-sm p-6"
      >
        {sent ? (
          /* What happened, and what did not. A reporter who is not told the
             content stays up assumes it came down, comes back to find it there,
             and reports it again. */
          <>
            <h2 className="text-h3 font-semibold">{t("community.reportSentTitle")}</h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("community.reportSentBody")}
            </p>
            <div className="mt-6 flex justify-end">
              <button type="button" className="btn btn-primary" onClick={onClose} autoFocus>
                {t("community.reportDone")}
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-h3 font-semibold">
              {t(
                target.type === "post"
                  ? "community.reportPostTitle"
                  : "community.reportCommentTitle",
              )}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted">
              {t("community.reportBody")}
            </p>

            {/* A real radio group: one answer, arrow keys work, and the label is
                associated by wrapping rather than by a for/id pair that can rot. */}
            <fieldset className="mt-4">
              <legend className="label-xs" id={groupId}>
                {t("community.reportReasonLabel")}
              </legend>
              <div className="mt-2 space-y-1">
                {REASONS.map((value) => (
                  <label key={value} className="cm-report-reason">
                    <input
                      type="radio"
                      name={groupId}
                      value={value}
                      checked={reason === value}
                      onChange={() => setReason(value)}
                    />
                    <span>{t(`community.reportReason.${value}`)}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="mt-4">
              <label className="label" htmlFor={detailsId}>
                {t("community.reportDetailsLabel")}
              </label>
              <textarea
                id={detailsId}
                className="field min-h-16"
                maxLength={1000}
                value={details}
                onChange={(event) => setDetails(event.target.value)}
                placeholder={t("community.reportDetailsPlaceholder")}
              />
            </div>

            {failed && (
              <p className="notice notice-error mt-3" role="alert">
                {t("community.reportFailed")}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" className="btn" onClick={onClose} disabled={busy}>
                {t("community.composerCancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!reason || busy}
                onClick={() => void submit()}
              >
                {busy ? "…" : t("community.reportSubmit")}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
