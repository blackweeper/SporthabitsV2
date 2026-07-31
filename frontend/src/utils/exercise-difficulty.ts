import { colors } from "@/src/theme";

export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export const EXERCISE_DIFFICULTY_LABEL: Record<ExerciseDifficulty, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

/** Colored-dot semantic (POLISH V2 card redesign) — reuses the existing
 * success/warning/error tokens rather than new hex literals. */
export const EXERCISE_DIFFICULTY_COLOR: Record<ExerciseDifficulty, string> = {
  beginner: colors.success,
  intermediate: colors.warning,
  advanced: colors.error,
};

export const EXERCISE_DIFFICULTIES: ExerciseDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];
