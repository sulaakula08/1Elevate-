"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { apiFetch } from "@/lib/supabase/client";
import { CountUp } from "@/components/motion";
import { ConfirmDialog } from "@/components/ui";

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
  history: { month: string; answers: number; mocks: number; joins: number }[];
};

export function UsageStats() {
  const { t } = useI18n();
  const { account } = useApp();
  const [stats, setStats] = useState<Stats | null>(null);
  const [state, setState] = useState<"loading" | "ready" | "denied" | "failed">("loading");
  const [confirmReset, setConfirmReset] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetNote, setResetNote] = useState<string | null>(null);

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
        <h2 className="display text-h2">{t("stats.title")}</h2>
        <p className="notice notice-error mt-4">{t("stats.failed")}</p>
      </section>
    );
  }
  if (state === "loading" || !stats) {
    return (
      <section className="mt-14">
        <h2 className="display text-h2">{t("stats.title")}</h2>
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

  async function resetStatistics() {
    setResetting(true);
    setResetNote(null);
    const response = await apiFetch("/api/admin/reset", { method: "POST" });
    setResetting(false);
    setConfirmReset(false);

    if (!response.ok) {
      const body = (await response.json().catch(() => ({}))) as { error?: string };
      setResetNote(body.error ?? t("stats.resetFailed"));
      return;
    }
    const body = (await response.json()) as { attempts: number; mocks: number };
    setResetNote(`${t("stats.resetDone")}: ${body.attempts} · ${body.mocks}`);
    // Re-read rather than zeroing locally: the figures must come from the
    // database, including anything written between the click and the answer.
    void load();
  }

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="display text-h2">{t("stats.title")}</h2>
        <p className="text-sm text-muted">{t("stats.sub")}</p>
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
          peakLabel={t("stats.peak")}
          days={stats.days}
          tone="var(--brand)"
          note={stats.usage.capped ? t("stats.capped") : undefined}
        />
        <Series
          label={t("stats.joinsPerDay")}
          peakLabel={t("stats.peak")}
          days={stats.joins}
          tone="var(--success)"
        />
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
              <span className="text-sm w-24 shrink-0">{t(`progress.mode.${key}`)}</span>
              <span
                className="h-2 rounded-[var(--radius-pill)] min-w-[2px]"
                style={{
                  width: `${modeTotal ? Math.max(1, (count / modeTotal) * 100) : 0}%`,
                  background: "var(--brand)",
                }}
              />
              <span className="num text-micro text-muted ml-auto">
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

      <p className="mt-5 text-sm leading-relaxed text-faint">
        {t("stats.rolesLine")}: {stats.users.roles.student ?? 0} · {stats.users.roles.admin ?? 0}{" "}
        · {stats.users.roles.owner ?? 0}. {t("stats.authorsLine")}: {stats.bank.authors}.
      </p>

      {/* ---------------- reset ----------------
          Owner only, matching what reset_statistics() enforces: offering an
          admin a button the database will refuse is a worse experience than not
          offering it. Accounts survive — signups are the one figure a reset must
          not touch. */}
      {account?.role === "owner" && (
        <div className="mt-10 pt-6 border-t">
          <p className="text-sm font-semibold" style={{ color: "var(--danger)" }}>
            {t("stats.resetTitle")}
          </p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted max-w-xl">
            {t("stats.resetBody")}
          </p>
          {resetNote && <p className="notice mt-3">{resetNote}</p>}
          <button
            className="btn btn-sm mt-4"
            style={{ borderColor: "var(--danger)", color: "var(--danger)" }}
            disabled={resetting}
            onClick={() => setConfirmReset(true)}
          >
            {resetting ? "…" : t("stats.resetAction")}
          </button>
        </div>
      )}

      {confirmReset && (
        <ConfirmDialog
          title={t("stats.resetConfirmTitle")}
          body={t("stats.resetConfirmBody")}
          confirmLabel={t("stats.resetAction")}
          danger
          busy={resetting}
          onConfirm={() => void resetStatistics()}
          onCancel={() => setConfirmReset(false)}
        />
      )}

      {/* ---------------- the whole run ---------------- */}
      <div className="mt-12 pt-8 border-t">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h3 className="display text-h3">{t("stats.historyTitle")}</h3>
          <p className="text-sm text-muted">{t("stats.historySub")}</p>
        </div>
        <History
          rows={stats.history}
          labels={{
            month: t("stats.month"),
            answers: t("stats.colAnswers"),
            mocks: t("stats.colMocks"),
            joins: t("stats.colJoins"),
            empty: t("stats.historyEmpty"),
          }}
        />
      </div>
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
      <dt className="text-micro text-muted mt-1">{label}</dt>
    </div>
  );
}

/**
 * Fourteen days as bars, each labelled with its own count and the chart labelled
 * with its peak.
 *
 * Bars alone give shape and nothing else: an admin could see Tuesday was the
 * busiest day but not whether that meant nine answers or nine hundred, which is
 * the difference between a quiet week and a broken one. The peak sits on the
 * highest bar rather than on an axis, so the number is where the eye already is.
 *
 * Which day a bar is was the part the chart never said. The bars are unlabelled
 * — fourteen dates will not fit across half a column — so "the spike is four
 * from the end" had to be counted back by hand, and counted again for the second
 * chart. Hovering any column now names its date outright.
 */
function Series({
  label,
  peakLabel,
  days,
  tone,
  note,
}: {
  label: string;
  /** Copy comes in as a prop: this file lays out numbers, it does not read the dictionary. */
  peakLabel: string;
  days: { day: string; count: number }[];
  tone: string;
  note?: string;
}) {
  const peak = Math.max(1, ...days.map((d) => d.count));
  const total = days.reduce((sum, d) => sum + d.count, 0);
  const peakIndex = days.findIndex((d) => d.count === peak && d.count > 0);
  const [hover, setHover] = useState<number | null>(null);

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <p className="label-xs">{label}</p>
        <span className="num text-micro text-faint ml-auto">{total}</span>
      </div>

      {/*
       * One line above the bars, showing the hovered day and falling back to the
       * peak. Sharing the line rather than adding a floating tooltip keeps the
       * two charts the same height whatever the pointer is doing — a tooltip
       * that overlays the bars would cover the neighbours you are comparing
       * against, which is the whole reason for hovering in the first place.
       * Reserved even when empty, so charts side by side keep their baselines.
       */}
      <p className="num text-2xs mt-3 h-4">
        {hover !== null ? (
          <span style={{ color: "var(--text)" }}>
            {longDate(days[hover].day)}
            <span className="text-faint"> · {days[hover].count}</span>
          </span>
        ) : (
          <span className="text-faint">{peakIndex === -1 ? "" : `${peakLabel} ${peak}`}</span>
        )}
      </p>

      <div className="flex items-end gap-1 h-20" onMouseLeave={() => setHover(null)}>
        {days.map((day, i) => (
          /*
           * The column is the hover target, not the bar. A quiet day is a 3%
           * sliver two pixels tall, which is the hardest thing on the chart to
           * point at and often the one an admin most wants to check.
           *
           * Focusable, and it reports its own date and count: a keyboard reaches
           * the same information, and the native title stays as a fallback for
           * anyone whose pointer arrives without a hover event at all.
           */
          <button
            key={day.day}
            type="button"
            className="flex-1 flex flex-col justify-end h-full cursor-default"
            title={`${longDate(day.day)}: ${day.count}`}
            aria-label={`${longDate(day.day)}: ${day.count}`}
            onMouseEnter={() => setHover(i)}
            onFocus={() => setHover(i)}
            onBlur={() => setHover(null)}
          >
            <span
              className="block rounded-[2px] transition-[height] duration-500"
              style={{
                height: `${Math.max(day.count ? 8 : 3, (day.count / peak) * 100)}%`,
                background: day.count
                  ? i === peakIndex
                    ? tone
                    : `color-mix(in srgb, ${tone} 62%, transparent)`
                  : "var(--line)",
                // The hovered bar goes solid. Losing the peak's own emphasis for
                // as long as the pointer is elsewhere is the right trade: the
                // peak is named in the line above, the hovered day is not.
                opacity: hover === null || hover === i ? 1 : 0.55,
              }}
            />
          </button>
        ))}
      </div>

      {/* One number per bar. Zeroes render as a dash: "0" fourteen times is a
          wall of noise, and the gap is the point. */}
      <div className="flex gap-1 mt-1.5">
        {days.map((day, i) => (
          <span
            key={day.day}
            className="num flex-1 text-center text-2xs tabular-nums"
            style={{ color: hover === i ? "var(--text)" : undefined }}
          >
            <span className={hover === i ? "" : "text-faint"}>
              {day.count > 0 ? day.count : "·"}
            </span>
          </span>
        ))}
      </div>

      {note && <p className="text-micro text-faint mt-2">{note}</p>}
    </div>
  );
}

/**
 * "2026-08-19" as "19 Aug 2026".
 *
 * Built from the parts rather than passed to `new Date(key)`, which reads a
 * bare date string as UTC: east of Greenwich that renders as the day before,
 * so every bar on the chart would be labelled with the wrong date. The keys
 * are made from local time in the stats route, and this reads them back the
 * same way.
 */
function longDate(key: string): string {
  const [year, month, day] = key.split("-").map(Number);
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/**
 * Every month since the first record, newest first — including months where
 * nothing happened, because a gap in the history is information and a list that
 * skips it reads as continuous activity.
 */
function History({
  rows,
  labels,
}: {
  rows: Stats["history"];
  labels: { month: string; answers: string; mocks: string; joins: string; empty: string };
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-muted mt-4">{labels.empty}</p>;
  }

  const peak = Math.max(1, ...rows.map((r) => r.answers));
  const totals = rows.reduce(
    (sum, r) => ({
      answers: sum.answers + r.answers,
      mocks: sum.mocks + r.mocks,
      joins: sum.joins + r.joins,
    }),
    { answers: 0, mocks: 0, joins: 0 },
  );

  return (
    <div className="mt-5 overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="text-left">
            <th className="label-xs font-normal py-2">{labels.month}</th>
            <th className="label-xs font-normal py-2 w-[38%]">{labels.answers}</th>
            <th className="label-xs font-normal py-2 text-right">{labels.mocks}</th>
            <th className="label-xs font-normal py-2 text-right">{labels.joins}</th>
          </tr>
        </thead>
        <tbody>
          {[...rows].reverse().map((row) => (
            <tr key={row.month} className="border-t">
              <td className="num py-2.5 whitespace-nowrap">{monthName(row.month)}</td>
              <td className="py-2.5">
                <span className="flex items-center gap-2">
                  {/* The bar is the comparison, the number is the fact. */}
                  <span
                    className="h-1.5 rounded-[var(--radius-pill)] shrink-0"
                    style={{
                      width: `${(row.answers / peak) * 100}%`,
                      minWidth: row.answers > 0 ? "2px" : "0",
                      background: "var(--brand)",
                    }}
                  />
                  <span className="num text-micro text-muted">{row.answers}</span>
                </span>
              </td>
              <td className="num py-2.5 text-right text-muted">{row.mocks}</td>
              <td className="num py-2.5 text-right text-muted">{row.joins}</td>
            </tr>
          ))}
          <tr className="border-t-2">
            <td className="py-2.5 font-semibold">Σ</td>
            <td className="num py-2.5 font-semibold">{totals.answers}</td>
            <td className="num py-2.5 text-right font-semibold">{totals.mocks}</td>
            <td className="num py-2.5 text-right font-semibold">{totals.joins}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

/** "2026-08" as "Aug 2026" — the raw key is unreadable in a column of twelve. */
function monthName(key: string): string {
  const [year, month] = key.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString(undefined, {
    month: "short",
    year: "numeric",
  });
}
