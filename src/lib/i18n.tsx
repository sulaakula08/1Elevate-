"use client";

import React, { createContext, useCallback, useContext } from "react";
import type { LocalizedText } from "@/data/types";

/**
 * The product is English-only: the SAT is an English exam, so the interface,
 * the item bank and the tutor all speak one language. `t`/`tx` stay as the
 * lookup layer — a single dictionary is still the cleanest place to keep copy.
 */
type Dict = Record<string, { en: string }>;

const D: Dict = {
  "app.tagline": {
    en: "Everything you need for the SAT, in one place",
  },
  "nav.home": { en: "Home" },
  "nav.practice": { en: "Practice" },
  "nav.mock": { en: "Mock test" },
  "nav.review": { en: "Review" },
  "nav.progress": { en: "Progress" },
  "nav.admin": { en: "Admin" },
  "nav.more": { en: "More" },
  /* Short labels for the mobile tab bar, where space is ~70px. */
  "nav.sHome": { en: "Home" },
  "nav.sPractice": { en: "Practice" },
  "nav.sMock": { en: "Mock" },
  "nav.sReview": { en: "Review" },
  "nav.tutorial": { en: "Tutorial" },
  "nav.profile": { en: "Profile" },
  "nav.bank": { en: "Question Bank" },
  "nav.settings": { en: "Settings" },

  /* ---------------- sidebar groups ---------------- */
  "side.practice": { en: "Practice" },
  "side.progress": { en: "Progress" },
  "side.learn": { en: "Learn" },
  "side.manage": { en: "Manage" },

  /* ---------------- dashboard: bank + analytics ---------------- */
  "bank.title": { en: "Question Bank" },
  "bank.solved": { en: "solved" },
  "bank.of": { en: "of" },
  "bank.open": { en: "Open" },
  "bank.allSubjects": { en: "All subjects" },

  "an.title": { en: "Question Analytics" },
  "an.viewAll": { en: "View all analytics" },
  "an.attempted": { en: "Questions attempted" },
  "an.accuracy": { en: "Current accuracy" },
  "an.queue": { en: "In review queue" },
  "an.streak": { en: "Study streak" },
  "an.trend": { en: "Activity trend" },
  "an.openQueue": { en: "Open queue" },
  "an.last14": { en: "last 14 days" },
  "an.noActivity": {
    en: "Nothing yet — your first session will show up here.",
  },

  /* ---------------- tutorial ---------------- */
  "tour.skip": { en: "Skip" },
  "tour.next": { en: "Next" },
  "tour.done": { en: "Got it" },
  "tour.step": { en: "Step" },
  "tour.t1": { en: "This is your home base" },
  "tour.d1": {
    en: "Your score against your target, your streak, and what to fix next — all in one place.",
  },
  "tour.t2": { en: "Practise by subject" },
  "tour.d2": {
    en: "Ten questions a session. We put the ones you got wrong first, and every answer comes with an explanation.",
  },
  "tour.t3": { en: "Sit a real mock" },
  "tour.d3": {
    en: "Official structure and timing: 98 questions in 2 h 14 min, across four adaptive modules.",
  },
  "tour.t4": { en: "Stuck? Ask the tutor" },
  "tour.d4": {
    en: "The AI tutor explains any question step by step — or gives just a hint if you'd rather work it out.",
  },
  "tour.t5": { en: "Track what's improving" },
  "tour.d5": {
    en: "Accuracy per subject and topic, a review queue built from your mistakes, and your mock score trend.",
  },
  "tour.replay": { en: "Replay the tour" },

  "tutorial.title": {
    en: "How 1Elevate works",
  },
  "tutorial.sub": {
    en: "Four minutes now saves you a lot of guessing later. Try the demo question at the bottom.",
  },
  "tutorial.demoTitle": { en: "Try it: a real practice question" },
  "tutorial.demoHint": {
    en: "Pick an answer, then check it. This is exactly what a practice session looks like.",
  },
  "tutorial.startTour": { en: "Start the guided tour" },
  "tutorial.formatTitle": { en: "The format we follow" },
  "tutorial.satFormat": {
    en: "SAT — 98 questions, 2 h 14 min. Reading & Writing (54) and Math (44), each in two modules, scored 400–1600.",
  },
  "tutorial.sourceNote": {
    en: "Questions are written by us to match the official blueprints — we don't reproduce copyrighted exam papers.",
  },

  "auth.signIn": { en: "Sign in" },
  "auth.signOut": { en: "Sign out" },
  "auth.signUp": { en: "Create account" },
  "auth.name": { en: "Name" },
  "auth.pin": { en: "PIN (4+ characters)" },
  "auth.haveAccount": { en: "I already have an account" },
  "auth.noAccount": { en: "I need an account" },
  "auth.wrongPin": { en: "Wrong name or PIN." },
  "auth.nameTaken": { en: "That name is already used." },
  "auth.pinShort": { en: "PIN must be at least 4 characters." },
  "auth.profilesHere": {
    en: "Profiles on this device",
  },
  "auth.required": {
    en: "Sign in to track your progress.",
  },
  "auth.localNote": {
    en: "Accounts are stored in this browser only — this is a local build, not a secure server login.",
  },
  "auth.firstAdmin": {
    en: "The first account created becomes the admin.",
  },

  /* ---------------- landing ---------------- */
  "landing.badge": {
    en: "Built in Kazakhstan · by Mentoria Organization",
  },
  "landing.titleA": { en: "Prepare for the SAT" },
  "landing.titleB": { en: "with a plan, not guesswork" },
  "landing.sub": {
    en: "A question bank written to the official blueprint, full-length mocks with real module timing, and analytics that name the topics costing you points — with an AI tutor that explains any question the moment you are stuck.",
  },
  "landing.start": { en: "Start free" },
  "landing.haveAccount": { en: "I have an account" },
  "landing.noCard": {
    en: "No card, no email confirmation — 30 seconds and you're in.",
  },
  "landing.subjectsHeadline": {
    en: "Two sections. Two very different kinds of thinking.",
  },
  "landing.mathBlurb": {
    en: "Algebra, advanced math, problem solving and geometry — worked through until the graph makes sense.",
  },
  "landing.verbalBlurb": {
    en: "Reading closely, using evidence, and revising sentences until the writing is clear.",
  },
  "landing.markCaption": {
    en: "Tap the mark — 1600 is the perfect SAT score.",
  },
  "landing.statQuestions": { en: "questions" },
  "landing.statSubjects": { en: "subjects" },
  "landing.statModules": { en: "adaptive modules" },
  "landing.statMinutes": { en: "minutes per mock" },

  "landing.featuresEyebrow": { en: "Everything in one place" },
  "landing.featuresTitle": {
    en: "Four things that actually move your score",
  },
  "landing.f1Title": { en: "Adaptive question bank" },
  "landing.f1Text": {
    en: "Every session pulls the questions you missed and the ones you've never seen first. Full explanations on every answer.",
  },
  "landing.f2Title": { en: "Timed mock exams" },
  "landing.f2Text": {
    en: "Real SAT structure, module timers that auto-submit, and a 400–1600 score report.",
  },
  "landing.f3Title": { en: "AI tutor on every task" },
  "landing.f3Text": {
    en: "Stuck? It explains the step you're missing, gives hints instead of answers, and takes follow-up questions.",
  },
  "landing.f4Title": { en: "Analytics that name the gap" },
  "landing.f4Text": {
    en: "Accuracy per subject and per topic, a review queue built from your mistakes, streaks and a score trend.",
  },

  "landing.howEyebrow": { en: "How it works" },
  "landing.howTitle": { en: "Three steps to your first mock score" },
  "landing.s1Title": { en: "Create your profile" },
  "landing.s1Text": {
    en: "Name, email and the score you're aiming for. Takes half a minute.",
  },
  "landing.s2Title": { en: "Practise with the tutor" },
  "landing.s2Text": {
    en: "Ten questions per session, instant feedback, and an explanation whenever you want one.",
  },
  "landing.s3Title": { en: "Sit a full mock" },
  "landing.s3Text": {
    en: "Same timing as the real thing, then a score report that shows exactly which section cost you points.",
  },

  "landing.subjectsTitle": { en: "Subjects covered" },
  "landing.ctaTitle": {
    en: "1600 is closer than it looks",
  },
  "landing.ctaText": {
    en: "Start with one practice session today. The analytics will tell you what to fix tomorrow.",
  },

  /* ---------------- signup wizard ---------------- */
  "signup.title": { en: "Create your profile" },
  "signup.step": { en: "Step" },
  "signup.of": { en: "of" },
  "signup.s1": { en: "About you" },
  "signup.s2": { en: "Your goal" },
  "signup.s3": { en: "Security" },
  "signup.email": { en: "Email" },
  "signup.grade": { en: "Grade / year" },
  "signup.targetScore": { en: "Target score" },
  "signup.scoreHint": {
    en: "You can change this any time in your profile.",
  },
  "signup.confirmPin": { en: "Repeat PIN" },
  "signup.graduate": { en: "Graduate" },
  "signup.next": { en: "Continue" },
  "signup.back": { en: "Back" },
  "signup.finish": { en: "Create profile" },
  "signup.errName": { en: "Enter a name of at least 2 characters." },
  "signup.errEmail": { en: "Enter a valid email address." },
  "signup.errPinMatch": { en: "The PINs don't match." },
  "signup.strength": { en: "PIN strength" },
  "signup.weak": { en: "weak" },
  "signup.ok": { en: "ok" },
  "signup.strong": { en: "strong" },
  "signup.welcome": {
    en: "Welcome to 1Elevate!",
  },
  "signup.localNotice": {
    en: "This profile is stored in this browser only — it is not a cloud account, so anyone using this device can open it.",
  },
  "home.greeting": { en: "Welcome back" },
  "home.targetScore": { en: "Target score" },
  "home.toGoal": { en: "to your goal" },
  "home.quickActions": { en: "Jump back in" },
  "dash.practiceHint": {
    en: "10 questions, instant feedback",
  },
  "dash.mockHint": {
    en: "Official structure and timing",
  },
  "dash.reviewHint": {
    en: "Everything you got wrong",
  },
  "dash.progressHint": {
    en: "Accuracy by subject and topic",
  },
  "home.continue": { en: "Continue practising" },
  "home.startMock": { en: "Take a mock test" },
  "home.weakest": { en: "Weakest topics" },
  "home.noWeak": {
    en: "Answer some questions and your weak topics will show up here.",
  },

  "practice.title": { en: "Practice by subject" },
  "practice.pickSubject": { en: "Pick a subject to start." },
  "practice.questions": { en: "questions" },
  "practice.accuracy": { en: "accuracy" },
  "practice.start": { en: "Start" },
  "practice.empty": {
    en: "No questions in this subject yet. Add some in the admin editor.",
  },

  "quiz.question": { en: "Question" },
  "quiz.of": { en: "of" },
  "quiz.check": { en: "Check answer" },
  "quiz.next": { en: "Next" },
  "quiz.finish": { en: "Finish" },
  "quiz.correct": { en: "Correct" },
  "quiz.incorrect": { en: "Incorrect" },
  "quiz.explanation": { en: "Explanation" },
  "quiz.exit": { en: "Exit" },
  "quiz.result": { en: "Result" },
  "quiz.again": { en: "Practise again" },
  "quiz.difficulty": { en: "Difficulty" },
  "diff.1": { en: "Easy" },
  "diff.2": { en: "Medium" },
  "diff.3": { en: "Hard" },
  "diff.all": { en: "All levels" },
  "diff.byLevel": { en: "By difficulty" },
  "diff.noneAtLevel": {
    en: "No questions at this level yet — pick another.",
  },
  "quiz.answered": { en: "answered" },

  "mock.title": { en: "Full timed mock test" },
  "mock.structure": { en: "Structure" },
  "mock.begin": { en: "Begin test" },
  "mock.section": { en: "Section" },
  "mock.module": { en: "Module" },
  "mock.timeLeft": { en: "Time left" },
  "mock.submitSection": { en: "Submit section" },
  "mock.timeUp": { en: "Time is up — moving on." },
  "mock.scoreReport": { en: "Score report" },
  "mock.estimated": { en: "Estimated score" },
  "mock.perSection": { en: "By section" },
  "mock.reviewMistakes": { en: "Review mistakes" },
  "mock.notEnough": {
    en: "Not enough questions in the bank for a full test — the sections below were shortened.",
  },
  "mock.history": { en: "Past mock tests" },
  "mock.noHistory": { en: "No mock tests yet." },

  "review.title": { en: "Review queue" },
  "review.desc": {
    en: "Questions you got wrong, hardest first. Answer one correctly twice in a row and it leaves the queue.",
  },
  "review.empty": {
    en: "Nothing to review. Well done.",
  },
  "review.start": { en: "Start review" },

  "progress.title": { en: "Your progress" },
  "progress.totalAnswered": { en: "Questions answered" },
  "progress.overallAccuracy": { en: "Overall accuracy" },
  "progress.streak": { en: "Day streak" },
  "progress.mocksTaken": { en: "Mock tests taken" },
  "progress.bySubject": { en: "By subject" },
  "progress.byTopic": { en: "By topic" },
  "progress.scoreTrend": { en: "Mock score trend" },
  "progress.last14": { en: "Activity, last 14 days" },
  "progress.noData": {
    en: "No data yet — answer a few questions first.",
  },
  "progress.needMoreMocks": {
    en: "Take at least two mock tests to see a trend.",
  },

  "admin.title": { en: "Content editor" },
  "admin.onlyAdmin": {
    en: "Only the admin account can open this page.",
  },
  "admin.newQuestion": { en: "New question" },
  "admin.editQuestion": { en: "Edit question" },
  "admin.exam": { en: "Exam" },
  "admin.subject": { en: "Subject" },
  "admin.topic": { en: "Topic" },
  "admin.passage": { en: "Passage (optional)" },
  "admin.prompt": { en: "Question" },
  "admin.choices": { en: "Answer choices" },
  "admin.markCorrect": { en: "Mark the correct choice" },
  "admin.explanationLabel": { en: "Explanation" },
  "admin.save": { en: "Save question" },
  "admin.cancel": { en: "Cancel" },
  "admin.delete": { en: "Delete" },
  "admin.edit": { en: "Edit" },
  "admin.yourQuestions": { en: "Questions you added" },
  "admin.builtIn": { en: "built-in" },
  "admin.custom": { en: "custom" },
  "admin.needEn": {
    en: "Question text and an explanation are required.",
  },
  "admin.needTwoChoices": {
    en: "At least two answer choices are required.",
  },
  "admin.saved": { en: "Saved." },
  "admin.export": { en: "Export JSON" },
  "admin.import": { en: "Import JSON" },
  "admin.importBad": { en: "That file could not be read as a question bank." },
  "admin.importOk": { en: "Imported" },

  "tutor.name": { en: "Ai-tutor" },
  "tutor.open": {
    en: "I don't understand — explain it",
  },
  "tutor.greeting": {
    en: "Stuck on this one? Pick a question below or type your own.",
  },
  "tutor.explain": { en: "Explain this task" },
  "tutor.hint": { en: "Just a hint" },
  "tutor.whyWrong": {
    en: "Why is my answer wrong?",
  },
  "tutor.simpler": {
    en: "Show a simpler example",
  },
  "tutor.placeholder": {
    en: "Ask the tutor…",
  },
  "tutor.send": { en: "Send" },
  "tutor.thinking": { en: "Thinking…" },
  "tutor.close": { en: "Close" },
  "tutor.noKey": {
    en: "The tutor needs an Anthropic API key. Add ANTHROPIC_API_KEY to .env.local and restart the dev server.",
  },

  /* ---------------- hero score card ---------------- */
  "hero.cardTitle": { en: "Score trend" },
  "hero.cardTag": { en: "Sample" },
  "hero.cardSub": { en: "Four full-length mocks" },
  "hero.goal": { en: "1600 goal" },
  "hero.mock": { en: "Mock" },
  "hero.rw": { en: "Reading & Writing" },
  "hero.math": { en: "Math" },
  "hero.caption": { en: "Illustrative data, not your result." },

  /* ---------------- practice test surface ---------------- */
  "ptool.goBack": { en: "Go back" },
  "ptool.directions": { en: "Directions" },
  "ptool.directionsBody": {
    en: "Read each question and choose the best answer. Use Mark for review to come back to a question, and cross out choices you have ruled out.",
  },
  "ptool.highlight": { en: "Highlight" },
  "ptool.calculator": { en: "Calculator" },
  "ptool.reference": { en: "Reference" },
  "ptool.more": { en: "More" },
  "ptool.mark": { en: "Mark for review" },
  "ptool.marked": { en: "Marked for review" },
  "ptool.crossOut": { en: "Cross out answer choices" },
  "ptool.undoCross": { en: "Undo cross out" },
  "ptool.hide": { en: "Hide" },
  "ptool.show": { en: "Show" },
  "ptool.pause": { en: "Pause" },
  "ptool.resume": { en: "Resume" },
  "ptool.previous": { en: "Previous" },
  "ptool.next": { en: "Next" },
  "ptool.askTutor": { en: "Ask the tutor" },
  "ptool.explanation": { en: "Explanation" },
  "ptool.checkAnswer": { en: "Check answer" },
  "ptool.navTitle": { en: "Section — question navigator" },
  "ptool.navCurrent": { en: "Current" },
  "ptool.navAnswered": { en: "Answered" },
  "ptool.navUnanswered": { en: "Unanswered" },
  "ptool.navReview": { en: "For review" },
  "ptool.goToReview": { en: "Go to review page" },
  "ptool.clearHighlights": { en: "Clear highlights" },
  "ptool.highlightHint": {
    en: "Select any text in the question, then release — the selection is highlighted.",
  },
  "ptool.refTitle": { en: "Reference sheet" },
  "ptool.calcTitle": { en: "Calculator" },
  "ptool.calcHint": { en: "Type a calculation, or use the keypad." },
  "ptool.calcError": { en: "Not a valid expression" },
  "ptool.finish": { en: "Finish session" },
  "ptool.timeUp": { en: "Time is up." },

  "common.subjects": { en: "Subjects" },
  "common.minutes": { en: "min" },
  "common.total": { en: "Total" },
  "common.back": { en: "Back" },
  "common.reset": { en: "Reset all local data" },
  "common.resetConfirm": {
    en: "Delete all accounts, progress and custom questions from this browser?",
  },
    "common.footer": {
    en: "Local build — everything is stored in this browser.",
  },
};

type Ctx = {
  /** UI string by key. */
  t: (key: string) => string;
  /** Content text from the item bank. */
  tx: (text: LocalizedText | undefined) => string;
};

const I18nContext = createContext<Ctx | null>(null);

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const t = useCallback((key: string) => D[key]?.en ?? key, []);
  const tx = useCallback((text: LocalizedText | undefined) => text?.en ?? '', []);

  return <I18nContext.Provider value={{ t, tx }}>{children}</I18nContext.Provider>;
}

export function useI18n(): Ctx {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error('useI18n must be used inside <I18nProvider>');
  return ctx;
}
