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
import type { PainZone } from "@/src/utils/gym-storage";
import type { Program, ProgramLevel } from "@/src/data/programs";
import { COVER_COLORS } from "@/src/data/programs";
import { buildCandidatePool } from "@/src/utils/coach-pool";
import { goalToProgramGoalTag, scheduleProgram } from "@/src/utils/coach-scheduler";

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
};

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
  const { days, phases } = scheduleProgram({
    pool,
    goal: input.primaryGoal,
    level: input.level,
    weeklyFrequency: input.weeklyFrequency,
    sessionDurationMinutes: input.sessionDurationMinutes,
    totalWeeks,
  });

  const goalLabel = TRAINING_GOAL_LABEL[input.primaryGoal];

  return {
    id: uid(),
    title: `Coach IronFlow — ${goalLabel}`,
    description: `Généré automatiquement pour l'objectif "${goalLabel}", ${input.weeklyFrequency}x/semaine, séances d'environ ${input.sessionDurationMinutes} min.`,
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
