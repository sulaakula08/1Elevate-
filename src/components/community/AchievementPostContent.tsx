"use client";

import type { AchievementPostData } from "@/data/community";

/** Milestone post: streaks read as an emoji + headline; score clubs additionally show the climb that earned it. */
export function AchievementPostContent({ data }: { data: AchievementPostData }) {
  const hasClimb = data.startScore !== undefined && data.currentScore !== undefined;
  const delta = hasClimb ? data.currentScore! - data.startScore! : 0;

  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2 text-[19px] font-semibold tracking-[-0.02em]">
        <span aria-hidden>{data.emoji}</span>
        {data.title}
      </p>

      {data.detail && <p className="text-[14px] text-muted">{data.detail}</p>}

      {hasClimb && (
        <div className="flex items-center gap-4 text-[13px] text-muted pt-0.5">
          <span className="num">
            {data.startScore} → <strong className="text-foreground">{data.currentScore}</strong>
          </span>
          <span
            className="badge"
            style={{
              ["--tone" as string]: "var(--success)",
              ["--tone-soft" as string]: "var(--success-soft)",
            }}
          >
            +{delta}
          </span>
        </div>
      )}
    </div>
  );
}
