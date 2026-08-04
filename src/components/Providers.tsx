"use client";

import React from "react";
import { I18nProvider } from "@/lib/i18n";
import { AppProvider } from "@/lib/app-state";
import { Tour } from "./Tour";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <I18nProvider>
      <AppProvider>
        {children}
        <Tour />
      </AppProvider>
    </I18nProvider>
  );
}
