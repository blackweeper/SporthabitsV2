/**
 * Objectifs d'entraînement pour lesquels un exercice est recommandé — extrait
 * en type nommé (était une union inline dans `ExerciseEnrichment.trainingGoals`,
 * `exercise-records.ts`) pour être réutilisable ailleurs (ex. `restTimeByGoal`,
 * qui a besoin du même vocabulaire comme clés de map).
 */
export type TrainingGoal =
  | "strength"
  | "hypertrophy"
  | "endurance"
  | "conditioning"
  | "mobility"
  | "rehabilitation"
  | "hyrox"
  | "crossfit"
  | "running"
  | "power"
  | "stability";

export const TRAINING_GOAL_LABEL: Record<TrainingGoal, string> = {
  strength: "Force",
  hypertrophy: "Hypertrophie",
  endurance: "Endurance",
  conditioning: "Conditionnement",
  mobility: "Mobilité",
  rehabilitation: "Rééducation",
  hyrox: "HYROX",
  crossfit: "CrossFit",
  running: "Course à pied",
  power: "Puissance",
  stability: "Stabilité",
};

export const TRAINING_GOALS: TrainingGoal[] = [
  "strength",
  "hypertrophy",
  "endurance",
  "conditioning",
  "mobility",
  "rehabilitation",
  "hyrox",
  "crossfit",
  "running",
  "power",
  "stability",
];
