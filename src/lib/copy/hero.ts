/** Header, hero and site chrome copy. */

import type { CopyDict } from "./index";

export const HERO_COPY: CopyDict = {
  /* Two lines by design: the promise, then what makes it different. The hero
     renders the second line in the brand gradient. */
  "hero.title": { en: "Prepare for the SAT" },
  "hero.titleB": { en: "with a plan, not guesswork" },

  /* Sits beside the wordmark in the signed-out bar, where there is no product
     navigation to carry the left half of the row. */
  "hero.navTagline": { en: "SAT preparation" },

  /* ---------------- hero score chart ---------------- */
  "hero.chartTitle": { en: "Score trend" },
  "hero.chartSub": { en: "Four mock tests" },
  /* The four results are illustrative marketing content, so the card says so. */
  "hero.chartSample": { en: "Example" },
  "hero.chartNote": { en: "Illustrative data, not your own result" },
  "hero.chartGoal": { en: "1600 goal" },
  "hero.chartTest": { en: "Test" },
  "hero.chartPoints": { en: "Mock test results" },
  "hero.chartScoreUnit": { en: "points" },
  "hero.chartVerbal": { en: "Reading and Writing" },
  "hero.chartMath": { en: "Math" },

  /* ---------------- footer ---------------- */
  "hero.footerNav": { en: "Sections" },
  "hero.footerAccount": { en: "Account" }
};
