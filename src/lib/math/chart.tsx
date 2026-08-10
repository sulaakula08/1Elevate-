/**
 * Figures written as text.
 *
 * A question that needs a graph used to need an image, which meant hosting a
 * file, and a file cannot be corrected, re-themed or read by a screen reader.
 * A chart described in the question source can be all three, and an author can
 * fix a wrong number without redrawing anything.
 *
 * The syntax is deliberately flat — one `key: value` per line, no nesting — so
 * an author writing a question is never debugging indentation:
 *
 *   ```chart
 *   type: line
 *   title: Percentage of maize exported
 *   x: 2009/10, 2010/11, 2011/12
 *   xLabel: Marketing year
 *   yLabel: Percent
 *   series: Argentina = 66, 67, 80
 *   series: Brazil = 21, 16, 34
 *   ```
 */

export type ChartKind = "line" | "bar" | "scatter";

export type ChartSeries = { name: string; values: (number | null)[] };

export type ChartSpec = {
  kind: ChartKind;
  title?: string;
  categories: string[];
  xLabel?: string;
  yLabel?: string;
  series: ChartSeries[];
};

const KINDS: ChartKind[] = ["line", "bar", "scatter"];

/** Returns null when the block is not a usable chart, so the caller can fall back. */
export function parseChart(source: string): ChartSpec | null {
  const spec: ChartSpec = { kind: "line", categories: [], series: [] };

  for (const raw of source.split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;

    const split = line.indexOf(":");
    if (split < 0) continue;
    const key = line.slice(0, split).trim().toLowerCase();
    const value = line.slice(split + 1).trim();
    if (!value) continue;

    switch (key) {
      case "type": {
        const kind = value.toLowerCase() as ChartKind;
        if (KINDS.includes(kind)) spec.kind = kind;
        break;
      }
      case "title":
        spec.title = value;
        break;
      case "x":
      case "labels":
        spec.categories = value.split(",").map((part) => part.trim());
        break;
      case "xlabel":
        spec.xLabel = value;
        break;
      case "ylabel":
        spec.yLabel = value;
        break;
      case "series": {
        // `name = 1, 2, 3`. A series with no name is still plotted, because a
        // single-series chart rarely needs a legend entry.
        const eq = value.indexOf("=");
        const name = eq >= 0 ? value.slice(0, eq).trim() : "";
        const numbers = (eq >= 0 ? value.slice(eq + 1) : value)
          .split(",")
          .map((part) => {
            const n = Number(part.trim());
            // A blank or unparseable entry is a gap, not a zero — plotting a
            // missing year at the origin would invent a data point.
            return part.trim() === "" || Number.isNaN(n) ? null : n;
          });
        if (numbers.some((n) => n !== null)) spec.series.push({ name, values: numbers });
        break;
      }
      default:
        break;
    }
  }

  if (spec.series.length === 0) return null;
  // Categories are optional: without them the points are numbered 1..n, which is
  // what a plain list of values means.
  if (spec.categories.length === 0) {
    const longest = Math.max(...spec.series.map((s) => s.values.length));
    spec.categories = Array.from({ length: longest }, (_, i) => String(i + 1));
  }
  return spec;
}

/** A rounded axis maximum, so gridlines land on numbers a reader can use. */
function niceScale(max: number, min: number) {
  const lo = Math.min(0, min);
  const span = Math.max(1, max - lo);
  const step = Math.pow(10, Math.floor(Math.log10(span / 4)));
  for (const factor of [1, 2, 2.5, 5, 10]) {
    const candidate = step * factor;
    if (span / candidate <= 5) {
      return { min: lo, max: Math.ceil(max / candidate) * candidate, step: candidate };
    }
  }
  return { min: lo, max, step: span / 5 };
}

/**
 * Series are told apart by marker shape and dash pattern as well as by tone.
 * Colour alone fails for a colour-blind reader, and the printed SAT figures this
 * imitates are monochrome for the same reason.
 */
const MARKERS = ["triangle", "square", "circle", "diamond"] as const;
const DASHES = ["", "6 4", "2 3", "8 3 2 3"];

function Marker({ shape, x, y }: { shape: (typeof MARKERS)[number]; x: number; y: number }) {
  const r = 4;
  if (shape === "circle") {
    return <circle cx={x} cy={y} r={r} fill="var(--surface)" stroke="currentColor" strokeWidth="1.6" />;
  }
  if (shape === "square") {
    return (
      <rect
        x={x - r}
        y={y - r}
        width={r * 2}
        height={r * 2}
        fill="var(--surface)"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    );
  }
  const points =
    shape === "triangle"
      ? `${x},${y - r - 1} ${x + r + 1},${y + r} ${x - r - 1},${y + r}`
      : `${x},${y - r - 1} ${x + r + 1},${y} ${x},${y + r + 1} ${x - r - 1},${y}`;
  return <polygon points={points} fill="currentColor" />;
}

const W = 460;
const H = 300;

export function ChartView({ spec }: { spec: ChartSpec }) {
  const { kind, categories, series } = spec;

  const all = series.flatMap((s) => s.values.filter((v): v is number => v !== null));
  const scale = niceScale(Math.max(...all, 0), Math.min(...all, 0));

  // Room for the y label, the rotated category labels and the legend.
  const padL = 56;
  const padR = 14;
  const padT = spec.title ? 34 : 14;
  const rotate = categories.some((c) => c.length > 5);
  const padB = (rotate ? 62 : 40) + (spec.xLabel ? 18 : 0);

  const plotW = W - padL - padR;
  const plotH = H - padT - padB;

  const xAt = (i: number) =>
    categories.length === 1
      ? padL + plotW / 2
      : padL + (i / (categories.length - 1)) * plotW;
  /** Bars sit in bands rather than on ticks, so a bar is never half off the axis. */
  const bandW = plotW / Math.max(1, categories.length);
  const bandX = (i: number) => padL + i * bandW;
  const yAt = (v: number) =>
    padT + plotH - ((v - scale.min) / (scale.max - scale.min)) * plotH;

  const ticks: number[] = [];
  for (let v = scale.min; v <= scale.max + 1e-9; v += scale.step) ticks.push(v);

  const summary = [
    spec.title,
    `${kind} chart`,
    series.map((s) => `${s.name || "series"}: ${s.values.join(", ")}`).join("; "),
  ]
    .filter(Boolean)
    .join(". ");

  return (
    <figure className="mdx-chart">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={summary}>
        {spec.title && (
          <text x={W / 2} y={18} className="ch-title" textAnchor="middle">
            {spec.title}
          </text>
        )}

        {/* Gridlines and y values. */}
        {ticks.map((v) => (
          <g key={v}>
            <line x1={padL} y1={yAt(v)} x2={W - padR} y2={yAt(v)} className="ch-grid" />
            <text x={padL - 8} y={yAt(v) + 4} className="ch-tick" textAnchor="end">
              {Number(v.toFixed(2))}
            </text>
          </g>
        ))}

        {/* Axes. */}
        <line x1={padL} y1={padT} x2={padL} y2={padT + plotH} className="ch-axis" />
        <line x1={padL} y1={padT + plotH} x2={W - padR} y2={padT + plotH} className="ch-axis" />

        {spec.yLabel && (
          <text
            className="ch-axis-label"
            textAnchor="middle"
            transform={`translate(14 ${padT + plotH / 2}) rotate(-90)`}
          >
            {spec.yLabel}
          </text>
        )}

        {/* Category labels, turned when they would otherwise collide. */}
        {categories.map((label, i) => {
          const cx = kind === "bar" ? bandX(i) + bandW / 2 : xAt(i);
          return rotate ? (
            <text
              key={i}
              className="ch-tick"
              textAnchor="end"
              transform={`translate(${cx} ${padT + plotH + 14}) rotate(-40)`}
            >
              {label}
            </text>
          ) : (
            <text key={i} className="ch-tick" x={cx} y={padT + plotH + 16} textAnchor="middle">
              {label}
            </text>
          );
        })}

        {spec.xLabel && (
          <text className="ch-axis-label" x={padL + plotW / 2} y={H - 6} textAnchor="middle">
            {spec.xLabel}
          </text>
        )}

        {/* The data. */}
        {series.map((s, si) => {
          const tone = `var(--chart-${si % 4})`;
          if (kind === "bar") {
            const slot = (bandW * 0.7) / series.length;
            return (
              <g key={si} style={{ color: tone }}>
                {s.values.map((v, i) =>
                  v === null ? null : (
                    <rect
                      key={i}
                      x={bandX(i) + bandW * 0.15 + si * slot}
                      y={yAt(v)}
                      width={Math.max(2, slot - 2)}
                      height={Math.max(0, padT + plotH - yAt(v))}
                      fill="currentColor"
                    />
                  ),
                )}
              </g>
            );
          }

          const points = s.values
            .map((v, i) => (v === null ? null : { x: xAt(i), y: yAt(v) }))
            .filter((p): p is { x: number; y: number } => p !== null);

          return (
            <g key={si} style={{ color: tone }}>
              {kind === "line" && points.length > 1 && (
                <polyline
                  points={points.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeDasharray={DASHES[si % DASHES.length] || undefined}
                  strokeLinejoin="round"
                />
              )}
              {points.map((p, i) => (
                <Marker key={i} shape={MARKERS[si % MARKERS.length]} x={p.x} y={p.y} />
              ))}
            </g>
          );
        })}
      </svg>

      {series.some((s) => s.name) && (
        <figcaption className="ch-legend">
          {series.map((s, si) => (
            <span key={si} className="ch-legend-item" style={{ color: `var(--chart-${si % 4})` }}>
              <svg viewBox="0 0 26 12" width="26" height="12" aria-hidden>
                {kind !== "bar" && (
                  <line
                    x1="1"
                    y1="6"
                    x2="25"
                    y2="6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeDasharray={DASHES[si % DASHES.length] || undefined}
                  />
                )}
                {kind === "bar" ? (
                  <rect x="6" y="1" width="14" height="10" fill="currentColor" />
                ) : (
                  <Marker shape={MARKERS[si % MARKERS.length]} x={13} y={6} />
                )}
              </svg>
              <span className="ch-legend-name">{s.name}</span>
            </span>
          ))}
        </figcaption>
      )}
    </figure>
  );
}
