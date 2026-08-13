"use client";

import { useCallback, useState } from "react";
import { useI18n } from "@/lib/i18n";
import { Calculator } from "./Calculator";
import { DesmosCalculator } from "./DesmosCalculator";

type Props = {
  /** Optional so the existing mock and review surfaces can keep sharing this panel. */
  active?: boolean;
  sessionKey?: string;
};

type Phase = "loading" | "desmos" | "fallback";

/** Real Desmos when available, with the existing basic calculator as an explicit fallback. */
export function CalculatorPanel({ active = true, sessionKey = "math-calculator" }: Props = {}) {
  const { t } = useI18n();
  const [phase, setPhase] = useState<Phase>("loading");
  const [attempt, setAttempt] = useState(0);

  const onResolved = useCallback((ok: boolean) => {
    setPhase(ok ? "desmos" : "fallback");
  }, []);

  return (
    <div className="calc-desmos-wrap">
      <DesmosCalculator
        key={attempt}
        active={active}
        sessionKey={sessionKey}
        onResolved={onResolved}
      />
      {phase === "loading" && <p className="calc-loading">{t("common.loading")}</p>}
      {phase === "fallback" && (
        <div className="calc-status calc-status-error" role="alert">
          <div className="calc-fallback-note">
            <span>{t("ptool.calcOffline")}</span>
            <button
              type="button"
              onClick={() => {
                setPhase("loading");
                setAttempt((value) => value + 1);
              }}
            >
              Retry Desmos
            </button>
          </div>
          <div className="calc-fallback-body">
            <Calculator />
          </div>
        </div>
      )}
    </div>
  );
}
