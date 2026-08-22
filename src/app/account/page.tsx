"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { SAT, getSubject, subjectColor, subjectColorSoft } from "@/data/exams";
import { useApp } from "@/lib/app-state";
import { uploadAvatar } from "@/lib/avatars";
import { useI18n } from "@/lib/i18n";
import { isFullMock } from "@/lib/analytics";
import {
  bySubject,
  medianSeconds,
  overall,
  pct,
  recentActivity,
  scoreStanding,
  streak,
} from "@/lib/stats";
import { CountUp, ProgressBar } from "@/components/motion";
import { RequireAccount } from "@/components/ui";
import { DangerZone } from "@/components/account/DangerZone";

export default function AccountPage() {
  return (
    <RequireAccount>
      <Profile />
    </RequireAccount>
  );
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

function Profile() {
  const { t, tx } = useI18n();
  const { account, data, signOut, updateAccount } = useApp();
  const router = useRouter();
  const [target, setTarget] = useState(account!.targetScore);

  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(account!.name);
  const photoInput = useRef<HTMLInputElement>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState<string | null>(null);

  /**
   * A blank name is not a name.
   *
   * The rail, every post header and the initials badge all key off this, and an
   * empty string turns each of them into a gap — so the edit is simply refused
   * and the field closes on what was there before.
   */
  function commitName() {
    const next = nameDraft.trim().slice(0, 80);
    setEditingName(false);
    if (!next || next === account!.name) return;
    updateAccount({ name: next });
  }

  async function pickPhoto(file: File) {
    setPhotoBusy(true);
    setPhotoError(null);
    try {
      const url = await uploadAvatar(file);
      updateAccount({ avatarUrl: url });
    } catch (error) {
      setPhotoError(error instanceof Error ? error.message : "Could not upload that image.");
    } finally {
      setPhotoBusy(false);
    }
  }

  const stats = overall(data.attempts);
  const days = streak(data.attempts);
  const pace = medianSeconds(data.attempts);
  /*
   * Full-length sittings only, the same rule /progress and the dashboard use.
   * A shortened mock scored on the 400–1600 scale is not comparable with a
   * whole exam, and three screens quoting three different "latest scores" for
   * one student is worse than any of them being slightly out of date.
   */
  const standing = scoreStanding(data.mocks.filter(isFullMock), account!.targetScore);
  const subjects = bySubject(data.attempts).filter((b) => b.total >= 3);
  const strongest = subjects.reduce<(typeof subjects)[number] | null>(
    (top, b) => (!top || b.accuracy > top.accuracy ? b : top),
    null,
  );
  const weakest = subjects.reduce<(typeof subjects)[number] | null>(
    (low, b) => (!low || b.accuracy < low.accuracy ? b : low),
    null,
  );
  // Fourteen days is enough to read a rhythm without turning the profile into
  // the progress page, which owns the long view.
  const fortnight = recentActivity(data.attempts, 14);
  const peak = Math.max(1, ...fortnight.map((d) => d.count));

  const gap = standing ? account!.targetScore - standing.latest : null;

  return (
    <div className="container-read pb-20">
      {/* ---------------- identity ---------------- */}
      <header className="flex items-start gap-4 fade-up">
        {/* The picture is the control: pressing the thing you want to replace is
            what every account screen has taught people to expect.

            The badge on its corner is always drawn, never on hover. A hover-only
            affordance does not exist on a touchscreen at all, and that is where
            most of this is read — so the only clue that the picture could be
            changed was invisible to half the people looking at it. */}
        <button
          type="button"
          className="acc-avatar"
          onClick={() => photoInput.current?.click()}
          disabled={photoBusy}
          aria-label={t("account.changePhoto")}
          title={t("account.changePhoto")}
        >
          {account!.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={account!.avatarUrl} alt="" />
          ) : (
            <span className="acc-avatar-initials" aria-hidden>
              {initials(account!.name)}
            </span>
          )}
          <span className="acc-avatar-badge" aria-hidden>
            {photoBusy ? (
              "…"
            ) : (
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                <path
                  d="M4 8.5h3l1.4-2h7.2L17 8.5h3v10H4v-10Z"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinejoin="round"
                />
                <circle cx="12" cy="13" r="3.1" stroke="currentColor" strokeWidth="1.8" />
              </svg>
            )}
          </span>
        </button>
        <input
          ref={photoInput}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            // Cleared immediately so choosing the same file twice still fires.
            e.target.value = "";
            if (file) void pickPhoto(file);
          }}
        />

        <div className="min-w-0 pt-1">
          {editingName ? (
            <form
              className="flex flex-wrap items-center gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                commitName();
              }}
            >
              <input
                className="field max-w-56"
                value={nameDraft}
                autoFocus
                maxLength={80}
                onChange={(e) => setNameDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Escape") setEditingName(false);
                }}
                aria-label={t("account.yourName")}
              />
              <button className="btn btn-sm btn-primary" type="submit">
                {t("common.save")}
              </button>
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setEditingName(false)}
              >
                {t("admin.cancel")}
              </button>
            </form>
          ) : (
            <h1 className="display text-h1 leading-tight truncate flex items-center gap-2">
              <span className="truncate">{account!.name}</span>
              <button
                type="button"
                className="acc-rename"
                onClick={() => {
                  setNameDraft(account!.name);
                  setEditingName(true);
                }}
                title={t("account.renameLabel")}
              >
                <svg viewBox="0 0 24 24" width="14" height="14" fill="none" aria-hidden>
                  <path
                    d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17v3Z"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinejoin="round"
                  />
                </svg>
                {t("account.renameVerb")}
              </button>
            </h1>
          )}
          <p className="mt-1 text-sm text-muted truncate">{account!.email || "—"}</p>
          {photoError && (
            <p className="mt-1.5 text-sm text-danger" role="alert">
              {photoError}
            </p>
          )}
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span
              className="chip"
              style={{
                ["--tone" as string]:
                  account!.role === "owner"
                    ? "var(--s-rose)"
                    : account!.role === "admin"
                      ? "var(--s-violet)"
                      : "var(--line-strong)",
              }}
            >
              {account!.role}
            </span>
            {days > 0 && (
              <span className="badge" style={{ ["--tone" as string]: "var(--s-orange)" }}>
                🔥 <span className="num">{days}</span>
              </span>
            )}
            <span className="text-micro text-faint">
              {t("account.memberSince")}{" "}
              {new Date(account!.createdAt).toLocaleDateString(undefined, {
                month: "long",
                year: "numeric",
              })}
            </span>
          </div>
        </div>
      </header>

      {/* ---------------- counters ---------------- */}
      <dl className="mt-9 border-t border-b grid grid-cols-3">
        {[
          { label: t("progress.totalAnswered"), value: stats.total, suffix: "" },
          {
            label: t("account.accuracy"),
            value: Math.round(stats.accuracy * 100),
            suffix: "%",
          },
          { label: t("progress.mocksTaken"), value: data.mocks.length, suffix: "" },
        ].map((stat, i) => (
          <div key={stat.label} className={`py-5 px-4 ${i > 0 ? "border-l" : ""}`}>
            <dd className="num text-2xl font-medium">
              <CountUp value={stat.value} suffix={stat.suffix} />
            </dd>
            <dt className="text-micro text-muted mt-1">{stat.label}</dt>
          </div>
        ))}
      </dl>

      {/* ---------------- fourteen-day rhythm ----------------
          A profile that only lists facts about a student says nothing about
          whether they are actually working. This does. */}
      <section className="mt-8">
        <p className="label-xs">{t("progress.last14")}</p>
        <div className="mt-4 flex items-end gap-1 h-14">
          {fortnight.map((day) => (
            <div
              key={day.day}
              className="flex-1 rounded-[2px] transition-[height] duration-500"
              title={`${day.day}: ${day.count}`}
              style={{
                height: `${Math.max(day.count ? 12 : 4, (day.count / peak) * 100)}%`,
                background: day.count ? "var(--brand)" : "var(--line)",
              }}
            />
          ))}
        </div>
      </section>

      {/* ---------------- snapshot ---------------- */}
      {(strongest || pace !== null) && (
        <section className="mt-10">
          <p className="label-xs">{t("account.snapshot")}</p>
          <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
            {strongest && (
              <SubjectCard
                label={t("account.strongest")}
                subjectId={strongest.key}
                name={
                  getSubject(strongest.key)
                    ? tx(getSubject(strongest.key)!.name)
                    : strongest.key
                }
                accuracy={strongest.accuracy}
              />
            )}
            {weakest && weakest.key !== strongest?.key && (
              <SubjectCard
                label={t("account.weakest")}
                subjectId={weakest.key}
                name={
                  getSubject(weakest.key) ? tx(getSubject(weakest.key)!.name) : weakest.key
                }
                accuracy={weakest.accuracy}
              />
            )}
            {pace !== null && (
              <div className="rounded-[var(--radius-sm)] border p-4">
                <p className="label-xs">{t("progress.pace")}</p>
                <p className="num mt-2 text-h2 font-medium">
                  {pace}
                  <span className="text-faint text-sm">s</span>
                </p>
                <p className="text-micro text-faint mt-0.5">{t("progress.paceHint")}</p>
              </div>
            )}
            <Link
              href="/progress"
              className="rounded-[var(--radius-sm)] border p-4 card-hover flex flex-col justify-center"
            >
              <p className="text-sm">{t("nav.progress")}</p>
              <p className="text-micro text-muted mt-1">{t("account.keepGoing")} →</p>
            </Link>
          </div>
        </section>
      )}

      {/* ---------------- the goal ---------------- */}
      <section className="mt-10 pt-8 border-t">
        <div className="flex items-baseline gap-3">
          <label className="label mb-0" htmlFor="target">
            {t("account.goal")}
          </label>
          <span className="num ml-auto text-sm text-faint">
            {SAT.minScore}–{SAT.maxScore}
          </span>
        </div>

        <p className="num mt-3 text-4xl font-medium leading-none">
          {target}
          <span className="text-faint text-lg"> / {SAT.maxScore}</span>
        </p>

        <input
          id="target"
          type="range"
          min={SAT.minScore}
          max={SAT.maxScore}
          step={10}
          value={target}
          onChange={(e) => setTarget(Number(e.target.value))}
          onPointerUp={() => updateAccount({ targetScore: target })}
          onKeyUp={() => updateAccount({ targetScore: target })}
          className="w-full mt-5"
          style={{ accentColor: "var(--brand)" }}
        />

        {standing ? (
          <>
            <div className="mt-5 flex items-baseline gap-3 text-sm">
              <span className="text-muted">{t("progress.latestMock")}</span>
              <span className="num ml-auto font-medium">{standing.latest}</span>
            </div>
            <ProgressBar
              value={standing.latest / Math.max(1, target)}
              tone={standing.latest >= target ? "accent" : "ink"}
              className="mt-2"
            />
            <p className="mt-3 text-sm text-muted">
              {gap !== null && gap > 0 ? (
                <>
                  <span className="num font-medium text-foreground">{gap}</span>{" "}
                  {t("account.goalGap")}
                </>
              ) : (
                t("account.goalReached")
              )}
            </p>
          </>
        ) : (
          <p className="mt-5 text-sm text-muted">{t("account.goalNoMock")}</p>
        )}

        <p className="mt-4 text-micro leading-relaxed text-faint">{t("account.goalHint")}</p>
      </section>

      {/* ---------------- study details ---------------- */}
      <dl className="mt-10 pt-8 border-t space-y-4 text-sm">
        <div className="flex items-baseline gap-4">
          <dt className="text-muted w-32 shrink-0 text-sm">{t("admin.exam")}</dt>
          <dd>{tx(SAT.name)}</dd>
        </div>
        {account!.grade && (
          <div className="flex items-baseline gap-4">
            <dt className="text-muted w-32 shrink-0 text-sm">{t("signup.grade")}</dt>
            <dd>{account!.grade === "grad" ? t("signup.graduate") : account!.grade}</dd>
          </div>
        )}
        <div className="flex items-baseline gap-4">
          <dt className="text-muted w-32 shrink-0 text-sm">{t("progress.streak")}</dt>
          <dd className="num">{days}</dd>
        </div>
      </dl>

      <p className="mt-10 text-sm leading-relaxed text-faint">{t("account.cloudNotice")}</p>

      <div className="mt-8 flex gap-2">
        <button className="btn" onClick={() => router.push("/")}>
          {t("common.back")}
        </button>
        <button
          className="btn"
          onClick={() => {
            signOut();
            router.push("/");
          }}
        >
          {t("auth.signOut")}
        </button>
      </div>

      {/* Last on the page on purpose: nothing routine sits below it, so it is
          never something you scroll past on the way to somewhere else. */}
      <DangerZone name={account!.name} />
    </div>
  );
}

/** A subject with its own hue, its accuracy, and nothing else. */
function SubjectCard({
  label,
  subjectId,
  name,
  accuracy,
}: {
  label: string;
  subjectId: string;
  name: string;
  accuracy: number;
}) {
  return (
    <div
      className="card-tone p-4"
      style={{
        ["--tone" as string]: subjectColor(subjectId),
        ["--tone-soft" as string]: subjectColorSoft(subjectId),
      }}
    >
      <p className="label-xs">{label}</p>
      <p className="text-sm mt-2 truncate">{name}</p>
      <div className="flex items-baseline gap-2 mt-1">
        <span className="num text-h3 font-medium">{pct(accuracy)}</span>
      </div>
      <ProgressBar
        value={accuracy}
        tone={accuracy < 0.5 ? "danger" : "accent"}
        className="mt-2"
      />
    </div>
  );
}
