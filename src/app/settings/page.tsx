"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
import { DAILY_GOALS } from "@/lib/storage";
import { ConfirmDialog, PageTitle, RequireAccount } from "@/components/ui";

export default function SettingsPage() {
  return (
    <RequireAccount>
      <SettingsInner />
    </RequireAccount>
  );
}

function SettingsInner() {
  const { t } = useI18n();
  const router = useRouter();
  const { theme, toggleTheme, signOut, account, data } = useApp();
  const { settings, set, reset } = useSettings();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

  /**
   * Everything this browser holds about the student, as a file they keep.
   *
   * Built and revoked in the same handler: an object URL left alive pins the
   * whole blob in memory for the life of the document, and this one contains
   * their entire history.
   */
  const exportData = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      account: account && {
        name: account.name,
        email: account.email,
        grade: account.grade,
        targetScore: account.targetScore,
      },
      attempts: data.attempts,
      mocks: data.mocks,
      settings,
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `1elevate-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-read pb-16">
      <PageTitle sub={t("settings.sub")}>{t("settings.title")}</PageTitle>

      {/* ---------------- appearance ---------------- */}
      <Group title={t("settings.appearance")}>
        <Row
          title={t("settings.dark")}
          body={t("settings.darkBody")}
          on={theme === "dark"}
          onChange={toggleTheme}
        />
        <Row
          title={t("settings.motion")}
          body={t("settings.motionBody")}
          on={settings.reduceMotion}
          onChange={(on) => set("reduceMotion", on)}
        />
      </Group>

      {/* ---------------- notifications ---------------- */}
      <Group title={t("settings.notifications")}>
        <Row
          title={t("settings.notifyAll")}
          body={t("settings.notifyAllBody")}
          on={settings.notifications}
          onChange={(on) => set("notifications", on)}
        />
      </Group>

      {/* ---------------- SAT exam ---------------- */}
      <Group id="sat-exam" title={t("settings.satExam")}>
        <DateRow
          title={t("settings.satDate")}
          body={t("settings.satDateBody")}
          value={settings.satExamDate}
          onChange={(value) => set("satExamDate", value)}
        />
        <Row
          title={t("settings.showSatCountdown")}
          body={t("settings.showSatCountdownBody")}
          on={settings.showSatCountdown}
          onChange={(on) => set("showSatCountdown", on)}
        />
      </Group>

      {/* ---------------- practice ----------------
          Two preferences that belong to how a person works rather than to how
          the app looks: both were previously buried in the test surface, where
          you had to be mid-session to find them. */}
      <Group title={t("settings.practice")}>
        <Row
          title={t("settings.hideTimer")}
          body={t("settings.hideTimerBody")}
          on={settings.hideTimer}
          onChange={(on) => set("hideTimer", on)}
        />
        <Row
          title={t("settings.showHints")}
          body={t("settings.showHintsBody")}
          on={settings.showHints}
          onChange={(on) => set("showHints", on)}
        />
        <Row
          title={t("settings.autoExplain")}
          body={t("settings.autoExplainBody")}
          on={settings.autoExplain}
          onChange={(on) => set("autoExplain", on)}
        />
      </Group>

      {/* ---------------- daily goal ----------------
          A number, not a switch, so it needs its own control. Fixed steps
          rather than a free field: the useful question is "roughly how much",
          and a text input invites 7 and then a week of missing it by two. */}
      <Group title={t("settings.goal")}>
        <ChoiceRow
          title={t("settings.goalTitle")}
          body={t("settings.goalBody")}
          value={settings.dailyGoal}
          options={DAILY_GOALS.map((n) => ({
            value: n,
            label: n === 0 ? t("settings.goalOff") : String(n),
          }))}
          onChange={(value) => set("dailyGoal", value)}
        />
      </Group>

      {/* ---------------- data ---------------- */}
      <Group title={t("settings.data")}>
        <ActionRow
          title={t("settings.export")}
          body={t("settings.exportBody")}
          action={t("settings.exportAction")}
          onAction={exportData}
        />
        {/* Next to the export button on purpose: someone asking what is held
            about them is one row away from taking a copy of it. */}
        <Link
          href="/privacy"
          className="w-full flex items-start gap-4 py-4 border-b hover:bg-surface-2 transition-colors px-1"
        >
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-medium">{t("settings.privacy")}</span>
            <span className="block text-sm text-muted mt-0.5 leading-relaxed">
              {t("settings.privacyBody")}
            </span>
          </span>
          <span className="text-muted shrink-0" aria-hidden>
            →
          </span>
        </Link>
      </Group>

      {/* ---------------- account ---------------- */}
      <section className="mt-12 pt-8 border-t">
        <p className="label-xs">{t("settings.account")}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/account" className="btn btn-sm">
            {t("nav.profile")}
          </Link>
          <Link href="/feedback" className="btn btn-sm">
            {t("nav.feedback")}
          </Link>
          <button className="btn btn-sm" onClick={reset}>
            {t("settings.resetPrefs")}
          </button>
        </div>

        <div className="mt-8 pt-6 border-t">
          <button
            className="btn btn-sm"
            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            onClick={() => setConfirmSignOut(true)}
          >
            {t("auth.signOut")}
          </button>
        </div>
      </section>

      {confirmSignOut && (
        <ConfirmDialog
          title={t("auth.signOut")}
          body={t("settings.confirmSignOutBody")}
          confirmLabel={t("auth.signOut")}
          danger
          onConfirm={() => {
            setConfirmSignOut(false);
            signOut();
            router.push("/");
          }}
          onCancel={() => setConfirmSignOut(false)}
        />
      )}
    </div>
  );
}

function Group({ id, title, children }: { id?: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="mt-10 first:mt-6 scroll-mt-8">
      <p className="label-xs">{title}</p>
      <div className="mt-3 border-t">{children}</div>
    </section>
  );
}

/**
 * One preference. The whole row is the control — a 44px-tall label beside a
 * 20px switch, where only the switch is clickable, is a target you have to aim
 * at for no reason.
 */
function Row({
  title,
  body,
  on,
  onChange,
}: {
  title: string;
  body: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className="w-full flex items-start gap-4 py-4 border-b text-left hover:bg-surface-2 transition-colors px-1"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted mt-0.5 leading-relaxed">{body}</span>
      </span>
      <span className={`sw ${on ? "sw-on" : ""}`} aria-hidden>
        <span className="sw-knob" />
      </span>
    </button>
  );
}

/**
 * One preference with more than two states.
 *
 * A radio group rather than a select: five short options are all visible at
 * once and are one tap each, where a dropdown hides them behind a press and
 * makes the current value the only thing you can see.
 *
 * Not a `button` wrapper like Row — a row containing several controls cannot
 * itself be one, and nesting buttons is invalid.
 */
function ChoiceRow<T extends number | string>({
  title,
  body,
  value,
  options,
  onChange,
}: {
  title: string;
  body: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="w-full py-4 border-b px-1">
      <p className="text-sm font-medium">{title}</p>
      <p className="text-sm text-muted mt-0.5 leading-relaxed">{body}</p>
      <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label={title}>
        {options.map((option) => {
          const on = option.value === value;
          return (
            <button
              key={String(option.value)}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(option.value)}
              className={`btn btn-sm num ${on ? "btn-primary" : ""}`}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function DateRow({
  title,
  body,
  value,
  onChange,
}: {
  title: string;
  body: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="w-full flex flex-col sm:flex-row sm:items-center gap-3 py-4 border-b px-1">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted mt-0.5 leading-relaxed">{body}</span>
      </span>
      <input
        type="date"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="field num w-full sm:w-auto"
      />
    </label>
  );
}

/** One row whose point is a thing that happens, not a value that persists. */
function ActionRow({
  title,
  body,
  action,
  onAction,
}: {
  title: string;
  body: string;
  action: string;
  onAction: () => void;
}) {
  return (
    <div className="w-full flex items-start gap-4 py-4 border-b px-1">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block text-sm text-muted mt-0.5 leading-relaxed">{body}</span>
      </span>
      <button type="button" className="btn btn-sm shrink-0" onClick={onAction}>
        {action}
      </button>
    </div>
  );
}
