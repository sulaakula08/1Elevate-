"use client";

import { useMemo } from "react";
import { SUBJECTS } from "@/data/exams";
import { domainsFor } from "@/data/taxonomy";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";

/**
 * What the bank actually holds, from the whole down to one skill.
 *
 * Built by walking the taxonomy rather than the questions. Counting what exists
 * can only ever show what exists, and the number an author needs is the other
 * one: a skill with no questions is invisible in a list of questions and is
 * precisely the thing worth knowing before writing the next batch. Every domain
 * and skill the exam defines appears here, including at zero.
 *
 * Anything filed under a domain or skill the taxonomy does not know — a typo, or
 * a name that changed — is collected as "unfiled" rather than dropped, so the
 * parts always add up to the total. A breakdown that quietly loses rows is worse
 * than no breakdown, because it is believed.
 */

type SkillRow = { name: string; count: number };
type DomainRow = { name: string; count: number; skills: SkillRow[] };
type SectionRow = {
  id: string;
  name: string;
  count: number;
  domains: DomainRow[];
  unfiled: number;
};

export function BankCoverage({ bank }: { bank: Question[] }) {
  const { t, tx } = useI18n();

  const { total, sections, unsectioned } = useMemo(() => {
    const sections: SectionRow[] = SUBJECTS.filter((s) => s.exam === "sat").map((subject) => {
      const mine = bank.filter((q) => q.subjectId === subject.id);

      const domains = domainsFor(subject.id).map((domain) => {
        const inDomain = mine.filter((q) => q.domain === domain.name);
        return {
          name: domain.name,
          count: inDomain.length,
          skills: domain.skills.map((skill) => ({
            name: skill,
            count: inDomain.filter((q) => q.skill === skill).length,
          })),
        };
      });

      // Everything whose domain is not one the taxonomy lists.
      const known = new Set(domains.map((d) => d.name));
      const unfiled = mine.filter((q) => !q.domain || !known.has(q.domain)).length;

      return {
        id: subject.id,
        name: tx(subject.name),
        count: mine.length,
        domains,
        unfiled,
      };
    });

    const inASection = new Set(sections.map((s) => s.id));
    return {
      total: bank.length,
      sections,
      unsectioned: bank.filter((q) => !inASection.has(q.subjectId)).length,
    };
  }, [bank, tx]);

  if (total === 0) return null;

  return (
    <section className="cov">
      <div className="cov-head">
        <h2 className="label-xs">{t("cov.title")}</h2>
        <p className="cov-total">
          <span className="num">{total}</span>
          <span className="cov-total-label">{t("cov.questions")}</span>
        </p>
      </div>

      <div className="cov-sections">
        {sections.map((section) => (
          <div key={section.id} className="cov-section">
            <div className="cov-section-head">
              <span className="cov-section-name">{section.name}</span>
              <span className="num cov-section-count">{section.count}</span>
            </div>

            <ul className="cov-domains">
              {section.domains.map((domain) => (
                <li key={domain.name}>
                  {/* A domain shows its number without being opened; the skills
                      under it are one click away. Forty skills expanded at once
                      is a wall nobody reads. */}
                  <details className="cov-domain">
                    <summary>
                      <span className="cov-domain-name">{domain.name}</span>
                      <span
                        className={`num cov-count${domain.count === 0 ? " cov-zero" : ""}`}
                      >
                        {domain.count}
                      </span>
                    </summary>

                    <ul className="cov-skills">
                      {domain.skills.map((skill) => (
                        <li key={skill.name}>
                          <span className="cov-skill-name">{skill.name}</span>
                          <span
                            className={`num cov-count${skill.count === 0 ? " cov-zero" : ""}`}
                          >
                            {skill.count}
                          </span>
                        </li>
                      ))}
                      {/* Questions in this domain that name no skill, or one the
                          taxonomy does not list. */}
                      {domain.count > domain.skills.reduce((sum, s) => sum + s.count, 0) && (
                        <li className="cov-unfiled">
                          <span className="cov-skill-name">{t("cov.noSkill")}</span>
                          <span className="num cov-count">
                            {domain.count - domain.skills.reduce((sum, s) => sum + s.count, 0)}
                          </span>
                        </li>
                      )}
                    </ul>
                  </details>
                </li>
              ))}

              {section.unfiled > 0 && (
                <li className="cov-domain cov-unfiled">
                  <span className="cov-domain-name">{t("cov.noDomain")}</span>
                  <span className="num cov-count">{section.unfiled}</span>
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>

      {unsectioned > 0 && (
        <p className="cov-note">
          {unsectioned} {t("cov.outsideSections")}
        </p>
      )}
    </section>
  );
}
