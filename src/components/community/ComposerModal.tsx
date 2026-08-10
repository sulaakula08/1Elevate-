"use client";

import { useEffect, useState } from "react";
import type { CommunityPostType } from "@/data/community";
import { subjectsFor } from "@/data/exams";
import { useI18n } from "@/lib/i18n";
import { useCommunity, type CreatePostInput } from "@/lib/community-state";
import { useSendDelay } from "@/lib/send-delay";

const SUBJECT_TYPES: CommunityPostType[] = ["question", "explanation", "study-update", "resource"];

type FormState = {
  text: string;
  subjectId: string;
  topic: string;
  myAnswer: string;
  correctAnswer: string;
  fromScore: string;
  toScore: string;
  mathScore: string;
  rwScore: string;
  mockLabel: string;
  achievementTitle: string;
  explanationTitle: string;
  resourceTitle: string;
  questionsCompleted: string;
  accuracy: string;
};

function emptyForm(): FormState {
  return {
    text: "",
    subjectId: "sat-math",
    topic: "",
    myAnswer: "",
    correctAnswer: "",
    fromScore: "",
    toScore: "",
    mathScore: "",
    rwScore: "",
    mockLabel: "",
    achievementTitle: "",
    explanationTitle: "",
    resourceTitle: "",
    questionsCompleted: "",
    accuracy: "",
  };
}

function canSubmit(type: CommunityPostType, form: FormState): boolean {
  switch (type) {
    case "question":
      return form.text.trim().length > 0;
    case "progress":
      return form.fromScore.trim().length > 0 && form.toScore.trim().length > 0;
    case "achievement":
      return form.achievementTitle.trim().length > 0;
    case "explanation":
      return form.explanationTitle.trim().length > 0 && form.text.trim().length > 0;
    case "study-update":
      return form.questionsCompleted.trim().length > 0 && form.accuracy.trim().length > 0;
    case "resource":
      return form.resourceTitle.trim().length > 0;
    default:
      return false;
  }
}

function toInput(type: CommunityPostType, form: FormState): CreatePostInput {
  const num = (s: string) => (s.trim() ? Number(s) : undefined);
  switch (type) {
    case "question":
      return {
        type,
        text: form.text,
        subjectId: form.subjectId,
        topic: form.topic || undefined,
        question: { myAnswer: form.myAnswer || undefined, correctAnswer: form.correctAnswer || undefined },
      };
    case "progress":
      return {
        type,
        text: form.text,
        progress: {
          fromScore: num(form.fromScore) ?? 0,
          toScore: num(form.toScore) ?? 0,
          mathScore: num(form.mathScore),
          readingWritingScore: num(form.rwScore),
          mockLabel: form.mockLabel || undefined,
        },
      };
    case "achievement":
      return {
        type,
        text: form.text,
        achievement: { title: form.achievementTitle, detail: form.text || undefined, emoji: "🏅" },
      };
    case "explanation":
      return {
        type,
        text: form.text,
        subjectId: form.subjectId,
        topic: form.topic || undefined,
        explanation: { title: form.explanationTitle, body: form.text },
      };
    case "study-update":
      return {
        type,
        text: form.text,
        subjectId: form.subjectId,
        topic: form.topic || undefined,
        studyUpdate: {
          questionsCompleted: num(form.questionsCompleted) ?? 0,
          accuracy: Math.min(100, Math.max(0, num(form.accuracy) ?? 0)) / 100,
        },
      };
    case "resource":
    default:
      return {
        type,
        text: form.text,
        subjectId: form.subjectId,
        topic: form.topic || undefined,
        resource: { title: form.resourceTitle, note: form.text },
      };
  }
}

/**
 * Two-step composer: pick a post type, then a short type-specific form. Opens
 * as a bottom sheet on phones and a centred dialog from `sm` up — the shared
 * `Modal` primitive in components/motion.tsx is fixed at max-w-sm, too narrow
 * for a multi-field form, so this owns its own backdrop/escape/scroll-lock.
 */
export function ComposerModal({
  initialType,
  onClose,
}: {
  initialType: CommunityPostType;
  onClose: () => void;
}) {
  const { t, tx } = useI18n();
  const { createPost } = useCommunity();
  const { pending, send } = useSendDelay();
  // The parent only mounts this component while the composer is open (see
  // app/community/page.tsx), so a fresh mount is exactly when state should
  // reset — no effect needed to sync it with an `open` flag.
  /*
   * The type is decided before this modal opens — the entry composer sends
   * either "post" or "question" — so there is no null state and no picker to
   * come back to. That screen is what the change removed.
   */
  const type = initialType;
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((previous) => ({ ...previous, [key]: value }));

  const submit = () => {
    if (!type || !canSubmit(type, form)) return;
    send(() => {
      createPost(toInput(type, form));
      onClose();
    });
  };

  const bodyField = (
    <label className="block">
      <span className="label">
        {type === "question"
          ? t("community.composerQuestionBody")
          : type === "post"
            ? t("community.composerPostBody")
            : type === "achievement"
              ? t("community.composerDetail")
              : t("community.composerBody")}
      </span>
      <textarea
        className="field cm-textarea"
        rows={type === "question" || type === "post" ? 5 : 3}
        value={form.text}
        onChange={(event) => set("text", event.target.value)}
        placeholder={t(
          type === "question"
            ? "community.composerBodyPlaceholderQuestion"
            : type === "post"
              ? "community.composerPostBody"
              : type === "explanation"
                ? "community.composerBodyPlaceholderExplanation"
                : "community.composerBodyPlaceholderGeneric",
        )}
      />
    </label>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center fade-in"
      style={{ background: "color-mix(in srgb, #131316 45%, transparent)" }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="composer-title"
    >
      <div
        className="cm-composer scale-in"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 pt-5 pb-3">
          <h2 id="composer-title" className="text-body font-semibold flex-1 min-w-0 truncate">
            {t(type === "question" ? "community.postTypeQuestion" : "community.composerCreateTitle")}
          </h2>
          <button type="button" className="bar-btn" onClick={onClose} aria-label={t("community.composerCancel")}>
            <span aria-hidden>✕</span>
          </button>
        </div>

        <div className="cm-composer-body px-5 pb-5">
          <div className="space-y-3.5">
            {(type === "question" || type === "post") && bodyField}

            {SUBJECT_TYPES.includes(type) && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">{t("community.composerSubject")}</span>
                  <select
                    className="field"
                    value={form.subjectId}
                    onChange={(event) => set("subjectId", event.target.value)}
                  >
                    {subjectsFor("sat").map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {tx(subject.name)}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="label">{t("community.composerTopic")}</span>
                  <input
                    type="text"
                    className="field"
                    value={form.topic}
                    onChange={(event) => set("topic", event.target.value)}
                  />
                </label>
              </div>
            )}

            {type === "question" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">{t("community.composerMyAnswer")}</span>
                  <input
                    type="text"
                    maxLength={8}
                    inputMode="text"
                    className="field"
                    placeholder={t("community.composerAnswerHint")}
                    value={form.myAnswer}
                    onChange={(event) => set("myAnswer", event.target.value.toUpperCase())}
                  />
                </label>
                <label className="block">
                  <span className="label">{t("community.composerCorrectAnswer")}</span>
                  <input
                    type="text"
                    maxLength={8}
                    inputMode="text"
                    className="field"
                    placeholder={t("community.composerAnswerHint")}
                    value={form.correctAnswer}
                    onChange={(event) => set("correctAnswer", event.target.value.toUpperCase())}
                  />
                </label>
              </div>
            )}

            {type === "progress" && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="label">{t("community.composerFromScore")}</span>
                    <input
                      type="number"
                      min={400}
                      max={1600}
                      className="field"
                      value={form.fromScore}
                      onChange={(event) => set("fromScore", event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="label">{t("community.composerToScore")}</span>
                    <input
                      type="number"
                      min={400}
                      max={1600}
                      className="field"
                      value={form.toScore}
                      onChange={(event) => set("toScore", event.target.value)}
                    />
                  </label>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="label">{t("community.composerMathScore")}</span>
                    <input
                      type="number"
                      min={200}
                      max={800}
                      className="field"
                      value={form.mathScore}
                      onChange={(event) => set("mathScore", event.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="label">{t("community.composerRwScore")}</span>
                    <input
                      type="number"
                      min={200}
                      max={800}
                      className="field"
                      value={form.rwScore}
                      onChange={(event) => set("rwScore", event.target.value)}
                    />
                  </label>
                </div>
                <label className="block">
                  <span className="label">{t("community.composerMockLabel")}</span>
                  <input
                    type="text"
                    className="field"
                    value={form.mockLabel}
                    onChange={(event) => set("mockLabel", event.target.value)}
                  />
                </label>
              </>
            )}

            {type === "achievement" && (
              <label className="block">
                <span className="label">{t("community.composerAchievementTitle")}</span>
                <input
                  type="text"
                  className="field"
                  value={form.achievementTitle}
                  onChange={(event) => set("achievementTitle", event.target.value)}
                />
              </label>
            )}

            {type === "explanation" && (
              <label className="block">
                <span className="label">{t("community.composerExplanationTitle")}</span>
                <input
                  type="text"
                  className="field"
                  value={form.explanationTitle}
                  onChange={(event) => set("explanationTitle", event.target.value)}
                />
              </label>
            )}

            {type === "study-update" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">{t("community.composerQuestionsCount")}</span>
                  <input
                    type="number"
                    min={1}
                    className="field"
                    value={form.questionsCompleted}
                    onChange={(event) => set("questionsCompleted", event.target.value)}
                  />
                </label>
                <label className="block">
                  <span className="label">{t("community.composerAccuracy")}</span>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="field"
                    value={form.accuracy}
                    onChange={(event) => set("accuracy", event.target.value)}
                  />
                </label>
              </div>
            )}

            {type === "resource" && (
              <label className="block">
                <span className="label">{t("community.composerResourceTitle")}</span>
                <input
                  type="text"
                  className="field"
                  value={form.resourceTitle}
                  onChange={(event) => set("resourceTitle", event.target.value)}
                />
              </label>
            )}

            {/* Asked last for every other type; asked first for a question,
                because the problem is the post. It used to sit under
                "Details" below the answer letters, so the composer asked what
                you picked before it asked what you were stuck on. */}
            {type !== "question" && type !== "post" && bodyField}

            <div className="flex items-center justify-end gap-2 pt-1">
              <button type="button" className="btn" onClick={onClose} disabled={pending}>
                {t("community.composerCancel")}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                disabled={!canSubmit(type, form) || pending}
                onClick={submit}
              >
                {pending ? t("community.posting") : t("community.composerPost")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
