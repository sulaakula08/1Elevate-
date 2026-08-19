export type TestPolicy = "required" | "optional" | "flexible" | "unknown";

export type University = {
  id: string;
  name: string;
  shortName?: string;
  city: string;
  state?: string;
  country: string;
  satLow?: number;
  satHigh?: number;
  satRangeNote?: string;
  testPolicy: TestPolicy;
  policyNote?: string;
  website: string;
  sourceUrl: string;
};

/**
 * A deliberately small, source-backed starter directory.
 *
 * SAT values are included only where the university publishes a composite
 * middle-50% range. Section percentiles are not added together and third-party
 * estimates are not used. Policies reflect the 2026–27 application cycle where
 * the source names one; every card links back to the official page so a student
 * can verify the current cycle before applying.
 */
export const UNIVERSITIES: University[] = [
  {
    id: "mit",
    name: "Massachusetts Institute of Technology",
    shortName: "MIT",
    city: "Cambridge",
    state: "Massachusetts",
    country: "United States",
    testPolicy: "required",
    policyNote: "SAT or ACT required; official statistics publish section ranges only.",
    website: "https://www.mit.edu/",
    sourceUrl: "https://mitadmissions.org/apply/firstyear/tests-scores/",
  },
  {
    id: "stanford",
    name: "Stanford University",
    city: "Stanford",
    state: "California",
    country: "United States",
    satLow: 1510,
    satHigh: 1570,
    satRangeNote: "Middle 50% of Class of 2028 score submitters",
    testPolicy: "required",
    website: "https://www.stanford.edu/",
    sourceUrl: "https://admission.stanford.edu/apply/first-year/testing.html",
  },
  {
    id: "harvard",
    name: "Harvard University",
    city: "Cambridge",
    state: "Massachusetts",
    country: "United States",
    testPolicy: "required",
    policyNote: "SAT or ACT required, with alternatives in exceptional access cases.",
    website: "https://www.harvard.edu/",
    sourceUrl: "https://college.harvard.edu/admissions/apply/application-requirements",
  },
  {
    id: "yale",
    name: "Yale University",
    city: "New Haven",
    state: "Connecticut",
    country: "United States",
    testPolicy: "required",
    policyNote: "First-year applicants must include ACT or SAT scores.",
    website: "https://www.yale.edu/",
    sourceUrl: "https://admissions.yale.edu/standardized-testing",
  },
  {
    id: "duke",
    name: "Duke University",
    city: "Durham",
    state: "North Carolina",
    country: "United States",
    satLow: 1520,
    satHigh: 1570,
    satRangeNote: "Middle 50% of Class of 2027 score submitters",
    testPolicy: "optional",
    policyNote: "Test-optional for the 2026–27 application cycle.",
    website: "https://www.duke.edu/",
    sourceUrl: "https://admissions.duke.edu/what-we-look-for/",
  },
  {
    id: "princeton",
    name: "Princeton University",
    city: "Princeton",
    state: "New Jersey",
    country: "United States",
    testPolicy: "optional",
    policyNote: "Test-optional for fall 2027 entry; requirements resume the following cycle.",
    website: "https://www.princeton.edu/",
    sourceUrl: "https://admission.princeton.edu/apply/standardized-testing",
  },
  {
    id: "caltech",
    name: "California Institute of Technology",
    shortName: "Caltech",
    city: "Pasadena",
    state: "California",
    country: "United States",
    testPolicy: "required",
    policyNote: "SAT or ACT required; scores are reviewed in section-level buckets.",
    website: "https://www.caltech.edu/",
    sourceUrl:
      "https://www.admissions.caltech.edu/apply/first-year-applicants/standardized-tests",
  },
  {
    id: "oxford",
    name: "University of Oxford",
    shortName: "Oxford",
    city: "Oxford",
    country: "United Kingdom",
    testPolicy: "flexible",
    policyNote: "For US applicants, SAT can form part of an accepted AP-based qualification route.",
    website: "https://www.ox.ac.uk/",
    sourceUrl:
      "https://www.ox.ac.uk/admissions/undergraduate/courses/admissions-requirements/international-qualifications",
  },
  {
    id: "toronto",
    name: "University of Toronto",
    shortName: "U of T",
    city: "Toronto",
    state: "Ontario",
    country: "Canada",
    testPolicy: "unknown",
    policyNote: "Requirements depend on the applicant's curriculum and program.",
    website: "https://www.utoronto.ca/",
    sourceUrl: "https://future.utoronto.ca/apply/requirements/",
  },
  {
    id: "ubc",
    name: "University of British Columbia",
    shortName: "UBC",
    city: "Vancouver",
    state: "British Columbia",
    country: "Canada",
    testPolicy: "unknown",
    policyNote: "Requirements depend on the applicant's curriculum and degree choice.",
    website: "https://www.ubc.ca/",
    sourceUrl: "https://you.ubc.ca/applying-ubc/requirements/",
  },
];

export const TEST_POLICY_LABELS: Record<TestPolicy, string> = {
  required: "Test required",
  optional: "Test optional",
  flexible: "Test flexible",
  unknown: "Check requirements",
};
