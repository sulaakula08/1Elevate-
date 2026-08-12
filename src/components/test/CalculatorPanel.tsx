"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Calculator } from "./Calculator";
import { DesmosCalculator } from "./DesmosCalculator";

/**
 * The calculator the test tools open: Desmos when it can be reached, the app's
 * own when it cannot.
 *
 * The fallback is the point. Desmos is a script from another origin, and the
 * first thing this project ever saw of it was a panel stuck on "Loading
 * calculator…" with `window.Desmos: Not loaded` underneath. A student in a
 * timed section cannot do anything with that. The built-in calculator has no
 * graphing, but it evaluates an expression, which is what most SAT questions
 * actually need — and it is always there.
 */

type Phase = "loading" | "desmos" | "fallback";

export function CalculatorPanel() {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");

  const onResolved = useCallback((ok: boolean) => {
    setPhase(ok ? "desmos" : "fallback");
  }, []);

  if (phase === "fallback") {
    return (
      <div className="flex flex-col h-full">
        <p className="calc-fallback-note">{t("ptool.calcOffline")}</p>
        <div className="flex-1 min-h-0">
          <Calculator />
        </div>
      </div>
    );
  }

  return (
    <div className="calc-desmos-wrap">
      {/* Mounted while loading as well as after: the host element has to exist
          for Desmos to be built into it. */}
      <DesmosCalculator onResolved={onResolved} />
      {phase === "loading" && <p className="calc-loading">{t("common.loading")}</p>}
    </div>
  );
}
