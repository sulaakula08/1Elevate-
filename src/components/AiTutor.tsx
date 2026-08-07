"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getSubject } from "@/data/exams";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { TutorAvatar, type TutorMood } from "./TutorAvatar";

type Turn = { role: "user" | "assistant"; content: string };

type Props = {
  question: Question;
  /** What the student picked, if they have answered. */
  chosenIndex?: number | null;
  /**
   * Controlled mode. The test surface owns its own "Ask the tutor" button in the
   * footer — a floating launcher would sit on top of the navigation there — so
   * it passes the open state in and suppresses the launcher.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Floating tutor that explains the current question, streaming its answer in. */
export function AiTutor({
  question,
  chosenIndex,
  open: openProp,
  onOpenChange,
}: Props) {
  const { t, tx } = useI18n();
  const controlled = openProp !== undefined;
  const [openState, setOpenState] = useState(false);
  const open = controlled ? openProp : openState;
  const setOpen = useCallback(
    (value: boolean) => {
      if (controlled) onOpenChange?.(value);
      else setOpenState(value);
    },
    [controlled, onOpenChange],
  );
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // A new question means a new conversation — the parent keys this component on
  // question.id, so a remount does the resetting. Just drop any live request.
  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight });
  }, [turns, streaming]);

  const ask = useCallback(
    async (text: string) => {
      if (streaming || !text.trim()) return;
      const history: Turn[] = [...turns, { role: "user", content: text.trim() }];
      setTurns([...history, { role: "assistant", content: "" }]);
      setDraft("");
      setError(null);
      setStreaming(true);

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const subject = getSubject(question.subjectId);
        const response = await fetch("/api/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: history,
            question: {
              exam: question.exam,
              subject: subject ? tx(subject.name) : question.subjectId,
              topic: question.topic,
              passage: question.passage ? tx(question.passage) : undefined,
              prompt: tx(question.prompt),
              choices: question.choices.map((choice) => tx(choice)),
              correctIndex: question.answer,
              officialExplanation: tx(question.explanation),
              chosenIndex: chosenIndex ?? null,
            },
          }),
        });

        if (!response.ok || !response.body) {
          const detail = await response.json().catch(() => null);
          setTurns(history);
          setError(
            response.status === 503 ? t("tutor.noKey") : detail?.error ?? "Request failed.",
          );
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setTurns([...history, { role: "assistant", content: answer }]);
        }
      } catch (caught) {
        if ((caught as Error).name !== "AbortError") {
          setTurns(history);
          setError((caught as Error).message);
        }
      } finally {
        setStreaming(false);
      }
    },
    [chosenIndex, question, streaming, t, turns, tx],
  );

  const lastAssistant = turns[turns.length - 1];
  const mood: TutorMood = !streaming
    ? "idle"
    : lastAssistant?.role === "assistant" && lastAssistant.content.length > 0
      ? "talking"
      : "thinking";

  const quickAsks = [
    t("tutor.explain"),
    t("tutor.hint"),
    ...(chosenIndex !== null && chosenIndex !== undefined && chosenIndex !== question.answer
      ? [t("tutor.whyWrong")]
      : []),
    t("tutor.simpler"),
  ];

  if (!open) {
    // Controlled callers draw their own trigger.
    if (controlled) return null;
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-full panel text-[13px] transition-colors hover:border-line-strong"
        style={{ boxShadow: "var(--overlay)" }}
      >
        <TutorAvatar mood="idle" size={22} />
        {t("tutor.open")}
      </button>
    );
  }

  return (
    <div
      className={`scale-in fixed right-5 z-30 ${
        controlled ? "bottom-20" : "bottom-5"
      } w-[min(23rem,calc(100vw-2.5rem))] panel flex flex-col overflow-hidden`}
      style={{ boxShadow: "var(--overlay)" }}
    >
      <div className="flex items-center gap-2.5 px-4 py-3 border-b">
        <TutorAvatar mood={mood} size={24} />
        <div className="min-w-0">
          <p className="text-[14px] font-medium">{t("tutor.name")}</p>
          <p className="text-[12px] text-faint truncate">
            {streaming ? t("tutor.thinking") : question.topic}
          </p>
        </div>
        <button
          className="btn btn-ghost btn-sm ml-auto"
          onClick={() => {
            abortRef.current?.abort();
            setOpen(false);
          }}
          aria-label={t("tutor.close")}
        >
          ✕
        </button>
      </div>

      <div ref={scrollRef} className="px-4 py-3 space-y-3 max-h-80 overflow-y-auto text-sm">
        {turns.length === 0 && (
          <p className="text-[13px] leading-relaxed text-muted">{t("tutor.greeting")}</p>
        )}

        {turns.map((turn, index) => (
          <div
            key={index}
            className={
              turn.role === "user"
                ? "ml-auto max-w-[85%] rounded-[10px] px-3 py-2 text-[13px] text-right"
                : "max-w-full text-[13px] whitespace-pre-wrap leading-[1.65]"
            }
            style={
              turn.role === "user"
                ? { background: "var(--surface-2)", color: "var(--foreground)" }
                : undefined
            }
          >
            {turn.content ||
              (turn.role === "assistant" && streaming ? (
                <span className="tutor-caret text-muted" />
              ) : null)}
          </div>
        ))}

        {error && (
          <p className="text-[12px] leading-relaxed" style={{ color: "var(--danger)" }}>
            {error}
          </p>
        )}
      </div>

      <div className="px-4 py-3 border-t space-y-2.5">
        <div className="flex flex-wrap gap-1.5">
          {quickAsks.map((label) => (
            <button
              key={label}
              disabled={streaming}
              onClick={() => ask(label)}
              className="px-2.5 py-1 rounded-full border text-[12px] text-muted transition-colors hover:text-foreground hover:border-foreground disabled:opacity-40"
            >
              {label}
            </button>
          ))}
        </div>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
        >
          <input
            className="field text-[13px]"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("tutor.placeholder")}
          />
          <button className="btn btn-primary btn-sm" disabled={streaming || !draft.trim()}>
            {t("tutor.send")}
          </button>
        </form>
      </div>
    </div>
  );
}
