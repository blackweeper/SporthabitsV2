import {
  getDailyMetricSeries,
  getRawSamplesForMetric,
  unitsToHoursMultiplier,
  DailyMetricPoint,
  HealthMetricSample,
  HRV_METRIC_NAMES,
  RESPIRATORY_RATE_METRIC_NAMES,
  RESTING_HR_METRIC_NAMES,
  SLEEP_METRIC_NAMES,
  SPO2_METRIC_NAMES,
} from "@/src/utils/health-data-storage";

export type HealthMetricKey = "sleep" | "hrv" | "restingHr" | "respiratoryRate" | "spo2";

export const HEALTH_METRIC_LABEL: Record<HealthMetricKey, string> = {
  sleep: "Sommeil",
  hrv: "VFC",
  restingHr: "FC repos",
  respiratoryRate: "Respiration",
  spo2: "SpO2",
};

export const HEALTH_METRIC_UNIT: Record<HealthMetricKey, string> = {
  sleep: "",
  hrv: "ms",
  restingHr: "bpm",
  respiratoryRate: "rpm",
  spo2: "%",
};

const ALIAS_SETS: Record<HealthMetricKey, Set<string>> = {
  sleep: SLEEP_METRIC_NAMES,
  hrv: HRV_METRIC_NAMES,
  restingHr: RESTING_HR_METRIC_NAMES,
  respiratoryRate: RESPIRATORY_RATE_METRIC_NAMES,
  spo2: SPO2_METRIC_NAMES,
};

function normalizeValue(key: HealthMetricKey, value: number): number {
  // SpO2 est parfois envoyé en fraction (0.97) plutôt qu'en pourcentage —
  // voir `useHealthDashboardData.ts`, même normalisation.
  if (key === "spo2" && value <= 1) return value * 100;
  return value;
}

export function formatHealthMetricValue(key: HealthMetricKey, value: number): string {
  if (key === "sleep") {
    const h = Math.floor(value);
    const m = Math.round((value - h) * 60);
    return `${h}h${m.toString().padStart(2, "0")}`;
  }
  const unit = HEALTH_METRIC_UNIT[key];
  return unit ? `${Math.round(normalizeValue(key, value))} ${unit}` : `${Math.round(normalizeValue(key, value))}`;
}

/** Série journalière pour le graphique d'évolution — même agrégation que
 * `HealthMetricGrid` (sommeil additionné par jour, le reste en moyenne
 * d'échantillon ponctuel). */
export async function loadHealthMetricSeries(
  key: HealthMetricKey,
  days: number,
  referenceDateYYYYMMDD: string,
): Promise<DailyMetricPoint[]> {
  const names = ALIAS_SETS[key];
  if (key === "sleep") {
    return getDailyMetricSeries(names, days, referenceDateYYYYMMDD, "sum", unitsToHoursMultiplier, true);
  }
  const series = await getDailyMetricSeries(names, days, referenceDateYYYYMMDD, "avg", undefined, true);
  return key === "spo2" ? series.map((p) => ({ ...p, value: normalizeValue(key, p.value) })) : series;
}

/** Tous les échantillons individuellement reçus pour cette métrique, triés
 * du plus récent au plus ancien — la "vue détaillée" (`/health-metric/[key]`)
 * les affiche un par un, au-delà de ce que le graphique résume par jour. */
export async function loadHealthMetricRawSamples(key: HealthMetricKey): Promise<HealthMetricSample[]> {
  return getRawSamplesForMetric(ALIAS_SETS[key]);
}

export function isHealthMetricKey(v: string | undefined): v is HealthMetricKey {
  return v === "sleep" || v === "hrv" || v === "restingHr" || v === "respiratoryRate" || v === "spo2";
}
