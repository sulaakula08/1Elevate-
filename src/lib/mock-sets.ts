import type { ExamBlueprint, QuestionIndexEntry } from "@/data/types";

/**
 * Several distinct mock tests, dealt from one bank.
 *
 * The page used to offer a single "Mock test" that reshuffled the whole bank on
 * every click. Two things were wrong with that. A student who sat it twice met
 * the same questions in a different order and could not tell whether their
 * score moved because they had improved or because the deal had been kinder;
 * and a bank holding four tests' worth of material advertised one.
 *
 * So the bank is cut into numbered tests instead, and the cut has two
 * properties that the reshuffle did not:
 *
 * Disjoint — no question appears in two tests. Test 2 is genuinely new material
 * rather than a rerun with different neighbours, which is the only thing that
 * makes a second sitting worth scoring.
 *
 * Stable — Test 3 is the same Test 3 tomorrow, on a phone, for every student.
 * The deal comes from a seeded shuffle over an id-sorted bank rather than
 * Math.random, so "I got 1240 on Test 3" is a comparable statement. Without
 * this a numbered test would be a label attached to nothing.
 *
 * The consequence to keep in mind: adding questions to the bank re-deals every
 * test. That is the honest trade for stability without a stored deal, and it is
 * the right way round — the bank grows rarely, tests are sat often.
 */

/** Fixed, so the deal is identical everywhere. Changing it re-deals every test. */
const SEED = 0x5f3e_a71b;

/** More than this and the list stops being a menu and becomes a catalogue. */
const MAX_SETS = 8;

export type MockSetSection = {
  subjectId: string;
  module: number;
  minutes: number;
  questions: QuestionIndexEntry[];
  /**
   * Which form of a second module this is.
   *
   * The real SAT routes you into an easier or a harder second module on each
   * section, based on the first. A first module has no form; a second has two,
   * and only one of them is sat.
   */
  form?: "lower" | "upper";
};

export type MockSet = {
  /** 1-based, and the number the student sees. */
  index: number;
  /**
   * The modules as sat: first modules, and one form of each second module. When
   * `adaptive` is true this is only the default route — the runner swaps in the
   * upper form when the first module goes well, from `alternates`.
   */
  sections: MockSetSection[];
  /**
   * The other form of each second module, keyed by subject. Empty when the bank
   * cannot fill two forms, which is when a test runs non-adaptive.
   */
  alternates: Map<string, MockSetSection>;
  total: number;
  minutes: number;
  /** False when the bank could not fill every module — a shortened test. */
  complete: boolean;
  /** True when both forms of every second module exist, so routing is possible. */
  adaptive: boolean;
};

/**
 * Share of a first module a student must get right to be routed upward.
 *
 * The real test's threshold is not published and is not a simple percentage —
 * it weighs item difficulty. Two thirds is the figure most published practice
 * material converges on, and it has the property that matters: a student who is
 * clearly coping goes up, and one who is guessing does not.
 */
export const ROUTE_THRESHOLD = 2 / 3;

/** Which form a first-module score routes into. */
export function routeFor(correct: number, total: number): "lower" | "upper" {
  if (total === 0) return "lower";
  return correct / total >= ROUTE_THRESHOLD ? "upper" : "lower";
}

/**
 * mulberry32 — small, fast, and good enough for dealing cards.
 *
 * Written out rather than pulled in: this needs to produce the same sequence in
 * five years for a stored score to stay meaningful, and a dependency that could
 * change its algorithm in a minor release cannot promise that.
 */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b_79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const random = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Questions one full test needs from each subject, non-adaptive. */
function needBySubject(blueprint: ExamBlueprint): Map<string, number> {
  const need = new Map<string, number>();
  for (const section of blueprint.sections) {
    need.set(section.subjectId, (need.get(section.subjectId) ?? 0) + section.count);
  }
  return need;
}

/**
 * What an adaptive test needs: every module, plus a second copy of each module
 * after the first, because both forms must exist even though only one is sat.
 *
 * For the SAT that is 27 + 27 + 27 = 81 Reading and Writing items and 22 × 3 =
 * 66 Math, against 54 and 44 non-adaptive.
 */
function adaptiveNeedBySubject(blueprint: ExamBlueprint): Map<string, number> {
  const need = new Map<string, number>();
  for (const section of blueprint.sections) {
    const extra = section.module > 1 ? section.count : 0;
    need.set(section.subjectId, (need.get(section.subjectId) ?? 0) + section.count + extra);
  }
  return need;
}

/**
 * One shuffled deck per subject.
 *
 * Sorted by id before shuffling, because the bank arrives in whatever order the
 * database felt like and a seeded shuffle over an unstable input is not stable
 * at all — it would only look deterministic until a row came back in a
 * different position.
 */
function decksFor(
  bank: QuestionIndexEntry[],
  blueprint: ExamBlueprint,
): Map<string, QuestionIndexEntry[]> {
  const decks = new Map<string, QuestionIndexEntry[]>();
  for (const subjectId of needBySubject(blueprint).keys()) {
    const pool = bank
      .filter((question) => question.subjectId === subjectId)
      .sort((a, b) => a.id.localeCompare(b.id));
    decks.set(subjectId, seededShuffle(pool, SEED));
  }
  return decks;
}

/**
 * How many complete tests the bank can currently fill.
 *
 * The scarcest subject decides: a test missing its Math modules is not a test.
 * Zero means the bank cannot fill even one, which is a real state — a new
 * install has an empty bank — and the caller falls back to a shortened test.
 */
export function fullSetCount(bank: QuestionIndexEntry[], blueprint: ExamBlueprint): number {
  const decks = decksFor(bank, blueprint);
  const need = needBySubject(blueprint);

  let sets = Infinity;
  for (const [subjectId, count] of need) {
    if (count <= 0) continue;
    sets = Math.min(sets, Math.floor((decks.get(subjectId)?.length ?? 0) / count));
  }
  return Number.isFinite(sets) ? Math.min(sets, MAX_SETS) : 0;
}

/**
 * Every test the bank can currently offer.
 *
 * When the bank cannot fill one whole test, this returns a single shortened one
 * built from everything there is — the behaviour the page had before, kept
 * because an empty list would leave a new account with nothing to press.
 */
export function buildMockSets(
  bank: QuestionIndexEntry[],
  blueprint: ExamBlueprint,
): MockSet[] {
  const decks = decksFor(bank, blueprint);
  const need = needBySubject(blueprint);
  const full = fullSetCount(bank, blueprint);

  if (full === 0) return [shortenedSet(decks, blueprint)];

  // Adaptive costs half as many tests, because each one needs both forms of its
  // second modules. Offering fewer, real ones beats offering more that only
  // pretend to be the exam.
  const adaptiveNeed = adaptiveNeedBySubject(blueprint);
  let adaptiveSets = Infinity;
  for (const [subjectId, count] of adaptiveNeed) {
    if (count <= 0) continue;
    adaptiveSets = Math.min(
      adaptiveSets,
      Math.floor((decks.get(subjectId)?.length ?? 0) / count),
    );
  }
  const adaptive = Number.isFinite(adaptiveSets) && adaptiveSets >= 1;
  const perTest = adaptive ? adaptiveNeed : need;
  const count = adaptive ? Math.min(adaptiveSets, MAX_SETS) : full;

  const sets: MockSet[] = [];
  for (let index = 0; index < count; index++) {
    // Each test starts where the previous one stopped, so no question is dealt
    // twice across the whole list.
    const cursors = new Map<string, number>();
    for (const [subjectId, need] of perTest) cursors.set(subjectId, index * need);

    const sections: MockSetSection[] = [];
    const alternates = new Map<string, MockSetSection>();

    for (const section of blueprint.sections) {
      const deck = decks.get(section.subjectId) ?? [];
      const from = cursors.get(section.subjectId) ?? 0;

      if (!adaptive || section.module === 1) {
        cursors.set(section.subjectId, from + section.count);
        sections.push({
          subjectId: section.subjectId,
          module: section.module,
          minutes: section.minutes,
          questions: deck.slice(from, from + section.count),
        });
        continue;
      }

      /*
       * Both forms of a second module, cut from one slice of twice the size and
       * split by difficulty.
       *
       * Sorting the slice and halving it is what makes the two forms differ:
       * the easier half becomes the lower form, the harder half the upper. It is
       * a cruder instrument than the real test's calibrated item pool, but it is
       * the same idea, and it is the strongest one available from a bank whose
       * only difficulty signal is 1–3.
       */
      const slice = deck.slice(from, from + section.count * 2);
      cursors.set(section.subjectId, from + section.count * 2);

      const byEase = [...slice].sort((a, b) => a.difficulty - b.difficulty);
      const lower = byEase.slice(0, section.count);
      const upper = byEase.slice(section.count);

      sections.push({
        subjectId: section.subjectId,
        module: section.module,
        minutes: section.minutes,
        questions: lower,
        form: "lower",
      });
      alternates.set(section.subjectId, {
        subjectId: section.subjectId,
        module: section.module,
        minutes: section.minutes,
        questions: upper,
        form: "upper",
      });
    }

    sets.push({
      index: index + 1,
      sections,
      alternates,
      total: sections.reduce((sum, s) => sum + s.questions.length, 0),
      minutes: sections.reduce((sum, s) => sum + s.minutes, 0),
      complete: true,
      adaptive,
    });
  }
  return sets;
}

/** Everything the bank has, with the clock cut to match. */
function shortenedSet(
  decks: Map<string, QuestionIndexEntry[]>,
  blueprint: ExamBlueprint,
): MockSet {
  const cursors = new Map<string, number>();

  const sections = blueprint.sections
    .map((section) => {
      const deck = decks.get(section.subjectId) ?? [];
      const from = cursors.get(section.subjectId) ?? 0;
      const questions = deck.slice(from, from + section.count);
      cursors.set(section.subjectId, from + questions.length);
      return {
        subjectId: section.subjectId,
        module: section.module,
        // Proportional, so a half-length module is not given a full-length clock.
        minutes: Math.max(
          1,
          Math.round((section.minutes * questions.length) / Math.max(1, section.count)),
        ),
        questions,
      };
    })
    .filter((section) => section.questions.length > 0);

  return {
    index: 1,
    sections,
    alternates: new Map(),
    total: sections.reduce((sum, s) => sum + s.questions.length, 0),
    minutes: sections.reduce((sum, s) => sum + s.minutes, 0),
    complete: false,
    adaptive: false,
  };
}
