"use client";

/**
 * The formula sheet the SAT provides in the Math section, redrawn in the app's
 * own type — figures included, because the real sheet is read as pictures with
 * labels and a column of bare formulas is measurably slower to scan under time.
 *
 * Everything here is a standard geometric fact, so it can live as plain content
 * rather than as exam material. Each figure is hand-drawn SVG on a 100×70 box
 * and inherits `currentColor`, so it works in either theme without a second
 * asset and without a network request mid-test.
 */

const STROKE = { fill: "none", stroke: "currentColor", strokeWidth: 1.5 } as const;

type Figure = { title: string; lines: string[]; draw: React.ReactNode };

const FIGURES: Figure[] = [
  {
    title: "Circle",
    lines: ["A = πr²", "C = 2πr"],
    draw: (
      <>
        <circle cx="50" cy="35" r="24" {...STROKE} />
        <line x1="50" y1="35" x2="74" y2="35" {...STROKE} strokeDasharray="3 3" />
        <circle cx="50" cy="35" r="1.6" fill="currentColor" />
        <text x="61" y="31" fontSize="9" fill="currentColor">
          r
        </text>
      </>
    ),
  },
  {
    title: "Rectangle",
    lines: ["A = ℓw"],
    draw: (
      <>
        <rect x="22" y="14" width="56" height="42" {...STROKE} />
        <text x="47" y="66" fontSize="9" fill="currentColor">
          ℓ
        </text>
        <text x="82" y="38" fontSize="9" fill="currentColor">
          w
        </text>
      </>
    ),
  },
  {
    title: "Triangle",
    lines: ["A = ½bh"],
    draw: (
      <>
        <path d="M18 56 L62 56 L44 16 Z" {...STROKE} />
        <line x1="44" y1="16" x2="44" y2="56" {...STROKE} strokeDasharray="3 3" />
        <path d="M44 50 L50 50 L50 56" {...STROKE} strokeWidth={1} />
        <text x="47" y="38" fontSize="9" fill="currentColor">
          h
        </text>
        <text x="36" y="66" fontSize="9" fill="currentColor">
          b
        </text>
      </>
    ),
  },
  {
    title: "Right triangle",
    lines: ["a² + b² = c²"],
    draw: (
      <>
        <path d="M22 56 L74 56 L22 18 Z" {...STROKE} />
        <path d="M22 50 L28 50 L28 56" {...STROKE} strokeWidth={1} />
        <text x="13" y="40" fontSize="9" fill="currentColor">
          a
        </text>
        <text x="46" y="66" fontSize="9" fill="currentColor">
          b
        </text>
        <text x="52" y="32" fontSize="9" fill="currentColor">
          c
        </text>
      </>
    ),
  },
  {
    title: "30°–60°–90°",
    lines: ["sides x, x√3, 2x"],
    draw: (
      <>
        <path d="M24 56 L76 56 L24 26 Z" {...STROKE} />
        <path d="M24 50 L30 50 L30 56" {...STROKE} strokeWidth={1} />
        <text x="12" y="44" fontSize="9" fill="currentColor">
          x
        </text>
        <text x="44" y="66" fontSize="9" fill="currentColor">
          x√3
        </text>
        <text x="52" y="36" fontSize="9" fill="currentColor">
          2x
        </text>
      </>
    ),
  },
  {
    title: "45°–45°–90°",
    lines: ["sides s, s, s√2"],
    draw: (
      <>
        <path d="M26 56 L70 56 L26 12 Z" {...STROKE} />
        <path d="M26 50 L32 50 L32 56" {...STROKE} strokeWidth={1} />
        <text x="16" y="36" fontSize="9" fill="currentColor">
          s
        </text>
        <text x="44" y="66" fontSize="9" fill="currentColor">
          s
        </text>
        <text x="50" y="30" fontSize="9" fill="currentColor">
          s√2
        </text>
      </>
    ),
  },
  {
    title: "Rectangular solid",
    lines: ["V = ℓwh"],
    draw: (
      <>
        <rect x="22" y="22" width="44" height="32" {...STROKE} />
        <path d="M22 22 L36 10 L80 10 L66 22" {...STROKE} />
        <path d="M66 54 L80 42 L80 10" {...STROKE} />
        <path d="M22 54 L36 42 L80 42" {...STROKE} strokeDasharray="3 3" opacity="0.5" />
        <path d="M36 42 L36 10" {...STROKE} strokeDasharray="3 3" opacity="0.5" />
      </>
    ),
  },
  {
    title: "Cylinder",
    lines: ["V = πr²h"],
    draw: (
      <>
        <ellipse cx="50" cy="16" rx="22" ry="7" {...STROKE} />
        <path d="M28 16 L28 52" {...STROKE} />
        <path d="M72 16 L72 52" {...STROKE} />
        <path d="M28 52 A22 7 0 0 0 72 52" {...STROKE} />
        <line x1="50" y1="16" x2="50" y2="52" {...STROKE} strokeDasharray="3 3" />
        <text x="53" y="38" fontSize="9" fill="currentColor">
          h
        </text>
      </>
    ),
  },
  {
    title: "Sphere",
    lines: ["V = 4/3 πr³"],
    draw: (
      <>
        <circle cx="50" cy="35" r="23" {...STROKE} />
        <ellipse cx="50" cy="35" rx="23" ry="7.5" {...STROKE} strokeDasharray="3 3" opacity="0.6" />
        <line x1="50" y1="35" x2="73" y2="35" {...STROKE} />
        <text x="58" y="31" fontSize="9" fill="currentColor">
          r
        </text>
      </>
    ),
  },
  {
    title: "Cone",
    lines: ["V = 1/3 πr²h"],
    draw: (
      <>
        <ellipse cx="50" cy="52" rx="22" ry="7" {...STROKE} />
        <path d="M28 52 L50 10 L72 52" {...STROKE} />
        <line x1="50" y1="10" x2="50" y2="52" {...STROKE} strokeDasharray="3 3" />
        <text x="53" y="34" fontSize="9" fill="currentColor">
          h
        </text>
      </>
    ),
  },
  {
    title: "Pyramid",
    lines: ["V = 1/3 ℓwh"],
    draw: (
      <>
        <path d="M24 50 L62 50 L76 38 L38 38 Z" {...STROKE} />
        <path d="M24 50 L50 10 L62 50" {...STROKE} />
        <path d="M50 10 L76 38" {...STROKE} />
        <path d="M50 10 L38 38" {...STROKE} strokeDasharray="3 3" opacity="0.5" />
      </>
    ),
  },
];

const FACTS = [
  "The number of degrees of arc in a circle is 360.",
  "The number of radians of arc in a circle is 2π.",
  "The sum of the measures in degrees of the angles of a triangle is 180.",
];

export function ReferenceSheet() {
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="grid grid-cols-2 gap-2">
        {FIGURES.map((figure) => (
          <div key={figure.title} className="rounded-[var(--radius-sm)] border p-3">
            <svg
              viewBox="0 0 100 70"
              className="w-full h-auto text-muted"
              role="img"
              aria-label={figure.title}
            >
              {figure.draw}
            </svg>
            <p className="label-xs mt-2">{figure.title}</p>
            {figure.lines.map((line) => (
              <p key={line} className="num mt-1 text-sm">
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {FACTS.map((fact) => (
          <li key={fact} className="text-sm leading-relaxed text-muted">
            {fact}
          </li>
        ))}
      </ul>
    </div>
  );
}
