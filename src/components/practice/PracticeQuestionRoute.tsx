"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo } from "react";
import type { PracticeSubjectId } from "@/lib/practice-routes";
import { practiceQuestionPath } from "@/lib/practice-routes";
import { useApp } from "@/lib/app-state";
import { shuffle } from "@/lib/stats";
import { RequireAccount } from "@/components/ui";
import { SectionGate } from "@/components/SectionGate";
import { PracticeRunner } from "@/components/PracticeRunner";
import { usePracticeSession } from "./PracticeSession";

type Props = {
  subjectId: PracticeSubjectId;
  title: string;
};

/**
 * Persistent subject-route shell. It lives in the static subject layout, so
 * changing only [questionId] keeps PracticeRunner mounted and preserves the
 * active session while Next.js adds normal browser-history entries.
 */
export function PracticeQuestionRoute({ subjectId, title }: Props) {
  const params = useParams<{ questionId?: string | string[] }>();
  const rawQuestionId = params.questionId;
  const questionId = Array.isArray(rawQuestionId) ? rawQuestionId[0] : rawQuestionId;

  return (
    <RequireAccount>
      <SectionGate section="practice">
        {questionId ? (
          <ResolvedPracticeQuestion
            key={subjectId}
            questionId={questionId}
            subjectId={subjectId}
            title={title}
          />
        ) : null}
      </SectionGate>
    </RequireAccount>
  );
}

function ResolvedPracticeQuestion({
  questionId,
  subjectId,
  title,
}: Props & { questionId: string }) {
  const router = useRouter();
  const { bank, bankReady } = useApp();
  const { session, startSession, clearSession } = usePracticeSession();

  const requestedQuestion = useMemo(
    () => bank.find((question) => question.id === questionId),
    [bank, questionId],
  );
  const subjectQuestions = useMemo(
    () => bank.filter((question) => question.subjectId === subjectId),
    [bank, subjectId],
  );
  const compatibleSession = useMemo(
    () =>
      session &&
      session.questions.some(
        (question) => question.id === questionId && question.subjectId === subjectId,
      )
        ? session
        : null,
    [questionId, session, subjectId],
  );

  useEffect(() => {
    if (
      compatibleSession ||
      !bankReady ||
      !requestedQuestion ||
      requestedQuestion.subjectId !== subjectId
    ) {
      return;
    }
    startSession({ questions: subjectQuestions, title });
  }, [
    bankReady,
    compatibleSession,
    requestedQuestion,
    startSession,
    subjectId,
    subjectQuestions,
    title,
  ]);

  const navigateToQuestion = useCallback(
    (nextQuestionId: string) => {
      const nextQuestion = bank.find(
        (question) => question.id === nextQuestionId && question.subjectId === subjectId,
      );
      const path = nextQuestion ? practiceQuestionPath(nextQuestion) : null;
      if (path) router.push(path, { scroll: false });
    },
    [bank, router, subjectId],
  );

  const exit = useCallback(() => {
    clearSession();
    router.push("/practice");
  }, [clearSession, router]);

  const restart = useCallback(() => {
    if (!compatibleSession) return;
    const restarted = startSession({
      questions: shuffle(compatibleSession.questions),
      title: compatibleSession.title,
    });
    const first = restarted.questions[0];
    const path = first ? practiceQuestionPath(first) : null;
    if (path) router.replace(path, { scroll: false });
  }, [compatibleSession, router, startSession]);

  if (!requestedQuestion && !bankReady) {
    return <QuestionRouteLoading />;
  }

  if (!requestedQuestion || requestedQuestion.subjectId !== subjectId) {
    return <QuestionRouteNotFound />;
  }

  if (!compatibleSession) {
    return <QuestionRouteLoading />;
  }

  return (
    <PracticeRunner
      key={compatibleSession.key}
      questions={compatibleSession.questions}
      activeQuestionId={questionId}
      mode="practice"
      title={compatibleSession.title}
      onQuestionChange={navigateToQuestion}
      onExit={exit}
      onRestart={restart}
    />
  );
}

function QuestionRouteLoading() {
  return (
    <div className="container-app space-y-3" aria-label="Loading question">
      <div className="skeleton h-9 w-1/2 rounded-lg" />
      <div className="skeleton h-4 w-2/3 rounded" />
      <div className="skeleton h-40 rounded-xl mt-6" />
    </div>
  );
}

function QuestionRouteNotFound() {
  return (
    <div className="max-w-sm mx-auto py-20 text-center fade-in">
      <p className="label-xs">Question not found</p>
      <h1 className="text-title mt-3">This practice question is unavailable.</h1>
      <p className="text-sm text-muted mt-3">
        The link may be incorrect, or the question may have been removed.
      </p>
      <Link href="/practice" className="btn btn-primary mt-6">
        Return to Practice
      </Link>
    </div>
  );
}
