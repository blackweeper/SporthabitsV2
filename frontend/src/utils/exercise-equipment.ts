/**
 * Equipment taxonomy for the new professional exercise library (ExerciseRecord,
 * Phase B1). New, standalone classification — the legacy `CustomExercise.equipment`
 * field (`src/utils/gym-storage.ts`) is a free-text string and is left as-is.
 */
export type ExerciseEquipment =
  | "barbell"
  | "dumbbell"
  | "kettlebell"
  | "machine"
  | "bodyweight"
  | "resistance_band"
  | "jump_rope"
  | "rowing_machine"
  | "assault_bike"
  | "ski_erg"
  | "treadmill"
  | "other";

export type ExerciseEquipmentDef = {
  key: ExerciseEquipment;
  label: string;
  icon: any;
};

export const EXERCISE_EQUIPMENT: ExerciseEquipmentDef[] = [
  { key: "barbell", label: "Barre", icon: "barbell" },
  { key: "dumbbell", label: "Haltères", icon: "barbell-outline" },
  { key: "kettlebell", label: "Kettlebell", icon: "fitness" },
  { key: "machine", label: "Machine", icon: "cog" },
  { key: "bodyweight", label: "Poids du corps", icon: "body" },
  { key: "resistance_band", label: "Élastique", icon: "resize" },
  { key: "jump_rope", label: "Corde", icon: "infinite" },
  { key: "rowing_machine", label: "Rameur", icon: "boat" },
  { key: "assault_bike", label: "Assault Bike", icon: "bicycle" },
  { key: "ski_erg", label: "SkiErg", icon: "snow" },
  { key: "treadmill", label: "Tapis de course", icon: "walk" },
  { key: "other", label: "Autre", icon: "ellipsis-horizontal" },
];

export const EXERCISE_EQUIPMENT_LABEL: Record<ExerciseEquipment, string> = Object.fromEntries(
  EXERCISE_EQUIPMENT.map((e) => [e.key, e.label]),
) as Record<ExerciseEquipment, string>;
