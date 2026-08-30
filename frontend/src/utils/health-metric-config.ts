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
    // Bug trouvé en vérifiant cette même fiche en direct : `valueExtractor`
    // reçoit l'échantillon ENTIER (voir la signature de `getDailyMetricSeries`),
    // pas son `.raw` — passer `sleepHoursFromRaw` telle quelle (qui attend
    // `raw` directement) faisait échouer `raw?.totalSleep` silencieusement
    // sur CHAQUE échantillon (undefined.totalSleep → toujours `null`),
    // vidant le graphique Sommeil sans jamais planter ni logguer d'erreur.
    return getDailyMetricSeries(names, days, referenceDateYYYYMMDD, "sum", undefined, true, (m) => sleepHoursFromRaw(m.raw));
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

export type MetricKpis = {
  today: number | null;
  average: number | null;
  best: number | null;
  /** Minimum réel de la fenêtre — utilisé par les fiches FC repos/VFC/SpO2
   * (min/max ont un sens pour une valeur physiologique ponctuelle ; pour
   * Pas/Distance/Calories actives, "moins bon jour" n'est pas affiché mais
   * reste calculé pour rester un seul point de calcul par fiche). */
  worst: number | null;
  /** Somme des valeurs de la fenêtre — pertinent pour Pas/Distance/Calories
   * actives ("Cette semaine : 62 430 pas"), sans objet pour une moyenne
   * ponctuelle (VFC/FC repos/Respiration/SpO2) mais toujours calculé : c'est
   * à l'écran de décider quel sous-ensemble de KPI afficher par métrique. */
  total: number | null;
};

/** KPI d'une fiche métrique — "aujourd'hui"/"moyenne"/"meilleur"/"pire"/"total"
 * sur la fenêtre demandée, calculés à partir de la même série que le
 * graphique (`loadHealthMetricSeries`), un seul fetch, jamais un second
 * calcul. Une valeur `null` (donnée absente) reste `null` — jamais un 0
 * fabriqué. */
export async function computeMetricKpis(
  key: HealthMetricKey,
  days: number,
  referenceDateYYYYMMDD: string,
): Promise<MetricKpis> {
  const series = await loadHealthMetricSeries(key, days, referenceDateYYYYMMDD);
  if (series.length === 0) return { today: null, average: null, best: null, worst: null, total: null };
  const todayPoint = series.find((p) => p.date === referenceDateYYYYMMDD);
  const values = series.map((p) => p.value);
  const total = values.reduce((a, b) => a + b, 0);
  const average = total / values.length;
  const best = Math.max(...values);
  const worst = Math.min(...values);
  return { today: todayPoint ? todayPoint.value : null, average, best, worst, total };
}

export type YearlyAverage = { year: number; dailyAverage: number; daysWithData: number };

// En dessous de ce nombre de jours réellement importés dans une année, une
// "moyenne quotidienne annuelle" serait trompeuse (ex. 3 jours de données en
// janvier ne représentent pas l'année) — cette année est alors exclue de la
// comparaison plutôt que d'afficher un chiffre non représentatif.
const MIN_DAYS_FOR_YEAR_COMPARISON = 14;

/** Moyenne quotidienne réelle par année civile, uniquement pour les
 * métriques "sum" (pas/distance/calories/sommeil — une moyenne quotidienne
 * n'a pas de sens pour VFC/FC repos/Respiration/SpO2, déjà des moyennes
 * ponctuelles). Une année avec moins de `MIN_DAYS_FOR_YEAR_COMPARISON` jours
 * de données réelles est exclue — jamais de comparaison fabriquée sur une
 * fraction non représentative de l'année. Recalcule depuis les échantillons
 * bruts (une seule fois, agrégés par jour puis par année) — aucune deuxième
 * source de vérité, `getRawSamplesForMetric` est déjà utilisé ailleurs dans
 * ce fichier pour la liste détaillée. */
export async function computeYearlyDailyAverages(key: HealthMetricKey): Promise<YearlyAverage[]> {
  if (AGGREGATION[key] !== "sum") return [];
  const samples = await getRawSamplesForMetric(ALIAS_SETS[key]);
  const convert = unitsConvertFor(key);
  const perYear = new Map<number, Map<string, number>>();
  for (const s of samples) {
    const value = key === "sleep" ? sleepHoursFromRaw(s.raw) : s.qty;
    if (value == null) continue;
    const dateStr = s.date.slice(0, 10);
    const year = parseInt(dateStr.slice(0, 4), 10);
    if (!Number.isFinite(year)) continue;
    const mult = convert ? convert(s.units) : 1;
    const byDate = perYear.get(year) ?? new Map<string, number>();
    byDate.set(dateStr, (byDate.get(dateStr) ?? 0) + value * mult);
    perYear.set(year, byDate);
  }
  const result: YearlyAverage[] = [];
  for (const [year, byDate] of perYear.entries()) {
    if (byDate.size < MIN_DAYS_FOR_YEAR_COMPARISON) continue;
    const total = Array.from(byDate.values()).reduce((a, b) => a + b, 0);
    result.push({ year, dailyAverage: total / byDate.size, daysWithData: byDate.size });
  }
  return result.sort((a, b) => b.year - a.year);
}
