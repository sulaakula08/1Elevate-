"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";
import { ConfirmDialog } from "@/components/ui";

/**
 * Closing an account.
 *
 * Two gates, and they guard different things. Typing the name defeats the
 * misclick — you cannot arrive here by pressing the wrong thing twice, because
 * the second press requires reading your own name and reproducing it. The
 * dialog then states the consequence, which typing a name does not: what is
 * about to be destroyed, and that there is no undo.
 *
 * The name is checked again in the database. That check is the one that
 * matters — this component is not the only way to reach the endpoint — and this
 * one exists so the button can be disabled rather than to be relied upon.
 */
export function DangerZone({ name }: { name: string }) {
  const { t } = useI18n();
  const { signOut } = useApp();
  const router = useRouter();

  const [typed, setTyped] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Exact, including case. A name is short and it is on screen directly above.
  const matches = typed === name;

  async function destroy() {
    setBusy(true);
    setError(null);
    try {
      const response = await apiFetch("/api/profile", {
        method: "DELETE",
        body: JSON.stringify({ confirmName: typed }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        setError(body.error ?? t("danger.failed"));
        setBusy(false);
        setConfirming(false);
        return;
      }
      // The account is gone; the session in this browser is now a token for
      // nothing. Signing out clears it and everything cached under it before
      // the landing page is reached.
      signOut();
      router.replace("/");
    } catch {
      setError(t("danger.failed"));
      setBusy(false);
      setConfirming(false);
    }
  }

  return (
    <section className="danger-zone" aria-labelledby="danger-heading">
      <h2 id="danger-heading" className="danger-title">
        {t("danger.title")}
      </h2>
      <p className="danger-body">{t("danger.body")}</p>

      <ul className="danger-list">
        <li>{t("danger.itemProgress")}</li>
        <li>{t("danger.itemCommunity")}</li>
        <li>{t("danger.itemLogin")}</li>
      </ul>
      <p className="danger-body">{t("danger.keepsNote")}</p>

      <label className="danger-field">
        <span className="label">{t("danger.typeName")}</span>
        <input
          className="field"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          placeholder={name}
          autoComplete="off"
          spellCheck={false}
          aria-describedby="danger-hint"
        />
      </label>
      <p id="danger-hint" className="danger-hint">
        {t("danger.hint")}
      </p>

      {error && (
        <p className="notice notice-error mt-3" role="alert">
          {error}
        </p>
      )}

      <button
        type="button"
        className="btn btn-sm danger-action mt-3"
        disabled={!matches || busy}
        onClick={() => setConfirming(true)}
      >
        {busy ? t("danger.deleting") : t("danger.action")}
      </button>

      {confirming && (
        <ConfirmDialog
          title={t("danger.confirmTitle")}
          body={t("danger.confirmBody")}
          confirmLabel={t("danger.action")}
          danger
          busy={busy}
          onConfirm={() => void destroy()}
          onCancel={() => setConfirming(false)}
        />
      )}
    </section>
  );
}
