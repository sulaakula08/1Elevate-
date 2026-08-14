/** The product sections an owner can close for maintenance. */
export const SECTION_KEYS = [
  "community",
  "practice",
  "mock",
  "review",
  "progress",
] as const;

export type SectionKey = (typeof SECTION_KEYS)[number];

/**
 * Sections that are built but not yet opened to students.
 *
 * Deliberately separate from the owner's maintenance switch, which answers a
 * different question. "Closed" means a working section is temporarily down and
 * will be back; it is toggled at runtime, it shuts the section for staff too,
 * and it is the wrong tool for something that has simply never launched. This
 * is a property of the build: the section is finished enough for the people
 * making it to use, and not finished enough to show anyone else.
 *
 * Emptying this list is the whole of a launch — no other code has to change.
 */
export const UNRELEASED_SECTIONS: readonly SectionKey[] = ["community"];

/** Which destination belongs to which unreleased section. */
export const UNRELEASED_HREFS: Readonly<Record<string, SectionKey>> = {
  "/community": "community",
};

export function isUnreleased(section: string): boolean {
  return (UNRELEASED_SECTIONS as readonly string[]).includes(section);
}
