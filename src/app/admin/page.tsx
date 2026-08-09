"use client";

import { useRef, useState } from "react";
import { SUBJECTS, getSubject } from "@/data/exams";
import { SEED_QUESTIONS } from "@/data";
import type { Difficulty, ExamId, LocalizedText, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { newId } from "@/lib/storage";
import { PeopleManager } from "@/components/PeopleManager";
import { FeedbackInbox } from "@/components/admin/FeedbackInbox";
import { UsageStats } from "@/components/admin/UsageStats";
import { QuestionView } from "@/components/QuestionView";
import { RichText } from "@/lib/math/markdown";
import { ConfirmDialog, EmptyState, PageTitle, RequireAccount } from "@/components/ui";

type Draft = {
  id: string;
  exam: ExamId;
  subjectId: string;
  topic: string;
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

function emptyDraft(): Draft {
  return {
    id: newId("q"),
    exam: "sat",
    subjectId: "sat-rw",
    topic: "",
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
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // The question the admin has asked to delete but not yet confirmed.
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
    topic: draft.topic.trim() || tx(getSubject(draft.subjectId)?.name),
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

  function submit(event: React.FormEvent) {
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
      topic: draft.topic.trim() || tx(getSubject(draft.subjectId)?.name),
      difficulty: draft.difficulty,
      passage: draft.passage.en.trim() ? clean(draft.passage) : undefined,
      prompt: clean(draft.prompt),
      choices: choices.map(clean),
      answer: Math.min(draft.answer, choices.length - 1),
      explanation: clean(draft.explanation),
      custom: true,
    };

    saveQuestion(question);
    setDraft(emptyDraft());
    setError(null);
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
              onChange={(e) => setDraft((prev) => ({ ...prev, subjectId: e.target.value }))}
            >
              {subjectOptions.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {tx(subject.name)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">{t("admin.topic")}</label>
            <input
              className="field"
              value={draft.topic}
              onChange={(e) => setDraft((prev) => ({ ...prev, topic: e.target.value }))}
            />
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

      <section>
        <h2 className="label-xs mb-4">
          {t("admin.yourQuestions")}
        </h2>
        {customQuestions.length === 0 ? (
          <EmptyState>—</EmptyState>
        ) : (
          <ul className="space-y-2">
            {customQuestions.map((question) => {
              const subject = getSubject(question.subjectId);
              return (
                <li key={question.id} className="flex items-start gap-3 py-3.5 border-b">
                  <div className="min-w-0">
                    <p className="text-xs text-muted">
                      {question.exam.toUpperCase()} · {subject ? tx(subject.name) : question.subjectId}{" "}
                      · {question.topic}
                    </p>
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
      </section>

      {/* How the product is being used, then who is using it, then what they
          have said about it. Each panel decides for itself whether the caller
          may see it — the API refuses a student, the policies refuse a student. */}
      <UsageStats />

      {/* Role management. Visible to admins as a read-only roster; only the
          owner sees the buttons, and only the database can actually grant. */}
      <PeopleManager />

      <FeedbackInbox />

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
