"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useI18n } from "@/lib/i18n";
import { MIN_PASSWORD, updatePassword } from "@/lib/auth";
import { Logo } from "@/components/Logo";

/**
 * Where the "reset password" email lands.
 *
 * Supabase turns the link's fragment into a recovery session automatically
 * (detectSessionInUrl is on in the browser client), so by the time this renders
 * the visitor is already authenticated well enough to set a new password — and
 * only to do that. No token handling is needed here.
 */
export default function ResetPage() {
  const { t } = useI18n();
  const router = useRouter();

  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (password.length < MIN_PASSWORD) return;

    setBusy(true);
    setError(null);
    const outcome = await updatePassword(password);
    setBusy(false);

    if (!outcome.ok) {
      // The usual cause is an expired or already-used link.
      setError(t("auth.err.resetExpired"));
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/"), 1200);
  }

  return (
    <div className="max-w-md mx-auto py-12 sm:py-16">
      <div className="panel p-7 sm:p-8">
        <Logo />
        <h1 className="display mt-6 text-[26px]">{t("auth.resetTitle")}</h1>

        {done ? (
          <p className="notice notice-ok mt-5">{t("auth.resetDone")}</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
            <label className="block">
              <span className="label">{t("auth.newPassword")}</span>
              <input
                className="field"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                minLength={MIN_PASSWORD}
                autoFocus
                required
              />
            </label>

            {error && (
              <p className="notice notice-error" role="alert">
                {error}
              </p>
            )}

            <button
              type="submit"
              className="btn btn-primary btn-lg w-full"
              disabled={busy || password.length < MIN_PASSWORD}
            >
              {busy ? t("auth.working") : t("auth.savePassword")}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
