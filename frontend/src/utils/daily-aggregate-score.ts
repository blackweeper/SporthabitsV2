/**
 * Score central du widget à 4 anneaux du Dashboard — moyenne simple des 4
 * pourcentages de remplissage (calories brûlées / pas / temps d'entraînement
 * / Score IronFlow). Volontairement indépendant de `computeDailyIronflowScore`
 * (`scoring.ts`), déjà utilisé ailleurs dans l'app (ex. Progression) : ce
 * nouveau nombre n'a pas vocation à remplacer ou influencer ce score existant.
 */
export function computeDailyAggregateScore(ringPercents: number[]): number {
  if (ringPercents.length === 0) return 0;
  const capped = ringPercents.map((p) => Math.max(0, Math.min(100, p)));
  const avg = capped.reduce((sum, p) => sum + p, 0) / capped.length;
  return Math.round(avg);
}
