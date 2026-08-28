/**
 * Pourcentage central du widget à 4 anneaux du Dashboard/`day-detail` —
 * moyenne simple des 4 pourcentages de remplissage (calories brûlées / pas /
 * temps d'entraînement / sommeil). Le Score IronFlow (ancien 4e anneau,
 * `scoring.ts`) a été supprimé de l'app ; ce nombre n'a jamais été ce
 * score — juste une moyenne de complétion des anneaux, indépendante par
 * construction.
 */
export function computeDailyAggregateScore(ringPercents: number[]): number {
  if (ringPercents.length === 0) return 0;
  const capped = ringPercents.map((p) => Math.max(0, Math.min(100, p)));
  const avg = capped.reduce((sum, p) => sum + p, 0) / capped.length;
  return Math.round(avg);
}
