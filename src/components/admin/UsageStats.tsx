"use client";

import { useCallback, useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";
import { CountUp } from "@/components/motion";

/**
 * How the product is being used, for an admin.
 *
 * Every number here is counted in the database (see /api/admin/stats), so this
 * component only lays out what it is given. It renders nothing at all when the
 * request fails: an admin panel showing zeros is indistinguishable from a real
 * result of zero, and the second is a claim this component cannot make.
 */

type Stats = {
  users: { total: number; week: number; month: number; roles: Record<string, number> };
  active: { week: number; month: number };
  usage: {
    attempts: number;
    attemptsWeek: number;
    byMode: { practice: number; review: number; mock: number };
    mocks: number;
    capped: boolean;
  };
  bank: { questions: number; authors: number };
  feedback: { total: number; open: number };
  days: { day: string; count: number }[];
  joins: { day: string; count: number }[];
};

export function UsageStats() {
  const { t } = useI18n();
  const [stats, setStats] = useState<Stats | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "failed">("loading");

  const load = useCallback(async () => {
    try {
      const response = await apiFetch("/api/admin/stats");
      if (response.status === 403) {
        setState("denied");
        return;
      }
      if (!response.ok) {
        setState("failed");
        return;
      }
      setStats((await response.json()) as Stats);
      setState("ready");
    } catch {
      setState("failed");
    }
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    void load();
  }, [load]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (state === "denied") return null;
  if (state === "failed") {
    return (
      <section className="mt-14">
        <h2 className="display text-[22px]">{t("stats.title")}</h2>
        <p className="notice notice-error mt-4">{t("stats.failed")}</p>
      </section>
    );
  }
  if (state === "loading" || !stats) {
    return (
      <section className="mt-14">
        <h2 className="display text-[22px]">{t("stats.title")}</h2>
        <div className="grid sm:grid-cols-4 gap-3 mt-5">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="skeleton h-20 rounded-xl" />
          ))}
        </div>
      </section>
    );
  }

  const modeTotal =
    stats.usage.byMode.practice + stats.usage.byMode.review + stats.usage.byMode.mock;

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="display text-[22px]">{t("stats.title")}</h2>
        <p className="text-[13px] text-muted">{t("stats.sub")}</p>
      </div>

      {/* ---------------- people ---------------- */}
      <dl className="mt-5 border-t border-b grid grid-cols-2 sm:grid-cols-4">
        <Figure label={t("stats.users")} value={stats.users.total} />
        <Figure label={t("stats.joinedWeek")} value={stats.users.week} accent />
        <Figure label={t("stats.activeWeek")} value={stats.active.week} />
        <Figure label={t("stats.activeMonth")} value={stats.active.month} />
      </dl>

      {/* ---------------- two 14-day series ---------------- */}
      <div className="grid sm:grid-cols-2 gap-8 mt-8">
        <Series
          label={t("stats.answersPerDay")}
          days={stats.days}
          tone="var(--brand)"
          note={stats.usage.capped ? t("stats.capped") : undefined}
        />
        <Series label={t("stats.joinsPerDay")} days={stats.joins} tone="var(--success)" />
      </div>

      {/* ---------------- what they actually use ---------------- */}
      <div className="mt-10">
        <p className="label-xs">{t("stats.whatTheyUse")}</p>
        <div className="mt-4 space-y-2.5">
          {(
            [
              ["practice", stats.usage.byMode.practice],
              ["review", stats.usage.byMode.review],
              ["mock", stats.usage.byMode.mock],
            ] as const
          ).map(([key, count]) => (
            <div key={key} className="flex items-center gap-3">
              <span className="text-[13.5px] w-24 shrink-0">{t(`progress.mode.${key}`)}</span>
              <span
                className="h-2 rounded-full min-w-[2px]"
                style={{
                  width: `${modeTotal ? Math.max(1, (count / modeTotal) * 100) : 0}%`,
                  background: "var(--brand)",
                }}
              />
              <span className="num text-[12.5px] text-muted ml-auto">
                {count}
                {modeTotal > 0 && (
                  <span className="text-faint"> · {Math.round((count / modeTotal) * 100)}%</span>
                )}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ---------------- everything else worth one number ---------------- */}
      <dl className="mt-9 border-t grid grid-cols-2 sm:grid-cols-4">
        <Figure label={t("stats.answersTotal")} value={stats.usage.attempts} />
        <Figure label={t("stats.answersWeek")} value={stats.usage.attemptsWeek} />
        <Figure label={t("stats.mocksTaken")} value={stats.usage.mocks} />
        <Figure label={t("stats.bankSize")} value={stats.bank.questions} />
      </dl>

      <p className="mt-5 text-[13px] leading-relaxed text-faint">
        {t("stats.rolesLine")}: {stats.users.roles.student ?? 0} · {stats.users.roles.admin ?? 0}{" "}
        · {stats.users.roles.owner ?? 0}. {t("stats.authorsLine")}: {stats.bank.authors}.
      </p>
    </section>
  );
}

function Figure({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="py-5 px-1 sm:px-4">
      <dd
        className="num text-2xl font-medium"
        style={accent && value > 0 ? { color: "var(--success)" } : undefined}
      >
        <CountUp value={value} />
      </dd>
      <dt className="text-[12.5px] text-muted mt-1">{label}</dt>
    </div>
  );
}

/** Fourteen days as bars. Same shape as the student's own activity chart. */
function Series({
  label,
  days,
  tone,
  note,
}: {
  label: string;
  days: { day: string; count: number }[];
  tone: string;
  note?: string;
}) {
  const peak = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <p className="label-xs">{label}</p>
        <span className="num text-[12px] text-faint ml-auto">{total}</span>
      </div>
      <div className="mt-4 flex items-end gap-1 h-20">
        {days.map((day) => (
          <div
            key={day.day}
            className="flex-1 rounded-[2px] transition-[height] duration-500"
            title={`${day.day}: ${day.count}`}
            style={{
              height: `${Math.max(day.count ? 8 : 3, (day.count / peak) * 100)}%`,
              background: day.count ? tone : "var(--line)",
            }}
          />
        ))}
      </div>
      {note && <p className="text-[11.5px] text-faint mt-2">{note}</p>}
    </div>
  );
}
