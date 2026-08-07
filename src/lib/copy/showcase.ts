/** Landing statistics, subject showcase and brand-mark copy. */

import type { CopyDict } from "./index";

export const SHOWCASE_COPY: CopyDict = {
  /* Landing statistics. The number and its noun are rendered separately — the
     noun is agreed with the count at runtime — so these strings are only the
     qualifier that follows, and must read as a continuation of both. */
  "showcase.statInBank": { en: "in the bank" },
  "showcase.statInMock": { en: "in a mock test" },

  /* Subject cards. Two short sentences: what the section trains, then what the
     product does with it. Anything longer competes with the scene behind it. */
  "showcase.rwBlurb": { en: "Meaning, evidence and grammar. Every answer choice explained.",
  },
  "showcase.mathBlurb": { en: "Algebra, functions, data and geometry. Every step of the solution explained.",
  },
};
