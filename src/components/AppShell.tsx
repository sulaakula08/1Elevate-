"use client";

import { useApp } from "@/lib/app-state";
import { Sidebar } from "./Sidebar";
import { MobileHeader, MobileTabs } from "./MobileBar";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";

/**
 * Two shells: a marketing layout (top bar, centred column) for visitors, and an
 * app layout (sidebar on desktop, tab bar on phones) once you're signed in.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { account, ready } = useApp();

  if (!ready) {
    return (
      <div className="flex min-h-dvh">
        <div className="sidebar hidden md:flex">
          <div className="skeleton h-7 w-28 rounded-lg" />
          <div className="skeleton h-8 w-full rounded-full mt-3" />
          <div className="skeleton h-8 w-full rounded-lg mt-4" />
          <div className="skeleton h-8 w-full rounded-lg mt-1.5" />
          <div className="skeleton h-8 w-full rounded-lg mt-1.5" />
        </div>
        <div className="flex-1 p-6 sm:p-8 space-y-4">
          <div className="skeleton h-9 w-64 rounded-lg" />
          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="skeleton h-40 rounded-2xl" />
            <div className="skeleton h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!account) {
    return (
      <>
        <TopBar />
        <main className="flex-1 w-full max-w-5xl mx-auto px-5">{children}</main>
        <Footer />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar account={account} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileHeader />
        <main className="flex-1 w-full max-w-5xl px-4 sm:px-8 py-6 sm:py-8">{children}</main>
        <Footer />
        <MobileTabs />
      </div>
    </div>
  );
}
