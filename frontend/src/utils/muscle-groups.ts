export type MuscleGroupKey =
  | "chest"
  | "back"
  | "shoulders"
  | "arms"
  | "legs"
  | "glutes"
  | "core"
  | "cardio"
  | "full_body";

export type MuscleGroupDef = { key: MuscleGroupKey; label: string; emoji: string };

/** Single source of truth for the muscle-group vocabulary, shared by the
 * "Séances individuelles" filter (app/(tabs)/training.tsx) and the exercise
 * library picker's musculation sub-filter. */
export const MUSCLE_GROUPS: MuscleGroupDef[] = [
  { key: "chest", label: "Pectoraux", emoji: "💪" },
  { key: "back", label: "Dos", emoji: "🦵" },
  { key: "shoulders", label: "Épaules", emoji: "🙆" },
  { key: "arms", label: "Bras", emoji: "💪" },
  { key: "legs", label: "Jambes", emoji: "🦵" },
  { key: "glutes", label: "Fessiers", emoji: "🍑" },
  { key: "core", label: "Abdominaux", emoji: "🌀" },
  { key: "cardio", label: "Cardio", emoji: "🏃" },
  { key: "full_body", label: "Full body", emoji: "🔥" },
];

/** The 6 core strength-training groups used to filter the exercise library. */
export const LIBRARY_MUSCLE_GROUPS: MuscleGroupDef[] = MUSCLE_GROUPS.filter((g) =>
  (["chest", "back", "shoulders", "legs", "arms", "core"] as MuscleGroupKey[]).includes(g.key),
);
