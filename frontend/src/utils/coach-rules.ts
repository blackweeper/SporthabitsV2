/**
 * Coach IronFlow — règles de programmation sportive déclaratives. Aucune
 * logique de sélection ici (voir `coach-selector.ts`/`coach-scheduler.ts`) —
 * uniquement des constantes ajustables sans toucher au moteur, même
 * principe que `BUCKET_QUOTA` dans `curate-official-library.ts`.
 */
import type { TrainingGoal } from "@/src/utils/exercise-training-goal";
import type { ExerciseMuscleGroup } from "@/src/utils/exercise-muscle-groups";
import type { MovementPattern } from "@/src/utils/exercise-movement-pattern";
import type { ProgramLevel } from "@/src/data/programs";
import type { AthleteCapacities, PainZone } from "@/src/utils/gym-storage";

// ---------- Muscle groupings ----------

export const PUSH_MUSCLES: ExerciseMuscleGroup[] = ["chest", "shoulders", "triceps"];
export const PULL_MUSCLES: ExerciseMuscleGroup[] = ["back", "biceps", "traps", "forearms"];
export const LEG_MUSCLES: ExerciseMuscleGroup[] = ["quads", "hamstrings", "glutes", "calves", "lower_back"];
export const CORE_MUSCLES: ExerciseMuscleGroup[] = ["abs"];
export const UPPER_MUSCLES: ExerciseMuscleGroup[] = [...PUSH_MUSCLES, ...PULL_MUSCLES];
export const FULL_BODY_MUSCLES: ExerciseMuscleGroup[] = [
  ...PUSH_MUSCLES,
  ...PULL_MUSCLES,
  ...LEG_MUSCLES,
  ...CORE_MUSCLES,
];

// ---------- Split templates by weekly frequency ----------

export type SplitDay = { label: string; muscleFocus: ExerciseMuscleGroup[] };
export type SplitTemplate = { label: string; days: SplitDay[] };

/** Une entrée par fréquence hebdomadaire cible (2 à 6). Au-delà de 6, on
 * réutilise le split 6x (pas de split 7x — un jour de repos reste
 * recommandé même à haute fréquence). En dessous de 2, on retombe sur le
 * split 2x (fréquence minimale utile pour un programme structuré). */
export const SPLIT_TEMPLATES: Record<number, SplitTemplate> = {
  2: { label: "Full Body", days: [
    { label: "Full Body A", muscleFocus: FULL_BODY_MUSCLES },
    { label: "Full Body B", muscleFocus: FULL_BODY_MUSCLES },
  ] },
  3: { label: "Full Body", days: [
    { label: "Full Body A", muscleFocus: FULL_BODY_MUSCLES },
    { label: "Full Body B", muscleFocus: FULL_BODY_MUSCLES },
    { label: "Full Body C", muscleFocus: FULL_BODY_MUSCLES },
  ] },
  4: { label: "Haut / Bas", days: [
    { label: "Haut du corps A", muscleFocus: UPPER_MUSCLES },
    { label: "Bas du corps A", muscleFocus: [...LEG_MUSCLES, ...CORE_MUSCLES] },
    { label: "Haut du corps B", muscleFocus: UPPER_MUSCLES },
    { label: "Bas du corps B", muscleFocus: [...LEG_MUSCLES, ...CORE_MUSCLES] },
  ] },
  5: { label: "Push / Pull / Legs + Haut / Bas", days: [
    { label: "Push", muscleFocus: PUSH_MUSCLES },
    { label: "Pull", muscleFocus: PULL_MUSCLES },
    { label: "Legs", muscleFocus: [...LEG_MUSCLES, ...CORE_MUSCLES] },
    { label: "Haut du corps", muscleFocus: UPPER_MUSCLES },
    { label: "Bas du corps", muscleFocus: [...LEG_MUSCLES, ...CORE_MUSCLES] },
  ] },
  6: { label: "Push / Pull / Legs ×2", days: [
    { label: "Push A", muscleFocus: PUSH_MUSCLES },
    { label: "Pull A", muscleFocus: PULL_MUSCLES },
    { label: "Legs A", muscleFocus: [...LEG_MUSCLES, ...CORE_MUSCLES] },
    { label: "Push B", muscleFocus: PUSH_MUSCLES },
    { label: "Pull B", muscleFocus: PULL_MUSCLES },
    { label: "Legs B", muscleFocus: [...LEG_MUSCLES, ...CORE_MUSCLES] },
  ] },
};

export function splitTemplateForFrequency(frequency: number): SplitTemplate {
  const clamped = Math.max(2, Math.min(6, Math.round(frequency)));
  return SPLIT_TEMPLATES[clamped];
}

// ---------- Volume — sets per muscle group per week (hypertrophy/strength goals) ----------

export const WEEKLY_SET_LANDMARKS: Record<ProgramLevel, { min: number; max: number }> = {
  debutant: { min: 6, max: 10 },
  intermediaire: { min: 10, max: 16 },
  avance: { min: 14, max: 20 },
};

// ---------- Sets/reps/repos par objectif — repli quand la bibliothèque n'a
// pas de restTimeByGoal pour l'exercice choisi (couverture 266/300 sur les
// officiels, 0/1048 sur le reste) ----------

export type GoalPrescription = { sets: number; reps: string; restSeconds: number };

export const PRESCRIPTION_BY_GOAL: Record<TrainingGoal, GoalPrescription> = {
  strength: { sets: 5, reps: "3-6", restSeconds: 180 },
  hypertrophy: { sets: 4, reps: "8-12", restSeconds: 90 },
  endurance: { sets: 3, reps: "15-20", restSeconds: 45 },
  conditioning: { sets: 3, reps: "12-15", restSeconds: 60 },
  mobility: { sets: 2, reps: "8-12", restSeconds: 30 },
  rehabilitation: { sets: 2, reps: "10-15", restSeconds: 60 },
  hyrox: { sets: 3, reps: "12-15", restSeconds: 60 },
  crossfit: { sets: 3, reps: "10-15", restSeconds: 60 },
  running: { sets: 1, reps: "1", restSeconds: 120 },
  power: { sets: 5, reps: "3-5", restSeconds: 150 },
  stability: { sets: 3, reps: "10-15", restSeconds: 45 },
};

// ---------- Budget de fatigue par séance ----------

/** Somme (fatigueNervous + fatigueMuscular)/2 des exercices d'une séance,
 * plafonnée pour éviter d'enchaîner trop de mouvements très coûteux. Monte
 * avec la durée disponible et le niveau (un avancé récupère mieux/plus
 * vite qu'un débutant sur une même séance). */
export function sessionFatigueBudget(sessionDurationMinutes: number, level: ProgramLevel): number {
  const perMinute = level === "avance" ? 0.9 : level === "intermediaire" ? 0.75 : 0.6;
  return Math.round(sessionDurationMinutes * perMinute);
}

// ---------- Exclusions liées aux douleurs (PainZone -> mouvements/muscles à
// éviter) — heuristique volontairement prudente, une exclusion dure jamais
// une simple dépréciation : en cas de douleur, on retire plutôt que de
// déprioriser. Pas un avis médical, un garde-fou de bon sens. ----------

export const PAIN_ZONE_EXCLUDED_PATTERNS: Partial<Record<PainZone, MovementPattern[]>> = {
  knees: ["squat"],
  lowerBack: ["hinge"],
  ankles: ["locomotion"],
};

export const PAIN_ZONE_EXCLUDED_MUSCLES: Partial<Record<PainZone, ExerciseMuscleGroup[]>> = {
  wrists: ["forearms"],
  elbows: ["triceps", "biceps", "forearms"],
  neck: ["traps"],
  lowerBack: ["lower_back"],
  shoulders: ["shoulders"],
  knees: ["quads", "hamstrings", "calves"],
  hips: ["glutes", "quads", "hamstrings"],
};

// ---------- Deload périodique ----------

/** Toutes les N semaines, une semaine à volume réduit plutôt qu'une
 * semaine identique — évite l'accumulation de fatigue sur un cycle long.
 * `setsMultiplier` réduit uniquement le nombre de séries, jamais l'exercice
 * choisi (le split/la sélection restent identiques, cohérent avec le fait
 * que `phases` n'est qu'annotatif sur `Program`). */
export const DELOAD_EVERY_N_WEEKS = 5;
export const DELOAD_SETS_MULTIPLIER = 0.6;

// ---------- Point faible déclaré (AthleteCapacities) -> objectifs à
// nudge dans le sélecteur. Une capacité 0-10 nettement en retrait sur les
// autres fait discrètement pencher le choix des exercices vers ces
// objectifs secondaires, sans jamais changer les séries/reps/repos
// (toujours ceux du `primaryGoal`, voir `PRESCRIPTION_BY_GOAL`). ----------

export const CAPACITY_TO_GOALS: Record<keyof Omit<AthleteCapacities, "updatedAt">, TrainingGoal[]> = {
  strength: ["strength", "power"],
  cardio: ["endurance", "conditioning"],
  mobility: ["mobility", "stability"],
  weightliftingTechnique: ["power", "strength"],
  muscularEndurance: ["endurance", "hypertrophy"],
};

/** Poids appliqué à `goalValue[goal]` pour chaque objectif nudgé — nettement
 * plus faible que le `*3` du `primaryGoal` dans `coach-selector.ts`, et
 * volontairement modeste face à la pénalité `recentlyUsedIds` (-4, fixe) :
 * un point faible influence le choix, il ne doit jamais faire revenir le
 * même exercice sur tous les jours de la semaine (vérifié à 1.2, un même
 * mouvement "conditioning" dominait toutes les séances malgré la pénalité
 * de répétition — ramené à 0.6). */
export const WEAK_CAPACITY_GOAL_WEIGHT = 0.6;

/** En dessous de ce seuil (0-10), une capacité est considérée faible. */
export const WEAK_CAPACITY_THRESHOLD = 4;
/** Écart minimum avec la moyenne des autres capacités pour qu'un point
 * faible soit jugé réel plutôt qu'un simple bruit (profil globalement bas). */
export const WEAK_CAPACITY_MIN_GAP = 2;
