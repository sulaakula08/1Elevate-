"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";
import { EmptyState } from "@/components/ui";

/**
 * What students have written in, for an admin.
 *
 * The read policy decides what arrives here: an admin gets everyone's messages,
 * a student only their own. That means this component cannot leak anything by
 * being rendered in the wrong place — but it is still only mounted on the admin
 * page, and it hides itself if what came back is just the reader's own post.
 */

type Item = {
  id: string;
  message: string;
  category: string;
  handled: boolean;
  at: number;
  authorName: string | null;
  authorEmail: string | null;
  mine: boolean;
};

type Filter = "open" | "all";

export function FeedbackInbox() {
  const { t } = useI18n();
  const [items, setItems] = useState<Item[]>([]);
  const [filter, setFilter] = useState<Filter>("open");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/api/feedback");
      if (!response.ok) {
        setError(t("feedback.loadFailed"));
        return;
      }
      const body = (await response.json()) as { items: Item[] };
      setItems(body.items);
      setError(null);
    } catch {
      setError(t("feedback.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [t]);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function setHandled(item: Item, handled: boolean) {
    setBusyId(item.id);
    const response = await apiFetch("/api/feedback", {
      method: "PATCH",
      body: JSON.stringify({ id: item.id, handled }),
    });
    setBusyId(null);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? t("feedback.loadFailed"));
      return;
    }
    // Reflect immediately rather than refetching; the list can be long.
    setItems((previous) =>
      previous.map((row) => (row.id === item.id ? { ...row, handled } : row)),
    );
  }

  const open = useMemo(() => items.filter((item) => !item.handled).length, [items]);
  const shown = filter === "open" ? items.filter((item) => !item.handled) : items;

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="display text-[22px]">{t("feedback.inbox")}</h2>
        <p className="text-[13px] text-muted">
          {items.length} {t("feedback.received")} · {open} {t("feedback.openCount")}
        </p>
        <div className="ml-auto flex gap-2">
          {(["open", "all"] as Filter[]).map((value) => (
            <button
              key={value}
              className={`chip ${filter === value ? "chip-on" : ""}`}
              aria-pressed={filter === value}
              onClick={() => setFilter(value)}
            >
              {t(`feedback.filter.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="notice notice-error mt-4" role="alert">
          {error}
        </p>
      )}

      {loading ? (
        <p className="text-muted mt-6 text-[14px]">{t("common.loading")}</p>
      ) : shown.length === 0 ? (
        <EmptyState>
          {filter === "open" ? t("feedback.allHandled") : t("feedback.noneYet")}
        </EmptyState>
      ) : (
        <ul className="mt-5 border-t">
          {shown.map((item) => (
            <li key={item.id} className="py-4 border-b">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="chip">{t(`feedback.cat.${item.category}`)}</span>
                {/* Who wrote it, so a reply is possible at all. */}
                <span className="text-[13px] min-w-0 truncate">
                  {item.authorName || t("feedback.someone")}
                  {item.authorEmail && (
                    <span className="text-faint"> · {item.authorEmail}</span>
                  )}
                </span>
                <span className="text-[12px] text-faint">
                  {new Date(item.at).toLocaleDateString()}
                </span>
                <button
                  className="btn btn-sm ml-auto shrink-0"
                  disabled={busyId === item.id}
                  onClick={() => void setHandled(item, !item.handled)}
                >
                  {busyId === item.id
                    ? "…"
                    : item.handled
                      ? t("feedback.reopen")
                      : t("feedback.markHandled")}
                </button>
              </div>
              <p
                className="mt-2.5 text-[14.5px] leading-relaxed whitespace-pre-wrap"
                style={item.handled ? { opacity: 0.55 } : undefined}
              >
                {item.message}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
