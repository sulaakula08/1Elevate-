"use client";

import type { ProgressPostData } from "@/data/community";
import { useI18n } from "@/lib/i18n";

/** Score-improvement post. The before → after jump is the whole point, so it carries the visual weight; everything else is a caption. */
export function ProgressPostContent({
  data,
  text,
}: {
  data: ProgressPostData;
  text?: string;
}) {
  const { t } = useI18n();
  const delta = data.toScore - data.fromScore;

  return (
    <div className="space-y-3">
      <p className="label-xs">{t("community.scoreGrowth")}</p>

      <div className="flex items-baseline gap-2.5 flex-wrap">
        <span className="num text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
          {data.fromScore}
        </span>
        <span className="text-faint text-[20px]" aria-hidden>
          →
        </span>
        <span className="num text-[28px] sm:text-[32px] font-semibold tracking-[-0.02em]">
          {data.toScore}
        </span>
        {delta !== 0 && (
          <span
            className="badge"
            style={{
              ["--tone" as string]: "var(--success)",
              ["--tone-soft" as string]: "var(--success-soft)",
            }}
          >
            {delta > 0 ? "+" : ""}
            {delta}
          </span>
        )}
      </div>

      {(data.mathScore || data.readingWritingScore) && (
        <div className="flex items-center gap-4 text-[13px] text-muted">
          {data.mathScore && (
            <span>
              {t("community.composerMathScore")} <strong className="num text-foreground">{data.mathScore}</strong>
            </span>
          )}
          {data.readingWritingScore && (
            <span>
              {t("community.composerRwScore")}{" "}
              <strong className="num text-foreground">{data.readingWritingScore}</strong>
            </span>
          )}
        </div>
      )}

      {text && <p className="text-[13.5px] text-muted">{text}</p>}
      {data.mockLabel && <p className="text-[12.5px] text-faint">{data.mockLabel}</p>}
    </div>
  );
}
