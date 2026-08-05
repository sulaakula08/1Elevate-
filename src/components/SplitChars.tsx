/**
 * Splits text into per-character spans for GSAP to stagger.
 *
 * Two details matter here:
 *
 * 1. Words are wrapped too, not just characters. A bare run of inline-block
 *    characters can break mid-word at any glyph; keeping each word in its own
 *    inline-block preserves normal word wrapping.
 * 2. The characters are aria-hidden and the caller puts the real sentence in an
 *    aria-label on the heading. A screen reader reading forty individual letters
 *    is unusable.
 *
 * Rendered on the server as visible text: the .ch opacity is only zeroed under
 * html.js-motion, which the bootstrap script adds solely when GSAP is going to
 * run. No JavaScript, or reduced motion, means the text simply stays visible.
 */
export function SplitChars({ text }: { text: string }) {
  const words = text.split(" ");

  return (
    <>
      {words.map((word, w) => (
        <span key={w} className="split-word">
          {[...word].map((char, c) => (
            <span key={c} className="ch" aria-hidden>
              {char}
            </span>
          ))}
          {w < words.length - 1 ? " " : null}
        </span>
      ))}
    </>
  );
}
