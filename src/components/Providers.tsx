"use client";

import React from "react";
import { MotionConfig } from "motion/react";
import { I18nProvider } from "@/lib/i18n";
import { AppProvider } from "@/lib/app-state";
import { CommunityProvider } from "@/lib/community-state";
import { SettingsProvider } from "@/lib/settings";
import { ContentProtection } from "./ContentProtection";
import { Tour } from "./Tour";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    /* reducedMotion="user" is the whole reason this wrapper exists: every
       Motion animation below reads the OS setting and drops to an opacity
       cross-fade on its own, the same contract the CSS and GSAP layers already
       honour. Without it there would be three motion systems and only two of
       them would be accessible. */
    <MotionConfig reducedMotion="user">
      <I18nProvider>
        {/* Settings wraps the app store: preferences are read by the shell itself,
            and none of them depend on an account existing. */}
        <SettingsProvider>
          <AppProvider>
            <CommunityProvider>
              {/* One set of document listeners for the whole app — see the note
                  in ContentProtection about why it lives here and nowhere else. */}
              <ContentProtection />
              {children}
              <Tour />
            </CommunityProvider>
          </AppProvider>
        </SettingsProvider>
      </I18nProvider>
    </MotionConfig>
  );
}
