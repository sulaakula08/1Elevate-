"use client";

import { useEffect, useState } from "react";
import type { CommunityPostType } from "@/data/community";
import { subjectsFor } from "@/data/exams";
import { useI18n } from "@/lib/i18n";
import { useCommunity, type CreatePostInput } from "@/lib/community-state";
import { useSendDelay } from "@/lib/send-delay";
import { Select } from "@/components/Select";

const SUBJECT_TYPES: CommunityPostType[] = ["question", "explanation", "study-update", "resource"];

/**
 * A question carried in from Practice.
 *
 * What is deliberately NOT here is the correct answer. Practice knows it, and
 * prefilling it would publish the key to a bank question that other students have
 * not attempted yet — the feed is the one place that undoes the review flow for
 * everyone at once. The composer's manual correct-answer field stays available,
 * so a student can still choose to say it about their own attempt; the difference
 * is that it becomes their decision rather than ours.
 */
export type ComposerPrefill = {
  /** The bank question's id, kept so the post can link back to Practice. */
  questionId: string;
  subjectId: string;
  topic?: string;
  /** The problem itself, shown read-only. */
  prompt: string;
  /** The letter the student picked, when they had answered before asking. */
  myAnswer?: string;
};

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

function canSubmit(type: CommunityPostType, form: FormState, prefill?: ComposerPrefill): boolean {
  switch (type) {
    case "question":
      /* Asked from Practice the problem is already there, so the post is
         publishable the moment it exists — a student who has nothing to add
         beyond "I am stuck on this" should not be blocked by an empty box. */
      return prefill ? true : form.text.trim().length > 0;
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

function toInput(
  type: CommunityPostType,
  form: FormState,
  prefill?: ComposerPrefill,
): CreatePostInput {
  const num = (s: string) => (s.trim() ? Number(s) : undefined);
  switch (type) {
    case "question":
      return {
        type,
        text: form.text,
        subjectId: prefill?.subjectId ?? form.subjectId,
        topic: prefill?.topic ?? (form.topic || undefined),
        question: {
          /* The problem is the prefilled prompt when there is one; otherwise
             payloadFor falls back to the body text, as it always has. */
          prompt: prefill?.prompt,
          questionId: prefill?.questionId,
          myAnswer: form.myAnswer || undefined,
          correctAnswer: form.correctAnswer || undefined,
        },
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
  prefill,
}: {
  initialType: CommunityPostType;
  onClose: () => void;
  /**
   * A question brought in from Practice. When present the problem is fixed and
   * shown read-only, the subject and topic come with it, and the body field
   * becomes the student's own context rather than the problem statement.
   */
  prefill?: ComposerPrefill;
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
  /* Seeded once on mount, which is also the only time it could matter: the
     parent mounts this component when the composer opens and unmounts it when it
     closes, so there is no stale-prop case to synchronise. */
  const [form, setForm] = useState<FormState>(() => {
    const base = emptyForm();
    if (!prefill) return base;
    return {
      ...base,
      subjectId: prefill.subjectId,
      topic: prefill.topic ?? "",
      myAnswer: prefill.myAnswer ?? "",
      // correctAnswer stays empty on purpose. See ComposerPrefill.
    };
  });

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
    if (!type || !canSubmit(type, form, prefill)) return;
    send(() => {
      createPost(toInput(type, form, prefill));
      onClose();
    });
  };

  const bodyField = (
    <label className="block">
      <span className="label">
        {type === "question"
          ? /* Asked from Practice the problem is already stated, so this field is
               no longer "your question" — it is what you make of it. */
            prefill
            ? t("community.composerAskContext")
            : t("community.composerQuestionBody")
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
            ? prefill
              ? "community.composerAskContextPlaceholder"
              : "community.composerBodyPlaceholderQuestion"
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
            {/*
              The problem, quoted and not editable.
              Read-only because it is not the author's text: it is a bank question
              they are asking about, and letting them retype it would let the post
              quote something the linked question does not say. It sits above the
              body field so the composer reads in the order the student thinks —
              here is the problem, here is what I do not understand.
            */}
            {prefill && (
              <div className="cm-ask-source">
                <p className="label-xs">{t("community.askSourceLabel")}</p>
                <blockquote className="cm-quote mt-2">{prefill.prompt}</blockquote>
                <p className="cm-ask-source-meta">
                  {tx(subjectsFor("sat").find((s) => s.id === prefill.subjectId)?.name)}
                  {prefill.topic && <> · {prefill.topic}</>}
                  {prefill.myAnswer && (
                    <>
                      {" · "}
                      {t("community.myAnswerLabel")}: <strong>{prefill.myAnswer}</strong>
                    </>
                  )}
                </p>
              </div>
            )}

            {(type === "question" || type === "post") && bodyField}

            {/* Subject and topic come with a prefilled question, so asking again
                would be asking the student to confirm what they cannot change. */}
            {SUBJECT_TYPES.includes(type) && !prefill && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="label">{t("community.composerSubject")}</span>
                  {/* The app's own list, not the operating system's: a native
                      option list ignores the theme entirely. */}
                  <Select
                    label={t("community.composerSubject")}
                    value={form.subjectId}
                    onChange={(next) => set("subjectId", next)}
                    options={subjectsFor("sat").map((subject) => ({
                      value: subject.id,
                      label: tx(subject.name),
                    }))}
                  />
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
              /*
                Prefilled, the student's own answer is already stated in the block
                above — so only the correct-answer field is offered, and it stays
                offered on purpose. It is the one place the key can appear, it
                arrives empty, and filling it is the author's decision about their
                own attempt rather than something Practice did for them.
              */
              <div className={prefill ? "block" : "grid grid-cols-2 gap-3"}>
                {!prefill && (
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
                )}
                <label className="block">
                  <span className="label">
                    {prefill
                      ? t("community.composerCorrectAnswerOptional")
                      : t("community.composerCorrectAnswer")}
                  </span>
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
                disabled={!canSubmit(type, form, prefill) || pending}
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
