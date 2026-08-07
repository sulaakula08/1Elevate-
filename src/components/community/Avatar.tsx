"use client";

import type { CommunityAuthor } from "@/data/community";

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const second = parts.length > 1 ? parts[1][0] : (parts[0]?.[1] ?? "");
  return `${first}${second}`.toUpperCase();
}

/**
 * Initials avatar in a subject hue — reuses the `--s-*` palette from
 * globals.css so community authors read as distinct people without a new
 * colour system, the same way subject cards already do.
 */
export function Avatar({
  author,
  size = 36,
}: {
  author: CommunityAuthor;
  size?: number;
}) {
  return (
    <span
      className="grid place-items-center rounded-full font-semibold shrink-0 select-none"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `var(--s-${author.colorSeed}-soft)`,
        color: `var(--s-${author.colorSeed})`,
      }}
      aria-hidden
    >
      {author.initials ?? initialsOf(author.name)}
    </span>
  );
}
