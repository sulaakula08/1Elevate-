"use client";

import { useEffect, useState } from "react";
import type { Question } from "@/data/types";
import { useApp } from "@/lib/app-state";

/**
 * The whole bank, whole rows, for the staff surfaces that genuinely need it.
 *
 * The editor has to show a question to let someone edit it, and the generator has
 * to know what is already written to avoid repeating it — neither works on the
 * taxonomy index a student's browser holds. So these two read through
 * `question_bank_admin`, which returns everything including answers and
 * explanations and refuses anyone who is not staff.
 *
 * The refusal is in the database, on the function's first line, not here. This
 * hook is a convenience, not a check: calling it as a student returns an empty
 * list because the server said no, and that is the correct outcome rather than
 * something this file has to enforce.
 *
 * Refetched whenever the shared index changes, which is what makes a save or a
 * delete show up: those paths refresh the index, and this follows it.
 */
export function useAdminBank(): { bank: Question[]; ready: boolean } {
  const { bank: index, loadAdminBank } = useApp();
  const [bank, setBank] = useState<Question[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let live = true;
    void loadAdminBank().then((rows) => {
      if (!live) return;
      if (rows) setBank(rows);
      setReady(true);
    });
    return () => {
      live = false;
    };
  }, [loadAdminBank, index]);

  return { bank, ready };
}
