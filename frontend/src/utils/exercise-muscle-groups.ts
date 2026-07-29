/**
 * Normalized muscle taxonomy for the new professional exercise library
 * (ExerciseRecord, Phase B1) — 14 precise groups, richer than the legacy
 * 9-value `MuscleGroupKey` (`src/utils/muscle-groups.ts`) used by the
 * existing Bibliothèque picker/filters, which stays untouched.
 */
export type ExerciseMuscleGroup =
  | "chest"
  | "back"
  | "shoulders"
  | "biceps"
  | "triceps"
  | "forearms"
  | "abs"
  | "quads"
  | "hamstrings"
  | "glutes"
  | "calves"
  | "traps"
  | "lower_back"
  | "full_body";

export type ExerciseMuscleGroupDef = {
  key: ExerciseMuscleGroup;
  label: string;
  emoji: string;
};

export const EXERCISE_MUSCLE_GROUPS: ExerciseMuscleGroupDef[] = [
  { key: "chest", label: "Pectoraux", emoji: "💪" },
  { key: "back", label: "Dos", emoji: "🦅" },
  { key: "shoulders", label: "Épaules", emoji: "🙆" },
  { key: "biceps", label: "Biceps", emoji: "💪" },
  { key: "triceps", label: "Triceps", emoji: "🦾" },
  { key: "forearms", label: "Avant-bras", emoji: "✋" },
  { key: "abs", label: "Abdominaux", emoji: "🌀" },
  { key: "quads", label: "Quadriceps", emoji: "🦵" },
  { key: "hamstrings", label: "Ischio-jambiers", emoji: "🦵" },
  { key: "glutes", label: "Fessiers", emoji: "🍑" },
  { key: "calves", label: "Mollets", emoji: "🦶" },
  { key: "traps", label: "Trapèzes", emoji: "🔺" },
  { key: "lower_back", label: "Lombaires", emoji: "🔻" },
  { key: "full_body", label: "Corps entier", emoji: "🔥" },
];

export const EXERCISE_MUSCLE_GROUP_LABEL: Record<ExerciseMuscleGroup, string> =
  Object.fromEntries(EXERCISE_MUSCLE_GROUPS.map((g) => [g.key, g.label])) as Record<
    ExerciseMuscleGroup,
    string
  >;
