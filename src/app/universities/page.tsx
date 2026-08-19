import type { Metadata } from "next";
import { UniversityBrowser } from "@/components/universities/UniversityBrowser";

export const metadata: Metadata = {
  title: "Browse Universities",
  description: "Explore a focused directory of universities by location, SAT range and test policy.",
};

export default function UniversitiesPage() {
  return <UniversityBrowser />;
}
