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
  /* Caption for the attempt strip. The count is the strip's own length, so the
     sentence and the graphic cannot drift apart — see `STRIP_LENGTH`.

     It deliberately does not say "a practice session is 48 questions". There is
     no such number — practice runs over whatever the student filtered to, and
     only review has a fixed size (fifteen, in review/page.tsx). The strip is a
     stretch of answers, and the ratio under it is the only claim being made. */
  "lp.methodStripA": { en: "Forty-eight answers." },
  "lp.methodStripB": { en: "The six you miss are the ones with something to say." },
  "lp.methodStripLabel": { en: "Forty-eight answers, six of them wrong" },

  /* ================= section 2: the learning loop ================= */
  "lp.loopEyebrow": { en: "One question, five steps" },
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
  "lp.resultsEyebrow": { en: "Student outcomes" },
  "lp.resultsDemoShort": { en: "Demo data" },
  "lp.resultsTitle": { en: "A wall of 1500s, built one skill at a time." },
  "lp.resultsSub": {
    en: "Eight score journeys. Eight different weak points turned into focused practice.",
  },
  "lp.resultsControls": { en: "Carousel controls" },
  "lp.resultsPrevious": { en: "Show previous result" },
  "lp.resultsNext": { en: "Show next result" },
  "lp.resultsCarousel": { en: "SAT result profiles" },
  "lp.resultsSatScore": { en: "SAT score" },
  "lp.resultsGain": { en: "points" },
  "lp.resultsMoved": { en: "Skill that moved" },
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
  "lp.footerMethod": { en: "How it works" },
  "lp.footerPreview": { en: "Practice preview" },
  "lp.footerExam": { en: "SAT format" },
  "lp.footerBlueprint": { en: "Built around the official SAT blueprint." },
  "nav.toggleTheme": { en: "Toggle color theme" },

  /* ---- restated from the base dictionary ---- */
  /* The old section headings are gone, so the two keys the footer-adjacent CTA
     still reads are re-pointed here rather than left describing a page that no
     longer exists. */
  "landing.ctaTitle": { en: "1600 is closer than it looks" },
};
