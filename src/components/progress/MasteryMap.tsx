"use client";

import { useState } from "react";
import { subjectColor, subjectsFor } from "@/data/exams";
import type { Cell, DomainCell } from "@/lib/analytics";
import { RULES, asDuration, asPercent, fill } from "@/lib/analytics";
import { useI18n } from "@/lib/i18n";
import { BANDS, Delta, bandColor } from "./primitives";

/**
 * The mastery map.
 *
 * The first pass drew eight rows of "name, percentage, chip, some squares, and
 * a line of micro text" — every domain the same width, every domain carrying its
 * own paragraph. It was a table that had been told it was a map.
 *
 * This is the map. Each section is a region; inside it, every domain is a block
 * whose *width is its share of the real exam*, so Algebra and Advanced Math are
 * visibly twice the size of Geometry because on the SAT they are. Each block is
 * tinted by how well the student is doing in it and carries one cell per skill,
 * so a section's strengths and weaknesses are a shape before they are a number.
 *
 * The eight paragraphs are gone. Each region has a single detail line: the
 * region's own summary until a cell is hovered or focused, then everything known
 * about that skill. Nothing is clipped, nothing floats, and a phone gets a line
 * of text rather than a popover to dismiss.
 */
export function MasteryMap({
  domains,
  bankReady,
}: {
  domains: DomainCell[];
  bankReady: boolean;
}) {
  const { t, tx } = useI18n();
  const subjects = subjectsFor("sat");
  const measured = domains.some((domain) => domain.attempts > 0);

  return (
    <>
      {!measured && !bankReady && <p className="pg-deck mb-4">{t("pg.bankMissing")}</p>}

      <div className="pg-map">
        {subjects.map((subject) => (
          <Region
            key={subject.id}
            name={tx(subject.name)}
            tone={subjectColor(subject.id)}
            domains={domains.filter((domain) => domain.subjectId === subject.id)}
          />
        ))}
      </div>
    </>
  );
}

/** The mastery ramp, in words as well as colour. Shown once, in the head. */
export function MasteryLegend() {
  const { t } = useI18n();
  return (
    <ul className="pg-ramp">
      {BANDS.map((band) => (
        <li
          key={band}
          className="pg-ramp-item"
          data-band={band}
          style={{ ["--band" as string]: bandColor(band) }}
        >
          <span className="pg-ramp-swatch" aria-hidden />
          {t(`pg.band.${band}`)}
        </li>
      ))}
    </ul>
  );
}

function Region({
  name,
  tone,
  domains,
}: {
  name: string;
  tone: string;
  domains: DomainCell[];
}) {
  const { t } = useI18n();
  /** The skill the region's detail line is describing; null means the region. */
  const [active, setActive] = useState<Cell | null>(null);

  const attempts = domains.reduce((sum, domain) => sum + domain.attempts, 0);
  const correct = domains.reduce((sum, domain) => sum + domain.correct, 0);
  const judged = domains.filter((domain) => domain.reliability !== "insufficient");
  const ranked = [...judged].sort((a, b) => (b.accuracy ?? 0) - (a.accuracy ?? 0));
  const skills = domains.reduce((sum, domain) => sum + domain.skills.length, 0);
  const touched = domains.reduce(
    (sum, domain) => sum + domain.skills.filter((skill) => skill.attempts > 0).length,
    0,
  );

  return (
    <section className="pg-region" style={{ ["--tone" as string]: tone }}>
      <header className="pg-region-head">
        <h3 className="pg-region-name">
          <span className="pg-sec-dot" aria-hidden />
          {name}
        </h3>
        <p className="pg-region-meta">
          {attempts > 0 ? asPercent(correct / attempts) : "—"} ·{" "}
          {fill(t("pg.regionCovered"), { touched, skills })}
        </p>
      </header>

      {/* Blocks sized by their share of the real exam. */}
      <div className="pg-terrain">
        {domains.map((domain) => (
          <Block key={domain.key} domain={domain} onHover={setActive} />
        ))}
      </div>

      {/* One line per region, not one per domain. */}
      <p className="pg-region-detail" data-skill={active ? "true" : undefined}>
        {active ? (
          <SkillDetail cell={active} />
        ) : (
          <>
            <span className="pg-region-detail-hint">{t("pg.masteryHint")}</span>
            {ranked.length > 1 && (
              <span>
                {fill(t("pg.regionRange"), {
                  best: ranked[0].key,
                  bestValue: asPercent(ranked[0].accuracy),
                  worst: ranked[ranked.length - 1].key,
                  worstValue: asPercent(ranked[ranked.length - 1].accuracy),
                })}
              </span>
            )}
          </>
        )}
      </p>
    </section>
  );
}

function Block({
  domain,
  onHover,
}: {
  domain: DomainCell;
  onHover: (cell: Cell | null) => void;
}) {
  const { t } = useI18n();
  const band = bandColor(domain.band);

  return (
    <div
      className="pg-block"
      data-band={domain.band}
      style={{
        ["--band" as string]: band,
        /* The block's share of the row is its share of the section on the real
           exam. `flex-grow` rather than a percentage width so the gaps between
           blocks come out of the whole row rather than out of the weights. */
        flexGrow: domain.weight * 100,
        flexBasis: 0,
      }}
    >
      <div className="pg-block-head">
        <h4 className="pg-block-name">{domain.key}</h4>
        <span className="pg-block-weight">
          {fill(t("pg.blockWeight"), { percent: asPercent(domain.weight) })}
        </span>
      </div>
      <div className="pg-block-score">
        <span
          className="pg-block-value"
          data-empty={domain.accuracy === null ? "true" : undefined}
        >
          {asPercent(domain.accuracy)}
        </span>
        {/* The block is already tinted by its band, so the label is set as
            text: a pill on a tint of its own colour disappears. */}
        <span className="pg-block-band">{t(`pg.band.${domain.band}`)}</span>
      </div>

      <div className="pg-cells">
        {domain.skills.map((skill) => (
          <button
            key={skill.key}
            type="button"
            className="pg-cell"
            data-band={skill.band}
            data-empty={skill.attempts === 0 ? "true" : undefined}
            data-thin={skill.reliability === "provisional" ? "true" : undefined}
            style={{ ["--band" as string]: bandColor(skill.band) }}
            aria-label={describe(skill, t)}
            onMouseEnter={() => onHover(skill)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => onHover(skill)}
            onBlur={() => onHover(null)}
          />
        ))}
      </div>
    </div>
  );
}

/** Everything known about one skill, on one line. */
function SkillDetail({ cell }: { cell: Cell }) {
  const { t } = useI18n();

  if (cell.attempts === 0) {
    return (
      <>
        <span className="pg-region-detail-name">{cell.key}</span>
        <span>
          {cell.available > 0
            ? fill(t("pg.cellUntouched"), { available: cell.available })
            : t("pg.cellEmptyBank")}
        </span>
      </>
    );
  }

  return (
    <>
      <span className="pg-region-detail-name">{cell.key}</span>
      <span className="pg-region-detail-value">{asPercent(cell.accuracy)}</span>
      <span>{fill(t("pg.cellAttempts"), { correct: cell.correct, attempts: cell.attempts })}</span>
      {cell.seconds !== null && <span>{asDuration(cell.seconds)}</span>}
      {cell.change.delta !== null && (
        <span>
          <Delta value={cell.change.delta} good="up" />{" "}
          {fill(t("pg.cellChange"), { days: RULES.windowDays }).toLowerCase()}
        </span>
      )}
      <span>{levelSummary(cell, t)}</span>
      {cell.reliability === "provisional" && (
        <span className="pg-region-detail-warn">
          {fill(t("pg.cellProvisional"), { need: RULES.reliable - cell.attempts })}
        </span>
      )}
    </>
  );
}

/** "E 92% · M 74% · H 48%", skipping levels with nothing behind them. */
function levelSummary(cell: Cell, t: (key: string) => string): string {
  return cell.byLevel
    .filter((level) => level.attempts > 0)
    .map((level) => `${t(`diff.${level.level}`).charAt(0)} ${asPercent(level.accuracy)}`)
    .join(" · ");
}

/** Everything the cell's colour is saying, in words, for a screen reader. */
function describe(cell: Cell, t: (key: string) => string): string {
  if (cell.attempts === 0) {
    return `${cell.key}: ${
      cell.available > 0
        ? fill(t("pg.cellUntouched"), { available: cell.available })
        : t("pg.cellEmptyBank")
    }`;
  }
  return `${cell.key}: ${t(`pg.band.${cell.band}`)}, ${asPercent(cell.accuracy)}, ${fill(
    t("pg.cellAttempts"),
    { correct: cell.correct, attempts: cell.attempts },
  )}`;
}
