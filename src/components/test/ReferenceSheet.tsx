"use client";

/**
 * The formula sheet the SAT provides in the Math section, redrawn in the app's
 * own type. Everything here is a standard geometric fact, so it can live as
 * plain content rather than as exam material.
 */

const FIGURES: { title: string; lines: string[] }[] = [
  { title: "Circle", lines: ["A = πr²", "C = 2πr"] },
  { title: "Rectangle", lines: ["A = ℓw"] },
  { title: "Triangle", lines: ["A = ½bh", "a² + b² = c²"] },
  { title: "Special right triangles", lines: ["30°–60°–90° → x, x√3, 2x", "45°–45°–90° → s, s, s√2"] },
  { title: "Rectangular solid", lines: ["V = ℓwh"] },
  { title: "Cylinder", lines: ["V = πr²h"] },
  { title: "Sphere", lines: ["V = 4/3 πr³"] },
  { title: "Cone", lines: ["V = 1/3 πr²h"] },
  { title: "Pyramid", lines: ["V = 1/3 ℓwh"] },
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
          <div key={figure.title} className="rounded-[10px] border p-3">
            <p className="label-xs">{figure.title}</p>
            {figure.lines.map((line) => (
              <p key={line} className="num mt-1.5 text-[14px]">
                {line}
              </p>
            ))}
          </div>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {FACTS.map((fact) => (
          <li key={fact} className="text-[13px] leading-relaxed text-muted">
            {fact}
          </li>
        ))}
      </ul>
    </div>
  );
}
