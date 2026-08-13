"use client";

import { useApp } from "@/lib/app-state";
import { Landing } from "@/components/Landing";
import { Dashboard } from "@/components/Dashboard";

export default function HomePage() {
  const { account, ready, bank } = useApp();

  // Landing content is deterministic and safe to server-render while the
  // browser restores a session. Signed-in students transition to their
  // dashboard as soon as that check completes.
  if (!ready || !account) return <Landing bank={bank} />;
  return <Dashboard account={account} />;
}
