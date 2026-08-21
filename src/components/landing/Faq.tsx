"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useI18n } from "@/lib/i18n";
import { useEntered } from "./scroll";

/**
 * The last thing the page owes the reader: the questions it has not answered.
 *
 * Placed between the exam anatomy and the closing CTA, because that is where the
 * remaining doubt actually sits. By this point the page has shown the loop, the
 * three surfaces and the sitting itself; what is left is "does it cover my
 * section", "what does it cost", "will it work on my phone" — objections rather
 * than argument. Answering them before the CTA rather than after is the
 * difference between a reader who clicks and one who opens a tab to check.
 *
 * The composition is the page's own asymmetry: a sticky editorial column holding
 * the heading, a column of accordion cards beside it. Not a centred stack of
 * rows — the section is nine short answers, and a centred stack makes nine of
 * anything read as a list to skim rather than a set to consult.
 *
 * One open at a time. Nine panels that can all be open at once turn the section
 * into the wall of text the collapse existed to prevent, and the reader loses the
 * one thing an accordion is for: knowing where they are.
 *
 * The answers are checkable on purpose. Every number below — 54 and 44 questions,
 * 32 and 35 minutes, fifteen per review session, twice in a row, 400–1600 — is a
 * value the product actually implements, and the hedges are real hedges: the mock
 * is better on a laptop, generated questions are labelled, a fresh account is
 * empty. An FAQ is the one section a reader arrives at already sceptical, and the
 * only way to survive that is to be right.
 */

/**
 * Nine questions, in the order a reader asks them: what is this, why you, does it
 * cover me, is it real, how does it choose, can I see it, is there a mock, will it
 * run on my phone, am I the audience.
 *
 * `id` is the DOM id stem for the header/panel pair, so it has to stay stable and
 * unique — it is what `aria-controls` and `aria-labelledby` point at.
 */
const FAQ_ITEMS = [
  { id: "what", q: "lp.faqQ1", a: "lp.faqA1" },
  { id: "different", q: "lp.faqQ2", a: "lp.faqA2" },
  { id: "sections", q: "lp.faqQ3", a: "lp.faqA3" },
  { id: "realism", q: "lp.faqQ4", a: "lp.faqA4" },
  { id: "next", q: "lp.faqQ5", a: "lp.faqA5" },
  { id: "progress", q: "lp.faqQ6", a: "lp.faqA6" },
  { id: "mock", q: "lp.faqQ7", a: "lp.faqA7" },
  { id: "mobile", q: "lp.faqQ8", a: "lp.faqA8" },
  { id: "audience", q: "lp.faqQ9", a: "lp.faqA9" },
] as const;

export function Faq() {
  const { t } = useI18n();
  const scope = useRef<HTMLElement>(null);
  const entered = useEntered(scope, { threshold: 0.1 });

  /* Which panel is open, by id. `null` is a legitimate state: the section opens
     fully collapsed, so the reader meets nine questions rather than one answer
     and eight questions. */
  const [openId, setOpenId] = useState<string | null>(null);

  /* The question buttons in document order, for the arrow-key walk below. */
  const triggers = useRef<(HTMLButtonElement | null)[]>([]);

  /*
   * Whether the accordion can actually be operated yet — false on the server and
   * for the first client frame, true from the first effect on.
   *
   * It gates `inert` and nothing else. A collapsed panel has to be inert or the
   * section offers all nine answers to a screen reader at once; but rendering
   * `inert` in the server HTML means a visitor with JavaScript off gets nine
   * questions and no way to reach a single answer, which is worse than either.
   * So the markup ships without it and hydration adds it, and the `scripting:
   * none` rule in landing.css opens every panel for the reader who will never
   * hydrate. Neither path costs the other anything: `inert` has no visual
   * effect, so this flag can never cause a flash or a shift.
   */
  const [live, setLive] = useState(false);
  useEffect(() => setLive(true), []);

  /*
   * Keyboard, as the ARIA accordion pattern specifies it.
   *
   * Enter and Space come free with a real `<button>` and are deliberately not
   * handled here — re-implementing them is how an accordion ends up firing twice
   * on Space. What a button does not give is movement between headers, so: Down
   * and Up walk the list, Home and End jump to its ends, and Escape closes the
   * open panel without moving focus off the question it belongs to.
   *
   * The walk wraps. Nine items is short enough that wrapping is quicker than
   * stopping, and a reader holding Down never has to notice which end they reached.
   */
  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    const focus = (next: number) => {
      event.preventDefault();
      triggers.current[(next + FAQ_ITEMS.length) % FAQ_ITEMS.length]?.focus();
    };

    switch (event.key) {
      case "ArrowDown":
        return focus(index + 1);
      case "ArrowUp":
        return focus(index - 1);
      case "Home":
        return focus(0);
      case "End":
        return focus(FAQ_ITEMS.length - 1);
      case "Escape":
        if (openId) setOpenId(null);
        return;
      default:
        return;
    }
  }

  return (
    <section
      id="faq"
      ref={scope}
      className="lp-faq"
      data-in={entered ? "" : undefined}
      aria-labelledby="lp-faq-title"
    >
      {/* Ambient wash only — no surface and no rules. The exam section above
          closes on a full-bleed hairline, so a second one here would read as a
          seam; the page canvas simply continues, lit from the other side. */}
      <span className="lp-faq-field" aria-hidden />

      <div className="lp-faq-grid">
        <header className="lp-faq-head">
          <p className="t-label lp-faq-eyebrow">{t("lp.faqEyebrow")}</p>
          <h2 id="lp-faq-title" className="lp-faq-title">
            {t("lp.faqTitle")}
          </h2>
          <p className="lp-faq-sub">{t("lp.faqSub")}</p>

          {/* The one answer nobody should have to click for. */}
          <p className="lp-faq-note">
            {t("lp.faqNote")}{" "}
            <Link href="/about" className="lp-faq-note-link">
              {t("lp.faqNoteLink")}
              <span aria-hidden> →</span>
            </Link>
          </p>
        </header>

        <ul className="lp-faq-list">
          {FAQ_ITEMS.map((item, i) => {
            const open = openId === item.id;
            return (
              <li
                key={item.id}
                className="lp-faq-item"
                data-open={open ? "" : undefined}
                style={{ ["--n" as string]: i }}
              >
                {/* A heading wrapping the button, not a heading styled as one:
                    the nine questions are this section's outline, and a screen
                    reader should be able to walk them by heading. All the type
                    lives on the button, so the h3 carries semantics and no
                    style. */}
                <h3 className="lp-faq-q">
                  <button
                    type="button"
                    id={`lp-faq-${item.id}-q`}
                    ref={(node) => {
                      triggers.current[i] = node;
                    }}
                    className="lp-faq-trigger"
                    aria-expanded={open}
                    aria-controls={`lp-faq-${item.id}-a`}
                    onClick={() => setOpenId(open ? null : item.id)}
                    onKeyDown={(event) => onKeyDown(event, i)}
                  >
                    <span className="lp-faq-n num" aria-hidden>
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="lp-faq-q-text">{t(item.q)}</span>

                    {/* Plus folding into minus: the tile turns a half circle
                        while the upright arm rotates flat into the crossbar. Two
                        spans and two transforms, so it composites, and no icon
                        library is involved. */}
                    <span className="lp-faq-sign" aria-hidden>
                      <span className="lp-faq-sign-bar" />
                      <span className="lp-faq-sign-bar" />
                    </span>
                  </button>
                </h3>

                {/*
                  The panel stays mounted and collapses to a zero-height grid row,
                  which is what makes the opening honest: the row grows to the
                  height the content actually has, so nothing is measured in
                  JavaScript and nothing clips at the end of the transition.

                  `inert` is what stops that from lying to a screen reader. A
                  panel hidden only by `overflow` is still in the accessibility
                  tree and still reachable by tab, so the section would offer all
                  nine answers whatever was open. See `live` above for why it is
                  only applied once the thing can be clicked.
                */}
                <div
                  id={`lp-faq-${item.id}-a`}
                  role="region"
                  aria-labelledby={`lp-faq-${item.id}-q`}
                  className="lp-faq-a"
                  inert={live && !open}
                >
                  <div className="lp-faq-a-inner">
                    <p className="lp-faq-a-text">{t(item.a)}</p>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </section>
  );
}
