type SubjectIllustrationProps = {
  kind: "math" | "verbal";
};

/**
 * Flat editorial artwork shared by the SAT subject cards throughout the app.
 *
 * These deliberately live as inline SVG instead of bitmap assets: the shapes
 * remain crisp at every card width, inherit no theme-dependent contrast, and
 * add no image request or WebGL work to a section that is purely illustrative.
 */
export function SubjectIllustration({ kind }: SubjectIllustrationProps) {
  return (
    <span className={`lp-subject-art lp-subject-art-${kind}`} aria-hidden>
      {kind === "verbal" ? <ReadingIllustration /> : <MathIllustration />}
    </span>
  );
}

function ReadingIllustration() {
  return (
    <svg viewBox="0 0 520 300" role="presentation" focusable="false">
      <circle className="lp-art-halo" cx="326" cy="135" r="128" />
      <circle className="lp-art-dot" cx="454" cy="56" r="8" />
      <circle className="lp-art-dot lp-art-dot-soft" cx="89" cy="98" r="5" />
      <path className="lp-art-spark" d="M422 35v24M410 47h24" />

      <ellipse className="lp-art-shadow" cx="275" cy="251" rx="190" ry="24" />

      <path
        className="lp-art-book-back"
        d="M253 99c-44-29-105-31-173-5l19 145c59-23 112-17 154 12V99Z"
      />
      <path
        className="lp-art-book-back"
        d="M253 99c47-28 111-29 184 1l-28 143c-62-24-113-19-156 8V99Z"
      />
      <path
        className="lp-art-page lp-art-page-left"
        d="M253 88c-45-25-103-25-166-1l18 137c56-18 105-12 148 16V88Z"
      />
      <path
        className="lp-art-page lp-art-page-right"
        d="M253 88c47-24 107-24 176 3l-25 135c-59-20-108-14-151 14V88Z"
      />
      <path className="lp-art-spine" d="M253 89v151" />

      <g className="lp-art-copy">
        <path d="M118 116c35-10 67-9 102 2" />
        <path d="M122 137c32-8 61-7 91 2" />
        <path d="M126 158c28-7 56-6 84 2" />
        <path d="M130 180c29-6 55-4 80 4" />
        <path d="M282 117c38-10 73-8 111 4" />
        <path d="M282 139c35-9 68-7 103 4" />
        <path d="M282 161c31-8 62-6 94 4" />
        <path d="M282 183c29-7 57-5 85 4" />
      </g>

      <path className="lp-art-highlight" d="M291 207c29-5 56-3 81 5" />
      <path className="lp-art-bookmark" d="m230 91 23 4v72l-12-10-11 7V91Z" />

      <g className="lp-art-pencil" transform="rotate(30 382 72)">
        <path className="lp-art-pencil-tip" d="m293 61-31 12 29 15 14-14-12-13Z" />
        <path className="lp-art-pencil-wood" d="m262 73 8-3 7 10-6 7-9-14Z" />
        <rect className="lp-art-pencil-body" x="293" y="61" width="151" height="28" rx="9" />
        <rect className="lp-art-pencil-light" x="305" y="64" width="113" height="7" rx="3.5" />
        <path className="lp-art-pencil-cap" d="M430 61h16c8 0 14 6 14 14s-6 14-14 14h-16V61Z" />
      </g>
    </svg>
  );
}

function MathIllustration() {
  return (
    <svg viewBox="0 0 520 300" role="presentation" focusable="false">
      <circle className="lp-art-halo" cx="315" cy="136" r="132" />
      <circle className="lp-art-dot" cx="443" cy="63" r="8" />
      <circle className="lp-art-dot lp-art-dot-soft" cx="114" cy="61" r="5" />
      <path className="lp-art-spark" d="M400 32v24M388 44h24" />
      <path className="lp-art-orbit" d="M91 209c78 55 253 68 353-16" />

      <ellipse className="lp-art-shadow" cx="293" cy="249" rx="184" ry="23" />

      <g className="lp-art-triangle" transform="rotate(-7 291 159)">
        <path d="M168 226 284 65l112 161H168Z" />
        <path d="m238 197 47-67 47 67h-94Z" />
      </g>

      <g className="lp-art-ruler" transform="rotate(31 336 135)">
        <rect x="238" y="111" width="224" height="55" rx="12" />
        <path d="M263 112v19M287 112v12M311 112v19M335 112v12M359 112v19M383 112v12M407 112v19M431 112v12" />
        <circle cx="444" cy="139" r="8" />
      </g>

      <g className="lp-art-protractor">
        <path d="M104 222a74 74 0 0 1 148 0h-148Z" />
        <path d="M139 219a39 39 0 0 1 78 0" />
        <path d="m178 151 0 19M143 160l9 17M213 160l-9 17M119 184l17 10M237 184l-17 10" />
      </g>

      <g className="lp-art-equation">
        <text x="74" y="91">x²</text>
        <text x="430" y="220">π</text>
        <path d="M81 108h48M105 84v48" />
      </g>
    </svg>
  );
}
