"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";
import { ConfirmDialog, EmptyState } from "@/components/ui";

/**
 * Reported content, for an admin.
 *
 * Grouped by the thing reported rather than listed by report — five people
 * flagging one post is one decision, and the count is the signal. The server does
 * the grouping; this renders it and offers the two verdicts.
 *
 * Like FeedbackInbox, this component carries no permission check of its own. The
 * read policy on community_reports and the is_admin() guard inside the moderation
 * functions decide what a caller can see and do, so rendering this in the wrong
 * place would show an empty queue rather than leak one.
 */

type Item = {
  targetType: "post" | "comment";
  targetId: string;
  preview: string | null;
  authorName: string | null;
  authorId: string | null;
  hidden: boolean;
  parentPreview?: string | null;
  reasons: string[];
  details: string[];
  reportCount: number;
  firstReportedAt: number;
  lastReportedAt: number;
  status: "open" | "resolved";
};

type Filter = "open" | "all";

/** Absolute and to the minute: an admin comparing two reports needs the clock. */
function formatWhen(at: number): string {
  return new Date(at).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function CommunityModeration() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [loading, setLoading] = useState(true);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** The item an admin has asked to hide but not yet confirmed. */
  const [toHide, setToHide] = useState<Item | null>(null);

  const load = useCallback(
    async (which: Filter) => {
      try {
        const response = await apiFetch(
          `/api/community/moderation${which === "all" ? "?status=all" : ""}`,
        );
        if (!response.ok) {
          setError(t("moderation.loadFailed"));
          return;
        }
        const body = (await response.json()) as { items: Item[] };
        setItems(body.items);
        setError(null);
      } catch {
        setError(t("moderation.loadFailed"));
      } finally {
        setLoading(false);
      }
    },
    [t],
  );

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load(filter);
  }, [load, filter]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function act(item: Item, action: "hide" | "unhide" | "dismiss") {
    const key = `${item.targetType}:${item.targetId}`;
    setBusyKey(key);
    const response = await apiFetch("/api/community/moderation", {
      method: "POST",
      body: JSON.stringify({ action, targetType: item.targetType, targetId: item.targetId }),
    });
    setBusyKey(null);
    setToHide(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? t("moderation.actionFailed"));
      return;
    }

    setError(null);
    // Refetched rather than patched in place: hiding settles the reports behind
    // the row, so what the queue should now show is a server-side question.
    await load(filter);
  }

  const openCount = useMemo(
    () => items.filter((item) => item.status === "open").length,
    [items],
  );

  return (
    <section>
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="display text-h2">{t("moderation.title")}</h2>
        <p className="text-sm text-muted">
          {openCount} {t("moderation.openCount")}
        </p>
        <div className="ml-auto flex gap-2">
          {(["open", "all"] as Filter[]).map((value) => (
            <button
              key={value}
              className={`chip ${filter === value ? "chip-on" : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(`moderation.filter.${value}`)}
            </button>
          ))}
        </div>
      </div>

      <p className="text-sm text-muted mt-2 max-w-xl leading-relaxed">
        {t("moderation.intro")}
      </p>

      {error && (
        <p className="notice notice-error mt-4" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-muted mt-6 text-sm">{t("common.loading")}</p>
      ) : items.length === 0 ? (
        <EmptyState tone="positive" title={t("moderation.clearTitle")}>
          {filter === "open" ? t("moderation.clearBody") : t("moderation.noneBody")}
        </EmptyState>
      ) : (
        <ul className="mt-5 border-t">
          {items.map((item) => {
            const key = `${item.targetType}:${item.targetId}`;
            const busy = busyKey === key;
            /* Content the author deleted themselves after it was reported. There
               is nothing left to hide, so only dismissing is offered. */
            const gone = item.preview === null;

            return (
              <li key={key} className="py-4 border-b">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="chip">
                    {t(`moderation.type.${item.targetType}`)}
                  </span>

                  {/* Every distinct reason given, not just the first: two people
                      may object to the same post for different reasons, and which
                      ones they are changes the decision. */}
                  {item.reasons.map((reason) => (
                    <span key={reason} className="chip">
                      {t(`community.reportReason.${reason}`)}
                    </span>
                  ))}

                  {item.reportCount > 1 && (
                    <span className="text-sm font-semibold text-danger">
                      {item.reportCount} {t("moderation.reports")}
                    </span>
                  )}

                  {item.hidden && (
                    <span className="chip chip-on">{t("moderation.hidden")}</span>
                  )}
                  {item.status === "resolved" && !item.hidden && (
                    <span className="text-micro text-faint">{t("moderation.resolved")}</span>
                  )}

                  <span className="text-micro text-faint ml-auto">
                    {formatWhen(item.lastReportedAt)}
                  </span>
                </div>

                <p className="text-xs text-muted mt-2">
                  {item.authorName ?? t("moderation.unknownAuthor")}
                </p>

                {/* The content itself. `whitespace-pre-wrap` because an abusive
                    post is often abusive in its line breaks too, and an admin
                    should see what students saw. */}
                {gone ? (
                  <p className="mt-1.5 text-sm text-faint italic">
                    {t("moderation.contentGone")}
                  </p>
                ) : (
                  <p
                    className="mt-1.5 text-sm leading-relaxed whitespace-pre-wrap"
                    style={item.hidden ? { opacity: 0.55 } : undefined}
                  >
                    {item.preview}
                  </p>
                )}

                {/* What a reported reply was replying to. A sentence can be
                    innocuous alone and abusive under a particular post. */}
                {item.targetType === "comment" && item.parentPreview && (
                  <p className="text-xs text-faint mt-1.5 truncate">
                    {t("moderation.inReplyTo")}: {item.parentPreview}
                  </p>
                )}

                {item.details.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {item.details.map((detail, index) => (
                      <li key={index} className="text-xs text-muted">
                        {/* No reporter name. Who reported something is not an
                            admin's business for a first decision, and a queue
                            that shows it invites acting on the person. */}
                        “{detail}”
                      </li>
                    ))}
                  </ul>
                )}

                <div className="mt-3 flex flex-wrap gap-2">
                  {item.hidden ? (
                    <button
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => void act(item, "unhide")}
                    >
                      {busy ? "…" : t("moderation.restore")}
                    </button>
                  ) : (
                    !gone && (
                      <button
                        className="btn btn-sm text-danger"
                        disabled={busy}
                        onClick={() => setToHide(item)}
                      >
                        {t("moderation.hide")}
                      </button>
                    )
                  )}

                  {item.status === "open" && (
                    <button
                      className="btn btn-sm"
                      disabled={busy}
                      onClick={() => void act(item, "dismiss")}
                    >
                      {busy ? "…" : t("moderation.dismiss")}
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {toHide && (
        <ConfirmDialog
          title={t(
            toHide.targetType === "post"
              ? "moderation.confirmHidePost"
              : "moderation.confirmHideComment",
          )}
          body={
            <>
              <span className="block text-foreground">{toHide.preview}</span>
              <span className="block mt-2">{t("moderation.confirmHideBody")}</span>
            </>
          }
          confirmLabel={t("moderation.hide")}
          cancelLabel={t("admin.cancel")}
          danger
          busy={busyKey === `${toHide.targetType}:${toHide.targetId}`}
          onConfirm={() => void act(toHide, "hide")}
          onCancel={() => setToHide(null)}
        />
      )}
    </section>
  );
}
