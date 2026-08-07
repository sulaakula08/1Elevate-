"use client";

import { EmptyState } from "@/components/ui";

/** Per-tab empty state: title + short body, plus an optional single action — see AGENTS §22. */
export function EmptyFeedState({
  title,
  body,
  action,
}: {
  title: string;
  body: string;
  action?: { label: string; onClick: () => void };
}) {
  return (
    <EmptyState>
      <span className="block text-[14.5px] font-medium text-foreground mb-1.5">{title}</span>
      {body}
      {action && (
        <span className="block mt-4">
          <button type="button" className="btn btn-primary btn-sm" onClick={action.onClick}>
            {action.label}
          </button>
        </span>
      )}
    </EmptyState>
  );
}
