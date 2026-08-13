/** The product sections an owner can close for maintenance. */
export const SECTION_KEYS = [
  "community",
  "practice",
  "mock",
  "review",
  "progress",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];
