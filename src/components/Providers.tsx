"use client";

import React from "react";
import { I18nProvider } from "@/lib/i18n";
import { AppProvider } from "@/lib/app-state";
import { CommunityProvider } from "@/lib/community-state";
import { SettingsProvider } from "@/lib/settings";
import { Tour } from "./Tour";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      {/* Settings wraps the app store: preferences are read by the shell itself,
          and none of them depend on an account existing. */}
      <SettingsProvider>
        <AppProvider>
          <CommunityProvider>
            {children}
            <Tour />
          </CommunityProvider>
        </AppProvider>
      </SettingsProvider>
    </I18nProvider>
  );
}
