import type { ReactNode } from "react";
import { PracticeSessionProvider } from "@/components/practice/PracticeSession";

export default function PracticeLayout({ children }: { children: ReactNode }) {
  return <PracticeSessionProvider>{children}</PracticeSessionProvider>;
}
