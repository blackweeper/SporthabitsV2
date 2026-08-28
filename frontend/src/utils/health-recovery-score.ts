/**
 * Score de récupération quotidien (0-100) pour l'écran Santé — PAS un
 * diagnostic médical, un indicateur pour guider l'intensité d'entraînement
 * du jour (voir `ReadinessInsight`/`HealthScoreCard`). Chaque composant
 * compare la valeur du jour à la moyenne personnelle récente de
 * l'utilisateur (7 jours, voir `getRecentMetricAverage`/`getRecentDailyAverage`
 * dans `health-data-storage.ts`) plutôt qu'à un seuil universel — détecte
 * "suis-je dans mon état habituel ?" plutôt que d'imposer une norme
 * générique. Si une composante manque de donnée (valeur ou référence
 * personnelle absente), elle est simplement exclue du calcul — jamais de
 * valeur inventée, jamais de fausse précision.
 */

export type RecoveryBand = "excellent" | "bon" | "modere" | "recuperation" | "prioritaire";

export const RECOVERY_BAND_LABEL: Record<RecoveryBand, string> = {
  excellent: "EXCELLENT",
  bon: "BON",
  modere: "MODÉRÉ",
  recuperation: "RÉCUPÉRATION",
  prioritaire: "RÉCUPÉRATION PRIORITAIRE",
};

export const RECOVERY_BAND_ADVICE: Record<RecoveryBand, string> = {
  excellent: "Prêt pour un entraînement intense.",
  bon: "Entraînement normal à soutenu.",
  modere: "Privilégie une séance normale ou légèrement allégée.",
  recuperation: "Privilégie une séance légère.",
  prioritaire: "Repos ou activité très légère.",
};

function bandForScore(score: number): RecoveryBand {
  if (score >= 90) return "excellent";
  if (score >= 75) return "bon";
  if (score >= 60) return "modere";
  if (score >= 40) return "recuperation";
  return "prioritaire";
}

export type RecoveryComponentKey = "sleep" | "hrv" | "restingHr" | "respiratoryRate" | "spo2";

export type RecoveryComponentInput = {
  /** Valeur du jour, `null` si non disponible. */
  value: number | null;
  /** Référence personnelle récente (moyenne 7 jours), `null` si insuffisante. */
  baseline: number | null;
  /** Sommeil/VFC/SpO2 : plus haut = meilleur. FC repos/Respiration : plus bas = meilleur. */
  higherIsBetter: boolean;
};

export type RecoveryComponentResult = {
  key: RecoveryComponentKey;
  value: number | null;
  baseline: number | null;
  /** Écart signé vs baseline, en % (positif = valeur au-dessus de la moyenne). */
  deltaPct: number | null;
  /** Contribution 0-100 de cette composante, `null` si non calculable. */
  componentScore: number | null;
  available: boolean;
};

export type RecoveryScoreResult = {
  score: number | null;
  band: RecoveryBand | null;
  bandLabel: string;
  advice: string;
  /** true si le score a été calculé à partir de moins de 5 composantes. */
  partial: boolean;
  components: RecoveryComponentResult[];
};

const WEIGHTS: Record<RecoveryComponentKey, number> = {
  sleep: 0.3,
  hrv: 0.3,
  restingHr: 0.2,
  respiratoryRate: 0.1,
  spo2: 0.1,
};

/** 0% d'écart vs baseline → 70 (état habituel, ni pénalisé ni bonifié à
 * l'excès) ; un écart de ±20% déplace la note d'environ ±30 points. Formule
 * volontairement simple et transparente — pas de prétention de précision
 * médicale (voir en-tête du fichier). */
function scoreComponent(value: number | null, baseline: number | null, higherIsBetter: boolean): number | null {
  if (value == null || baseline == null || baseline <= 0) return null;
  const ratio = (value - baseline) / baseline;
  const signedRatio = higherIsBetter ? ratio : -ratio;
  const raw = 70 + signedRatio * 150;
  return Math.max(0, Math.min(100, Math.round(raw)));
}

export function computeRecoveryScore(
  inputs: Record<RecoveryComponentKey, RecoveryComponentInput>,
): RecoveryScoreResult {
  const components: RecoveryComponentResult[] = (Object.keys(inputs) as RecoveryComponentKey[]).map((key) => {
    const { value, baseline, higherIsBetter } = inputs[key];
    const componentScore = scoreComponent(value, baseline, higherIsBetter);
    const deltaPct = value != null && baseline != null && baseline > 0 ? ((value - baseline) / baseline) * 100 : null;
    return { key, value, baseline, deltaPct, componentScore, available: componentScore != null };
  });

  const available = components.filter((c) => c.available);
  if (available.length === 0) {
    return {
      score: null,
      band: null,
      bandLabel: "Données insuffisantes",
      advice: "Pas assez de données santé pour calculer ta récupération aujourd'hui.",
      partial: true,
      components,
    };
  }

  const totalWeight = available.reduce((s, c) => s + WEIGHTS[c.key], 0);
  const weightedSum = available.reduce((s, c) => s + (c.componentScore ?? 0) * WEIGHTS[c.key], 0);
  const score = Math.round(weightedSum / totalWeight);
  const band = bandForScore(score);

  return {
    score,
    band,
    bandLabel: RECOVERY_BAND_LABEL[band],
    advice: RECOVERY_BAND_ADVICE[band],
    partial: available.length < components.length,
    components,
  };
}
