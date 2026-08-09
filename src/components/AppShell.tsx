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

  /**
   * Tablets get the rail collapsed whether or not the student asked for it.
   *
   * Between the `md` breakpoint and `lg` the full 15rem rail was still showing,
   * which left about 30rem for the content column — stat labels wrapped to three
   * lines and the subject cards were squeezed to the point where their artwork
   * ran into the titles. Reusing the collapsed state rather than writing a
   * tablet-only stylesheet means there is one rail design, not two.
   */
  const [tablet, setTablet] = useState(false);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setCollapsed(loadSidebarCollapsed());
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 48rem) and (max-width: 63.999rem)");
    setTablet(mq.matches);
    const onChange = (event: MediaQueryListEvent) => setTablet(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
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
          <div className="skeleton h-8 w-full rounded-[var(--radius-pill)] mt-3" />
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
        <main className="flex-1 w-full px-5 sm:px-8">{children}</main>
        <Footer />
      </>
    );
  }

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        account={account}
        collapsed={collapsed || tablet}
        onToggle={tablet ? undefined : toggleSidebar}
      />
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
        {/*
          The shell owns the gutter; the page owns its width by picking
          `container-read` or `container-app`. Before this, nine pages each
          chose their own `max-w-*` and the column moved on every navigation.

          No footer here. The app has a rail and a tab bar; repeating those
          links as a marketing footer under a feed added nothing and pushed a
          "Local build" disclaimer under every screen.
        */}
        <main className="flex-1 w-full px-5 sm:px-8 lg:px-10 py-8 sm:py-10">{children}</main>
        <MobileTabs />
      </div>
    </div>
  );
}
