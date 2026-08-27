/**
 * Recommandation d'intensité simple à partir du sommeil/FC repos/VFC
 * importés (Health Auto Export) comparés à la moyenne récente de
 * l'utilisateur — une heuristique simple et transparente, pas un score
 * scientifique/médical. `null` si aucune donnée disponible (état vide
 * propre, voir `HealthRecommendationCard.tsx`).
 */

export type HealthRecommendationLevel = "light" | "moderate" | "intense";

export type HealthRecommendation = {
  level: HealthRecommendationLevel;
  title: string;
  message: string;
};

export type HealthRecommendationInput = {
  sleepHours: number | null;
  restingHr: number | null;
  restingHrAvg7d: number | null;
  hrv: number | null;
  hrvAvg7d: number | null;
};

function formatHours(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

/** -1 mauvais, 0 neutre/pas de donnée, +1 bon — écart de 5%+ pour compter. */
function scoreSignal(value: number | null, avg: number | null, higherIsBetter: boolean): number {
  if (value == null || avg == null || avg === 0) return 0;
  const ratio = value / avg;
  const delta = higherIsBetter ? ratio - 1 : 1 - ratio;
  if (delta >= 0.05) return 1;
  if (delta <= -0.08) return -1;
  return 0;
}

export function computeHealthRecommendation(input: HealthRecommendationInput): HealthRecommendation | null {
  const hasAnyData = input.sleepHours != null || input.restingHr != null || input.hrv != null;
  if (!hasAnyData) return null;

  const sleepScore = input.sleepHours == null ? 0 : input.sleepHours >= 7 ? 1 : input.sleepHours < 6 ? -1 : 0;
  const hrvScore = scoreSignal(input.hrv, input.hrvAvg7d, true);
  // FC au repos plus basse que la moyenne = signe de bonne récupération.
  const hrScore = scoreSignal(input.restingHr, input.restingHrAvg7d, false);
  const total = sleepScore + hrvScore + hrScore;

  const parts: string[] = [];
  if (input.sleepHours != null) parts.push(`Tu as dormi ${formatHours(input.sleepHours)}`);
  if (input.hrv != null && input.hrvAvg7d != null) {
    parts.push(input.hrv >= input.hrvAvg7d ? "ta VFC est au-dessus de ta moyenne récente" : "ta VFC est en dessous de ta moyenne récente");
  }
  if (input.restingHr != null && input.restingHrAvg7d != null) {
    parts.push(
      input.restingHr <= input.restingHrAvg7d
        ? "ta FC au repos est dans ta norme"
        : "ta FC au repos est plus élevée que d'habitude",
    );
  }
  const detail = parts.length > 0 ? `${parts.join(", ")}.` : "";

  if (total <= -1) {
    return {
      level: "light",
      title: "Séance légère recommandée",
      message: `${detail} Ton corps semble avoir besoin de récupération aujourd'hui.`.trim(),
    };
  }
  if (total >= 1) {
    return {
      level: "intense",
      title: "Prêt pour une séance intense",
      message: `${detail} La récupération a l'air excellente, tu peux pousser aujourd'hui.`.trim(),
    };
  }
  return {
    level: "moderate",
    title: "Séance modérée recommandée",
    message: (detail || "Pas assez de signaux pour trancher clairement.") + " Reste à l'écoute de tes sensations.",
  };
}
