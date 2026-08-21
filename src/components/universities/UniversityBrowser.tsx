"use client";

import { useMemo, useState } from "react";
import { TEST_POLICY_LABELS, UNIVERSITIES, type TestPolicy, type University } from "@/data/universities";
import { useI18n } from "@/lib/i18n";
import { PageTitle, RequireAccount } from "@/components/ui";

type RangeFilter = "all" | "published" | "fits";
type ScoreContext = "reach" | "range" | "above";

const POLICIES = Object.keys(TEST_POLICY_LABELS) as TestPolicy[];

function normalized(value: string): string {
  return value.trim().toLocaleLowerCase();
}

function parseSatScore(value: string): number | null {
  if (!/^\d{3,4}$/.test(value)) return null;
  const score = Number(value);
  return score >= 400 && score <= 1600 && score % 10 === 0 ? score : null;
}

function scoreContext(university: University, score: number | null): ScoreContext | null {
  if (score === null || university.satLow === undefined || university.satHigh === undefined) {
    return null;
  }
  if (score < university.satLow) return "reach";
  if (score <= university.satHigh) return "range";
  return "above";
}

export function UniversityBrowser() {
  return (
    <RequireAccount>
      <UniversityBrowserInner />
    </RequireAccount>
  );
}

function UniversityBrowserInner() {
  const { t } = useI18n();
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("all");
  const [policy, setPolicy] = useState<TestPolicy | "all">("all");
  const [scoreInput, setScoreInput] = useState("");
  const [rangeFilter, setRangeFilter] = useState<RangeFilter>("all");

  const countries = useMemo(
    () => [...new Set(UNIVERSITIES.map((university) => university.country))].sort(),
    [],
  );
  const score = parseSatScore(scoreInput);
  const scoreInvalid = scoreInput !== "" && score === null;

  const results = useMemo(() => {
    const needle = normalized(query);
    return UNIVERSITIES.filter((university) => {
      const place = [university.name, university.shortName, university.city, university.state, university.country]
        .filter(Boolean)
        .join(" ")
        .toLocaleLowerCase();
      if (needle && !place.includes(needle)) return false;
      if (country !== "all" && university.country !== country) return false;
      if (policy !== "all" && university.testPolicy !== policy) return false;
      const hasRange = university.satLow !== undefined && university.satHigh !== undefined;
      if (rangeFilter === "published" && !hasRange) return false;
      if (rangeFilter === "fits") {
        if (score === null || !hasRange || score < university.satLow!) return false;
      }
      return true;
    });
  }, [country, policy, query, rangeFilter, score]);

  const filtersOn =
    normalized(query) !== "" ||
    country !== "all" ||
    policy !== "all" ||
    scoreInput !== "" ||
    rangeFilter !== "all";

  const clear = () => {
    setQuery("");
    setCountry("all");
    setPolicy("all");
    setScoreInput("");
    setRangeFilter("all");
  };

  return (
    <div className="container-app universities-page pb-16">
      <PageTitle sub={t("universities.sub")}>{t("universities.title")}</PageTitle>

      <section className="university-filters panel" aria-label={t("universities.title")}>
        <label className="university-filter university-search">
          <span>{t("universities.search")}</span>
          <input
            type="search"
            className="field"
            value={query}
            placeholder={t("universities.searchPlaceholder")}
            onChange={(event) => setQuery(event.target.value)}
          />
        </label>

        <label className="university-filter">
          <span>{t("universities.country")}</span>
          <select className="field" value={country} onChange={(event) => setCountry(event.target.value)}>
            <option value="all">{t("universities.allCountries")}</option>
            {countries.map((name) => <option key={name} value={name}>{name}</option>)}
          </select>
        </label>

        <label className="university-filter">
          <span>{t("universities.policy")}</span>
          <select
            className="field"
            value={policy}
            onChange={(event) => setPolicy(event.target.value as TestPolicy | "all")}
          >
            <option value="all">{t("universities.allPolicies")}</option>
            {POLICIES.map((value) => <option key={value} value={value}>{TEST_POLICY_LABELS[value]}</option>)}
          </select>
        </label>

        <label className="university-filter">
          <span>{t("universities.score")}</span>
          <input
            type="number"
            inputMode="numeric"
            min={400}
            max={1600}
            step={10}
            className="field num"
            value={scoreInput}
            placeholder={t("universities.scorePlaceholder")}
            aria-describedby="sat-score-note"
            aria-invalid={scoreInvalid}
            onChange={(event) => {
              const value = event.target.value;
              setScoreInput(value);
              if (rangeFilter === "fits" && parseSatScore(value) === null) {
                setRangeFilter("all");
              }
            }}
          />
        </label>

        <label className="university-filter">
          <span>{t("universities.rangeFilter")}</span>
          <select className="field" value={rangeFilter} onChange={(event) => setRangeFilter(event.target.value as RangeFilter)}>
            <option value="all">{t("universities.allRanges")}</option>
            <option value="published">{t("universities.publishedRanges")}</option>
            <option value="fits" disabled={score === null}>{t("universities.scoreFits")}</option>
          </select>
        </label>
      </section>

      <p
        id="sat-score-note"
        className="university-note"
        data-error={scoreInvalid || undefined}
        aria-live="polite"
      >
        {t(scoreInvalid ? "universities.scoreError" : "universities.matchNote")}
      </p>

      <div className="university-results-head">
        <p className="text-sm text-muted" aria-live="polite">
          <span className="num font-semibold text-foreground">{results.length}</span>{" "}
          {t(results.length === 1 ? "universities.result" : "universities.results")}
        </p>
        {filtersOn && <button type="button" className="btn btn-sm" onClick={clear}>{t("universities.clear")}</button>}
      </div>

      {results.length > 0 ? (
        <div className="university-grid">
          {results.map((university) => (
            <UniversityCard key={university.id} university={university} context={scoreContext(university, score)} />
          ))}
        </div>
      ) : (
        <div className="university-empty panel">
          <p className="text-body font-medium">{t("universities.empty")}</p>
          <p className="text-sm text-muted mt-1">{t("universities.emptyBody")}</p>
          <button type="button" className="btn btn-sm mt-4" onClick={clear}>{t("universities.clear")}</button>
        </div>
      )}

      <p className="university-data-note">{t("universities.dataNote")}</p>
    </div>
  );
}

function UniversityCard({ university, context }: { university: University; context: ScoreContext | null }) {
  const { t } = useI18n();
  const location = [university.city, university.state, university.country].filter(Boolean).join(", ");
  const contextLabel = context === "reach" ? t("universities.reach") : context === "range" ? t("universities.inRange") : context === "above" ? t("universities.aboveRange") : null;

  return (
    <article className="university-card card">
      <header>
        <div className="university-card-topline">
          {university.shortName && <span className="university-monogram num">{university.shortName}</span>}
          {contextLabel && <span className="university-match" data-context={context}>{contextLabel}</span>}
        </div>
        <h2 className="university-name">{university.name}</h2>
        <p className="university-location">{location}</p>
      </header>

      <dl className="university-facts">
        <div>
          <dt>{t("universities.satRange")}</dt>
          <dd className="num">
            {university.satLow !== undefined && university.satHigh !== undefined
              ? `${university.satLow}–${university.satHigh}`
              : t("universities.notPublished")}
          </dd>
          {university.satRangeNote && <p>{university.satRangeNote}</p>}
        </div>
        <div>
          <dt>{t("universities.policy")}</dt>
          <dd>{TEST_POLICY_LABELS[university.testPolicy]}</dd>
          {university.policyNote && <p>{university.policyNote}</p>}
        </div>
      </dl>

      <footer className="university-actions">
        <a className="btn btn-primary btn-sm" href={university.website} target="_blank" rel="noreferrer">
          {t("universities.view")} <span aria-hidden>↗</span>
        </a>
        <a className="university-source" href={university.sourceUrl} target="_blank" rel="noreferrer">
          {t("universities.source")} <span aria-hidden>↗</span>
        </a>
      </footer>
    </article>
  );
}
