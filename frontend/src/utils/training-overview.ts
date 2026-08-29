import { Plan, WorkoutSession } from "@/src/utils/gym-storage";
import { computeAdvancedStats } from "@/src/utils/stats";
import { normalizeWodResult } from "@/src/utils/wod-result-normalizer";

/**
 * "Training Overview" — Historique & Statistiques fusionnés. Aucune nouvelle
 * source de vérité : tout ce fichier ne fait que découper `WorkoutSession[]`
 * (déjà chargé via `getSessions()`) par période puis réutiliser
 * `computeAdvancedStats` (déjà utilisé par Dashboard/Profil/Performance) —
 * jamais un second calcul de volume/calories/durée.
 */

/** Lundi 00:00 de la semaine contenant `date` (semaine ISO, cohérent avec le
 * calendrier hebdomadaire du Dashboard). */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  const day = d.getDay(); // 0 = dimanche
  const diff = day === 0 ? -6 : 1 - day; // recule jusqu'au lundi
  d.setDate(d.getDate() + diff);
  return d;
}

export function filterSessionsByDateRange(
  sessions: WorkoutSession[],
  startInclusive: Date,
  endExclusive: Date,
): WorkoutSession[] {
  const startMs = startInclusive.getTime();
  const endMs = endExclusive.getTime();
  return sessions.filter((s) => {
    const t = Date.parse(s.startedAt);
    return !isNaN(t) && t >= startMs && t < endMs;
  });
}

/** `null` si aucune comparaison fiable n'est possible (période précédente
 * vide) — jamais un "+0%"/"+∞%" fabriqué pour remplir un widget. */
export function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return Math.round(((current - previous) / previous) * 100);
}

export type WeekComparison = {
  thisWeek: ReturnType<typeof computeAdvancedStats>;
  previousWeek: ReturnType<typeof computeAdvancedStats>;
  hasPreviousWeekData: boolean;
  deltaSessionsPct: number | null;
  deltaDurationPct: number | null;
  deltaVolumePct: number | null;
  deltaCaloriesPct: number | null;
};

/** Compare la semaine en cours (lundi → maintenant) à la semaine précédente
 * complète (lundi → lundi) — référencée sur `referenceDate` (par défaut
 * `new Date()`, paramétrable pour les tests). */
export function computeWeekComparison(
  sessions: WorkoutSession[],
  referenceDate: Date = new Date(),
): WeekComparison {
  const thisWeekStart = startOfWeek(referenceDate);
  const nextWeekStart = new Date(thisWeekStart);
  nextWeekStart.setDate(nextWeekStart.getDate() + 7);
  const previousWeekStart = new Date(thisWeekStart);
  previousWeekStart.setDate(previousWeekStart.getDate() - 7);

  const thisWeekSessions = filterSessionsByDateRange(sessions, thisWeekStart, nextWeekStart);
  const previousWeekSessions = filterSessionsByDateRange(sessions, previousWeekStart, thisWeekStart);

  const thisWeek = computeAdvancedStats(thisWeekSessions);
  const previousWeek = computeAdvancedStats(previousWeekSessions);
  const hasPreviousWeekData = previousWeekSessions.length > 0;

  return {
    thisWeek,
    previousWeek,
    hasPreviousWeekData,
    deltaSessionsPct: hasPreviousWeekData ? percentChange(thisWeek.totalSessions, previousWeek.totalSessions) : null,
    deltaDurationPct: hasPreviousWeekData ? percentChange(thisWeek.totalDurationSec, previousWeek.totalDurationSec) : null,
    deltaVolumePct: hasPreviousWeekData ? percentChange(thisWeek.totalVolumeKg, previousWeek.totalVolumeKg) : null,
    deltaCaloriesPct: hasPreviousWeekData ? percentChange(thisWeek.totalCalories, previousWeek.totalCalories) : null,
  };
}

export type EvolutionPeriod = "week" | "month" | "6m" | "year";
export type EvolutionMetric = "sessions" | "volume" | "calories" | "duration" | "exercises" | "cardio";

export const EVOLUTION_PERIOD_LABEL: Record<EvolutionPeriod, string> = {
  week: "SEMAINE",
  month: "MOIS",
  "6m": "6 MOIS",
  year: "ANNÉE",
};

export const EVOLUTION_METRIC_LABEL: Record<EvolutionMetric, string> = {
  sessions: "Séances",
  volume: "Volume",
  calories: "Calories",
  duration: "Temps",
  exercises: "Exercices",
  cardio: "Distance cardio",
};

type EvolutionBucket = { start: Date; end: Date; label: string };

const DAY_LETTERS = ["D", "L", "M", "M", "J", "V", "S"];
const MONTH_LETTERS = ["J", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

/** Génère les tranches de temps d'un graphique d'évolution — jamais de
 * bucket fabriqué au-delà de ce que la période demande : semaine = 7 jours,
 * mois = ~4-5 semaines calendaires, 6 mois/année = mois calendaires. */
function buildEvolutionBuckets(period: EvolutionPeriod, referenceDate: Date = new Date()): EvolutionBucket[] {
  const buckets: EvolutionBucket[] = [];
  if (period === "week") {
    for (let i = 6; i >= 0; i--) {
      const start = new Date(referenceDate);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - i);
      const end = new Date(start);
      end.setDate(end.getDate() + 1);
      buckets.push({ start, end, label: DAY_LETTERS[start.getDay()] });
    }
    return buckets;
  }
  if (period === "month") {
    const end0 = new Date(referenceDate);
    end0.setHours(0, 0, 0, 0);
    end0.setDate(end0.getDate() + 1);
    const start0 = new Date(end0);
    start0.setDate(start0.getDate() - 28);
    for (let i = 0; i < 4; i++) {
      const start = new Date(start0);
      start.setDate(start.getDate() + i * 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      buckets.push({ start, end, label: `S${i + 1}` });
    }
    return buckets;
  }
  const months = period === "6m" ? 6 : 12;
  for (let i = months - 1; i >= 0; i--) {
    const start = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i, 1);
    const end = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - i + 1, 1);
    buckets.push({ start, end, label: MONTH_LETTERS[start.getMonth()] });
  }
  return buckets;
}

function metricValueForSessions(sessions: WorkoutSession[], metric: EvolutionMetric): number {
  switch (metric) {
    case "sessions":
      return sessions.length;
    case "volume":
      return computeAdvancedStats(sessions).totalVolumeKg;
    case "calories":
      return computeAdvancedStats(sessions).totalCalories;
    case "duration":
      return Math.round(computeAdvancedStats(sessions).totalDurationSec / 60);
    case "exercises":
      return sessions.reduce((a, s) => a + (s.exercises?.length ?? 0), 0);
    case "cardio":
      return Math.round(
        sessions.reduce((a, s) => a + (s.cardio_metrics?.distance_m ?? 0) / 1000, 0) * 10,
      ) / 10;
    default:
      return 0;
  }
}

/** Série réelle pour le graphique "Évolution" — un point par tranche de
 * temps, calculé en filtrant/agrégeant les vraies séances (jamais une
 * seconde source de vérité que `computeAdvancedStats`/`WorkoutSession`). */
export function computeEvolutionSeries(
  sessions: WorkoutSession[],
  period: EvolutionPeriod,
  metric: EvolutionMetric,
  referenceDate: Date = new Date(),
): { label: string; value: number }[] {
  const buckets = buildEvolutionBuckets(period, referenceDate);
  return buckets.map((b) => ({
    label: b.label,
    value: metricValueForSessions(filterSessionsByDateRange(sessions, b.start, b.end), metric),
  }));
}

/** Seules les métriques dont la donnée sous-jacente existe réellement dans
 * `sessions` sont proposées — jamais un sélecteur qui mène à une série
 * plate à 0 par manque de données (ex. "Distance cardio" sans aucune
 * séance cardio enregistrée). */
export function availableEvolutionMetrics(sessions: WorkoutSession[]): EvolutionMetric[] {
  const metrics: EvolutionMetric[] = ["sessions", "duration"];
  if (sessions.some((s) => (s.exercises?.length ?? 0) > 0)) metrics.push("volume", "exercises");
  if (sessions.some((s) => (s.caloriesBurned ?? 0) > 0)) metrics.push("calories");
  if (sessions.some((s) => (s.cardio_metrics?.distance_m ?? 0) > 0)) metrics.push("cardio");
  return metrics;
}

export type SessionWodIdentity = {
  title: string;
  format: string;
  roundsCompleted: number | null;
};

/** Résout l'identité WOD d'UNE séance (si elle vient d'un WOD nommé) à
 * partir des données déjà présentes — jamais de stockage parallèle : le nom
 * vient de `plan.title`/`session.planTitle`, le format de
 * `plan.wodSource.format`, le résultat de `normalizeWodResult` (déjà utilisé
 * par `wod-history.ts`/Performance) appliqué au premier exercice AMRAP/For
 * Time de la séance. `null` si la séance n'est pas un WOD identifiable —
 * l'appelant retombe alors sur l'affichage générique existant. */
export function resolveSessionWodIdentity(
  session: WorkoutSession,
  wodPlansById: Map<string, Plan>,
): SessionWodIdentity | null {
  const plan = wodPlansById.get(session.planId);
  if (!plan?.wodSource) return null;
  let roundsCompleted: number | null = null;
  for (const ex of session.exercises) {
    const normalized = normalizeWodResult(ex);
    if (normalized) {
      roundsCompleted = normalized.roundsCompleted;
      break;
    }
  }
  return {
    title: plan.title || session.planTitle,
    format: plan.wodSource.format,
    roundsCompleted,
  };
}
