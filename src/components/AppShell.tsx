"use client";

import { useCallback, useEffect, useState } from "react";
import { useApp } from "@/lib/app-state";
import { loadSidebarCollapsed, saveSidebarCollapsed } from "@/lib/storage";
import { NotificationsBell } from "./NotificationsBell";
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
  /**
   * Collapsed rail state. Starts expanded and reads the stored preference after
   * mount rather than during render: localStorage is not available on the
   * server, and guessing would hydrate the wrong width.
   */
  const [collapsed, setCollapsed] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCollapsed(loadSidebarCollapsed());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const toggleSidebar = useCallback(() => {
    setCollapsed((previous) => {
      saveSidebarCollapsed(!previous);
      return !previous;
    });
  }, []);

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
      <Sidebar account={account} collapsed={collapsed} onToggle={toggleSidebar} />
      <div className="flex-1 min-w-0 flex flex-col">
        <MobileHeader />

        {/*
          The bell lives here, not in the rail.

          Two problems with the rail: the panel is 21rem wide and the rail is
          15rem, so anchoring it to the button's right edge ran it off the left of
          the screen — and collapsing the rail to 4rem took the bell with it.
          Pinned to the top right of the viewport it is reachable in both rail
          states, and the panel opens inwards where there is always room.

          Desktop only: phones have it in their own header already.
        */}
        <div className="notif-float hidden md:block">
          <NotificationsBell />
        </div>
        {/*
          Centred, and wider than it was.

          `mx-auto` was missing, so every page sat hard against the sidebar with
          all of the slack on the right — and collapsing the rail made that worse
          rather than better, because the extra 11rem went entirely to the empty
          side. Centring inside the remaining space means the content re-centres
          itself whenever the rail changes width, with no width calculation.
        */}
        {/* The wider desktop gutter is what keeps the floating bell off the
            content: equal on both sides, so the column stays centred. */}
        <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-8 md:px-14 py-6 sm:py-8">
          {children}
        </main>
        <Footer />
        <MobileTabs />
      </div>
    </div>
  );
}
