"use client";

/**
 * Hero: a score report card. Four mock results climb toward a 1600 flag, with a
 * filled area under the curve, real axis labels and a section breakdown — so it
 * reads as a product screen rather than decoration.
 */
export function HeroScoreChart({ className = "" }: { className?: string }) {
  const points = [
    { x: 62, y: 196, label: "1" },
    { x: 148, y: 168, label: "2" },
    { x: 234, y: 132, label: "3" },
    { x: 320, y: 86, label: "4" },
  ];
  const line = `M${points.map((p) => `${p.x},${p.y}`).join(" L")}`;
  const area = `${line} L320,232 L62,232 Z`;

  return (
    <svg
      viewBox="0 0 400 300"
      className={className}
      role="img"
      aria-label="Четыре результата пробных тестов, растущие к 1600"
    >
      <defs>
        <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--brand)" stopOpacity="0.22" />
          <stop offset="100%" stopColor="var(--brand)" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* card */}
      <rect
        x="0.5"
        y="0.5"
        width="399"
        height="299"
        rx="14"
        fill="var(--surface)"
        stroke="var(--line)"
      />

      {/* header */}
      <text x="24" y="34" fontSize="13" fontWeight="600" fill="var(--foreground)">
        Динамика баллов
      </text>
      <rect x="292" y="20" width="84" height="20" rx="10" fill="var(--brand-soft)" />
      <text x="334" y="34" fontSize="11" fontWeight="700" textAnchor="middle" fill="var(--accent)">
        цель 1600
      </text>

      {/* gridlines + y labels */}
      {[
        { y: 72, label: "1600" },
        { y: 126, label: "1400" },
        { y: 180, label: "1200" },
        { y: 232, label: "1000" },
      ].map((row) => (
        <g key={row.label}>
          <line
            x1="62"
            y1={row.y}
            x2="376"
            y2={row.y}
            stroke="var(--line)"
            strokeDasharray={row.label === "1600" ? "4 4" : undefined}
          />
          <text x="52" y={row.y + 4} fontSize="10" textAnchor="end" fill="var(--faint)">
            {row.label}
          </text>
        </g>
      ))}

      {/* the curve */}
      <path d={area} fill="url(#hero-area)" />
      <path
        d={line}
        fill="none"
        stroke="var(--brand)"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        pathLength={1}
        className="draw"
      />

      {/* points + x labels */}
      {points.map((p, i) => (
        <g key={p.label}>
          <circle
            cx={p.x}
            cy={p.y}
            r={i === points.length - 1 ? 6 : 4}
            fill={i === points.length - 1 ? "var(--brand)" : "var(--surface)"}
            stroke="var(--brand)"
            strokeWidth="2.2"
          />
          <text x={p.x} y="252" fontSize="10" textAnchor="middle" fill="var(--faint)">
            Тест {p.label}
          </text>
        </g>
      ))}

      {/* latest score callout */}
      <g>
        <rect x="292" y="52" width="58" height="24" rx="6" fill="var(--foreground)" />
        <text
          x="321"
          y="68"
          fontSize="12"
          fontWeight="700"
          textAnchor="middle"
          fill="var(--background)"
        >
          1480
        </text>
      </g>

      {/* section breakdown */}
      <line x1="24" y1="266" x2="376" y2="266" stroke="var(--line)" />
      {[
        { x: 24, name: "Чтение и письмо", value: "740", w: 160 },
        { x: 210, name: "Математика", value: "740", w: 140 },
      ].map((col) => (
        <g key={col.name}>
          <text x={col.x} y="284" fontSize="10" fill="var(--muted)">
            {col.name}
          </text>
          <text
            x={col.x + col.w}
            y="284"
            fontSize="11"
            fontWeight="700"
            textAnchor="end"
            fill="var(--foreground)"
          >
            {col.value}
          </text>
        </g>
      ))}
    </svg>
  );
}
