"use client";

import { useMemo, useState } from "react";
import { subjectsFor } from "@/data/exams";
import { domainsFor, skillsFor } from "@/data/taxonomy";
import type { Difficulty, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { apiFetch } from "@/lib/supabase/client";
import { RichText } from "@/lib/math/markdown";

/**
 * Drafting questions with the model, then reviewing them one at a time.
 *
 * Nothing here saves on its own. The route already discards anything that fails
 * validation or repeats a prompt already in the bank, but "valid" is not "good":
 * only a person can tell whether a distractor is tempting for the right reason
 * or whether a figure can actually be read. So every draft arrives with its
 * answer marked and has to be kept deliberately.
 *
 * Difficulty is calibrated against the bank's own measured accuracy where there
 * is enough of it — see MIN_ATTEMPTS. Below that the number is noise and is not
 * sent, because a confident wrong figure is worse than none.
 */

const LEVELS: { value: Difficulty; label: string }[] = [
  { value: 1, label: "Easy" },
  { value: 2, label: "Medium" },
  { value: 3, label: "Hard" },
];

/** Answers before a question's accuracy is worth quoting to the model. */
const MIN_ATTEMPTS = 30;

type Draft = Question & { keep: boolean };

export function GenerateQuestions() {
  const { bank, data, saveQuestion } = useApp();
  const subjects = subjectsFor("sat");

  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "sat-rw");
  const [domain, setDomain] = useState(domainsFor("sat-rw")[0].name);
  const [skill, setSkill] = useState(domainsFor("sat-rw")[0].skills[0]);
  const [counts, setCounts] = useState<Record<Difficulty, number>>({ 1: 0, 2: 2, 3: 0 });
  const [figures, setFigures] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Draft[]>([]);
  const [savingId, setSavingId] = useState<string | null>(null);

  /**
   * Measured accuracy per question, for the questions that have been answered
   * enough times to mean something.
   */
  const calibration = useMemo(() => {
    const tally = new Map<string, { tries: number; correct: number }>();
    for (const attempt of data.attempts) {
      const row = tally.get(attempt.questionId) ?? { tries: 0, correct: 0 };
      row.tries += 1;
      if (attempt.correct) row.correct += 1;
      tally.set(attempt.questionId, row);
    }
    return bank
      .filter((q) => q.subjectId === subjectId)
      .flatMap((q) => {
        const row = tally.get(q.id);
        if (!row || row.tries < MIN_ATTEMPTS) return [];
        return [
          { prompt: q.prompt.en ?? "", difficulty: q.difficulty, accuracy: row.correct / row.tries },
        ];
      })
      .slice(0, 12);
  }, [bank, data.attempts, subjectId]);

  const total = LEVELS.reduce((sum, l) => sum + (counts[l.value] || 0), 0);

  async function generate() {
    setBusy(true);
    setError(null);
    setNote(null);

    const subjectBank = bank.filter((q) => q.subjectId === subjectId);
    const body = {
      subjectId,
      wanted: LEVELS.filter((l) => counts[l.value] > 0).map((l) => ({
        difficulty: l.value,
        count: counts[l.value],
      })),
      // Chosen from the official taxonomy, not typed: a generated item is filed
      // under exactly the same names a hand-written one is, so the two are
      // comparable in every report.
      topics: [skill],
      domains: [domain],
      avoid: subjectBank.map((q) => q.prompt.en ?? "").filter(Boolean).slice(0, 40),
      calibration,
      wantFigures: figures,
    };

    try {
      const response = await apiFetch("/api/generate", {
        method: "POST",
        body: JSON.stringify(body),
      });
      const payload = (await response.json().catch(() => ({}))) as {
        questions?: Question[];
        rejected?: number;
        model?: string;
        error?: string;
      };

      if (!response.ok) {
        setError(payload.error ?? "Could not generate.");
        return;
      }
      const produced = payload.questions ?? [];
      setDrafts(produced.map((q) => ({ ...q, keep: true })));
      setNote(
        `${produced.length} drafted${payload.rejected ? `, ${payload.rejected} discarded as invalid or duplicate` : ""}` +
          `${calibration.length ? ` · calibrated against ${calibration.length} measured question${calibration.length === 1 ? "" : "s"}` : ""}`,
      );
    } catch {
      setError("Could not reach the generator.");
    } finally {
      setBusy(false);
    }
  }

  async function keepDraft(draft: Draft) {
    setSavingId(draft.id);
    setError(null);
    // Blank id: the server numbers it like any hand-written question, so a
    // generated item is not filed differently from an authored one.
    const outcome = await saveQuestion({ ...draft, id: "", custom: true });
    setSavingId(null);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setDrafts((current) => current.filter((d) => d.id !== draft.id));
  }

  return (
    <section className="mt-14">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="display text-[22px]">Draft with AI</h2>
        <p className="text-[13px] text-muted">
          Reviewed before anything is saved — nothing here publishes itself.
        </p>
      </div>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="label">Section</span>
          <select
            className="field"
            value={subjectId}
            onChange={(e) => {
              // Sections share no domains, so the pair is reseeded rather than
              // left pointing at a skill the new section does not have.
              const first = domainsFor(e.target.value)[0];
              setSubjectId(e.target.value);
              setDomain(first.name);
              setSkill(first.skills[0]);
            }}
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name.en}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Domain</span>
          <select
            className="field"
            value={domain}
            onChange={(e) => {
              setDomain(e.target.value);
              setSkill(skillsFor(subjectId, e.target.value)[0] ?? "");
            }}
          >
            {domainsFor(subjectId).map((d) => (
              <option key={d.name} value={d.name}>
                {d.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="label">Skill</span>
          <select className="field" value={skill} onChange={(e) => setSkill(e.target.value)}>
            {skillsFor(subjectId, domain).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        {LEVELS.map((level) => (
          <label key={level.value} className="block">
            <span className="label">{level.label}</span>
            <input
              className="field w-20"
              type="number"
              min={0}
              max={5}
              value={counts[level.value]}
              onChange={(e) =>
                setCounts((prev) => ({
                  ...prev,
                  [level.value]: Math.max(0, Math.min(5, Number(e.target.value) || 0)),
                }))
              }
            />
          </label>
        ))}

        <label className="flex items-center gap-2 text-[13.5px] pb-2.5">
          <input
            type="checkbox"
            checked={figures}
            onChange={(e) => setFigures(e.target.checked)}
          />
          Include a chart where the skill needs one
        </label>

        <button
          type="button"
          className="btn btn-primary mb-0.5"
          disabled={busy || total === 0}
          onClick={() => void generate()}
        >
          {busy ? "Writing…" : `Draft ${total || ""}`.trim()}
        </button>
      </div>

      {calibration.length === 0 && (
        <p className="mt-3 text-[12.5px] text-faint">
          Difficulty is described rather than measured until questions have {MIN_ATTEMPTS}+ answers
          each. Once students have practised, the model is given the real accuracy of your own
          items and asked to match it.
        </p>
      )}

      {error && (
        <p className="notice notice-error mt-4" role="alert">
          {error}
        </p>
      )}
      {note && <p className="notice notice-ok mt-4">{note}</p>}

      {drafts.length > 0 && (
        <ul className="mt-6 space-y-3">
          {drafts.map((draft) => (
            <li key={draft.id} className="card p-4">
              <p className="text-[12px] text-muted">
                {draft.topic}
                {draft.skill ? ` · ${draft.skill}` : ""} · difficulty {draft.difficulty}
              </p>

              {draft.passage?.en && (
                <div className="mt-2 text-[14px] cm-quote">
                  <RichText text={draft.passage.en} block />
                </div>
              )}

              <div className="mt-2 text-[15px]">
                <RichText text={draft.prompt.en ?? ""} block />
              </div>

              <ol className="mt-2 space-y-1 text-[14px]">
                {draft.choices.map((choice, i) => (
                  <li
                    key={i}
                    className={i === draft.answer ? "text-success font-medium" : "text-muted"}
                  >
                    {String.fromCharCode(65 + i)}. <RichText text={choice.en ?? ""} />
                    {i === draft.answer && " ✓"}
                  </li>
                ))}
              </ol>

              <details className="mt-2">
                <summary className="text-[13px] text-muted cursor-pointer">Explanation</summary>
                <div className="mt-1 text-[13.5px] text-muted">
                  <RichText text={draft.explanation.en ?? ""} block />
                </div>
              </details>

              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  className="btn btn-sm btn-primary"
                  disabled={savingId === draft.id}
                  onClick={() => void keepDraft(draft)}
                >
                  {savingId === draft.id ? "Saving…" : "Add to bank"}
                </button>
                <button
                  type="button"
                  className="btn btn-sm"
                  onClick={() =>
                    setDrafts((current) => current.filter((d) => d.id !== draft.id))
                  }
                >
                  Discard
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
