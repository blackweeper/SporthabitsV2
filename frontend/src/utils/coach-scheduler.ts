/**
 * Coach IronFlow — assemblage du programme complet (jours, séances,
 * sets/reps/repos, deload périodique) à partir du pool déjà filtré et du
 * sélecteur. Sortie : un `Program` au format existant, `days`/`sessions`
 * restant la seule source de vérité (`phases` n'est qu'annotatif).
 */
import type { ExerciseRecord } from "@/src/utils/exercise-records";
import type { TrainingGoal } from "@/src/utils/exercise-training-goal";
import type { ExerciseMuscleGroup } from "@/src/utils/exercise-muscle-groups";
import type { ExerciseTemplate, ProgramDay, ProgramGoal, ProgramLevel, ProgramPhase, ProgramSession } from "@/src/data/programs";
import { estimateSessionDurationSeconds } from "@/src/utils/session-estimate";
import {
  DELOAD_EVERY_N_WEEKS,
  DELOAD_SETS_MULTIPLIER,
  PRESCRIPTION_BY_GOAL,
  sessionFatigueBudget,
  splitTemplateForFrequency,
} from "@/src/utils/coach-rules";
import { pickExercisesForSession } from "@/src/utils/coach-selector";

export type SchedulerInput = {
  pool: ExerciseRecord[];
  goal: TrainingGoal;
  level: ProgramLevel;
  weeklyFrequency: number;
  sessionDurationMinutes: number;
  totalWeeks: number;
};

export type SchedulerOutput = {
  days: ProgramDay[];
  phases: ProgramPhase[];
};

/** Répartit `frequency` jours d'entraînement sur une semaine de 7 jours,
 * espacés le plus régulièrement possible (pas de vraie science du repos
 * ici, juste éviter d'empiler tous les jours d'entraînement au début de la
 * semaine). */
function weekTrainingPattern(frequency: number): boolean[] {
  const days = new Array(7).fill(false);
  const clamped = Math.max(1, Math.min(7, Math.round(frequency)));
  const step = 7 / clamped;
  for (let i = 0; i < clamped; i++) {
    const idx = Math.round(i * step) % 7;
    days[idx] = true;
  }
  return days;
}

function recordToExerciseTemplate(record: ExerciseRecord, sets: number, reps: string, restSeconds: number): ExerciseTemplate {
  return {
    name: record.nameFr,
    mode: "reps",
    sets,
    reps,
    weight: null,
    rest_seconds: restSeconds,
    duration_seconds: null,
    notes: null,
    exerciseRecordId: record.id,
    matchConfidence: "exact",
  };
}

/** Estimation grossière du nombre d'exercices qu'une séance peut contenir
 * dans le temps imparti (~8 min/exercice, échauffement+transition inclus) —
 * affinée ensuite par un essai/retrait réel via `estimateSessionDurationSeconds`. */
function estimateExerciseCount(sessionDurationMinutes: number): number {
  return Math.max(3, Math.min(10, Math.round(sessionDurationMinutes / 8)));
}

function buildSession(
  pool: ExerciseRecord[],
  ctx: {
    goal: TrainingGoal;
    targetMuscles: ExerciseMuscleGroup[];
    level: ProgramLevel;
    sessionDurationMinutes: number;
    setsMultiplier: number;
    recentlyUsedIds: Set<string>;
  },
  label: string,
): { session: ProgramSession; usedIds: string[] } {
  const budget = sessionFatigueBudget(ctx.sessionDurationMinutes, ctx.level);
  const maxExercises = estimateExerciseCount(ctx.sessionDurationMinutes);
  const picked = pickExercisesForSession(pool, {
    goal: ctx.goal,
    targetMuscles: ctx.targetMuscles,
    level: ctx.level,
    fatigueBudgetRemaining: budget,
    recentlyUsedIds: ctx.recentlyUsedIds,
    maxExercises,
  });

  const prescription = PRESCRIPTION_BY_GOAL[ctx.goal];
  const sets = Math.max(1, Math.round(prescription.sets * ctx.setsMultiplier));
  let exercises = picked.map((r) => recordToExerciseTemplate(r, sets, prescription.reps, prescription.restSeconds));

  // Ajustement grossier à la durée cible : si l'estimation dépasse de plus
  // de 25% la durée visée, retire les derniers exercices (les moins bien
  // scorés, puisque `pickExercisesForSession` pique déjà par score
  // décroissant) jusqu'à repasser sous la tolérance.
  const targetSeconds = ctx.sessionDurationMinutes * 60;
  while (exercises.length > 2 && estimateSessionDurationSeconds(exercises) > targetSeconds * 1.25) {
    exercises = exercises.slice(0, -1);
  }

  return {
    session: { label, title: label, exercises },
    usedIds: exercises.map((e) => e.exerciseRecordId!).filter(Boolean),
  };
}

export function scheduleProgram(input: SchedulerInput): SchedulerOutput {
  const split = splitTemplateForFrequency(input.weeklyFrequency);
  const trainingPattern = weekTrainingPattern(input.weeklyFrequency);
  const days: ProgramDay[] = [];
  const phases: ProgramPhase[] = [];

  // Fenêtre glissante des exercices utilisés sur la semaine précédente —
  // pénalise la répétition sans jamais l'interdire (voir coach-selector.ts).
  let recentlyUsedIds = new Set<string>();
  let splitDayCursor = 0;

  for (let week = 0; week < input.totalWeeks; week++) {
    const isDeload = (week + 1) % DELOAD_EVERY_N_WEEKS === 0;
    const setsMultiplier = isDeload ? DELOAD_SETS_MULTIPLIER : 1;
    const weekUsedIds = new Set<string>();
    // Accumule au fil de la semaine (pas seulement d'une semaine à l'autre) —
    // sans ça, un split "Full Body" (mêmes muscles ciblés chaque jour)
    // choisissait exactement les mêmes exercices les 3 jours de la semaine,
    // faute de signal de répétition avant la fin de la semaine. `seenIds`
    // parle à `buildSession` comme "déjà utilisé récemment", `recentlyUsedIds`
    // (semaine précédente) reste le point de départ.
    const seenIds = new Set(recentlyUsedIds);
    const startDay = week * 7 + 1;

    for (let d = 0; d < 7; d++) {
      if (!trainingPattern[d]) {
        days.push({ rest: true, title: "Repos", sessions: [] });
        continue;
      }
      const splitDay = split.days[splitDayCursor % split.days.length];
      splitDayCursor++;
      const { session, usedIds } = buildSession(
        input.pool,
        {
          goal: input.goal,
          targetMuscles: splitDay.muscleFocus,
          level: input.level,
          sessionDurationMinutes: input.sessionDurationMinutes,
          setsMultiplier,
          recentlyUsedIds: seenIds,
        },
        splitDay.label,
      );
      days.push({ rest: false, title: splitDay.label, sessions: [session] });
      for (const id of usedIds) {
        weekUsedIds.add(id);
        seenIds.add(id);
      }
    }

    phases.push({
      startDay,
      endDay: startDay + 6,
      kind: isDeload ? "deload" : "volume",
      label: isDeload ? `Semaine ${week + 1} — Décharge` : `Semaine ${week + 1}`,
    });
    recentlyUsedIds = weekUsedIds;
  }

  return { days, phases };
}

export function goalToProgramGoalTag(goal: TrainingGoal): ProgramGoal | undefined {
  const map: Partial<Record<TrainingGoal, ProgramGoal>> = {
    strength: "force",
    hypertrophy: "prise_de_masse",
    endurance: "perte_de_poids",
    conditioning: "perte_de_poids",
    mobility: "mobilite",
  };
  return map[goal];
}
