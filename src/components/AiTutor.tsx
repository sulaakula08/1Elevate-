"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Question } from "@/data/types";
import { useI18n } from "@/lib/i18n";
import { RichText } from "@/lib/math/markdown";
import { apiFetch } from "@/lib/supabase/client";
import { TutorAvatar, type TutorMood } from "./TutorAvatar";

/**
 * `done` is what makes a finished answer immune to re-animation: the reveal
 * state lives inside <Typed>, which is only mounted for a turn that is still
 * being written. A turn flips to done exactly once and never back, so a
 * re-render — a new message, a resize, a theme change — cannot restart type-out
 * on something the student has already read.
 */
type Turn = { id: number; role: "user" | "assistant"; content: string; done: boolean };

type Props = {
  question: Question;
  /** What the student picked, if they have answered. */
  chosenIndex?: number | null;
  /**
   * Controlled mode. The test surface draws its own "Ask the tutor" button in
   * the footer — a floating launcher would sit on top of the navigation there —
   * so it passes the open state in and the launcher is suppressed.
   */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

/** Characters revealed per second. Fast enough to keep up, slow enough to read. */
const CHARS_PER_SECOND = 220;

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Progressive reveal of a string that is still growing.
 *
 * The loop only runs while there is something left to reveal and cancels the
 * moment it catches up, so a panel sitting idle — or one whose answer has
 * finished — costs no frames. Under reduced motion no loop is ever scheduled.
 */
function Typed({ text, skip }: { text: string; skip: boolean }) {
  const [revealed, setRevealed] = useState(0);
  // Skipping is a derived view of the same state rather than a write to it, so
  // pressing "show it all" cannot race the frame loop into an inconsistent
  // position — the loop simply stops being consulted.
  const instant = skip || prefersReducedMotion();
  const shown = instant ? text.length : revealed;

  useEffect(() => {
    if (instant || revealed >= text.length) return;

    let frame = 0;
    let previous = 0;
    const tick = (now: number) => {
      const elapsed = previous ? now - previous : 16;
      previous = now;
      let caughtUp = false;
      setRevealed((current) => {
        const next = Math.min(text.length, current + (elapsed * CHARS_PER_SECOND) / 1000);
        caughtUp = next >= text.length;
        return next;
      });
      if (!caughtUp) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [text, revealed, instant]);

  // Cutting mid-token would make a formula flicker between "parse failed" and
  // "parsed" as its closing delimiter arrives, so the reveal stops at the last
  // completed maths span rather than at an arbitrary character.
  const raw = text.slice(0, Math.floor(shown));
  const opened = Math.max(raw.lastIndexOf("\\("), raw.lastIndexOf("\\["), raw.lastIndexOf("$$"));
  const closed = Math.max(raw.lastIndexOf("\\)"), raw.lastIndexOf("\\]"));
  const safe = opened > closed ? raw.slice(0, opened) : raw;

  return <RichText text={safe} block />;
}

/** A completed turn. No reveal state exists here at all — that is the point. */
function Done({ text }: { text: string }) {
  return <RichText text={text} block />;
}

export function AiTutor({ question, chosenIndex, open: openProp, onOpenChange }: Props) {
  const { t } = useI18n();
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
  const [skip, setSkip] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  /** The question that produced the last error, so retry doesn't need retyping. */
  const [lastAsk, setLastAsk] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const nextId = useRef(0);
  /** Auto-scroll is a convenience, not a hijack: it stops once you scroll up. */
  const stick = useRef(true);

  useEffect(() => () => abortRef.current?.abort(), []);

  useEffect(() => {
    const node = scrollRef.current;
    if (!node || !stick.current) return;
    node.scrollTop = node.scrollHeight;
  });

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (streaming || !trimmed) return;

      const history = turns.map(({ role, content }) => ({ role, content }));
      const sent: Turn = { id: nextId.current++, role: "user", content: trimmed, done: true };
      const reply: Turn = { id: nextId.current++, role: "assistant", content: "", done: false };

      setTurns((previous) => [...previous, sent, reply]);
      setDraft("");
      setError(null);
      setLastAsk(trimmed);
      setSkip(false);
      setStreaming(true);
      stick.current = true;

      const controller = new AbortController();
      abortRef.current = controller;

      /** Marks the reply done and leaves whatever had arrived on screen. */
      const settle = () =>
        setTurns((previous) =>
          previous.map((turn) => (turn.id === reply.id ? { ...turn, done: true } : turn)),
        );

      try {
        /*
         * An id and what the student picked. Nothing else.
         *
         * The whole question used to go up, including the correct index and the
         * official explanation — which is only possible if the browser already has
         * them, and is the reason it used to. The route reads the question from the
         * bank itself now, so asking the tutor about a question no longer requires
         * knowing its answer.
         */
        const response = await apiFetch("/api/explain", {
          method: "POST",
          headers: { "content-type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            messages: [...history, { role: "user", content: trimmed }],
            questionId: question.id,
            chosenIndex: chosenIndex ?? null,
          }),
        });

        if (!response.ok || !response.body) {
          // Drop the empty reply — an error is not a turn in the conversation.
          setTurns((previous) => previous.filter((turn) => turn.id !== reply.id));
          setError(response.status === 503 ? t("study.tutorNoKey") : t("study.tutorFailed"));
          return;
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let answer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          answer += decoder.decode(value, { stream: true });
          setTurns((previous) =>
            previous.map((turn) => (turn.id === reply.id ? { ...turn, content: answer } : turn)),
          );
        }
        settle();
      } catch (caught) {
        if ((caught as Error).name === "AbortError") {
          settle();
          return;
        }
        if (process.env.NODE_ENV !== "production") console.error("[tutor]", caught);
        setTurns((previous) => previous.filter((turn) => turn.id !== reply.id));
        setError(t("study.tutorFailed"));
      } finally {
        setStreaming(false);
      }
    },
    [chosenIndex, question, streaming, t, turns],
  );

  const copy = useCallback(async (turn: Turn) => {
    try {
      await navigator.clipboard.writeText(turn.content);
      setCopied(turn.id);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      // A clipboard the browser refuses is not worth an error state.
    }
  }, []);

  const pending = turns[turns.length - 1];
  const writing = streaming && pending?.role === "assistant";
  const mood: TutorMood = !streaming ? "idle" : pending?.content ? "talking" : "thinking";

  const quickAsks = [
    t("tutor.explain"),
    t("tutor.hint"),
    /* Only once the question has been graded: before that the client has no
       answer to compare against, and offering "why was mine wrong" for an
       answer nobody has checked would be guessing. */
    ...(chosenIndex !== null &&
    chosenIndex !== undefined &&
    question.answer !== undefined &&
    chosenIndex !== question.answer
      ? [t("tutor.whyWrong")]
      : []),
    t("tutor.simpler"),
  ];

  if (!open) {
    // A controlled caller draws its own trigger.
    if (controlled) return null;
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-5 right-5 z-30 flex items-center gap-2.5 pl-2.5 pr-4 py-2 rounded-[var(--radius-pill)] panel text-sm transition-colors hover:border-line-strong"
        style={{ boxShadow: "var(--overlay)" }}
      >
        <TutorAvatar mood="idle" size={22} />
        {t("study.tutorOpen")}
      </button>
    );
  }

  return (
    <div
      className={`scale-in tutor-panel fixed right-5 z-30 w-[min(23rem,calc(100vw-2.5rem))] ${
        controlled ? "bottom-20" : "bottom-5"
      }`}
      role="dialog"
      aria-label={t("study.tutorName")}
    >
      <div className="flex items-center gap-2.5 px-4 py-3 border-b">
        <TutorAvatar mood={mood} size={24} />
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight">{t("study.tutorName")}</p>
          <p className="text-micro text-faint truncate" aria-live="polite">
            {!streaming
              ? t("study.tutorRole")
              : pending?.content
                ? t("study.tutorWriting")
                : t("study.tutorThinking")}
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

      <div
        ref={scrollRef}
        className="px-4 py-3.5 space-y-3.5 max-h-80 overflow-y-auto"
        onScroll={(event) => {
          const node = event.currentTarget;
          stick.current = node.scrollHeight - node.scrollTop - node.clientHeight < 48;
        }}
      >
        {turns.length === 0 && !error && (
          <p className="text-sm leading-relaxed text-muted">{t("study.tutorGreeting")}</p>
        )}

        {turns.map((turn) =>
          turn.role === "user" ? (
            <p key={turn.id} className="tutor-turn-user">
              {turn.content}
            </p>
          ) : (
            <div key={turn.id} className="tutor-turn-bot">
              <p className="tutor-turn-name">
                {t("study.tutorName")}
                {turn.done && turn.content && (
                  <button
                    className="tutor-copy btn btn-ghost btn-sm ml-auto !py-0 !px-1.5 !text-2xs"
                    onClick={() => copy(turn)}
                  >
                    {copied === turn.id ? t("study.tutorCopied") : t("study.tutorCopy")}
                  </button>
                )}
              </p>
              {turn.done ? (
                <Done text={turn.content} />
              ) : turn.content ? (
                <Typed text={turn.content} skip={skip} />
              ) : (
                <span className="tutor-thinking" aria-label={t("study.tutorThinking")}>
                  <span />
                  <span />
                  <span />
                </span>
              )}
            </div>
          ),
        )}

        {error && (
          <div className="space-y-2">
            <p className="text-micro leading-relaxed" style={{ color: "var(--danger)" }}>
              {error}
            </p>
            {lastAsk && (
              <button className="btn btn-sm" onClick={() => ask(lastAsk)}>
                {t("study.tutorRetry")}
              </button>
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-t space-y-2.5">
        {writing ? (
          <div className="flex gap-1.5">
            <button className="tutor-quick" onClick={() => setSkip(true)} disabled={skip}>
              {t("study.tutorSkip")}
            </button>
            <button className="tutor-quick" onClick={() => abortRef.current?.abort()}>
              {t("study.tutorStop")}
            </button>
          </div>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {quickAsks.map((label) => (
              <button key={label} className="tutor-quick" onClick={() => ask(label)}>
                {label}
              </button>
            ))}
          </div>
        )}

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            ask(draft);
          }}
        >
          <input
            className="field text-sm"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            placeholder={t("tutor.placeholder")}
            aria-label={t("tutor.placeholder")}
          />
          <button className="btn btn-primary btn-sm" disabled={streaming || !draft.trim()}>
            {t("tutor.send")}
          </button>
        </form>
      </div>
    </div>
  );
}
