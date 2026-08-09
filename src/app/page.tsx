"use client";

import { useApp } from "@/lib/app-state";
import { Landing } from "@/components/Landing";
import { Dashboard } from "@/components/Dashboard";

export default function HomePage() {
  const { account, ready, bank } = useApp();

  // Until localStorage is read we don't know which of the two to show; a skeleton
  // avoids flashing the marketing page at a signed-in student.
  if (!ready) {
    return (
      <div className="container-app space-y-4">
        <div className="skeleton h-4 w-24 rounded" />
        <div className="skeleton h-10 w-2/3 rounded-lg" />
        <div className="skeleton h-3 w-full max-w-md rounded mt-8" />
        <div className="skeleton h-20 rounded-xl mt-8" />
      </div>
    );
  }

  if (!account) return <Landing bank={bank} />;
  return <Dashboard account={account} />;
}
