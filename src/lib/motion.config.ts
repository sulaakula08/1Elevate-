/**
 * Every duration, delay, ease and distance for the landing-page GSAP sequence,
 * in one place. Change a number here and the whole sequence retimes — nothing
 * else in the animation code hard-codes a value.
 *
 * `rate` is the global speed dial for the time-based intro: 0.5 plays it at half
 * speed, 2 at double. It is applied with timeScale() on the master timeline, so
 * it scales the intro proportionally without touching the individual numbers.
 *
 * Scroll-driven motion (the pin, the parallax) is deliberately listed separately
 * — see the note in useLandingMotion.ts for why it cannot share the master's
 * playhead.
 */
export const MOTION = {
  /** Master timeline speed multiplier. */
  rate: 1,

  /** Delay before the intro starts, so hydration has settled. */
  introDelay: 0.15,

  /** The h1, revealed character by character. */
  headline: {
    duration: 0.85,
    stagger: 0.022,
    y: "0.6em",
    rotateX: -55,
    ease: "back.out(1.7)",
  },

  /** Sub-headline, buttons and the fine print, each overlapping the last. */
  lede: { duration: 0.7, y: 18, ease: "power3.out", overlap: -0.55 },
  actions: { duration: 0.7, y: 16, stagger: 0.08, ease: "power3.out", overlap: -0.45 },
  finePrint: { duration: 0.6, y: 10, ease: "power2.out", overlap: -0.4 },

  /** The score card slides in alongside the headline rather than after it. */
  heroCard: { duration: 1.1, y: 26, scale: 0.97, ease: "power3.out", startAt: 0.2 },

  /**
   * Scroll parallax on the hero card. `distance` is how far it drifts over the
   * whole scroll range; scrub is the catch-up lag in seconds.
   */
  parallax: { distance: 90, scrub: 1.1 },

  /**
   * The pinned features section. `hold` is extra scroll distance (in viewport
   * heights) the section stays pinned after the cards have finished landing.
   */
  features: {
    pinHold: 1.1,
    scrub: 0.6,
    heading: { duration: 0.5, y: 24, ease: "power2.out" },
    card: { duration: 0.6, y: 44, scale: 0.94, stagger: 0.5, ease: "power2.out" },
  },
} as const;
