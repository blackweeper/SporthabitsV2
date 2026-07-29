export type ExerciseDifficulty = "beginner" | "intermediate" | "advanced";

export const EXERCISE_DIFFICULTY_LABEL: Record<ExerciseDifficulty, string> = {
  beginner: "Débutant",
  intermediate: "Intermédiaire",
  advanced: "Avancé",
};

export const EXERCISE_DIFFICULTIES: ExerciseDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];
