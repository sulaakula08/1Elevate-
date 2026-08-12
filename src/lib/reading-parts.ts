import type { LocalizedText, Question } from "@/data/types";

/**
 * Splits a Reading and Writing question into the passage and the question about
 * it, for the two-pane reading layout.
 *
 * Two sources, because the bank has two habits. An item may carry a real
 * `passage`; more often an admin pastes the stimulus and the question into the
 * prompt as separate paragraphs, and the last paragraph is the question. Where
 * neither applies — Math, or a single-paragraph item — this returns null and the
 * caller shows one pane.
 *
 * Lives here rather than in a runner because practice and the mock have to split
 * a question the same way: a passage that appears on the left in practice and
 * inline in a mock is two different tests of the same item.
 */
export type ReadingParts = { passage: LocalizedText; prompt: LocalizedText };

export function readingDisplayParts(question: Question): ReadingParts | null {
  if (question.subjectId === "sat-math") return null;
  if (question.passage) return { passage: question.passage, prompt: question.prompt };

  const blocks = question.prompt.en
    .trim()
    .split(/\r?\n\s*\r?\n/)
    .map((block) => block.trim())
    .filter(Boolean);

  if (blocks.length < 2) return null;
  return {
    passage: { en: blocks.slice(0, -1).join("\n\n") },
    prompt: { en: blocks[blocks.length - 1] },
  };
}
