"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { MIN_PASSWORD, passwordScore, sendPasswordReset, type AuthErrorCode } from "@/lib/auth";
import { Logo } from "./Logo";

/**
 * One form for both signing in and creating an account.
 *
 * The old flow was a three-step wizard ending in a PIN, and a separate login
 * page that matched a name against localStorage. Both are gone. What is left is
 * the shortest path that still collects what the profile needs: email, password,
 * and — only when creating — a name.
 *
 * Grade and target score are no longer asked up front. They have sensible
 * defaults, they are editable in the profile, and every extra field before the
 * first screen of the product costs sign-ups.
 */

type Mode = "signin" | "signup";

export function AuthForm({ mode }: { mode: Mode }) {
  const { t } = useI18n();
  const router = useRouter();
  const { signIn, signUp, authConfigured } = useApp();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<AuthErrorCode | null>(null);
  /** Set when the account was made but Supabase wants the email confirmed. */
  const [checkEmail, setCheckEmail] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const isSignUp = mode === "signup";
  const strength = passwordScore(password);

  const emailLooksValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const canSubmit =
    !busy &&
    emailLooksValid &&
    password.length >= MIN_PASSWORD &&
    (!isSignUp || name.trim().length >= 2);

  async function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    const outcome = isSignUp
      ? await signUp({ name, email, password, grade: "", targetScore: 1400 })
      : await signIn(email, password);

    setBusy(false);

    if (!outcome.ok) {
      setError(outcome.code);
      return;
    }
    if (outcome.needsConfirmation) {
      setCheckEmail(true);
      return;
    }
    router.push("/");
  }

  async function onForgot() {
    if (!emailLooksValid) {
      setError("invalidEmail");
      return;
    }
    setBusy(true);
    const outcome = await sendPasswordReset(email);
    setBusy(false);
    if (outcome.ok) setResetSent(true);
    else setError(outcome.code);
  }

  /* ---------------- confirmation screen ---------------- */

  if (checkEmail) {
    return (
      <div className="panel p-8 text-center">
        <h1 className="display text-2xl">{t("auth.checkEmailTitle")}</h1>
        <p className="lede mt-3 text-body">{t("auth.checkEmailBody")}</p>
        <p className="num mt-4 text-sm font-medium">{email.trim().toLowerCase()}</p>
        <Link href="/login" className="btn btn-primary mt-7">
          {t("auth.signIn")}
        </Link>
      </div>
    );
  }

  return (
    <div className="panel p-7 sm:p-8">
      <Logo />

      <h1 className="display mt-6 text-h2 sm:text-h1">
        {t(isSignUp ? "auth.signUpTitle" : "auth.signInTitle")}
      </h1>
      <p className="text-muted mt-2 text-sm">
        {t(isSignUp ? "auth.signUpSub" : "auth.signInSub")}
      </p>

      {!authConfigured && (
        <p className="notice notice-warn mt-5">{t("auth.notConfigured")}</p>
      )}

      <form onSubmit={onSubmit} className="mt-6 space-y-4" noValidate>
        {isSignUp && (
          <label className="block">
            <span className="label">{t("auth.name")}</span>
            <input
              className="field"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              autoFocus
              required
            />
          </label>
        )}

        <label className="block">
          <span className="label">{t("auth.email")}</span>
          <input
            className="field"
            type="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            // The browser's own credential manager fills these, which is the
            // single biggest convenience win available here.
            autoComplete="email"
            autoFocus={!isSignUp}
            required
          />
        </label>

        <label className="block">
          <span className="label flex items-center justify-between">
            {t("auth.password")}
            <button
              type="button"
              className="text-micro text-muted hover:text-foreground"
              onClick={() => setShowPassword((v) => !v)}
            >
              {t(showPassword ? "auth.hide" : "auth.show")}
            </button>
          </span>
          <input
            className="field"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isSignUp ? "new-password" : "current-password"}
            minLength={MIN_PASSWORD}
            required
          />
        </label>

        {isSignUp && password.length > 0 && (
          <div className="flex items-center gap-2">
            <div className="strength-track" aria-hidden>
              <div className="strength-fill" data-level={strength} />
            </div>
            <span className="text-micro text-muted">
              {t(
                strength <= 1
                  ? "auth.pwWeak"
                  : strength === 2
                    ? "auth.pwOk"
                    : "auth.pwStrong",
              )}
            </span>
          </div>
        )}

        {error && (
          <p className="notice notice-error" role="alert">
            {t(`auth.err.${error}`)}
            {error === "emailTaken" && (
              <Link href="/login" className="underline ml-1">
                {t("auth.signIn")}
              </Link>
            )}
            {error === "invalidCredentials" && (
              <Link href="/signup" className="underline ml-1">
                {t("auth.signUp")}
              </Link>
            )}
          </p>
        )}

        {resetSent && <p className="notice notice-ok">{t("auth.resetSent")}</p>}

        <button type="submit" className="btn btn-primary btn-lg w-full" disabled={!canSubmit}>
          {busy ? t("auth.working") : t(isSignUp ? "auth.signUp" : "auth.signIn")}
        </button>
      </form>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 text-sm">
        <Link href={isSignUp ? "/login" : "/signup"} className="text-muted hover:text-foreground">
          {t(isSignUp ? "auth.haveAccount" : "auth.noAccount")}
        </Link>
        {!isSignUp && (
          <button
            type="button"
            onClick={onForgot}
            className="text-muted hover:text-foreground"
            disabled={busy}
          >
            {t("auth.forgot")}
          </button>
        )}
      </div>
    </div>
  );
}
