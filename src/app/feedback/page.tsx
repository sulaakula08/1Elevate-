"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";

/** Categories the form offers. Free text carries the meaning; this is for sorting. */
const CATEGORIES = ["bug", "content", "idea", "other"] as const;
type Category = (typeof CATEGORIES)[number];

type Item = {
  id: string;
  message: string;
  category: string;
  handled: boolean;
  at: number;
  mine: boolean;
};

export default function FeedbackPage() {
  return (
    <RequireAccount>
      <FeedbackInner />
    </RequireAccount>
  );
}

function FeedbackInner() {
  const { t } = useI18n();
  const [category, setCategory] = useState<Category>("bug");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [mine, setMine] = useState<Item[]>([]);

  /** The student's own messages, so sending does not feel like posting into a void. */
  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/api/feedback");
      if (!response.ok) return;
      const body = (await response.json()) as { items: Item[] };
      setMine(body.items.filter((item) => item.mine));
    } catch {
      // Offline: the form still works, the list simply stays empty.
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setError(null);
    const response = await apiFetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({ message: message.trim(), category }),
    });
    setSending(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? t("feedback.failed"));
      return;
    }

    setMessage("");
    setSent(true);
    void load();
  }

  return (
    <div className="max-w-2xl mx-auto pb-16">
      <PageTitle sub={t("feedback.sub")}>{t("feedback.title")}</PageTitle>

      <form onSubmit={submit} className="panel p-6 space-y-5">
        <div>
          <label className="label">{t("feedback.about")}</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {CATEGORIES.map((value) => (
              <button
                key={value}
                type="button"
                className={`chip ${category === value ? "chip-on" : ""}`}
                aria-pressed={category === value}
                onClick={() => setCategory(value)}
              >
                {t(`feedback.cat.${value}`)}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="label" htmlFor="message">
            {t("feedback.message")}
          </label>
          <textarea
            id="message"
            className="field min-h-32"
            value={message}
            maxLength={4000}
            placeholder={t("feedback.placeholder")}
            onChange={(e) => {
              setMessage(e.target.value);
              setSent(false);
            }}
          />
          <p className="num text-[11.5px] text-faint mt-1.5">{message.trim().length} / 4000</p>
        </div>

        {error && (
          <p className="notice notice-error" role="alert">
            {error}
          </p>
        )}
        {sent && !error && <p className="notice notice-ok">{t("feedback.thanks")}</p>}

        <div className="flex items-center gap-3">
          <button className="btn btn-primary" disabled={sending || !message.trim()}>
            {sending ? t("feedback.sending") : t("feedback.send")}
          </button>
          <p className="text-[12.5px] text-muted">{t("feedback.privacy")}</p>
        </div>
      </form>

      <section className="mt-12">
        <p className="label-xs">{t("feedback.yours")}</p>
        {mine.length === 0 ? (
          <EmptyState>{t("feedback.none")}</EmptyState>
        ) : (
          <ul className="mt-4 border-t">
            {mine.map((item) => (
              <li key={item.id} className="py-4 border-b">
                <div className="flex items-center gap-2.5">
                  <span className="chip">{t(`feedback.cat.${item.category}`)}</span>
                  <span className="text-[12px] text-faint">
                    {new Date(item.at).toLocaleDateString()}
                  </span>
                  {/* Being told it was read is most of what sending feedback is for. */}
                  {item.handled && (
                    <span
                      className="badge ml-auto"
                      style={{ ["--tone" as string]: "var(--success)" }}
                    >
                      {t("feedback.handled")}
                    </span>
                  )}
                </div>
                <p className="mt-2 text-[14px] leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
