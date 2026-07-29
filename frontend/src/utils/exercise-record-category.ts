/**
 * Category taxonomy for the new professional exercise library (ExerciseRecord,
 * Phase B1). Deliberately a SEPARATE type from the legacy `ExerciseCategory`
 * (`src/utils/exercise-category.ts`, 3 values) used by the existing
 * session-stats/chart engine — that one stays untouched to avoid regressions
 * on the Phase A Bibliothèque and Progression screens.
 */
export type ExerciseRecordCategory =
  | "musculation"
  | "cardio"
  | "mobility"
  | "stretching"
  | "plyometric"
  | "sport";

export const EXERCISE_RECORD_CATEGORY_LABEL: Record<ExerciseRecordCategory, string> = {
  musculation: "Musculation",
  cardio: "Cardio",
  mobility: "Mobilité",
  stretching: "Étirement",
  plyometric: "Plyométrie",
  sport: "Sport",
};

export const EXERCISE_RECORD_CATEGORY_ICON: Record<ExerciseRecordCategory, any> = {
  musculation: "barbell",
  cardio: "bicycle",
  mobility: "body",
  stretching: "leaf",
  plyometric: "flash",
  sport: "football",
};

export const EXERCISE_RECORD_CATEGORY_COLOR: Record<ExerciseRecordCategory, string> = {
  musculation: "#FF5722",
  cardio: "#00B0FF",
  mobility: "#00E676",
  stretching: "#8BC34A",
  plyometric: "#FFC107",
  sport: "#AB47BC",
};

export const EXERCISE_RECORD_CATEGORIES: ExerciseRecordCategory[] = [
  "musculation",
  "cardio",
  "mobility",
  "stretching",
  "plyometric",
  "sport",
];
