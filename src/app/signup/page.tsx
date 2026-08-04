"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { SAT } from "@/data/exams";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { SuccessTick } from "@/components/illustrations";
import { Modal } from "@/components/motion";

const STEPS = 3;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export default function SignupPage() {
  const { t, tx } = useI18n();
  const { signUp, ready, accounts } = useApp();
  const router = useRouter();

  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [grade, setGrade] = useState("11");
  const [targetScore, setTargetScore] = useState(1400);
  const [pin, setPin] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const strength = useMemo(() => {
    let score = 0;
    if (pin.length >= 4) score += 1;
    if (pin.length >= 8) score += 1;
    if (/[^0-9]/.test(pin) && /[0-9]/.test(pin)) score += 1;
    return score; // 0–3
  }, [pin]);

  function validate(current: number): string | null {
    if (current === 0) {
      if (name.trim().length < 2) return t("signup.errName");
      if (!EMAIL_RE.test(email.trim())) return t("signup.errEmail");
      return null;
    }
    // Step 2 is a slider with a valid default, so there's nothing to reject.
    if (current === 1) return null;
    if (pin.length < 4) return t("auth.pinShort");
    if (pin !== confirm) return t("signup.errPinMatch");
    return null;
  }

  function next() {
    const problem = validate(step);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setStep((s) => Math.min(STEPS - 1, s + 1));
  }

  function back() {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  }

  async function submit() {
    const problem = validate(2);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    const result = await signUp({ name, email, grade, pin, targetScore });
    setBusy(false);
    if (!result.ok) {
      setError(result.error === "nameTaken" ? t("auth.nameTaken") : t("auth.pinShort"));
      setStep(0);
      return;
    }
    setDone(true);
  }

  const stepTitles = [t("signup.s1"), t("signup.s2"), t("signup.s3")];

  return (
    <div className="max-w-md mx-auto pt-12 pb-20">
      <p className="label-xs fade-in">
        {t("signup.step")} {step + 1} {t("signup.of")} {STEPS}
      </p>
      <h1 className="display fade-up mt-3 text-[2rem]">{stepTitles[step]}</h1>

      {/* step rules */}
      <div className="mt-7 flex gap-1.5">
        {stepTitles.map((title, i) => (
          <span
            key={title}
            className="h-[2px] flex-1 rounded-full transition-colors duration-300"
            style={{ background: i <= step ? "var(--foreground)" : "var(--line)" }}
          />
        ))}
      </div>

      <div className="mt-10">
        {/* -------- step 1: identity -------- */}
        {step === 0 && (
          <div key="s0" className="space-y-6 fade-in">
            <div>
              <label className="label" htmlFor="name">
                {t("auth.name")}
              </label>
              <input
                id="name"
                className="field"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aisha Nurlanova"
                autoComplete="name"
              />
            </div>
            <div>
              <label className="label" htmlFor="email">
                {t("signup.email")}
              </label>
              <input
                id="email"
                type="email"
                className="field"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="aisha@example.com"
                autoComplete="email"
              />
            </div>
            <div>
              <p className="label">{t("signup.grade")}</p>
              <div className="flex flex-wrap gap-2">
                {["9", "10", "11", "12", "grad"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setGrade(option)}
                    className={`chip ${grade === option ? "chip-on" : ""}`}
                  >
                    {option === "grad" ? t("signup.graduate") : option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* -------- step 2: goal -------- */}
        {step === 1 && (
          <div key="s1" className="space-y-8 fade-in">
            <div>
              <label className="label" htmlFor="target">
                {t("signup.targetScore")} · {tx(SAT.name)}
              </label>
              <p className="num text-5xl font-semibold text-grad leading-none">{targetScore}</p>
              <input
                id="target"
                type="range"
                min={800}
                max={SAT.maxScore}
                step={10}
                value={targetScore}
                onChange={(e) => setTargetScore(Number(e.target.value))}
                className="w-full mt-5"
                style={{ accentColor: "var(--foreground)" }}
              />
              <div className="flex justify-between text-[12px] text-faint">
                <span className="num">800</span>
                <span className="num">{SAT.maxScore}</span>
              </div>
              <p className="mt-4 text-[13px] text-muted">{t("signup.scoreHint")}</p>
            </div>
          </div>
        )}

        {/* -------- step 3: PIN -------- */}
        {step === 2 && (
          <div key="s2" className="space-y-6 fade-in">
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
                autoComplete="new-password"
              />
              <div className="mt-2.5 flex items-center gap-3">
                <div className="flex-1 flex gap-1">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="h-[2px] flex-1 rounded-full transition-colors duration-300"
                      style={{
                        background:
                          i < strength
                            ? ["var(--danger)", "var(--warning)", "var(--success)"][strength - 1]
                            : "var(--line)",
                      }}
                    />
                  ))}
                </div>
                <span className="text-[12px] text-faint">
                  {[t("signup.weak"), t("signup.ok"), t("signup.strong")][Math.max(0, strength - 1)]}
                </span>
              </div>
            </div>

            <div>
              <label className="label" htmlFor="confirm">
                {t("signup.confirmPin")}
              </label>
              <input
                id="confirm"
                type="password"
                className={`field ${confirm && confirm !== pin ? "field-error" : ""}`}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            <p className="text-[13px] leading-relaxed text-faint">
              {t("signup.localNotice")} {ready && accounts.length === 0 && t("auth.firstAdmin")}
            </p>
          </div>
        )}

        {error && (
          <p className="shake mt-6 text-[13px]" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}

        <div className="mt-10 flex items-center gap-2">
          {step > 0 && (
            <button type="button" className="btn" onClick={back}>
              {t("signup.back")}
            </button>
          )}
          {step < STEPS - 1 ? (
            <button type="button" className="btn btn-primary flex-1" onClick={next}>
              {t("signup.next")}
            </button>
          ) : (
            <button
              type="button"
              className="btn btn-primary flex-1"
              disabled={busy}
              onClick={submit}
            >
              {busy ? "…" : t("signup.finish")}
            </button>
          )}
        </div>
      </div>

      <p className="mt-12 pt-6 border-t text-[13px] text-muted">
        {t("auth.haveAccount")}{" "}
        <Link href="/login" className="link">
          {t("auth.signIn")}
        </Link>
      </p>

      <Modal open={done} onClose={() => router.push("/")}>
        <div className="panel p-8 text-center" style={{ boxShadow: "var(--overlay)" }}>
          <SuccessTick className="mx-auto" size={48} />
          <h2 className="display mt-6 text-[1.5rem]">{t("signup.welcome")}</h2>
          <p className="mt-2 text-[13px] text-muted">
            {name} · {tx(SAT.name)} · {t("home.targetScore")}{" "}
            <span className="num">{targetScore}</span>
          </p>
          <button className="btn btn-primary w-full mt-7" onClick={() => router.push("/practice")}>
            {t("practice.start")}
          </button>
          <button className="btn btn-ghost btn-sm w-full mt-2" onClick={() => router.push("/")}>
            {t("nav.home")}
          </button>
        </div>
      </Modal>
    </div>
  );
}
