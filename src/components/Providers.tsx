"use client";

import React from "react";
import { I18nProvider } from "@/lib/i18n";
import { AppProvider } from "@/lib/app-state";
import { CommunityProvider } from "@/lib/community-state";
import { Tour } from "./Tour";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppProvider>
        <CommunityProvider>
          {children}
          <Tour />
        </CommunityProvider>
      </AppProvider>
    </I18nProvider>
  );
}
