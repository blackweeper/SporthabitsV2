/**
 * Coach IronFlow — scoring et sélection des exercices d'une séance. Prend
 * un pool déjà filtré (`coach-pool.ts`) et choisit, créneau par créneau,
 * l'exercice le plus pertinent pour l'objectif/les muscles ciblés/le budget
 * de fatigue restant — jamais aléatoire, toujours déterministe (même
 * entrée = même sortie).
 */
import type { ExerciseRecord } from "@/src/utils/exercise-records";
import type { ExerciseMuscleGroup } from "@/src/utils/exercise-muscle-groups";
import type { TrainingGoal } from "@/src/utils/exercise-training-goal";
import type { ProgramLevel } from "@/src/data/programs";

export type SelectorContext = {
  goal: TrainingGoal;
  targetMuscles: ExerciseMuscleGroup[];
  level: ProgramLevel;
  fatigueBudgetRemaining: number;
  /** Ids déjà utilisés récemment (mêmes jours/semaine précédente) — pénalise
   * sans jamais exclure totalement (un pool restreint par matériel doit
   * pouvoir répéter un exercice plutôt que renvoyer une séance vide). */
  recentlyUsedIds: Set<string>;
  /** Combien de fois chaque muscle cible a déjà été couvert dans CETTE
   * séance — utilisé pour répartir les choix plutôt que d'empiler 5
   * exercices du même muscle si `targetMuscles` en contient plusieurs. */
  muscleCoverage: Map<ExerciseMuscleGroup, number>;
};

function fatigueCost(record: ExerciseRecord): number {
  const scores = record.enrichment?.coachScores;
  if (!scores) return 5; // valeur neutre si jamais un exercice n'a pas encore de coachScores
  return ((scores.fatigueNervous ?? 4) + (scores.fatigueMuscular ?? 5)) / 2;
}

export function scoreExerciseForSlot(record: ExerciseRecord, ctx: SelectorContext): number {
  const scores = record.enrichment?.coachScores;
  const cost = fatigueCost(record);
  if (cost > ctx.fatigueBudgetRemaining) return -Infinity; // ne rentre plus dans le budget de la séance

  let score = 0;

  const goalValue = scores?.goalValue?.[ctx.goal] ?? 0;
  score += goalValue * 3;

  if (record.primaryMuscle && ctx.targetMuscles.includes(record.primaryMuscle)) {
    const covered = ctx.muscleCoverage.get(record.primaryMuscle) ?? 0;
    score += Math.max(1, 6 - covered * 2); // décroît à mesure que ce muscle est déjà couvert
  }
  if (record.secondaryMuscles?.some((m) => ctx.targetMuscles.includes(m))) {
    score += 1.5;
  }

  if (record.exerciseTier === "essential") score += 3;
  else if (record.exerciseTier === "official_core") score += 1.5;
  // collection_only / null : aucun bonus, mais jamais exclu (voir coach-pool.ts)

  const difficultyRank: Record<string, number> = { beginner: 0, intermediate: 1, advanced: 2 };
  const levelRank: Record<ProgramLevel, number> = { debutant: 0, intermediaire: 1, avance: 2 };
  if (record.difficulty) {
    const gap = Math.abs((difficultyRank[record.difficulty] ?? 1) - levelRank[ctx.level]);
    score -= gap * 1.5; // pénalise un écart de niveau trop grand (dans les 2 sens)
  }

  if (ctx.recentlyUsedIds.has(record.id)) score -= 4;

  return score;
}

/** Sélectionne jusqu'à `maxExercises` exercices pour une séance, greedy :
 * à chaque tour, prend le meilleur score restant, met à jour le budget de
 * fatigue et la couverture musculaire, recommence. S'arrête plus tôt si
 * plus aucun candidat ne rentre dans le budget restant. */
export function pickExercisesForSession(
  pool: ExerciseRecord[],
  ctx: Omit<SelectorContext, "muscleCoverage"> & { maxExercises: number },
): ExerciseRecord[] {
  const muscleCoverage = new Map<ExerciseMuscleGroup, number>();
  const picked: ExerciseRecord[] = [];
  const pickedIds = new Set<string>();
  let fatigueBudgetRemaining = ctx.fatigueBudgetRemaining;

  while (picked.length < ctx.maxExercises) {
    let best: ExerciseRecord | null = null;
    let bestScore = -Infinity;
    for (const record of pool) {
      if (pickedIds.has(record.id)) continue;
      const score = scoreExerciseForSlot(record, {
        goal: ctx.goal,
        targetMuscles: ctx.targetMuscles,
        level: ctx.level,
        fatigueBudgetRemaining,
        recentlyUsedIds: ctx.recentlyUsedIds,
        muscleCoverage,
      });
      if (score > bestScore) {
        bestScore = score;
        best = record;
      }
    }
    if (!best || bestScore === -Infinity) break; // plus rien ne rentre dans le budget
    picked.push(best);
    pickedIds.add(best.id);
    fatigueBudgetRemaining -= fatigueCost(best);
    if (best.primaryMuscle) {
      muscleCoverage.set(best.primaryMuscle, (muscleCoverage.get(best.primaryMuscle) ?? 0) + 1);
    }
  }

  return picked;
}
