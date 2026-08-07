"use client";

import { useRef, useState } from "react";
import { SUBJECTS, getSubject } from "@/data/exams";
import { SEED_QUESTIONS } from "@/data";
import type { Difficulty, ExamId, LocalizedText, Question } from "@/data/types";
import { useApp } from "@/lib/app-state";
import { useI18n } from "@/lib/i18n";
import { newId } from "@/lib/storage";
import { PeopleManager } from "@/components/PeopleManager";
import { EmptyState, PageTitle, RequireAccount } from "@/components/ui";

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

      <form onSubmit={submit} className="panel p-6 space-y-6">
        <div className="flex items-center gap-2">
          <h2 className="font-bold">
            {customQuestions.some((q) => q.id === draft.id)
              ? t("admin.editQuestion")
              : t("admin.newQuestion")}
          </h2>        </div>

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
        </div>

        <div>
          <label className="label">
            {t("admin.choices")} — {t("admin.markCorrect")}
          </label>
          <div className="space-y-2">
            {draft.choices.map((choice, index) => (
              <div key={index} className="flex items-center gap-2">
                <input
                  type="radio"
                  name="answer"
                  checked={draft.answer === index}
                  onChange={() => setDraft((prev) => ({ ...prev, answer: index }))}
                  aria-label={`${t("admin.markCorrect")} ${index + 1}`}
                />
                <input
                  className="field"
                  value={choice.en}
                  onChange={(e) => setChoice(index, e.target.value)}
                />
                {draft.choices.length > 2 && (
                  <button
                    type="button"
                    className="btn btn-ghost px-2"
                    onClick={() =>
                      setDraft((prev) => ({
                        ...prev,
                        choices: prev.choices.filter((_, i) => i !== index),
                        answer: prev.answer >= index && prev.answer > 0 ? prev.answer - 1 : prev.answer,
                      }))
                    }
                  >
                    ✕
                  </button>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            className="btn btn-ghost text-xs mt-2"
            onClick={() =>
              setDraft((prev) => ({ ...prev, choices: [...prev.choices, { ...EMPTY_TEXT }] }))
            }
          >
            +
          </button>
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
                    <p className="text-sm truncate">{tx(question.prompt)}</p>
                  </div>
                  <div className="ml-auto flex gap-1 shrink-0">
                    <button
                      className="btn btn-ghost text-xs"
                      onClick={() => {
                        setDraft(toDraft(question));
                        setNotice(null);
                        setError(null);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                    >
                      {t("admin.edit")}
                    </button>
                    <button
                      className="btn btn-ghost text-xs text-danger"
                      onClick={() => deleteQuestion(question.id)}
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

      {/* Role management. Visible to admins as a read-only roster; only the
          owner sees the buttons, and only the database can actually grant. */}
      <PeopleManager />
    </div>
  );
}
