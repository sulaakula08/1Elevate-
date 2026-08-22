"use client";

import { getSubject, subjectColor } from "@/data/exams";
import type { Analytics } from "@/lib/analytics";
import { asDuration, asPercent, fill } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { Delta, useInView } from "./primitives";

/**
 * Math against Reading & Writing.
 *
 * The first pass answered this with fourteen table rows in two columns and left
 * the reader to do the comparing. The verdict now leads — which half is holding
 * the score back, and by how much — and the evidence is drawn as one mirrored
 * comparison: each measure on its own row, the two sections growing out from a
 * shared centre, so "which is bigger" is a glance rather than a subtraction.
 *
 * Three measures are drawn, because they are the three that answer *why*: what
 * the section is worth, how often the student is right, and how they do when the
 * questions get hard. Everything else — volume, pace, strongest and weakest
 * domain — sits underneath in one line per section, where it belongs.
 */
export function SectionBalance({ analytics }: { analytics: Analytics }) {
  const { t, tx } = useI18n();
  const { subjects, estimate, period } = analytics;
  const [ref, seen] = useInView<HTMLDivElement>();

  /** Left is the first section in exam order, so the sides never swap about. */
  const sides = subjects.map((report) => {
    const section = estimate.subjects.find((s) => s.subjectId === report.subjectId);
    return {
      report,
      section,
      name: tx(getSubject(report.subjectId)?.name) || report.subjectId,
      tone: subjectColor(report.subjectId),
    };
  });

  const scored = sides.filter((side) => side.section?.score !== undefined && side.section?.score !== null);
  const verdict = (() => {
    if (scored.length === 0) return null;
    if (scored.length === 1) {
      return {
        head: fill(t("pg.verdictOne"), { subject: scored[0].name }),
        body: null,
      };
    }
    const ordered = [...scored].sort(
      (a, b) => (b.section?.score ?? 0) - (a.section?.score ?? 0),
    );
    const gap = (ordered[0].section?.score ?? 0) - (ordered[1].section?.score ?? 0);
    if (gap < 30) {
      return {
        head: t("pg.verdictEvenHead"),
        body: fill(t("pg.verdictEvenBody"), { gap }),
      };
    }
    return {
      head: fill(t("pg.verdictCarryHead"), { weak: ordered[1].name }),
      body: fill(t("pg.verdictCarryBody"), { strong: ordered[0].name, gap }),
    };
  })();

  /** Each row is one measure, drawn on a scale both sections share. */
  const rows = [
    {
      key: t("pg.rowEstimate"),
      note: t("pg.sectionScale"),
      values: sides.map((side) =>
        side.section?.score == null
          ? null
          : { share: (side.section.score - 200) / 600, label: String(side.section.score) },
      ),
    },
    {
      key: t("pg.colAccuracy"),
      note: fill(t("pg.rowAllTime"), { count: "" }).trim(),
      values: sides.map((side) =>
        side.report.accuracy === null
          ? null
          : { share: side.report.accuracy, label: asPercent(side.report.accuracy) },
      ),
    },
    {
      key: t("pg.colHard"),
      note: t("pg.rowHardNote"),
      values: sides.map((side) =>
        side.report.hard.accuracy === null
          ? null
          : {
              share: side.report.hard.accuracy,
              label: asPercent(side.report.hard.accuracy),
            },
      ),
    },
  ];

  return (
    <div ref={ref}>
      {verdict && (
        <div className="pg-verdict">
          <p className="pg-verdict-head">{verdict.head}</p>
          {verdict.body && <p className="pg-verdict-body">{verdict.body}</p>}
        </div>
      )}

      <div className="pg-versus">
        <div className="pg-versus-heads">
          {sides.map((side, index) => (
            <span
              key={side.report.subjectId}
              className="pg-versus-head"
              data-side={index === 0 ? "left" : "right"}
              style={{ ["--tone" as string]: side.tone }}
            >
              <span className="pg-sec-dot" aria-hidden />
              {side.name}
              <Delta value={side.report.change.delta} good="up" />
            </span>
          ))}
        </div>

        {rows.map((row) => (
          <div className="pg-versus-row" key={row.key}>
            <span className="pg-versus-bar" data-side="left">
              <span className="pg-versus-value">{row.values[0]?.label ?? "—"}</span>
              <span className="pg-versus-track">
                <span
                  className="pg-versus-fill"
                  style={{
                    ["--tone" as string]: sides[0].tone,
                    width: seen ? `${(row.values[0]?.share ?? 0) * 100}%` : "0%",
                  }}
                />
              </span>
            </span>

            <span className="pg-versus-label">
              {row.key}
              {row.note && <span className="pg-versus-note">{row.note}</span>}
            </span>

            <span className="pg-versus-bar" data-side="right">
              <span className="pg-versus-track">
                <span
                  className="pg-versus-fill"
                  style={{
                    ["--tone" as string]: sides[1].tone,
                    width: seen ? `${(row.values[1]?.share ?? 0) * 100}%` : "0%",
                  }}
                />
              </span>
              <span className="pg-versus-value">{row.values[1]?.label ?? "—"}</span>
            </span>
          </div>
        ))}

        {/* Everything that qualifies the comparison, one line per section. */}
        <div className="pg-versus-feet">
          {sides.map((side, index) => (
            /* Two lines rather than five: five lines of eleven-pixel grey per
               side was the table coming back in through the footer. */
            <p
              key={side.report.subjectId}
              className="pg-versus-foot"
              data-side={index === 0 ? "left" : "right"}
            >
              <span>
                {[
                  fill(t("pg.footVolume"), {
                    count: side.report.attempts,
                    share: asPercent(side.report.share),
                  }),
                  fill(t("pg.footPace"), { pace: asDuration(side.report.seconds) }),
                  fill(t("pg.footRecent"), {
                    days: period.days,
                    value: asPercent(side.report.change.current),
                  }),
                ].join(" · ")}
              </span>
              <span className="pg-versus-foot-recent">
                {[
                  side.report.best &&
                    fill(t("pg.footBest"), {
                      name: side.report.best.key,
                      value: asPercent(side.report.best.accuracy),
                    }),
                  side.report.worst &&
                    fill(t("pg.footWorst"), {
                      name: side.report.worst.key,
                      value: asPercent(side.report.worst.accuracy),
                    }),
                ]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}
