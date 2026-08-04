"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";

export default function LoginPage() {
  const { t } = useI18n();
  const { signIn, accounts, ready } = useApp();
  const router = useRouter();
  const [handle, setHandle] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const result = await signIn(handle, pin);
    setBusy(false);
    if (result.ok) {
      router.push("/");
      return;
    }
    setError(t("auth.wrongPin"));
  }

  return (
    <div className="max-w-sm mx-auto pt-16 pb-20">
      <h1 className="display fade-up text-[2rem]">{t("auth.signIn")}</h1>
      <p className="fade-in mt-3 text-[15px] text-muted">{t("app.tagline")}</p>

      <form onSubmit={submit} className="mt-10 space-y-6">
        <div>
          <label className="label" htmlFor="handle">
            {t("auth.name")} / {t("signup.email")}
          </label>
          <input
            id="handle"
            className="field"
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            autoComplete="username"
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="pin">
            {t("auth.pin")}
          </label>
          <input
            id="pin"
            type="password"
            className="field"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoComplete="current-password"
            required
          />
        </div>

        {error && (
          <p className="shake text-[13px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <button className="btn btn-primary w-full" disabled={busy || !handle.trim()}>
          {busy ? "…" : t("auth.signIn")}
        </button>
      </form>

      {ready && accounts.length > 0 && (
        <div className="mt-8 pt-6 border-t">
          <p className="label-xs">{t("auth.profilesHere")}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {accounts.map((profile) => (
              <button
                key={profile.id}
                type="button"
                className="chip"
                onClick={() => setHandle(profile.name)}
              >
                {profile.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className="mt-8 text-[13px] text-muted">
        {t("auth.noAccount")}{" "}
        <Link href="/signup" className="link">
          {t("auth.signUp")}
        </Link>
      </p>
    </div>
  );
}
