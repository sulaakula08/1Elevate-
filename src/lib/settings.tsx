"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  DEFAULT_SETTINGS,
  type Settings,
  loadSettings,
  saveSettings,
} from "./storage";

/**
 * Browser preferences, in one place.
 *
 * Deliberately separate from the app store: none of this is account data, none
 * of it syncs, and a component reading "should I animate" has no business
 * pulling in the whole practice history to find out.
 */

type Ctx = {
  settings: Settings;
  /** Ready is false until localStorage has been read, so nothing renders twice. */
  ready: boolean;
  set: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  reset: () => void;
};

const SettingsContext = createContext<Ctx | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [ready, setReady] = useState(false);

  // localStorage only exists on the client, so the first value has to arrive
  // after mount. Starting from the defaults means the server and the first
  // client render agree.
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setSettings(loadSettings());
    setReady(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  /**
   * Reduced motion is applied as an attribute on the root rather than by each
   * component checking the setting: the CSS that animates lives in stylesheets,
   * so the switch has to reach it there.
   */
  useEffect(() => {
    if (!ready) return;
    if (settings.reduceMotion) document.documentElement.dataset.motion = "reduce";
    else delete document.documentElement.dataset.motion;
  }, [ready, settings.reduceMotion]);

  const set = useCallback<Ctx["set"]>((key, value) => {
    setSettings((previous) => {
      const next = { ...previous, [key]: value };
      saveSettings(next);
      return next;
    });
  }, []);

  const reset = useCallback(() => {
    saveSettings(DEFAULT_SETTINGS);
    setSettings(DEFAULT_SETTINGS);
  }, []);

  const value = useMemo(() => ({ settings, ready, set, reset }), [settings, ready, set, reset]);

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings(): Ctx {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error("useSettings must be used inside <SettingsProvider>");
  return ctx;
}
