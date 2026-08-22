"use client";

import { useApp } from "@/lib/app-state";
import { RequireAccount } from "@/components/ui";
import { SectionGate } from "@/components/SectionGate";
import { ProgressDashboard } from "@/components/progress/ProgressDashboard";

/**
 * Progress.
 *
 * The page itself is a gate and nothing else: an account, a maintenance switch,
 * then the dashboard. Everything the analytics need is already in the app store
 * — the attempt log, the mock history and the bank's taxonomy — so there is no
 * fetch here, and the figures are derived in one pass by lib/analytics.ts rather
 * than by the components that draw them.
 */
export default function ProgressPage() {
  return (
    <RequireAccount>
      <SectionGate section="progress">
        <Inner />
      </SectionGate>
    </RequireAccount>
  );
}

function Inner() {
  const { account } = useApp();
  // RequireAccount has already established there is one; this keeps the
  // dashboard's props non-nullable rather than asserting inside it.
  if (!account) return null;
  return <ProgressDashboard account={account} />;
}
