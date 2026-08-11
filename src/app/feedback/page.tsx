"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";
import { MAX_SHOTS, removeShot, uploadShot, type Shot } from "@/lib/shots";
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
  /** Signed links, valid for the hour after the list was loaded. */
  shots?: string[];
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
  const [shots, setShots] = useState<Shot[]>([]);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

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

  /**
   * Uploads happen as the files are chosen, not on send.
   *
   * A photo takes a moment to shrink and post, and doing that inside submit
   * would leave the student looking at a dead button with no idea whether the
   * message went. This way the thumbnail appearing is the progress bar, and by
   * the time they finish typing the upload is long done.
   */
  async function attach(files: FileList) {
    const room = MAX_SHOTS - shots.length;
    if (room <= 0) return;

    setUploading(true);
    setError(null);
    for (const file of [...files].slice(0, room)) {
      try {
        const shot = await uploadShot(file);
        setShots((current) => [...current, shot]);
      } catch {
        setError(t("feedback.shotFailed"));
      }
    }
    setUploading(false);
  }

  function detach(shot: Shot) {
    setShots((current) => current.filter((s) => s.path !== shot.path));
    URL.revokeObjectURL(shot.preview);
    void removeShot(shot.path);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    setError(null);
    const response = await apiFetch("/api/feedback", {
      method: "POST",
      body: JSON.stringify({
        message: message.trim(),
        category,
        shots: shots.map((s) => s.path),
      }),
    });
    setSending(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setError(body.error ?? t("feedback.failed"));
      return;
    }

    setMessage("");
    // The uploads belong to the message now; the previews are what get cleared.
    for (const shot of shots) URL.revokeObjectURL(shot.preview);
    setShots([]);
    setSent(true);
    void load();
  }

  return (
    <div className="container-read pb-16">
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
          <p className="num text-micro text-faint mt-1.5">{message.trim().length} / 4000</p>
        </div>

        {/* Screenshots. Most bug reports are a description of something on
            screen, and the screen says it in one go. */}
        <div>
          <label className="label">{t("feedback.shots")}</label>
          <p className="text-micro text-muted mt-0.5">{t("feedback.shotsBody")}</p>

          {shots.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {shots.map((shot) => (
                <li key={shot.path} className="fb-shot">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={shot.preview} alt="" />
                  <button
                    type="button"
                    className="fb-shot-x"
                    aria-label={t("feedback.shotRemove")}
                    title={t("feedback.shotRemove")}
                    onClick={() => detach(shot)}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}

          <button
            type="button"
            className="btn btn-sm mt-3"
            disabled={uploading || shots.length >= MAX_SHOTS}
            onClick={() => fileInput.current?.click()}
          >
            {uploading ? t("feedback.shotUploading") : t("feedback.shotAdd")}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={(e) => {
              if (e.target.files?.length) void attach(e.target.files);
              e.target.value = "";
            }}
          />
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
          <p className="text-micro text-muted">{t("feedback.privacy")}</p>
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
                  <span className="text-micro text-faint">
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
                <p className="mt-2 text-sm leading-relaxed whitespace-pre-wrap">
                  {item.message}
                </p>
                {item.shots && item.shots.length > 0 && (
                  <ul className="mt-2.5 flex flex-wrap gap-2">
                    {item.shots.map((url) => (
                      <li key={url} className="fb-shot">
                        {/* Opens full size: a thumbnail of a screenshot is not
                            readable, and reading it is the whole point. */}
                        <a href={url} target="_blank" rel="noreferrer">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={url} alt="" />
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
