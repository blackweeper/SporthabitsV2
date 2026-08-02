/**
 * Coach IronFlow — orchestrateur public. Seule fonction que l'UI (future
 * écran questionnaire) doit appeler : prend un profil + la bibliothèque
 * complète, retourne un `Program` valide au format existant, immédiatement
 * affichable/lançable comme n'importe quel programme prédéfini ou importé.
 * 100% déterministe — aucune dépendance IA, aucun appel réseau.
 */
import type { ExerciseRecord } from "@/src/utils/exercise-records";
import type { ExerciseEquipment } from "@/src/utils/exercise-equipment";
import type { TrainingGoal } from "@/src/utils/exercise-training-goal";
import { TRAINING_GOAL_LABEL } from "@/src/utils/exercise-training-goal";
import type { AthleteCapacities, PainZone } from "@/src/utils/gym-storage";
import type { Program, ProgramLevel } from "@/src/data/programs";
import { COVER_COLORS } from "@/src/data/programs";
import { buildCandidatePool } from "@/src/utils/coach-pool";
import { goalToProgramGoalTag, scheduleProgram } from "@/src/utils/coach-scheduler";
import { CAPACITY_TO_GOALS, WEAK_CAPACITY_MIN_GAP, WEAK_CAPACITY_THRESHOLD } from "@/src/utils/coach-rules";
import { buildProgramDescription } from "@/src/utils/coach-explainer";

export type CoachEngineInput = {
  /** Catalogue complet (`getExerciseRecords()`) — le moteur filtre/score
   * lui-même, ne jamais pré-filtrer côté appelant. */
  allExercises: ExerciseRecord[];
  primaryGoal: TrainingGoal;
  level: ProgramLevel;
  weeklyFrequency: number;
  sessionDurationMinutes: number;
  /** Défaut 8 semaines — assez pour un premier cycle complet avec un
   * deload (`DELOAD_EVERY_N_WEEKS=5`) sans être interminable à générer. */
  totalWeeks?: number;
  availableEquipment?: ExerciseEquipment[] | null;
  painZones?: PainZone[] | null;
  /** Niveau 2 (profil sportif) — un point faible net nudge légèrement le
   * choix des exercices (voir `CAPACITY_TO_GOALS`), sans jamais changer les
   * séries/reps/repos du `primaryGoal`. */
  athleteCapacities?: AthleteCapacities | null;
  /** Niveau 3 (apprentissage, `coach-learning.ts`) — taux d'échec observé
   * par exercice, déprioritise sans exclure. */
  exerciseFailureRate?: Record<string, number> | null;
  /** Vrai quand l'appelant a préempli fréquence/durée depuis l'historique
   * réel (`computeLearningSignals`) — purement narratif (`coach-explainer.ts`),
   * n'affecte jamais la sélection elle-même. */
  historyInformed?: boolean;
};

/** Point faible réel = capacité <= seuil ET nettement sous la moyenne des
 * autres capacités déclarées (évite de "corriger" un profil juste
 * globalement bas, où aucune capacité ne ressort vraiment). Retourne les
 * objectifs associés à nudger, ou `null` si aucun point faible net. */
function weakGoalBoostFromCapacities(capacities: AthleteCapacities | null | undefined): TrainingGoal[] | null {
  if (!capacities) return null;
  const keys = Object.keys(CAPACITY_TO_GOALS) as (keyof typeof CAPACITY_TO_GOALS)[];
  const entries = keys
    .map((key) => ({ key, value: capacities[key] }))
    .filter((e): e is { key: keyof typeof CAPACITY_TO_GOALS; value: number } => typeof e.value === "number");
  if (entries.length < 2) return null; // pas assez de signal pour comparer

  const avg = entries.reduce((sum, e) => sum + e.value, 0) / entries.length;
  const weakest = entries.reduce((min, e) => (e.value < min.value ? e : min));
  if (weakest.value > WEAK_CAPACITY_THRESHOLD || avg - weakest.value < WEAK_CAPACITY_MIN_GAP) return null;

  return CAPACITY_TO_GOALS[weakest.key];
}

/** Génère un id local — copie volontairement `uid()` de `gym-storage.ts`
 * plutôt que de l'importer : `gym-storage.ts` tire une chaîne de modules
 * dépendant de React Native (via `program-library-sync.ts`), incompatible
 * avec une exécution hors app (scripts Node, futurs tests unitaires). Le
 * moteur reste ainsi une pure fonction sans dépendance au stockage. */
function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function generateProgram(input: CoachEngineInput): Program {
  const pool = buildCandidatePool(input.allExercises, {
    availableEquipment: input.availableEquipment,
    painZones: input.painZones,
  });

  const totalWeeks = input.totalWeeks ?? 8;
  const weakGoalBoost = weakGoalBoostFromCapacities(input.athleteCapacities);
  const { days, phases } = scheduleProgram({
    pool,
    goal: input.primaryGoal,
    level: input.level,
    weeklyFrequency: input.weeklyFrequency,
    sessionDurationMinutes: input.sessionDurationMinutes,
    totalWeeks,
    exerciseFailureRate: input.exerciseFailureRate,
    weakGoalBoost,
  });

  const goalLabel = TRAINING_GOAL_LABEL[input.primaryGoal];

  return {
    id: uid(),
    title: `Coach IronFlow — ${goalLabel}`,
    description: buildProgramDescription({
      goal: input.primaryGoal,
      level: input.level,
      weeklyFrequency: input.weeklyFrequency,
      sessionDurationMinutes: input.sessionDurationMinutes,
      totalWeeks,
      phases,
      weakGoalBoost,
      historyInformed: input.historyInformed,
    }),
    durationDays: days.length,
    level: input.level,
    goal: goalLabel,
    goalTag: goalToProgramGoalTag(input.primaryGoal),
    coverEmoji: "🎯",
    color: COVER_COLORS[0],
    days,
    isCustom: true,
    category: "workout",
    phases,
  };
}
