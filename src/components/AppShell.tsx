"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useApp } from "@/lib/app-state";
import { loadSidebarCollapsed, saveSidebarCollapsed } from "@/lib/storage";
import { NotificationsBell } from "./NotificationsBell";
import { Sidebar } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";
import { MobileHeader, MobileTabs } from "./MobileBar";
import { TopBar } from "./TopBar";
import { Footer } from "./Footer";

/**
 * Two shells: a marketing layout (top bar, centred column) for visitors, and an
 * app layout (sidebar on desktop, tab bar on phones) once you're signed in.
 */
export function AppShell({ children }: { children: React.ReactNode }) {
  const { account, ready } = useApp();
  const pathname = usePathname();
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

  // The home route can render its public landing immediately. Holding it behind
  // session restoration would replace the real product preview with an app
  // skeleton on every cold visit and on slow connections.
  if (!ready && pathname !== "/") {
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
        <main className="marketing-main flex-1 w-full px-5 sm:px-8">{children}</main>
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
          The shell owns the gutter; the page owns its width by picking
          `container-read` or `container-app`. Before this, nine pages each
          chose their own `max-w-*` and the column moved on every navigation.

          No footer here. The app has a rail and a tab bar; repeating those
          links as a marketing footer under a feed added nothing and pushed a
          "Local build" disclaimer under every screen.
        */}
        <main className="flex-1 w-full px-5 sm:px-8 lg:px-10 py-8 sm:py-10">
          {/*
            The bell docks to the content column, not to the viewport corner.

            It cannot go in the rail: the panel is 21rem wide against a 15rem
            rail, so anchoring it there ran the panel off the left of the screen,
            and collapsing the rail to 4rem took the bell with it. But pinned to
            the corner of the window it was a floating pill with nothing behind
            it, aligned to nothing on the page. Sticky and zero-height, it sits
            on the content's own right edge and top margin — the same line the
            page's first section starts on — and still follows the scroll.

            Desktop only: phones have it in their own header already.
          */}
          <div className="notif-dock hidden md:flex items-center gap-1.5">
            {/* The theme control sits with the bell rather than back in the rail:
                the rail's spare slot is Settings now, and a preference flipped
                several times a day should not be two clicks away. */}
            <ThemeToggle />
            <NotificationsBell />
          </div>
          {children}
        </main>
        <MobileTabs />
      </div>
    </div>
  );
}
