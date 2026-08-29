import {
  getDailyMetricSeries,
  getRawSamplesForMetric,
  sleepHoursFromRaw,
  unitsToKcalMultiplier,
  unitsToKmMultiplier,
  DailyMetricPoint,
  HealthMetricSample,
  ACTIVE_ENERGY_METRIC_NAMES,
  DISTANCE_METRIC_NAMES,
  HRV_METRIC_NAMES,
  RESPIRATORY_RATE_METRIC_NAMES,
  RESTING_HR_METRIC_NAMES,
  SLEEP_METRIC_NAMES,
  SPO2_METRIC_NAMES,
  STEP_METRIC_NAMES,
} from "@/src/utils/health-data-storage";

// Étendu (V2) : couvre aussi Pas/Distance/Calories actives — auparavant
// limité aux 5 "vitaux" (`isHealthMetricKey` rejetait `steps`/
// `walkingDistance`/`activeCalories`, rendant `/health-metric/[key]`
// inatteignable pour ces trois, malgré des widgets déjà cliquables ailleurs
// dans l'app — voir le brief "Pas/Distance cliquables"). Un seul registre de
// clés/labels/unités/séries pour toute la Santé, jamais un second système
// parallèle par écran.
export type HealthMetricKey =
  | "steps"
  | "walkingDistance"
  | "activeCalories"
  | "sleep"
  | "hrv"
  | "restingHr"
  | "respiratoryRate"
  | "spo2";

export const HEALTH_METRIC_LABEL: Record<HealthMetricKey, string> = {
  steps: "Pas",
  walkingDistance: "Distance",
  activeCalories: "Calories actives",
  sleep: "Sommeil",
  hrv: "VFC",
  restingHr: "FC repos",
  respiratoryRate: "Respiration",
  spo2: "SpO2",
};

export const HEALTH_METRIC_UNIT: Record<HealthMetricKey, string> = {
  steps: "pas",
  walkingDistance: "km",
  activeCalories: "kcal",
  sleep: "",
  hrv: "ms",
  restingHr: "bpm",
  respiratoryRate: "rpm",
  spo2: "%",
};

const ALIAS_SETS: Record<HealthMetricKey, Set<string>> = {
  steps: STEP_METRIC_NAMES,
  walkingDistance: DISTANCE_METRIC_NAMES,
  activeCalories: ACTIVE_ENERGY_METRIC_NAMES,
  sleep: SLEEP_METRIC_NAMES,
  hrv: HRV_METRIC_NAMES,
  restingHr: RESTING_HR_METRIC_NAMES,
  respiratoryRate: RESPIRATORY_RATE_METRIC_NAMES,
  spo2: SPO2_METRIC_NAMES,
};

/** "sum" pour les métriques réparties en plusieurs échantillons/jour à
 * additionner (pas, distance, calories, sommeil) ; "avg" pour une métrique
 * ponctuelle (VFC/FC repos/Respiration/SpO2, ~1 échantillon/jour). */
const AGGREGATION: Record<HealthMetricKey, "sum" | "avg"> = {
  steps: "sum",
  walkingDistance: "sum",
  activeCalories: "sum",
  sleep: "sum",
  hrv: "avg",
  restingHr: "avg",
  respiratoryRate: "avg",
  spo2: "avg",
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
  if (key === "steps") return Math.round(value).toLocaleString("fr-FR");
  if (key === "walkingDistance") return `${value.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} km`;
  const unit = HEALTH_METRIC_UNIT[key];
  return unit ? `${Math.round(normalizeValue(key, value))} ${unit}` : `${Math.round(normalizeValue(key, value))}`;
}

/** Conversion d'unité à appliquer à `m.qty`/`m.units` pour cette métrique —
 * `undefined` = pas de conversion (déjà dans l'unité voulue, ou métrique
 * portée par un `valueExtractor` dédié, voir `sleep`). */
function unitsConvertFor(key: HealthMetricKey): ((units: string | null) => number) | undefined {
  if (key === "walkingDistance") return unitsToKmMultiplier;
  if (key === "activeCalories") return unitsToKcalMultiplier;
  return undefined;
}

/** Valeur réelle d'UN échantillon pour cette métrique, unité déjà convertie
 * (km/kcal/heures) — point d'entrée UNIQUE pour "quelle est la valeur de cet
 * échantillon", utilisé à la fois par le graphique (`loadHealthMetricSeries`,
 * via `getDailyMetricSeries`) et par la liste d'échantillons bruts
 * (`/health-metric/[key]`). Avant l'existence de cette fonction, la liste
 * brute affichait `s.qty` tel quel — correct pour Pas/VFC/FC repos, mais FAUX
 * pour Distance/Calories actives (kJ affichés tels quels, étiquetés "kcal",
 * jusqu'à ~4× la vraie valeur) et pour Sommeil (`qty` toujours `null` sur un
 * vrai payload, voir `sleepHoursFromRaw`). Jamais deux chemins de conversion
 * différents pour la même métrique. */
export function valueOfSample(key: HealthMetricKey, s: HealthMetricSample): number | null {
  if (key === "sleep") return sleepHoursFromRaw(s.raw);
  if (s.qty == null) return null;
  const convert = unitsConvertFor(key);
  return convert ? s.qty * convert(s.units) : s.qty;
}

/** Série journalière pour le graphique d'évolution — même agrégation que
 * `HealthMetricGrid`. */
export async function loadHealthMetricSeries(
  key: HealthMetricKey,
  days: number,
  referenceDateYYYYMMDD: string,
): Promise<DailyMetricPoint[]> {
  const names = ALIAS_SETS[key];
  if (key === "sleep") {
    return getDailyMetricSeries(names, days, referenceDateYYYYMMDD, "sum", undefined, true, sleepHoursFromRaw);
  }
  const series = await getDailyMetricSeries(
    names,
    days,
    referenceDateYYYYMMDD,
    AGGREGATION[key],
    unitsConvertFor(key),
    true,
  );
  return key === "spo2" ? series.map((p) => ({ ...p, value: normalizeValue(key, p.value) })) : series;
}

/** Tous les échantillons individuellement reçus pour cette métrique, triés
 * du plus récent au plus ancien — la "vue détaillée" (`/health-metric/[key]`)
 * les affiche un par un, au-delà de ce que le graphique résume par jour. */
export async function loadHealthMetricRawSamples(key: HealthMetricKey): Promise<HealthMetricSample[]> {
  return getRawSamplesForMetric(ALIAS_SETS[key]);
}

const ALL_KEYS: HealthMetricKey[] = [
  "steps",
  "walkingDistance",
  "activeCalories",
  "sleep",
  "hrv",
  "restingHr",
  "respiratoryRate",
  "spo2",
];

export function isHealthMetricKey(v: string | undefined): v is HealthMetricKey {
  return !!v && (ALL_KEYS as string[]).includes(v);
}
