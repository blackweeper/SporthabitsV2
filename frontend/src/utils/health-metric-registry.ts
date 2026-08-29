import {
  ACTIVE_ENERGY_METRIC_NAMES,
  DISTANCE_METRIC_NAMES,
  getHealthMetrics,
  getImportedActiveCaloriesForDate,
  getImportedDistanceKmForDate,
  getImportedSleepHoursForDate,
  getImportedStepsForDate,
  normalizeMetricName,
  SLEEP_METRIC_NAMES,
  STEP_METRIC_NAMES,
} from "@/src/utils/health-data-storage";

/**
 * Registre générique des métriques de santé importées — le point d'entrée
 * unique pour tout code (Défis, futurs widgets) qui a besoin de "la valeur
 * d'une métrique santé pour un jour donné" sans savoir/dupliquer comment
 * cette métrique est lue ou agrégée. Chaque lecteur ci-dessous délègue
 * EXACTEMENT à la fonction déjà utilisée par le Dashboard/le panneau de
 * diagnostic (`health-data-storage.ts`) — ne jamais recalculer une métrique
 * différemment ici, sous peine de désynchroniser Dashboard/Défis.
 *
 * Volontairement incomplet vis-à-vis du schéma cible
 * (steps/walkingDistance/runningDistance/activeCalories/sleepDuration/
 * workouts) : Health Auto Export n'envoie qu'une distance marche+course déjà
 * combinée (`DISTANCE_METRIC_NAMES`), donc `runningDistance` n'a pas de
 * lecteur fiable distinct pour l'instant, et `workouts` n'a pas encore
 * d'agrégation par jour. Ces clés existent dans le type pour que les futurs
 * défis puissent déjà s'y référer, mais `HEALTH_METRIC_REGISTRY[key]` reste
 * `undefined` pour elles tant qu'un vrai lecteur n'existe pas — jamais une
 * fausse valeur à la place.
 */
export type HealthMetricKey =
  | "steps"
  | "walkingDistance"
  | "runningDistance"
  | "activeCalories"
  | "sleepDuration"
  | "workouts";

export type HealthMetricDef = {
  key: HealthMetricKey;
  label: string;
  unit: string;
  /** Valeur du jour LOCAL (`dateYYYYMMDD`) — toujours la même fonction que celle utilisée ailleurs dans l'app. */
  getValueForDate: (dateYYYYMMDD: string) => Promise<number>;
  /** true si au moins un échantillon de ce type existe un jour dans le stockage local, quelle que soit sa date — distingue "0 réel" de "donnée jamais reçue". */
  hasAnyData: () => Promise<boolean>;
  formatValue: (value: number) => string;
};

async function hasAnySample(names: Set<string>): Promise<boolean> {
  const metrics = await getHealthMetrics();
  return metrics.some((m) => names.has(normalizeMetricName(m.name)));
}

export const HEALTH_METRIC_REGISTRY: Partial<Record<HealthMetricKey, HealthMetricDef>> = {
  steps: {
    key: "steps",
    label: "Pas",
    unit: "pas",
    getValueForDate: getImportedStepsForDate,
    hasAnyData: () => hasAnySample(STEP_METRIC_NAMES),
    formatValue: (v) => Math.round(v).toLocaleString("fr-FR"),
  },
  walkingDistance: {
    key: "walkingDistance",
    label: "Distance",
    unit: "km",
    getValueForDate: getImportedDistanceKmForDate,
    hasAnyData: () => hasAnySample(DISTANCE_METRIC_NAMES),
    formatValue: (v) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 2 })} km`,
  },
  activeCalories: {
    key: "activeCalories",
    label: "Calories actives",
    unit: "kcal",
    getValueForDate: getImportedActiveCaloriesForDate,
    hasAnyData: () => hasAnySample(ACTIVE_ENERGY_METRIC_NAMES),
    formatValue: (v) => `${Math.round(v)} kcal`,
  },
  sleepDuration: {
    key: "sleepDuration",
    label: "Sommeil",
    unit: "h",
    getValueForDate: getImportedSleepHoursForDate,
    hasAnyData: () => hasAnySample(SLEEP_METRIC_NAMES),
    formatValue: (v) => `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} h`,
  },
};
