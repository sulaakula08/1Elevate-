"use client";

import type { AchievementPostData } from "@/data/community";
import { IconAchievement } from "./icons";

/**
 * Milestone post: a headline, and for score clubs the climb that earned it.
 *
 * The badge is drawn rather than the emoji the composer used to attach. An
 * emoji here rendered at the platform's own weight beside the app's own
 * typography, and every milestone got the same medal regardless of what it was
 * for — so it read as decoration rather than as a mark the product awards.
 */
export function AchievementPostContent({ data }: { data: AchievementPostData }) {
  const hasClimb = data.startScore !== undefined && data.currentScore !== undefined;
  const delta = hasClimb ? data.currentScore! - data.startScore! : 0;

  return (
    <div className="space-y-2.5">
      <p className="flex items-center gap-2.5 text-h3 font-semibold tracking-[-0.02em]">
        <span className="cm-badge-mark" aria-hidden>
          <IconAchievement size={18} filled />
        </span>
        {data.title}
      </p>

      {data.detail && <p className="text-sm text-muted">{data.detail}</p>}

      {hasClimb && (
        <div className="flex items-center gap-4 text-sm text-muted pt-0.5">
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
