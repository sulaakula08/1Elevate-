/** Community feed, composer and sidebar copy. */

import type { CopyDict } from "./index";

export const COMMUNITY_COPY: CopyDict = {
  "nav.community": { en: "Community" },
  "nav.sCommunity": { en: "Feed" },

  "community.title": { en: "Community" },
  "community.subtitle": { en: "Learn together. Improve together." },

  "community.tabForYou": { en: "For You" },
  "community.tabFollowing": { en: "Following" },
  "community.tabQuestions": { en: "Questions" },
  "community.tabWins": { en: "Wins" },

  "community.composerPrompt": { en: "Share something with the community…" },
  "community.quickAsk": { en: "Ask a question" },

  /* Names for the types that still exist in the feed. Only the question one is
     read today, as the composer's title; the rest are kept because the types
     they name still render, and the flows that will write them automatically —
     progress from a mock, a study update from a session — will want them back.

     The six one-line hints that used to sit here are gone. They existed only to
     describe rows in the "what would you like to share?" picker, and that screen
     was the thing this change removed. */
  "community.postTypeQuestion": { en: "Ask a Question" },
  "community.postTypeProgress": { en: "Share Progress" },
  "community.postTypeAchievement": { en: "Achievement" },
  "community.postTypeExplanation": { en: "Explain Something" },
  "community.postTypeStudyUpdate": { en: "Study Update" },
  "community.postTypeResource": { en: "Share Resource" },

  "community.composerSubject": { en: "Subject" },
  "community.composerTopic": { en: "Topic (optional)" },
  "community.composerCreateTitle": { en: "Create a post" },
  "community.composerPostBody": { en: "What do you want to share?" },
  "community.composerQuestionBody": { en: "Your question" },
  "community.composerBody": { en: "Details" },
  "community.composerMyAnswer": { en: "My answer" },
  /* Both answer fields take a letter for a multiple-choice item or a written
     value for a Math grid-in, so the hint has to show both. */
  "community.composerAnswerHint": { en: "B, or 0.375" },
  "community.composerCorrectAnswer": { en: "Correct answer" },
  "community.composerFromScore": { en: "Previous score" },
  "community.composerToScore": { en: "New score" },
  "community.composerMathScore": { en: "Math" },
  "community.composerRwScore": { en: "Reading & Writing" },
  "community.composerMockLabel": { en: "Mock test label" },
  "community.composerAchievementTitle": { en: "Achievement title" },
  "community.composerExplanationTitle": { en: "Headline" },
  "community.composerDetail": { en: "Detail (optional)" },
  "community.composerQuestionsCount": { en: "Questions completed" },
  "community.composerAccuracy": { en: "Accuracy, %" },
  "community.composerResourceTitle": { en: "Resource title" },
  "community.composerBodyPlaceholderQuestion": { en: "What's the question you got stuck on?" },
  "community.composerBodyPlaceholderExplanation": { en: "Explain it in a few sentences…" },
  "community.composerBodyPlaceholderGeneric": { en: "Add a short note…" },
  "community.composerCancel": { en: "Cancel" },
  "community.composerPost": { en: "Post" },

  "community.reactionHelpful": { en: "Helpful" },
  "community.reactionCongrats": { en: "Congrats" },
  "community.actionExplain": { en: "Explain" },
  "community.actionExplanation": { en: "explanation" },
  "community.actionExplanations": { en: "explanations" },
  "community.actionCommentOne": { en: "comment" },
  "community.actionCommentMany": { en: "comments" },
  "community.actionComment": { en: "Comment" },
  "community.actionSave": { en: "Save" },
  "community.actionSaved": { en: "Saved" },

  "community.viewAllComments": { en: "View all comments" },
  "community.hideComments": { en: "Hide comments" },
  "community.commentPlaceholder": { en: "Write a comment…" },
  "community.commentSend": { en: "Send" },
  "community.noExplanations": { en: "No explanations yet." },
  "community.explanationPlaceholder": { en: "Explain how to solve it…" },
  "community.noComments": { en: "No comments yet." },

  "community.myAnswerLabel": { en: "My answer" },
  "community.correctAnswerLabel": { en: "Correct answer" },
  "community.scoreGrowth": { en: "SAT score growth" },
  "community.studySessionResults": { en: "Session results" },
  "community.sessionQuestions": { en: "questions" },
  "community.accuracyLabel": { en: "Accuracy" },
  "community.sharedResource": { en: "Resource" },
  "community.sharedExplanation": { en: "Explanation" },

  "community.emptyQuestionsTitle": { en: "No questions yet" },
  "community.emptyQuestionsBody": { en: "Be the first to ask the community for help." },
  "community.emptyQuestionsAction": { en: "Ask a question" },
  "community.emptyWinsTitle": { en: "No wins yet" },
  "community.emptyWinsBody": { en: "Score improvements and achievements will show up here." },
  "community.emptyFollowingTitle": { en: "You're not following anyone yet" },
  "community.emptyFollowingBody": {
    en: "Follow classmates to see their progress and questions in this tab.",
  },

  /* Posting is written through to the server, but the confirmation waits a beat
     — see useSendDelay. */
  "community.posting": { en: "Posting…" },
  "community.sending": { en: "Sending…" },

  "community.homeTitle": { en: "From your community" },
  "community.homeSeeAll": { en: "See all" },
};
