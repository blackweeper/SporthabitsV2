import { Plan, WorkoutSession } from "@/src/utils/gym-storage";

export type WodHistoryPoint = { sessionId: string; date: string; value: number };

export type WodHistoryEntry = {
  planId: string;
  planTitle: string;
  format: string;
  /** Certaines listes WOD (voir `wod-library.ts`) attachent une image de
   * couverture — réutilisée pour que la carte Performance ait la même
   * identité que la bibliothèque WOD (jamais un design séparé). */
  points: WodHistoryPoint[]; // chronologique
  best: number | null;
  last: number | null;
  previous: number | null;
  /** `last - previous` (positif = progrès pour un format où "plus haut est
   * mieux", comme AMRAP/EMOM) — `null` tant qu'il n'y a pas 2 séances. */
  progressDelta: number | null;
};

/**
 * Historique de progression par WOD nommé (Best/Dernier/Précédent) — jamais
 * "as-tu fait un AMRAP", mais "as-tu progressé SUR CE WOD précis" (voir
 * brief : refaire Cindy à 5 puis 7 tours doit montrer "7 tours ↑ +2").
 *
 * Scope actuel : uniquement le format AMRAP (le seul dont le résultat
 * "nombre de tours" est déjà capturé de façon fiable dans
 * `SessionExerciseLog.sets[0].reps` — voir `wod-result-normalizer.ts`). Les
 * autres formats (For Time/EMOM/For Reps) demandent chacun une lecture
 * différente de la donnée de résultat, pas encore fiabilisée pour tous —
 * ajoutés séparément plutôt que de deviner une comparaison incertaine.
 */
export function computeAmrapWodHistory(
  sessions: WorkoutSession[],
  plans: Plan[],
): WodHistoryEntry[] {
  const wodPlanById = new Map(plans.filter((p) => p.wodSource).map((p) => [p.id, p]));
  const byPlan = new Map<string, WodHistoryPoint[]>();

  for (const s of sessions) {
    const plan = wodPlanById.get(s.planId);
    if (!plan) continue;
    for (const ex of s.exercises) {
      if (ex.mode !== "amrap") continue;
      const completedSet = ex.sets.find((st) => st.completed);
      const rounds = completedSet ? parseInt(completedSet.reps, 10) : NaN;
      if (!Number.isFinite(rounds) || rounds <= 0) continue;
      const list = byPlan.get(s.planId) ?? [];
      list.push({ sessionId: s.id, date: s.startedAt, value: rounds });
      byPlan.set(s.planId, list);
      break; // un seul bloc AMRAP par séance WOD dans ce modèle
    }
  }

  const entries: WodHistoryEntry[] = [];
  for (const [planId, points] of byPlan) {
    points.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const plan = wodPlanById.get(planId)!;
    const values = points.map((p) => p.value);
    const best = values.length ? Math.max(...values) : null;
    const last = values.length ? values[values.length - 1] : null;
    const previous = values.length >= 2 ? values[values.length - 2] : null;
    const progressDelta = last != null && previous != null ? last - previous : null;
    entries.push({
      planId,
      planTitle: plan.title,
      format: plan.wodSource!.format,
      points,
      best,
      last,
      previous,
      progressDelta,
    });
  }

  return entries.sort((a, b) => {
    const aLast = a.points[a.points.length - 1]?.date ?? "";
    const bLast = b.points[b.points.length - 1]?.date ?? "";
    return bLast.localeCompare(aLast);
  });
}
