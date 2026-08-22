import { SAT } from "@/data/exams";

/**
 * How much of the question bank one request may ask for.
 *
 * Derived from the blueprint rather than chosen, and defined once because three
 * places have to agree on it or the app breaks in a way no type can catch: the
 * browser pages its id lists by this, the route rejects anything above it, and
 * the server helper guards on it. Two of them at 30 and one at 27 is a mock
 * module that 400s.
 *
 * The largest single thing any screen shows at once is a mock module, and
 * `SAT.sections` is where a module's size is defined — 27 for Reading and
 * Writing, 22 for Math. Practice asks for at most ten (a window of two behind
 * and eight ahead); review asks for a page. So an application behaving like the
 * application never exceeds this, and a caller asking for more is not one.
 *
 * `question_bodies` in the database keeps its own slightly higher ceiling as an
 * immovable backstop — a grant and a definer function are the boundary, and the
 * boundary should not move every time the blueprint is edited. This is the figure
 * that tracks the product.
 */
export const MAX_IDS_PER_REQUEST = Math.max(...SAT.sections.map((section) => section.count));

/**
 * The largest batch of choices the product can submit for marking: every question
 * in one sitting, which is what the final scoring pass sends.
 */
export const MAX_GRADING_BATCH = SAT.sections.reduce(
  (total, section) => total + section.count,
  0,
);
