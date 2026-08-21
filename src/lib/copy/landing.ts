/**
 * Phase-two landing copy: the editorial transition, the learning loop, the
 * outcomes wall, the capability surfaces and the exam anatomy.
 *
 * Keys are `lp.*` so the strings for the new middle of the page cannot be
 * confused with the `landing.*` set the hero and the footer still use. Two of
 * those older keys are deliberately re-stated at the bottom of this file — this
 * dictionary is merged after the base one, so a key written here wins.
 *
 * House style, which is why nothing below reads like a feature list: name the
 * mechanic, not the benefit. "Questions leave the queue after two correct
 * answers in a row" is checkable; "powerful adaptive learning" is not.
 */

import type { CopyDict } from "./index";

export const LANDING_COPY: CopyDict = {
  /* ================= section 1: editorial transition ================= */
  "lp.methodEyebrow": { en: "The method" },
  /* Split across three spans so the reveal can time them independently. The
     break between "knows" and "something" is where the emphasis lands. */
  "lp.methodLine1": { en: "Every wrong answer" },
  "lp.methodLine2": { en: "knows something about you." },
  "lp.methodLine3": { en: "Most practice throws it away." },
  "lp.methodBody": {
    en: "1Elevate keeps it. One miss names a skill, the skill picks your next question, and that question is where the points come back.",
  },
  /* Labels for the answer map. The count is the strip's own length, so the
     copy and the graphic cannot drift apart — see `STRIP_LENGTH`.

     It deliberately does not say "a practice session is 48 questions". There is
     no such number — practice runs over whatever the student filtered to, and
     only review has a fixed size (fifteen, in review/page.tsx). The strip is a
     stretch of answers, and the ratio under it is the only claim being made. */
  "lp.methodStripTitle": { en: "Example: 48 recent answers" },
  "lp.methodStripSub": { en: "Each block is one answered question." },
  "lp.methodStripLegend": { en: "Answer map legend" },
  "lp.methodStripCorrect": { en: "Correct" },
  "lp.methodStripMissed": { en: "Missed" },
  "lp.methodStripHint": { en: "Move across the answers to inspect the pattern." },
  "lp.methodStripAnswer": { en: "Answer" },
  "lp.methodStripCorrectDetail": { en: "Correct — no review item added." },
  "lp.methodStripMissedDetail": { en: "Missed — skill signal added to review." },
  "lp.methodStripStart": { en: "Answer 1" },
  "lp.methodStripEnd": { en: "Answer 48" },
  "lp.methodStripCount": { en: "6 missed answers" },
  "lp.methodStripResult": { en: "Each one is tagged by skill and added to your review queue." },
  "lp.methodStripLabel": {
    en: "Answer map showing 48 recent answers: 42 correct and 6 missed. Missed answers are highlighted in purple.",
  },

  /* ================= section 2: the learning loop ================= */
  "lp.loopEyebrow": { en: "One question, six steps" },
  "lp.loopTitle": { en: "Watch a mistake turn into a plan." },
  "lp.loopSub": {
    en: "The practice surface below is the one students use, running a real item from the Algebra bank.",
  },
  "lp.loopScrollHint": { en: "Scroll" },
  "lp.loopTapHint": { en: "Tap a step" },
  "lp.loopStepLabel": { en: "Step" },
  "lp.loopOf": { en: "of" },
  "lp.loopPrev": { en: "Previous step" },
  "lp.loopNext": { en: "Next step" },
  "lp.loopViewport": { en: "1Elevate practice surface, stepping through one mistake" },

  "lp.step1Title": { en: "Answer" },
  "lp.step1Text": {
    en: "One item from the bank, with its domain, skill and difficulty attached. You pick the choice the arithmetic seems to give.",
  },
  "lp.step2Title": { en: "Explain" },
  "lp.step2Text": {
    en: "Wrong — and the explanation names the step you skipped rather than the letter you missed.",
  },
  /* The step between the explanation and the queue. A student who has just read
     why they were wrong and still does not see it has one move left, and until
     now the page did not show it. */
  "lp.stepAskTitle": { en: "Ask" },
  "lp.stepAskText": {
    en: "Still not sure? Ask Elevate. It answers on the question in front of you, in the words you asked in.",
  },
  "lp.step3Title": { en: "Review" },
  "lp.step3Text": {
    en: "The item joins your review queue and the skill behind it becomes visible in your progress.",
  },
  "lp.step4Title": { en: "Practise" },
  "lp.step4Text": {
    en: "The queue serves the same skill one level up. That is what “what to practise next” means here.",
  },
  "lp.step5Title": { en: "Progress" },
  "lp.step5Text": {
    en: "Right twice in a row and the item leaves the queue — and the skill stops being the first thing the product asks you for.",
  },

  /* Product-surface strings. These sit inside the frame, so they are written as
     interface text and not as marketing: short, factual, lower case where the
     real product is lower case. */
  "lp.frameSelected": { en: "Selected" },
  "lp.frameCheck": { en: "Check answer" },
  "lp.frameChecked": { en: "Checked" },
  "lp.frameIncorrect": { en: "Incorrect" },
  "lp.frameCorrectAnswer": { en: "Correct answer" },
  "lp.frameQueued": { en: "Added to review" },
  "lp.frameQueueRule": {
    en: "Answer it right twice in a row and it leaves the queue.",
  },
  "lp.frameQueueCount": { en: "in the queue" },
  "lp.frameSameSkill": { en: "Same skill" },
  "lp.frameOneUp": { en: "one level up" },
  "lp.frameFocusTitle": { en: "Worth your next session" },
  "lp.frameFocusHint": { en: "Weakest skills first, at least two attempts each" },
  /* The flag that marks whichever skill is currently weakest. It moves between
     rows at the last step, which is the whole point of the graphic. */
  "lp.frameNextFlag": { en: "Weakest" },
  "lp.frameFocusMore": { en: "more skills under 80%, further down the list" },
  "lp.frameMastered": { en: "Right twice in a row" },
  "lp.frameAccuracy": { en: "accuracy" },
  "lp.frameModeProgress": { en: "Progress" },
  "lp.frameMode": { en: "Practice" },
  "lp.frameModeReview": { en: "Review" },
  /* The tutor exchange. Short on both sides: the point of the step is that the
     answer lands on the question you are looking at, not that the model can
     write paragraphs. */
  "lp.frameTutorName": { en: "Elevate" },
  "lp.frameTutorRole": { en: "AI tutor" },
  "lp.frameYou": { en: "You" },
  "lp.frameAskText": { en: "why is it −4 and not 4?" },
  "lp.frameTutorReply": {
    en: "Put x = 0 first, so −3y = 12. Now divide by −3 — the sign turns over with it, and y = −4. That flip is the whole difference between your answer and the right one.",
  },
  "lp.frameAskHint": { en: "Ask about this question" },
  "lp.frameFootAsk": {
    en: "Asked and answered inside the question, so nothing has to be looked up somewhere else.",
  },
  "lp.frameModeTutor": { en: "Tutor" },
  "lp.frameSlip": { en: "The slip" },
  "lp.frameSlipText": { en: "Divided by a negative and kept the sign." },
  "lp.frameFoot0": { en: "Choice C selected. Nothing checked yet." },
  "lp.frameFoot2": {
    en: "Filed under Algebra, and served again in your next review session.",
  },
  "lp.frameFoot3": {
    en: "Both intercepts are given this time, and the sign on the y term is still the step that decides it.",
  },
  "lp.frameFoot4": { en: "The flagged item is right twice running, so it leaves the queue." },

  /* ================= section 3: outcomes ================= */
  "lp.resultsEyebrow": { en: "Sample outcomes" },
  "lp.resultsTitle": { en: "A wall of 1500s, built one skill at a time." },
  "lp.resultsSub": {
    en: "Eight score journeys. Eight different weak points turned into focused practice.",
  },
  "lp.resultsCarousel": { en: "SAT result profiles" },
  "lp.resultsGain": { en: "points" },
  "lp.resultsMoved": { en: "Skill that moved" },
  /* Score-report furniture. The card is drawn as the report a student is
     handed, so it uses the report's own labels rather than marketing ones. */
  "lp.resultsAdministration": { en: "Administration" },
  "lp.resultsTotalScore": { en: "Total score" },
  "lp.resultsRange": { en: "400–1600" },
  "lp.resultsRw": { en: "Reading and Writing" },
  "lp.resultsMath": { en: "Math" },
  /* ================= section 4: capability surfaces ================= */
  "lp.capsEyebrow": { en: "What you actually use" },
  "lp.capsTitle": { en: "Three surfaces. One loop." },
  "lp.capsSub": {
    en: "Practice, explanation, review. Everything else in the product exists to move you between them.",
  },

  "lp.cap1Label": { en: "The bank" },
  "lp.cap1Title": { en: "Narrow it to the exact thing you keep missing" },
  "lp.cap1Text": {
    en: "Every item carries the College Board domain, skill and difficulty it was written against, so a session can be one skill wide or a whole section.",
  },
  "lp.cap1All": { en: "All sections" },
  "lp.cap1Try": { en: "Filter the sample" },

  "lp.cap2Label": { en: "Explanations" },
  "lp.cap2Title": { en: "Why the right one is right, and why yours was not" },
  "lp.cap2Text": {
    en: "Every choice is explained, not only the correct one. Ask a follow-up in your own words and Elevate answers on the same screen.",
  },
  "lp.cap2Ask": { en: "Why is it not 4?" },
  "lp.cap2Reply": {
    en: "Because the coefficient is negative. Dividing both sides by −3 reverses the sign, so y = −4.",
  },
  "lp.cap2Tutor": { en: "Elevate" },

  "lp.cap3Label": { en: "Review & progress" },
  "lp.cap3Title": { en: "A queue built out of your own mistakes" },
  "lp.cap3Text": {
    en: "Accuracy per skill, weakest first. Nothing leaves the queue until you have answered it correctly twice in a row.",
  },
  "lp.cap3Queue": { en: "In the queue" },
  "lp.cap3Skills": { en: "Skills involved" },
  "lp.cap3Streak": { en: "Day streak" },
  "lp.cap3Weakest": { en: "Weakest first" },

  /* Bank-row states, in the words the real question bank filters on. */
  "lp.stateMissed": { en: "Missed before" },
  "lp.stateUnseen": { en: "Unseen" },
  "lp.stateSolved": { en: "Solved" },
  "lp.bankShowing": { en: "showing" },

  /* ================= section 5: the exam ================= */
  "lp.examEyebrow": { en: "The real sitting" },
  "lp.examTitle": { en: "The whole exam, exactly as it runs." },
  "lp.examSub": {
    en: "Two sections, four modules, one ten-minute break, and a clock that submits your module whether you are finished or not.",
  },
  "lp.examModule": { en: "Module" },
  "lp.examBreak": { en: "Break" },
  "lp.examBreakNote": { en: "Ten minutes. You may end it early." },
  "lp.examQuestionsShort": { en: "q" },
  "lp.examTotalQuestions": { en: "questions" },
  "lp.examTotalTime": { en: "of testing time" },
  "lp.examScored": { en: "Scored" },
  "lp.examTimeline": { en: "SAT module timeline" },

  "lp.subjectsTitle": { en: "Two sections. Two very different kinds of thinking." },
  "lp.subjectsDomains": { en: "Domains" },
  "lp.subjectOpen": { en: "Start here" },

  /* ================= section 6: frequently asked questions =================

     Nine answers, written to the same rule as the rest of this file: every
     number here is one the product implements, and every hedge is a real one.
     54/44 questions and 32/35 minutes come from `SAT.sections`; fifteen is the
     review session size in review/page.tsx; "twice in a row" is the rule in
     lib/stats.ts; 400–1600 is `SAT.minScore`–`SAT.maxScore`.

     No answer promises a study plan, a guaranteed score or a native app, because
     there is no such thing in here. The mobile answer says the mock is better on
     a laptop and the realism answer says generated items are labelled — an FAQ is
     the one section a sceptical reader opens, and a claim they can disprove in
     one session costs more than the claim was worth. */
  "lp.faqEyebrow": { en: "Before you start" },
  "lp.faqTitle": { en: "Frequently asked questions" },
  "lp.faqSub": {
    en: "What the product does, how it decides what you practise next, and what it costs.",
  },
  "lp.faqNote": { en: "1Elevate is free, and there is no card at signup." },
  "lp.faqNoteLink": { en: "The longer story" },

  "lp.faqQ1": { en: "What is 1Elevate?" },
  "lp.faqA1": {
    en: "A free SAT preparation platform built on one idea: a wrong answer tells you which skill to practise next. It holds a question bank written to the official blueprint, full-length mock tests with real module timing, and an explanation on every choice — not only the correct one.",
  },

  "lp.faqQ2": { en: "How is it different from other SAT prep platforms?" },
  "lp.faqA2": {
    en: "Most of them hand you questions and a score. 1Elevate does something with the answers. Every miss is tagged with the College Board domain and skill behind it, joins your review queue, and comes back until you answer it right twice in a row.",
  },

  "lp.faqQ3": { en: "Does it cover both Math and Reading & Writing?" },
  "lp.faqA3": {
    en: "Both, on the published format: 54 Reading and Writing questions across two 32-minute modules, and 44 Math questions across two 35-minute modules. Each section's four official domains are covered, and every item carries the domain, skill and difficulty it was written against.",
  },

  "lp.faqQ4": { en: "Are the practice questions like the real Digital SAT?" },
  "lp.faqA4": {
    en: "They are written against the same blueprint — the same domains, the same question types, the same difficulty bands — and Math items come with the graphing calculator and the reference sheet, as the digital test does. Where the bank is short of a full sitting, questions are generated to that blueprint and labelled as AI-written wherever they appear.",
  },

  "lp.faqQ5": { en: "How does 1Elevate decide what I practise next?" },
  "lp.faqA5": {
    en: "By what you have already got wrong, not by a questionnaire. Your accuracy is ranked skill by skill, weakest first, and a review session serves fifteen questions from the top of that list. You can also drive it yourself: filter the bank by section, domain, skill, difficulty, or just the items you have missed before.",
  },

  "lp.faqQ6": { en: "Can I track my progress?" },
  "lp.faqA6": {
    en: "Accuracy per section and per skill, how much of the bank you have answered, a day streak, an activity heatmap, and your score trend across every mock you have taken. All of it is built from your own attempts, so a new account starts empty and fills after one session.",
  },

  "lp.faqQ7": { en: "Is there a full-length SAT practice test?" },
  "lp.faqA7": {
    en: "Yes — the whole sitting, not an excerpt. Four modules back to back, a ten-minute break in the middle, module clocks that submit for you when the time runs out, and a 400–1600 score report at the end.",
  },

  "lp.faqQ8": { en: "Can I use 1Elevate on my phone?" },
  "lp.faqA8": {
    en: "Yes, in the browser — there is nothing to install. Practice, review, explanations and progress are all built for a small screen. For the full-length mock a laptop or tablet is better: the calculator, the reference sheet and the highlighter want the room the real test gives them.",
  },

  "lp.faqQ9": { en: "Who is 1Elevate for?" },
  "lp.faqA9": {
    en: "Anyone sitting the SAT, first attempt or retake. It is most useful once you are already putting the hours in and cannot tell which of them are paying off — that is the question the whole product is built to answer.",
  },

  /* ================= closing ================= */
  "lp.closeEyebrow": { en: "Your next session" },
  "lp.closeTitle": { en: "Find the next SAT question worth your time." },
  "lp.closeText": {
    en: "Answer one real question. 1Elevate names the skill behind the miss and turns it into a focused next session.",
  },
  "lp.closePreviewLabel": { en: "Preview of a focused next practice session" },
  "lp.closePreviewMode": { en: "Next session" },
  "lp.closePreviewSource": { en: "From your last answer" },
  "lp.closeRouteLabel": { en: "The 1Elevate learning loop" },
  "lp.closePreviewWeakest": { en: "Weakest skill" },
  "lp.closePreviewQuestions": { en: "questions" },
  "lp.closePreviewSkill": { en: "Linear equations in two variables" },
  "lp.closePreviewMeta": { en: "Algebra · Medium · focused practice" },
  "lp.closePreviewAccuracy": { en: "Current accuracy 44%, next target 60%" },
  "lp.closePreviewReady": { en: "First question ready" },

  /* ================= footer and chrome ================= */
  "lp.footerExplore": { en: "Explore" },
  "lp.footerAbout": { en: "About 1Elevate" },
  "lp.footerMethod": { en: "How it works" },
  "lp.footerPreview": { en: "Practice preview" },
  "lp.footerExam": { en: "SAT format" },
  "lp.footerFaq": { en: "Common questions" },
  "lp.footerBlueprint": { en: "Built around the official SAT blueprint." },
  "lp.footerPrivacy": { en: "Privacy and cookies" },
  "nav.toggleTheme": { en: "Toggle color theme" },

  /* ---- restated from the base dictionary ---- */
  /* The old section headings are gone, so the two keys the footer-adjacent CTA
     still reads are re-pointed here rather than left describing a page that no
     longer exists. */
  "landing.ctaTitle": { en: "1600 is closer than it looks" },
};
