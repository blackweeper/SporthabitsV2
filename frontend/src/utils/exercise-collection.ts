/**
 * Future downloadable "Collections IronFlow" — a curation/packaging axis,
 * distinct from `Discipline` (`exercise-discipline.ts`), which describes
 * what sport an exercise's CONTENT suits (pedagogical, filled by
 * enrichment). `collections` is an editorial decision about which
 * downloadable pack an exercise should ship in — some buckets here
 * (Home Gym, Beginner Journey) are equipment/level-based, not
 * discipline-based, so they deliberately don't reuse `Discipline`.
 */
export type FutureCollection =
  | "hyrox"
  | "crossfit"
  | "bodybuilding"
  | "home_gym"
  | "mobility_longevity"
  | "beginner_journey"
  | "running_performance";

export const FUTURE_COLLECTION_LABEL: Record<FutureCollection, string> = {
  hyrox: "HYROX",
  crossfit: "CrossFit",
  bodybuilding: "Bodybuilding",
  home_gym: "Home Gym",
  mobility_longevity: "Mobility & Longevity",
  beginner_journey: "Beginner Journey",
  running_performance: "Running Performance",
};

export const FUTURE_COLLECTIONS: FutureCollection[] = [
  "hyrox",
  "crossfit",
  "bodybuilding",
  "home_gym",
  "mobility_longevity",
  "beginner_journey",
  "running_performance",
];
