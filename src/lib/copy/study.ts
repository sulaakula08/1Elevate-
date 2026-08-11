/** Question bank, question player and AI tutor copy. */

import type { CopyDict } from "./index";

export const STUDY_COPY: CopyDict = {
  /* ---------------- question bank ---------------- */
  "study.bankTitle": { en: "Question bank" },
  "study.bankSub": { en: "Browse by section, or by the domains and topics the exam is actually built from. A session is 10 questions, starting with the ones you got wrong." },
  "study.filterSection": { en: "Section" },
  "study.filterStatus": { en: "Status" },
  "study.allSections": { en: "All sections" },
  "study.statusAll": { en: "All" },
  "study.statusNew": { en: "Unseen" },
  "study.statusWrong": { en: "Answered wrong" },
  "study.statusDone": { en: "Solved" },
  "study.mixTitle": { en: "Difficulty mix" },
  "study.solvedOf": { en: "solved" },
  "study.accuracy": { en: "accuracy" },
  "study.startSession": { en: "Start a session" },
  "study.resumeSession": { en: "Resume" },
  "study.noMatch": { en: "No questions match these filters. Clear one of them." },
  "study.inReview": { en: "in review" },
  "study.topicsLabel": { en: "topics" },
  "study.clearFilters": { en: "Clear filters" },
  "study.viewLabel": { en: "How to browse the bank" },
  "study.viewSections": { en: "Sections" },
  "study.viewTopics": { en: "Domains & topics" },
  "study.searchTopics": { en: "Search topics" },
  "study.practiseTopic": { en: "Practise" },

  /* ---------------- question player ---------------- */
  "study.passage": { en: "Passage" },
  "study.chooseAnswer": { en: "Choose one answer" },
  /* Surfaced as a hint under the choices, so the shortcut is discoverable
     rather than folklore. */
  /* How many questions one session draws. "All" is the default. */
  "study.filterLength": { en: "Session" },
  "study.lengthAll": { en: "All" },

  "study.keyHint": { en: "Keys 1–4 pick an answer, Enter checks it" },

  /* ---------------- tutor ----------------
     The assistant has a name so a student can refer to it. Deliberately not
     localised: it is a proper noun. */
  "study.tutorName": { en: "Elevate" },
  "study.tutorRole": { en: "AI assistant" },
  "study.tutorOpen": { en: "Ask Elevate" },
  "study.tutorGreeting": { en: "Let's work through this task. Pick a question below or type your own." },
  "study.tutorThinking": { en: "Thinking…" },
  "study.tutorWriting": { en: "Writing…" },
  "study.tutorSkip": { en: "Show it all" },
  "study.tutorCopy": { en: "Copy" },
  "study.tutorCopied": { en: "Copied" },
  "study.tutorRetry": { en: "Retry" },
  "study.tutorStop": { en: "Stop" },
  /* Deliberately not "an error occurred": a student can act on this one. */
  "study.tutorFailed": { en: "Could not get an answer. Check your connection and try again." },
  "study.tutorNoKey": { en: "The assistant is unavailable: the server has no access key configured. Everything else works as usual." },

  /* ---------------- the test surface ----------------
     Named after the controls of the real digital test app, because a student
     who learns them here should recognise them on test day. */
  "ptool.goBack": { en: "Go back" },
  "ptool.directions": { en: "Directions" },
  "ptool.directionsBody": {
    en: "Read each question and choose the best answer. Mark a question for review to come back to it, and cross out the choices you have ruled out.",
  },
  "ptool.highlight": { en: "Highlight" },
  "ptool.highlightHint": {
    en: "Select any text in the question to highlight it, or click a highlight to take it off.",
  },
  "ptool.clearHighlights": { en: "Clear highlights" },
  "ptool.highlightColor": { en: "Highlight colour" },
  "ptool.color.amber": { en: "Amber" },
  "ptool.color.green": { en: "Green" },
  "ptool.color.blue": { en: "Blue" },
  "ptool.color.rose": { en: "Pink" },
  "ptool.color.violet": { en: "Violet" },
  "ptool.calculator": { en: "Calculator" },
  "ptool.calcTitle": { en: "Calculator" },
  "ptool.calcHint": { en: "Type a calculation, or use the keypad" },
  "ptool.calcError": { en: "Not a valid expression" },
  "ptool.reference": { en: "Reference" },
  "ptool.refTitle": { en: "Reference sheet" },
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
  "ptool.askTutor": { en: "Ask Elevate" },
  "ptool.navTitle": { en: "Section — question navigator" },
  "ptool.navCurrent": { en: "Current" },
  "ptool.navAnswered": { en: "Answered" },
  "ptool.navUnanswered": { en: "Unanswered" }
};
