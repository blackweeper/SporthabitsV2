/**
 * Disciplines/programmes auxquels un exercice est particulièrement adapté —
 * affiché sur la fiche ("Disciplines adaptées") ET, plus tard, le champ
 * d'appartenance aux Collections IronFlow téléchargeables (Fondamentaux,
 * HYROX, CrossFit...) : même vocabulaire, un seul champ pour les deux usages
 * afin de ne jamais avoir à remodeler `ExerciseEnrichment` une deuxième fois.
 */
export type Discipline =
  | "musculation"
  | "hyrox"
  | "crossfit"
  | "halterophilie"
  | "mobilite"
  | "etirements"
  | "running"
  | "strongman"
  | "street_workout"
  | "kettlebell"
  | "powerlifting";

export const DISCIPLINE_LABEL: Record<Discipline, string> = {
  musculation: "Musculation",
  hyrox: "HYROX",
  crossfit: "CrossFit",
  halterophilie: "Haltérophilie",
  mobilite: "Mobilité",
  etirements: "Étirements",
  running: "Running",
  strongman: "Strongman",
  street_workout: "Street Workout",
  kettlebell: "Kettlebell",
  powerlifting: "Powerlifting",
};

export const DISCIPLINES: Discipline[] = [
  "musculation",
  "hyrox",
  "crossfit",
  "halterophilie",
  "mobilite",
  "etirements",
  "running",
  "strongman",
  "street_workout",
  "kettlebell",
  "powerlifting",
];
