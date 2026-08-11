"use client";

import { useRef, useState } from "react";
import { SUBJECTS, getSubject } from "@/data/exams";
import { SEED_QUESTIONS } from "@/data";
import type { Difficulty, ExamId, LocalizedText, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";

import { domainsFor, skillsFor } from "@/data/taxonomy";
import { PeopleManager } from "@/components/PeopleManager";
import { SectionControls } from "@/components/admin/SectionControls";
import { GenerateQuestions } from "@/components/admin/GenerateQuestions";
import { DeleteByNumber } from "@/components/admin/DeleteByNumber";
import { FeedbackInbox } from "@/components/admin/FeedbackInbox";
import { CommunityModeration } from "@/components/admin/CommunityModeration";
import { UsageStats } from "@/components/admin/UsageStats";
import { QuestionView } from "@/components/QuestionView";
import { RichText } from "@/lib/math/markdown";
import { ConfirmDialog, EmptyState, PageTitle, RequireAccount } from "@/components/ui";

type Draft = {
  id: string;
  exam: ExamId;
  subjectId: string;
  topic: string;
  domain: string;
  skill: string;
  difficulty: Difficulty;
  passage: LocalizedText;
  prompt: LocalizedText;
  choices: LocalizedText[];
  answer: number;
  explanation: LocalizedText;
};

const EMPTY_TEXT: LocalizedText = { en: "" };

/** Choice labels, matching the letters a student sees in the player. */
const LETTERS = ["A", "B", "C", "D", "E", "F"];

/** Absolute, minute-precision — an admin comparing two edits needs the clock. */
function formatWhen(at: number): string {
  return new Date(at).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

/** How many of the newest questions the list shows before it is expanded. */
const RECENT_COUNT = 5;

/**
 * The page's sections.
 *
 * Everything an admin can do used to sit on one column: the editor, the bank,
 * the generator, the section switches, the roster, the usage figures and the
 * feedback inbox, in that order. Reaching the inbox meant scrolling past all of
 * it, and nothing on the way was related to what you came for. One at a time.
 */
const TABS = [
  "questions",
  "generate",
  "sections",
  "people",
  "usage",
  "feedback",
  /* Last, beside feedback: both are queues of things students sent in, and an
     admin comes to them after the writing and running work rather than before. */
  "moderation",
] as const;
type Tab = (typeof TABS)[number];

/** Reading & Writing is the default section, so its first domain seeds a draft. */
const RW_FIRST = domainsFor("sat-rw")[0];

function emptyDraft(): Draft {
  return {
    // Blank on purpose: the server hands out the section number (sat-math-041)
    // when the question is saved, because only it can see what is already used.
    id: "",
    exam: "sat",
    subjectId: "sat-rw",
    topic: "",
    domain: RW_FIRST.name,
    skill: RW_FIRST.skills[0],
    difficulty: 1,
    passage: { ...EMPTY_TEXT },
    prompt: { ...EMPTY_TEXT },
    choices: [{ ...EMPTY_TEXT }, { ...EMPTY_TEXT }, { ...EMPTY_TEXT }, { ...EMPTY_TEXT }],
    answer: 0,
    explanation: { ...EMPTY_TEXT },
  };
}

function toDraft(question: Question): Draft {
  return {
    id: question.id,
    exam: question.exam,
    subjectId: question.subjectId,
    topic: question.topic,
    domain: question.domain ?? domainsFor(question.subjectId)[0].name,
    skill: question.skill ?? "",
    difficulty: question.difficulty,
    passage: { ...EMPTY_TEXT, ...(question.passage ?? {}) },
    prompt: { ...EMPTY_TEXT, ...question.prompt },
    choices: question.choices.map((c) => ({ ...EMPTY_TEXT, ...c })),
    answer: question.answer,
    explanation: { ...EMPTY_TEXT, ...question.explanation },
  };
}

export default function AdminPage() {
  return (
    <RequireAccount>
      <AdminInner />
    </RequireAccount>
  );
}

function AdminInner() {
  const { t, tx } = useI18n();
  const { account, bank, saveQuestion, deleteQuestion, replaceCustomQuestions } = useApp();
  const [tab, setTab] = useState<Tab>("questions");
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The question the admin has asked to delete but not yet confirmed.
  const [showAllQuestions, setShowAllQuestions] = useState(false);
  const [toDelete, setToDelete] = useState<Question | null>(null);
  /** The editor starts folded: most visits here are to read, not to write. */
  const [editorOpen, setEditorOpen] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  if (account!.role === "student") {
    return (
      <div>
        <PageTitle>{t("admin.title")}</PageTitle>
        <EmptyState>{t("admin.onlyAdmin")}</EmptyState>
      </div>
    );
  }

  const customQuestions = bank.filter((q) => q.custom);

  /**
   * Newest first, so "the last five" means the five just written rather than
   * the five that happen to sit at the end of the array. Items from before
   * `createdAt` existed have no timestamp; they sort last and keep their
   * relative order rather than being scattered by an undefined comparison.
   */
  const recentFirst = [...customQuestions].sort((a, b) => {
    if (a.createdAt && b.createdAt) return b.createdAt - a.createdAt;
    if (a.createdAt) return -1;
    if (b.createdAt) return 1;
    return 0;
  });
  const shown = showAllQuestions ? recentFirst : recentFirst.slice(0, RECENT_COUNT);
  const hidden = recentFirst.length - shown.length;
  const subjectOptions = SUBJECTS.filter((s) => s.exam === draft.exam);

  /**
   * The draft as a `Question`, for the preview.
   *
   * Blank choices are dropped the same way `submit` drops them, so the preview
   * shows the item that would actually be saved rather than a row of empties —
   * and the answer index is clamped for the same reason it is on save.
   */
  const previewChoices = draft.choices.filter((c) => c.en.trim().length > 0);
  const previewQuestion: Question = {
    id: draft.id,
    exam: draft.exam,
    subjectId: draft.subjectId,
    // The skill IS the topic. Keeping a separate free-text topic gave two names
    // for one thing and let reports group by a typo.
    topic: draft.skill || tx(getSubject(draft.subjectId)?.name),
    domain: draft.domain || undefined,
    skill: draft.skill || undefined,
    difficulty: draft.difficulty,
    passage: draft.passage.en.trim() ? draft.passage : undefined,
    prompt: draft.prompt,
    choices: previewChoices.length > 0 ? previewChoices : [{ en: "—" }],
    answer: Math.max(0, Math.min(draft.answer, previewChoices.length - 1)),
    explanation: draft.explanation.en.trim() ? draft.explanation : { en: "—" },
    custom: true,
  };

  function setText(field: "passage" | "prompt" | "explanation", value: string) {
    setDraft((prev) => ({ ...prev, [field]: { en: value } }));
  }

  function setChoice(index: number, value: string) {
    setDraft((prev) => ({
      ...prev,
      choices: prev.choices.map((choice, i) =>
        i === index ? { en: value } : choice,
      ),
    }));
  }

  function clean(text: LocalizedText): LocalizedText {
    return { en: text.en.trim() };
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setNotice(null);

    const choices = draft.choices.filter((c) => c.en.trim().length > 0);
    if (!draft.prompt.en.trim() || !draft.explanation.en.trim()) {
      setError(t("admin.needEn"));
      return;
    }
    if (choices.length < 2) {
      setError(t("admin.needTwoChoices"));
      return;
    }

    const question: Question = {
      id: draft.id,
      exam: draft.exam,
      subjectId: draft.subjectId,
      // The skill IS the topic. Keeping a separate free-text topic gave two names
    // for one thing and let reports group by a typo.
    topic: draft.skill || tx(getSubject(draft.subjectId)?.name),
    domain: draft.domain || undefined,
    skill: draft.skill || undefined,
      difficulty: draft.difficulty,
      passage: draft.passage.en.trim() ? clean(draft.passage) : undefined,
      prompt: clean(draft.prompt),
      choices: choices.map(clean),
      answer: Math.min(draft.answer, choices.length - 1),
      explanation: clean(draft.explanation),
      // Provenance survives an edit. The editor rebuilds a question from its own
      // fields, so without this, correcting a typo in a drafted item would quietly
      // reclassify it as hand-written.
      generatedBy: customQuestions.find((q) => q.id === draft.id)?.generatedBy,
      custom: true,
    };

    // Await the database before claiming success. This reported "Saved" whatever
    // happened, so a rejected question looked identical to a stored one — an
    // author could retype the same item repeatedly and never learn why it was
    // not appearing.
    setError(null);
    setNotice(null);
    const outcome = await saveQuestion(question);
    if (!outcome.ok) {
      setError(outcome.error);
      return;
    }
    setDraft(emptyDraft());
    setNotice(t("admin.saved"));
  }

  function exportJson() {
    const blob = new Blob([JSON.stringify(customQuestions, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "1elevate-questions.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  async function importJson(file: File) {
    try {
      const parsed = JSON.parse(await file.text());
      if (!Array.isArray(parsed)) throw new Error("not an array");
      const incoming: Question[] = parsed
        .filter(
          (q): q is Question =>
            typeof q?.id === "string" &&
            typeof q?.subjectId === "string" &&
            Array.isArray(q?.choices) &&
            typeof q?.answer === "number" &&
            typeof q?.prompt?.en === "string",
        )
        .map((q) => ({ ...q, custom: true }));
      if (incoming.length === 0) throw new Error("no valid questions");
      // Imported ids win over existing ones with the same id.
      const kept = customQuestions.filter((q) => !incoming.some((i) => i.id === q.id));
      replaceCustomQuestions([...kept, ...incoming]);
      setError(null);
      setNotice(`${t("admin.importOk")}: ${incoming.length}`);
    } catch {
      setNotice(null);
      setError(t("admin.importBad"));
    }
  }

  return (
    <div className="space-y-8">
      <PageTitle
        sub={`${SEED_QUESTIONS.length} ${t("admin.builtIn")} · ${customQuestions.length} ${t(
          "admin.custom",
        )}`}
      >
        {t("admin.title")}
      </PageTitle>

      {/* One row of sections, in the order an admin needs them: write, then
          generate, then run, then people, then read what came back. */}
      <div className="flex flex-wrap gap-2" role="tablist" aria-label={t("admin.title")}>
        {TABS.map((value) => (
          <button
            key={value}
            role="tab"
            aria-selected={tab === value}
            className={`chip ${tab === value ? "chip-on" : ""}`}
            onClick={() => setTab(value)}
          >
            {t(`admin.tab.${value}`)}
          </button>
        ))}
      </div>

      {tab === "questions" && (
      <>
      {/*
        The editor folds away.

        It is the tallest thing on this page by a distance, and an admin who came
        here to read the usage figures or the feedback should not have to scroll
        past a full question form to reach them. Editing a question from the list
        below opens it again, so the fold can never hide the thing you just asked
        to edit.
      */}
      <div className="panel">
        <button
          type="button"
          className="ed-head"
          aria-expanded={editorOpen}
          onClick={() => setEditorOpen((open) => !open)}
        >
          <span className="min-w-0">
            <span className="block font-bold">
              {customQuestions.some((q) => q.id === draft.id)
                ? t("admin.editQuestion")
                : t("admin.newQuestion")}
            </span>
            <span className="block text-micro text-muted mt-0.5">
              {editorOpen ? t("admin.editorHide") : t("admin.editorShow")}
            </span>
          </span>
          <span
            className="text-faint text-micro ml-auto shrink-0 transition-transform"
            style={{ transform: editorOpen ? "rotate(90deg)" : "none" }}
            aria-hidden
          >
            ▸
          </span>
        </button>

      <form
        onSubmit={submit}
        className="px-6 pb-6 space-y-6"
        hidden={!editorOpen}
      >

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="label">{t("admin.subject")}</label>
            <select
              className="field"
              value={draft.subjectId}
              onChange={(e) =>
                setDraft((prev) => {
                  // The two sections share no domains, so the pair has to be
                  // reseeded — otherwise a Math item keeps a Reading & Writing
                  // skill and every report files it under the wrong section.
                  const first = domainsFor(e.target.value)[0];
                  return {
                    ...prev,
                    subjectId: e.target.value,
                    domain: first.name,
                    skill: first.skills[0],
                  };
                })
              }
            >
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {tx(subject.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("admin.domain")}</label>
            <select
              className="field"
              value={draft.domain}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  domain: e.target.value,
                  // A skill belongs to one domain, so changing the domain has to
                  // move the skill with it or the pair becomes nonsense.
                  skill: skillsFor(prev.subjectId, e.target.value)[0] ?? "",
                }))
              }
            >
              {domainsFor(draft.subjectId).map((d) => (
                <option key={d.name} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("admin.skill")}</label>
            <select
              className="field"
              value={draft.skill}
              onChange={(e) => setDraft((prev) => ({ ...prev, skill: e.target.value }))}
            >
              {skillsFor(draft.subjectId, draft.domain).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("quiz.difficulty")}</label>
            <select
              className="field"
              value={draft.difficulty}
              onChange={(e) =>
                setDraft((prev) => ({
                  ...prev,
                  difficulty: Number(e.target.value) as Difficulty,
                }))
              }
            >
              <option value={1}>{t("diff.1")}</option>
              <option value={2}>{t("diff.2")}</option>
              <option value={3}>{t("diff.3")}</option>
            </select>
          </div>
        </div>

        <div>
          <label className="label">
            {t("admin.passage")}
          </label>
          <textarea
            className="field min-h-20"
            value={draft.passage.en}
            onChange={(e) => setText("passage", e.target.value)}
          />
          {/* The passage goes through the same renderer as the prompt, so it
              takes the same notation — worth saying here, since an author with a
              formula in a stimulus has no reason to assume it. */}
          <p className="text-micro text-muted mt-2">{t("admin.mathHintShort")}</p>
        </div>

        <div>
          <label className="label">
            {t("admin.prompt")}
          </label>
          <textarea
            className="field min-h-16"
            value={draft.prompt.en}
            onChange={(e) => setText("prompt", e.target.value)}
          />
          {/* Where authors need it: beside the field they are pasting into. */}
          <p className="text-micro leading-relaxed text-muted mt-2">
            {t("admin.mathHint")}
          </p>
        </div>

        {/*
          The letter tile *is* the control: clicking A/B/C/D marks that choice
          correct. A bare radio was 13px of browser default beside a 40px field,
          which is both hard to hit and impossible to read as "this one is the
          answer" — the letter says which choice, the fill says it is the right
          one, and the tick removes any doubt.

          Fixed at four choices, so neither an add nor a remove button: the SAT
          is a four-option test. Anything imported with a different count still
          renders and stays editable.
        */}
        <div>
          <label className="label">{t("admin.choices")}</label>
          <p className="text-micro text-muted -mt-1 mb-2.5">{t("admin.markCorrectHint")}</p>
          <div role="radiogroup" aria-label={t("admin.markCorrect")} className="space-y-2">
            {draft.choices.map((choice, index) => {
              const isAnswer = draft.answer === index;
              return (
                <div key={index} className="flex items-center gap-2.5">
                  <button
                    type="button"
                    role="radio"
                    aria-checked={isAnswer}
                    className={`qa-pick ${isAnswer ? "qa-pick-on" : ""}`}
                    onClick={() => setDraft((prev) => ({ ...prev, answer: index }))}
                    title={`${t("admin.markCorrect")}: ${LETTERS[index]}`}
                  >
                    <span aria-hidden>{isAnswer ? "✓" : LETTERS[index]}</span>
                    <span className="sr-only">
                      {LETTERS[index]} — {t("admin.markCorrect")}
                    </span>
                  </button>
                  <input
                    className="field"
                    value={choice.en}
                    onChange={(e) => setChoice(index, e.target.value)}
                    placeholder={`${t("admin.choice")} ${LETTERS[index]}`}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <label className="label">
            {t("admin.explanationLabel")}
          </label>
          <textarea
            className="field min-h-16"
            value={draft.explanation.en}
            onChange={(e) => setText("explanation", e.target.value)}
          />
        </div>

        {/*
          The draft as a student will actually see it, rendered by the very
          component the player uses — not a lookalike, so a formula that renders
          here renders there. This is the answer to "did my paste survive": an
          author sees a fraction stacked or sees the raw notation, immediately,
          without saving anything.
        */}
        {draft.prompt.en.trim() && (
          <div className="pt-5 border-t">
            <p className="label-xs">{t("admin.preview")}</p>
            <div className="mt-4 rounded-[var(--radius-sm)] border p-4">
              <QuestionView
                question={previewQuestion}
                selected={previewQuestion.answer}
                onSelect={() => {}}
                revealed
                disabled
                keyboard={false}
              />
            </div>
          </div>
        )}

        {error && <p className="text-sm text-danger font-semibold">{error}</p>}
        {notice && <p className="text-sm text-success font-semibold">{notice}</p>}

        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary">{t("admin.save")}</button>
          <button
            type="button"
            className="btn"
            onClick={() => {
              setDraft(emptyDraft());
              setError(null);
              setNotice(null);
            }}
          >
            {t("admin.cancel")}
          </button>
          <button type="button" className="btn ml-auto" onClick={exportJson}>
            {t("admin.export")}
          </button>
          <button type="button" className="btn" onClick={() => fileInput.current?.click()}>
            {t("admin.import")}
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importJson(file);
              e.target.value = "";
            }}
          />
        </div>
      </form>
      </div>

      {/* Bulk removal, above the list it removes from. */}
      {customQuestions.length > 0 && <DeleteByNumber questions={customQuestions} />}

      <section>
        <h2 className="label-xs mb-4">
          {t("admin.yourQuestions")}
        </h2>
        {customQuestions.length === 0 ? (
          <EmptyState>—</EmptyState>
        ) : (
          <ul className="space-y-2">
            {shown.map((question) => {
              const subject = getSubject(question.subjectId);
              return (
                <li key={question.id} className="flex items-start gap-3 py-3.5 border-b">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      {question.exam.toUpperCase()} · {subject ? tx(subject.name) : question.subjectId}{" "}
                      · {question.topic}
                      {question.skill && <> · {question.skill}</>}
                    </p>
                    {/* Provenance, stated rather than implied. An author reviewing
                        the bank needs to know which items came from a model, both
                        to spot-check them and to know what the bank is made of. */}
                    {question.generatedBy && (
                      <span className="q-ai" title={`Drafted by ${question.generatedBy}`}>
                        <svg viewBox="0 0 24 24" width="11" height="11" aria-hidden>
                          <path
                            d="M12 3.5l1.9 4.9 4.9 1.9-4.9 1.9L12 17.1l-1.9-4.9-4.9-1.9 4.9-1.9L12 3.5Z"
                            fill="currentColor"
                          />
                        </svg>
                        AI draft
                      </span>
                    )}
                    {/* Rendered, not raw: a list of "$rac{3}{8}$" tells an
                        author nothing about the item they are looking for. */}
                    <RichText className="text-sm truncate block" text={tx(question.prompt)} />
                    <p className="text-xs text-faint mt-1 truncate">
                      {question.authorEmail ?? t("admin.unknownAuthor")}
                      {question.createdAt ? ` · ${formatWhen(question.createdAt)}` : ""}
                    </p>
                  </div>
                  <div className="ml-auto flex gap-1 shrink-0">
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => {
                        setDraft(toDraft(question));
                        setEditorOpen(true);
                        setNotice(null);
                        setError(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      {t("admin.edit")}
                    </button>
                    <button
                      className="btn btn-ghost text-xs text-danger"
                      onClick={() => setToDelete(question)}
                    >
                      {t("admin.delete")}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* Only offered when it would actually change what is on screen. */}
        {hidden > 0 && (
          <button className="btn btn-sm mt-4" onClick={() => setShowAllQuestions(true)}>
            {t("admin.showAll")} ({recentFirst.length})
          </button>
        )}
        {showAllQuestions && recentFirst.length > RECENT_COUNT && (
          <button className="btn btn-sm mt-4" onClick={() => setShowAllQuestions(false)}>
            {t("admin.showRecent")}
          </button>
        )}
      </section>
      </>
      )}

      {/* Each panel decides for itself whether the caller may see it — the API
          refuses a student, the policies refuse a student. */}
      {tab === "generate" && <GenerateQuestions />}

      {tab === "sections" && <SectionControls />}

      {/* Role management. Visible to admins as a read-only roster; only the
          owner sees the buttons, and only the database can actually grant. */}
      {tab === "people" && <PeopleManager />}

      {tab === "usage" && <UsageStats />}

      {tab === "feedback" && <FeedbackInbox />}

      {tab === "moderation" && <CommunityModeration />}

      {toDelete && (
        <ConfirmDialog
          title={t("admin.confirmDeleteTitle")}
          body={
            <>
              <span className="block text-foreground">{tx(toDelete.prompt)}</span>
              <span className="block mt-2">
                {toDelete.authorEmail
                  ? `${t("admin.writtenBy")} ${toDelete.authorEmail}`
                  : t("admin.unknownAuthor")}
                {toDelete.createdAt ? ` · ${formatWhen(toDelete.createdAt)}` : ""}
              </span>
              <span className="block mt-2">{t("admin.confirmDeleteBody")}</span>
            </>
          }
          confirmLabel={t("admin.delete")}
          cancelLabel={t("admin.cancel")}
          danger
          onConfirm={() => {
            deleteQuestion(toDelete.id);
            setToDelete(null);
            setError(null);
            setNotice(t("admin.deleted"));
          }}
          onCancel={() => setToDelete(null)}
        />
      )}
    </div>
  );
}
