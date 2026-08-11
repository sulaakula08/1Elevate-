"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { useSettings } from "@/lib/settings";
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
  const { theme, toggleTheme, signOut } = useApp();
  const { settings, set, reset } = useSettings();
  const [confirmSignOut, setConfirmSignOut] = useState(false);

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

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-10 first:mt-6">
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
