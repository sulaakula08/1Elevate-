/**
 * Where a question came from, kept beside the bank rather than inside it.
 *
 * `Question` in `src/data/types.ts` is the shape of the seed bank, the admin
 * editor and the JSON import/export, so widening it for one feature would touch
 * all three. A side table keyed by question id records provenance without
 * changing the content model: the bank stays exportable as plain content, and a
 * question that loses its record simply stops being labelled rather than
 * becoming invalid.
 *
 * Stored under the app's own `elevate.*` namespace so "reset all local data"
 * clears it along with everything else.
 */

const KEY = "elevate.generation.provenance";

export type Provenance = {
  source: "ai-generated";
  /** Epoch ms. */
  generatedAt: number;
  provider: "anthropic";
  model: string;
  /**
   * Only questions that passed `validateQuestion` are ever written here. It is
   * recorded rather than implied so that any future relaxation of the gate has
   * to show up in the record.
   */
  validation: "passed";
};

export type ProvenanceTable = Record<string, Provenance>;

export function readProvenance(): ProvenanceTable {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === null) return {};
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as ProvenanceTable) : {};
  } catch {
    return {};
  }
}

/** Merges new records in; existing ids keep their original stamp. */
export function recordProvenance(entries: ProvenanceTable) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify({ ...readProvenance(), ...entries }));
  } catch {
    // Storage full or blocked: the questions still work, they just lose their label.
  }
}

export function generatedIds(): Set<string> {
  return new Set(Object.keys(readProvenance()));
}
