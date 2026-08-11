"use client";

import { useMemo, useState } from "react";
import { SUBJECTS } from "@/data/exams";
import type { Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/math/markdown";
import { ConfirmDialog } from "@/components/ui";

/**
 * Delete by number.
 *
 * The list below this deletes one question at a time, which is the right shape
 * for "that one is wrong" and the wrong shape for the job that actually comes
 * up: a batch of drafts has landed, an admin has read them on paper, and eight
 * of them need to go. Ids are a running number per section — sat-math-041 — so
 * the number is what an admin is already holding in their head, and this takes
 * it in the form they would say it out loud: `12, 15, 20-24`.
 */

/** The trailing number of an id, when it carries one for this section. */
function numberOf(id: string, subjectId: string): number | null {
  if (!id.startsWith(`${subjectId}-`)) return null;
  const tail = id.slice(subjectId.length + 1);
  return /^\d+$/.test(tail) ? Number(tail) : null;
}

type Parsed = {
  /** Every number the field asked for, in the order it asked. */
  wanted: number[];
  /** Whole ids pasted in rather than typed as numbers. */
  ids: string[];
  /** Anything that was neither, reported back rather than silently dropped. */
  bad: string[];
};

function parse(input: string): Parsed {
  const wanted: number[] = [];
  const ids: string[] = [];
  const bad: string[] = [];

  for (const raw of input.split(/[,\s]+/)) {
    const token = raw.trim();
    if (!token) continue;

    const range = token.match(/^(\d+)\s*[-–]\s*(\d+)$/);
    if (range) {
      const from = Number(range[1]);
      const to = Number(range[2]);
      // A backwards range is a typo, not an empty set: read it either way round.
      for (let n = Math.min(from, to); n <= Math.max(from, to); n += 1) wanted.push(n);
      continue;
    }
    if (/^\d+$/.test(token)) {
      wanted.push(Number(token));
      continue;
    }
    // An id contains its own section, so it needs no help from the picker.
    if (/^[a-z0-9-]+-\d+$/i.test(token)) {
      ids.push(token.toLowerCase());
      continue;
    }
    bad.push(token);
  }

  return { wanted: [...new Set(wanted)], ids: [...new Set(ids)], bad };
}

export function DeleteByNumber({ questions }: { questions: Question[] }) {
  const { t, tx } = useI18n();
  const { deleteQuestions } = useApp();

  const subjects = SUBJECTS.filter((s) => s.exam === "sat");
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "sat-rw");
  const [input, setInput] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const parsed = useMemo(() => parse(input), [input]);

  /** What the field resolves to right now, so the admin sees it before deleting. */
  const { found, missing } = useMemo(() => {
    const byNumber = new Map<number, Question>();
    for (const q of questions) {
      const n = numberOf(q.id, subjectId);
      if (n !== null) byNumber.set(n, q);
    }
    const byId = new Map(questions.map((q) => [q.id, q]));

    const found: Question[] = [];
    const missing: string[] = [];

    for (const n of parsed.wanted) {
      const hit = byNumber.get(n);
      if (hit) found.push(hit);
      else missing.push(String(n));
    }
    for (const id of parsed.ids) {
      const hit = byId.get(id);
      if (hit && !found.includes(hit)) found.push(hit);
      else if (!hit) missing.push(id);
    }
    return { found, missing };
  }, [questions, subjectId, parsed]);

  return (
    <div className="panel p-5">
      <p className="label-xs">{t("admin.deleteByNumber")}</p>
      <p className="text-micro text-muted mt-1.5 leading-relaxed">
        {t("admin.deleteByNumberBody")}
      </p>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select
          className="field w-auto"
          aria-label={t("admin.subject")}
          value={subjectId}
          onChange={(e) => {
            setSubjectId(e.target.value);
            setNotice(null);
          }}
        >
          {subjects.map((subject) => (
            <option key={subject.id} value={subject.id}>
              {tx(subject.name)}
            </option>
          ))}
        </select>
        <input
          className="field flex-1 min-w-[12rem]"
          inputMode="numeric"
          placeholder={t("admin.deleteByNumberHint")}
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setNotice(null);
          }}
        />
        <button
          type="button"
          className="btn btn-sm text-danger"
          style={{ borderColor: "var(--danger)" }}
          disabled={found.length === 0}
          onClick={() => setConfirming(true)}
        >
          {t("admin.delete")}
          {found.length > 0 ? ` (${found.length})` : ""}
        </button>
      </div>

      {/* What the numbers resolved to, before anything is deleted. Typing 41
          when the section stops at 38 should say so here, not fail silently. */}
      {input.trim() && (
        <div className="mt-3 text-micro">
          {found.length > 0 && (
            <ul className="space-y-1">
              {found.map((q) => (
                <li key={q.id} className="flex gap-2 min-w-0">
                  <span className="num text-faint shrink-0">{q.id}</span>
                  <RichText className="truncate block min-w-0 text-muted" text={tx(q.prompt)} />
                </li>
              ))}
            </ul>
          )}
          {missing.length > 0 && (
            <p className="mt-1.5 text-warning">
              {t("admin.deleteNoSuch")}: <span className="num">{missing.join(", ")}</span>
            </p>
          )}
          {parsed.bad.length > 0 && (
            <p className="mt-1.5 text-warning">
              {t("admin.deleteUnreadable")}: {parsed.bad.join(", ")}
            </p>
          )}
        </div>
      )}

      {notice && <p className="mt-3 text-sm text-success font-semibold">{notice}</p>}

      {confirming && (
        <ConfirmDialog
          title={t("admin.confirmDeleteTitle")}
          body={
            <>
              <span className="block text-foreground num">
                {found.map((q) => q.id).join(", ")}
              </span>
              <span className="block mt-2">{t("admin.confirmDeleteBody")}</span>
            </>
          }
          confirmLabel={`${t("admin.delete")} (${found.length})`}
          cancelLabel={t("admin.cancel")}
          danger
          onConfirm={() => {
            const count = found.length;
            deleteQuestions(found.map((q) => q.id));
            setConfirming(false);
            setInput("");
            setNotice(`${t("admin.deleted")}: ${count}`);
          }}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
