import type { CopyDict } from "./index";

/**
 * Copy for the progress analytics.
 *
 * Every string that states a method — how an estimate is reached, what a band
 * means, why a comparison is missing — lives here rather than in a component,
 * because those sentences are the product's claims about itself and they should
 * be readable in one place. Placeholders in `{braces}` are filled by `fill()`
 * in lib/analytics.ts with figures the engine has already rounded.
 */
export const PROGRESS_COPY: CopyDict = {
  "pg.lead": {
    en: "Everything your practice says about where you stand — and what to do with the time you have left.",
  },

  /* ---------------- hero ---------------- */
  "pg.standing": { en: "Where you stand" },
  "pg.actSkills": { en: "Skills" },
  "pg.actHabits": { en: "Habits" },
  "pg.actMocks": { en: "Mock exams" },
  "pg.navOverview": { en: "Overview" },
  "pg.navSkills": { en: "Skills" },
  "pg.navHabits": { en: "Habits" },
  "pg.navMocks": { en: "Mocks" },
  "pg.measured": { en: "Latest mock" },
  "pg.estimated": { en: "Practice estimate" },
  "pg.estimateNote": { en: "Estimated from your practice, not a mock score" },
  "pg.estimateBeside": { en: "practice {score}" },
  "pg.method": { en: "How this is worked out" },
  "pg.methodBody": {
    en: "Each answer counts by how recent it is — halving every 30 days — and your accuracy is re-weighted to the difficulty mix of the question bank, so practising only easy questions barely moves it. That share correct is mapped onto the 200–800 section scale, the same flat mapping a mock falls back on when it does not route. It is an indication of where your practice sits, not a prediction of a test day: the real exam adapts, and only a mock can measure that.",
  },
  "pg.target": { en: "Target" },
  "pg.targetTag": { en: "Your target" },
  "pg.gapToGo": { en: "{points} to go" },
  "pg.trackLabel": { en: "{score} of 1600, target {target}" },
  "pg.secFoot": { en: "{accuracy} right over {count} questions" },
  "pg.streakDay": { en: "day in a row" },
  "pg.streakDays": { en: "days in a row" },
  "pg.streakSince": { en: "Practised every day since {date}" },
  "pg.vitalOfSeven": { en: "of the last 7 days" },
  "pg.vitalDaysToExam": { en: "days to exam day" },
  "pg.onTarget": { en: "Target reached" },
  "pg.takeMock": { en: "Take a mock test" },
  "pg.estimateLocked": { en: "Answer {need} more to unlock the estimate" },
  "pg.estimateLockedTotal": {
    en: "A combined estimate needs {need} more answers, split across both sections.",
  },
  "pg.sectionScale": { en: "200–800" },
  "pg.vitalAccuracy": { en: "Accuracy" },
  "pg.vitalQuestions": { en: "Questions" },
  "pg.vitalWindow": { en: "last {days} days" },
  "pg.vitalPerQuestion": { en: "median per question" },
  "pg.vitalActive": { en: "{days} of the last 7 days" },
  "pg.noBaseline": { en: "no baseline yet" },
  "pg.vsPrevious": { en: "vs previous {days} days" },

  /* ---------------- trajectory ---------------- */
  "pg.trend": { en: "Accuracy trajectory" },
  "pg.trendHint": { en: "{window}-day rolling average" },
  "pg.trendBoth": { en: "Overall" },
  "pg.range7d": { en: "7D" },
  "pg.range30d": { en: "30D" },
  "pg.range90d": { en: "3M" },
  "pg.rangeAll": { en: "All" },
  "pg.rangeLabel": { en: "Time range" },
  "pg.seriesLabel": { en: "Section" },
  /* Names the day explicitly: the figure above it is a rolling average, and
     "19 answered" beside it could otherwise read as the sample behind it. */
  "pg.trendTooltip": { en: "{count} answered that day · {correct} right" },
  "pg.trendNoWindow": { en: "too few answers that week to average" },
  /* "pts" alone is ambiguous on a page that also talks in SAT points, so
     the accuracy ones say so. "In a week" rather than "this week" because
     the callout is anchored to the week it describes, which is not always
     the most recent one. */
  "pg.trendFall": { en: "Accuracy −{points} pts in a week" },
  "pg.trendRise": { en: "Accuracy +{points} pts in a week" },
  "pg.mockOneWord": { en: "Mock exam" },
  "pg.mockRawNote": { en: "share correct, not a scaled section score" },
  "pg.trendEmpty": {
    en: "Answer {need} more questions and this line starts drawing itself.",
  },
  "pg.trendTableCaption": {
    en: "Rolling accuracy by date, with the number of questions answered each day.",
  },
  "pg.trendDate": { en: "Date" },
  "pg.trendVolume": { en: "Questions that day" },

  /* ---------------- sections ---------------- */
  "pg.sections": { en: "Section balance" },
  "pg.verdictCarryHead": { en: "{weak} is holding your score back" },
  "pg.verdictCarryBody": {
    en: "{strong} is {gap} points ahead of it on the practice estimate. The three measures below are why.",
  },
  "pg.verdictEvenHead": { en: "Your two sections are level" },
  "pg.verdictEvenBody": {
    en: "{gap} points apart on the practice estimate — neither one is holding you back on its own.",
  },
  "pg.verdictOne": { en: "Only {subject} has enough practice behind it to judge" },
  "pg.rowEstimate": { en: "Practice estimate" },
  "pg.rowAllTime": { en: "all time {count}" },
  "pg.rowHardNote": { en: "level 3 questions" },
  "pg.footVolume": { en: "{count} answered ({share} of your practice)" },
  "pg.footPace": { en: "{pace} a question" },
  "pg.footBest": { en: "best {name} {value}" },
  "pg.footWorst": { en: "weakest {name} {value}" },
  "pg.footRecent": { en: "{value} in the last {days} days" },
  "pg.colAccuracy": { en: "Accuracy" },
  "pg.colPace": { en: "Median time" },
  "pg.colHard": { en: "Hard questions" },

  /* ---------------- mastery ---------------- */
  "pg.mastery": { en: "Mastery map" },
  "pg.masteryDeck": {
    en: "Every domain the SAT tests, sized by how much of the exam it carries. Each cell is one skill.",
  },
  "pg.pacing": { en: "Difficulty and pace" },
  "pg.losingDeckEmpty": {
    en: "Once a domain has enough answers behind it, this is where you will see what it is costing you.",
  },
  "pg.masteryHint": { en: "Point at a cell for the skill behind it." },
  "pg.regionCovered": { en: "{touched} of {skills} skills practised" },
  "pg.regionRange": {
    en: "Strongest {best} at {bestValue} · weakest {worst} at {worstValue}",
  },
  "pg.blockWeight": { en: "{percent} of the section" },
  "pg.band.mastered": { en: "Mastered" },
  "pg.band.strong": { en: "Strong" },
  "pg.band.developing": { en: "Developing" },
  "pg.band.needsWork": { en: "Needs work" },
  "pg.band.critical": { en: "Critical" },
  "pg.band.unknown": { en: "Not enough data" },
  "pg.cellAttempts": { en: "{correct} of {attempts} right" },
  "pg.cellProvisional": { en: "Provisional — {need} more for a reliable read" },
  "pg.cellUntouched": { en: "Not practised yet · {available} in the bank" },
  "pg.cellEmptyBank": { en: "No questions in the bank yet" },
  "pg.cellChange": { en: "Last {days} days" },

  /* ---------------- opportunities ---------------- */
  "pg.losing": { en: "Where you're losing points" },
  /* Moved behind a disclosure: the primary interface says what a figure is
     worth, and the method is there for anybody who wants to check it. */
  "pg.losingMethod": { en: "How this estimate is worked out" },
  "pg.losingHint": {
    en: "For each domain we take the gap between your accuracy there and your accuracy in your strongest domain of the same section, multiply it by the share of that section the domain carries on the real exam, and map the result onto the 200–800 scale. Treat it as a direction, not a promise: it assumes you reach a level you have already reached somewhere else, and the real SAT is adaptive and scored on a curve, so the same improvement is worth a different number of points depending on where you already are. It is here to tell you what to work on first, not to predict your score.",
  },
  "pg.totalHead": { en: "of estimated opportunity" },
  "pg.totalSub": {
    en: "Derived from your current gaps across {domains} domains and the official SAT section weightings.",
  },
  "pg.oppReach": { en: "→ {accuracy} at your {best} level" },
  "pg.losingPoints": { en: "≈{points} points" },
  "pg.losingWeight": { en: "{percent} of the section" },
  "pg.losingEmpty": {
    en: "Ranking a weakness needs {threshold} answers in a domain. You are {need} away from the first one.",
  },
  "pg.losingNeedTwo": {
    en: "A ranking compares a domain with your own strongest one, so it needs two domains with {threshold} answers behind them. You have {have}.",
  },

  /* ---------------- difficulty ---------------- */
  "pg.difficulty": { en: "Difficulty" },
  "pg.diffGapHead": { en: "Hard questions are your gap" },
  "pg.diffGapBody": { en: "{points} points below your easy accuracy" },
  "pg.diffHoldHead": { en: "You hold up as it gets harder" },
  "pg.diffHoldBody": { en: "only {points} points between easy and hard" },
  "pg.diffMeta": { en: "{attempts} answers · {pace}" },
  "pg.difficultyNone": { en: "Nothing at this level yet" },

  /* ---------------- speed ---------------- */
  "pg.speed": { en: "Speed against accuracy" },
  "pg.speedDeck": {
    en: "One point per domain, split by your own median pace and accuracy.",
  },
  "pg.speedMethod": { en: "Why mock answers are left out" },
  "pg.speedHint": {
    en: "A mock records one section average against every question in it, so those answers are a pace repeated rather than measured. Only practice and review answers with a real duration are plotted.",
  },
  "pg.speedX": { en: "Median time per question" },
  "pg.speedY": { en: "Accuracy" },
  "pg.speedYou": { en: "You: {seconds} · {accuracy}" },
  "pg.quad.fastAccurate": { en: "Fast and right" },
  "pg.quad.slowAccurate": { en: "Right, but slow" },
  "pg.quad.fastInaccurate": { en: "Fast and wrong" },
  "pg.quad.slowInaccurate": { en: "Slow and wrong" },
  "pg.speedEmpty": {
    en: "Timed practice in at least three domains gives this chart something to plot.",
  },
  "pg.speedPoint": { en: "{name} · {seconds} · {accuracy} over {attempts} answers" },

  /* ---------------- consistency ---------------- */
  "pg.consistency": { en: "Consistency" },
  "pg.streakLede": { en: "{days}-day streak" },
  "pg.streakNone": { en: "No run going right now" },
  "pg.span6m": { en: "6M" },
  "pg.span1y": { en: "1Y" },
  "pg.spanLabel": { en: "Time span" },
  "pg.footActive": { en: "{days} days practised, {answered} answers" },
  "pg.footHours": { en: "{hours} h measured" },
  "pg.footLongest": { en: "longest run {days} days" },
  "pg.heatQuestions": { en: "{count} questions" },
  "pg.heatRowTime": { en: "Time" },
  "pg.heatNone": { en: "Nothing answered" },
  "pg.heatLess": { en: "Less" },
  "pg.heatMore": { en: "More" },
  "pg.heatCaption": {
    en: "Questions answered per day over the last year, as calendar weeks.",
  },

  /* ---------------- records ---------------- */
  "pg.records": { en: "Personal records" },
  "pg.rec.volume": { en: "Questions answered" },
  "pg.rec.volumeNext": { en: "{remaining} to {target}" },
  "pg.rec.bestDay": { en: "Busiest day" },
  "pg.rec.bestDayNote": { en: "{percent} right" },
  "pg.rec.bestAccuracyDay": { en: "Sharpest day" },
  "pg.rec.bestAccuracyDayNote": { en: "over {count} questions" },
  "pg.rec.longestStreak": { en: "Longest streak" },
  "pg.rec.longestStreakNote": { en: "{count} running now" },
  "pg.rec.bestMock": { en: "Best mock" },
  "pg.rec.bestMockNote": { en: "of {count} sat" },
  "pg.rec.bestWeek": { en: "Best week" },
  "pg.rec.bestWeekNote": { en: "{count} answers" },
  "pg.rec.mostImproved": { en: "Most improved" },
  "pg.rec.mostImprovedNote": { en: "in {days} days" },
  "pg.recPending": { en: "Not set yet" },
  "pg.recPendingHint": { en: "Answer {count} in a day to set this one." },

  /* ---------------- period ---------------- */
  "pg.period": { en: "Last {days} days against the {days} before" },
  "pg.periodEmpty": {
    en: "There is no earlier period to compare against yet. This fills in once you have practised across two windows.",
  },
  "pg.metric.accuracy": { en: "Accuracy" },
  "pg.metric.questions": { en: "Questions" },
  "pg.metric.activeDays": { en: "Days practised" },
  "pg.metric.pace": { en: "Median time" },

  /* ---------------- insights ---------------- */
  "pg.insights": { en: "What the data says" },

  /*
   * Each insight is written as four parts: the role it plays, the figure it
   * turns on, the thing it is about, and the evidence. The first one on the page
   * is set large and the rest are compact — an interpretation should not arrive
   * as four paragraphs of identical grey text.
   */
  "pg.insight.improving.role": { en: "Biggest improvement" },
  "pg.insight.improving.figure": { en: "+{gain}%" },
  "pg.insight.improving.title": { en: "{name}" },
  "pg.insight.improving.body": {
    en: "Up from {from}% to {to}% right over the last {days} days — your fastest gain anywhere.",
  },

  "pg.insight.declining.role": { en: "Watch this" },
  "pg.insight.declining.figure": { en: "−{drop}%" },
  "pg.insight.declining.title": { en: "{name} is slipping" },
  "pg.insight.declining.body": {
    en: "Down from {from}% to {to}% right over the last {days} days. Worth a session before it settles in.",
  },

  "pg.insight.hardGap.role": { en: "Difficulty gap" },
  "pg.insight.hardGap.figure": { en: "−{gap}%" },
  "pg.insight.hardGap.title": { en: "Hard questions" },
  "pg.insight.hardGap.body": {
    en: "You get {hard}% of hard questions right against {medium}% of medium ones, across {attempts} hard answers.",
  },

  "pg.insight.consistency.role": { en: "Consistency" },
  "pg.insight.consistency.figure": { en: "{days} of 7" },
  "pg.insight.consistency.title": { en: "Your habit is holding" },
  "pg.insight.consistency.body": {
    en: "You practised on {days} of the last seven days, and the current run is {streak} days.",
  },

  "pg.insight.imbalance.role": { en: "Out of balance" },
  "pg.insight.imbalance.figure": { en: "{share}%" },
  "pg.insight.imbalance.title": { en: "{subject} needs more time" },
  "pg.insight.imbalance.body": {
    en: "Only {share}% of your practice has been {subject}, at {attempts} answers — and it is half the exam.",
  },

  "pg.insight.slowDomain.role": { en: "Time and points" },
  "pg.insight.slowDomain.figure": { en: "{seconds}" },
  "pg.insight.slowDomain.title": { en: "{name} is costing you both" },
  "pg.insight.slowDomain.body": {
    en: "A question here takes {seconds} against your {median} median, and you get {accuracy}% right against {overall}% overall.",
  },

  "pg.insight.mockGap.role": { en: "Under the clock" },
  "pg.insight.mockGap.figure": { en: "{gap}%" },
  "pg.insight.mockGap.title": { en: "Exam day does not match practice" },
  "pg.insight.mockGap.body": {
    en: "You get {practice}% right in your own time and {mock}% under exam conditions. That gap is pacing and pressure, not knowledge.",
  },

  "pg.insight.reliability.role": { en: "Almost there" },
  "pg.insight.reliability.figure": { en: "{need}" },
  "pg.insight.reliability.title": { en: "Nearly enough to rank your weak spots" },
  "pg.insight.reliability.body": {
    en: "A domain needs {threshold} answers before this page will call it weak. The nearest one is {need} away.",
  },

  /* ---------------- next ---------------- */
  "pg.next": { en: "Your next focus" },
  "pg.impact.high": { en: "High impact" },
  "pg.impact.medium": { en: "Medium impact" },
  "pg.impact.low": { en: "Lower impact" },
  "pg.nextPractice": { en: "Practise this" },
  "pg.nextReview": { en: "Clear your review queue" },
  "pg.nextReviewNote": { en: "{count} you have already missed, waiting to be cleared" },
  "pg.nextDomainWhy": { en: "{subject} · {accuracy} right now" },
  "pg.nextMock": { en: "Sit a mock test" },
  "pg.nextMockNote": { en: "The one thing practice cannot measure is exam day" },
  "pg.nextVolume": { en: "Build up some history" },
  "pg.nextVolumeNote": { en: "{count} more answers and this page can rank your weak spots" },
  "pg.openReview": { en: "Open review" },
  "pg.openMock": { en: "Start a mock" },
  "pg.openPractice": { en: "Open practice" },

  /* ---------------- mocks ---------------- */
  "pg.mocks": { en: "Mock exams" },
  "pg.journeyHead": { en: "points since your first full mock" },
  "pg.journeySub": { en: "Across {count} sittings, starting {date}." },
  "pg.journeyFirst": { en: "Your first mock came in at {score}" },
  "pg.mockTargetRule": { en: "Target {target}" },
  "pg.mockLatestLine": { en: "latest {score}" },
  "pg.mockBestLine": { en: "best {score}" },
  "pg.mockPerLine": { en: "{points} a mock on average" },
  "pg.mockToTarget": { en: "{points} to your target" },
  "pg.mockRaw": { en: "Raw accuracy by section, sitting by sitting" },
  "pg.mockShortCount": { en: "{count} incomplete sitting left out" },
  "pg.mockShortRow": { en: "{correct} right of {answered} answered" },
  "pg.mockOne": {
    en: "A second full sitting gives you a trend — and the first honest read on whether practice is transferring.",
  },
  "pg.mockNone": {
    en: "No mock sat yet. Practice tells you what you know; a mock tells you what you can do in 2 h 14 min.",
  },
  "pg.mockGapLine": {
    en: "{mock} right under exam conditions against {practice} right in practice.",
  },
  "pg.mockShortened": {
    en: "A test of fewer than {min} questions is not comparable with a full one on the 400–1600 scale, so it is kept out of the progression.",
  },
  "pg.mockSet": { en: "Test {index}" },

  /* ---------------- shared ---------------- */
  "pg.empty": { en: "Not enough data yet" },
  "pg.emptyMore": { en: "Answer {count} more questions to unlock this." },
  "pg.bankMissing": {
    en: "Domain and skill analysis needs the question bank, which has not loaded. Everything else on this page is unaffected.",
  },
};
