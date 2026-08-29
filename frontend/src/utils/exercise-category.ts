import AsyncStorage from '@react-native-async-storage/async-storage';
import { WorkoutSession } from '@/src/utils/gym-storage';

export type ExerciseCategory = 'cardio_machine' | 'musculation' | 'mobility';

export const EXERCISE_CATEGORY_LABEL: Record<ExerciseCategory, string> = {
  cardio_machine: 'Cardio machine',
  musculation: 'Musculation',
  mobility: 'Mobilité',
};

export const EXERCISE_CATEGORY_ICON: Record<ExerciseCategory, any> = {
  cardio_machine: 'bicycle',
  musculation: 'barbell',
  mobility: 'body',
};

// Glacier Aurora : musculation/force = Glacier Blue, cardio = Cyan — même
// mapping sémantique que `Theme.colors.data` (§8 du brief de rebrand), gardé
// séparé de `Theme` car ce fichier est utilisé aussi hors contexte thème
// (scripts, matching) et doit rester une simple constante statique.
export const EXERCISE_CATEGORY_COLOR: Record<ExerciseCategory, string> = {
  cardio_machine: '#35D6E8',
  musculation: '#4DA3FF',
  mobility: '#00E676',
};

// Keyword catalogs (lowercased, no accents).
const MOBILITY_KEYWORDS = [
  'etirement', 'stretch', 'mobilite', 'yoga', 'pigeon', 'cobra',
  'papillon', 'chat vache', 'chat-vache', 'assis', 'respiration',
  'ischio', 'ischios', 'adducteur', 'hip flexor', 'fente basse',
  'aigle', 'enfant', 'quadriceps assis', 'quadriceps debout',
  'psoas', 'sciatique', 'twist', 'torsion',
];
const CARDIO_MACHINE_KEYWORDS = [
  'skierg', 'ski erg', 'rameur', 'rowing machine', 'tapis',
  'treadmill', 'course sur tapis', 'velo', 'vélo', 'bike',
  'assault bike', 'assault-bike', 'elliptique', 'cross trainer',
  'cardio machine', 'stepper', 'echelle', 'jacobs ladder',
];

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/** Escape a string for RegExp. */
function escapeRE(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Match keyword against text with word boundaries so "velo" won't match "developpe". */
function matchesKeyword(text: string, keyword: string): boolean {
  // Add spaces around to simulate boundaries even at start/end
  const padded = ` ${text} `;
  // Support hyphenated keywords (they should still match as-is between non-alpha)
  const kw = escapeRE(keyword);
  const re = new RegExp(`(^|[^a-z0-9])${kw}([^a-z0-9]|$)`);
  return re.test(padded);
}

/** Auto-detects category from exercise name. */
export function autoDetectCategory(name: string): ExerciseCategory {
  const n = normalize(name);
  for (const kw of MOBILITY_KEYWORDS) {
    if (matchesKeyword(n, kw)) return 'mobility';
  }
  for (const kw of CARDIO_MACHINE_KEYWORDS) {
    if (matchesKeyword(n, kw)) return 'cardio_machine';
  }
  return 'musculation';
}

// ---------- User overrides (stored in AsyncStorage) ----------
const OVERRIDES_KEY = '@ironflow/exerciseCategoryOverrides';

type OverrideMap = Record<string, ExerciseCategory>;

let cache: OverrideMap | null = null;

export async function getOverrides(): Promise<OverrideMap> {
  if (cache) return cache;
  const raw = await AsyncStorage.getItem(OVERRIDES_KEY);
  if (!raw) {
    cache = {};
    return cache;
  }
  try {
    cache = JSON.parse(raw);
    return cache!;
  } catch {
    cache = {};
    return cache;
  }
}

export async function setOverride(
  name: string,
  category: ExerciseCategory,
): Promise<void> {
  const map = await getOverrides();
  map[normalize(name)] = category;
  cache = map;
  await AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));
}

export async function clearOverride(name: string): Promise<void> {
  const map = await getOverrides();
  delete map[normalize(name)];
  cache = map;
  await AsyncStorage.setItem(OVERRIDES_KEY, JSON.stringify(map));
}

/** Resolve final category: user override, else auto-detect. */
export async function getExerciseCategory(
  name: string,
): Promise<ExerciseCategory> {
  const map = await getOverrides();
  return map[normalize(name)] ?? autoDetectCategory(name);
}

/** Synchronous helper when the caller already has the override map. */
export function resolveCategory(
  name: string,
  overrides: OverrideMap,
): ExerciseCategory {
  return overrides[normalize(name)] ?? autoDetectCategory(name);
}

// ---------- Category-specific stats aggregation ----------

export type CardioStats = {
  totalDurationSec: number;
  totalDistanceM: number;
  avgPaceSecPerKm: number; // 0 if no distance
  totalCalories: number;
  sessions: number;
};

export type MuscuStats = {
  maxWeightKg: number;
  totalVolumeKg: number;
  bestSet: { weight: number; reps: number } | null;
  /** Somme des reps de tous les sets complétés — distinct de `bestSet.reps`
   * (le max d'UN set) : un AMRAP de 6 tours à 5 reps/tour donne
   * `totalReps=30` mais `bestSet.reps=5`, jamais l'inverse (voir
   * `wod-result-normalizer.ts` — ne jamais laisser croire à un record de
   * "30 reps" quand c'est un total cumulé). */
  totalReps: number;
  progressionPct: number; // volume growth first vs last session
  sessions: number;
};

export type MobilityStats = {
  totalHoldSec: number;
  avgHoldSec: number;
  sessions: number;
};

/**
 * Compute stats for a single exercise name, considering only its sessions.
 * `sessions` should be pre-filtered by date range if needed.
 */
export function computeCategoryStats(
  name: string,
  category: ExerciseCategory,
  sessions: WorkoutSession[],
  bodyMassKg: number = 70,
):
  | { kind: 'cardio'; stats: CardioStats }
  | { kind: 'musculation'; stats: MuscuStats }
  | { kind: 'mobility'; stats: MobilityStats } {
  const key = normalize(name);

  if (category === 'cardio_machine') {
    let dur = 0;
    let distTotal = 0;
    let cal = 0;
    let sess = 0;
    for (const s of sessions) {
      let hasEx = false;
      for (const ex of s.exercises) {
        if (normalize(ex.name) !== key) continue;
        hasEx = true;
        for (const st of ex.sets) {
          if (!st.completed) continue;
          if (ex.mode === 'time') {
            const secs = ex.targetDurationSeconds || 0;
            dur += secs;
          } else if (ex.mode === 'amrap' || ex.mode === 'emom') {
            dur += ex.targetDurationSeconds || 0;
          } else {
            // reps-based, approximate 3s per rep
            const r = parseFloat((st.reps ?? '').replace(/[^0-9.]/g, '')) || 0;
            dur += r * 3;
          }
        }
      }
      if (hasEx) {
        sess++;
        // If session has cardio metrics use them
        if (s.cardio_metrics?.distance_m) {
          distTotal += s.cardio_metrics.distance_m;
        }
        cal += s.caloriesBurned || 0;
      }
    }
    if (distTotal === 0 && dur > 0) {
      // Rough estimate 8 km/h if no distance recorded
      distTotal = Math.round((dur / 3600) * 8000);
    }
    const pace = distTotal > 0 ? (dur * 1000) / distTotal : 0;
    if (cal === 0 && dur > 0) {
      // MET ~ 8 for cardio machines
      cal = Math.round(((8 * bodyMassKg) * dur) / 3600);
    }
    return {
      kind: 'cardio',
      stats: {
        totalDurationSec: Math.round(dur),
        totalDistanceM: Math.round(distTotal),
        avgPaceSecPerKm: pace,
        totalCalories: cal,
        sessions: sess,
      },
    };
  }

  if (category === 'mobility') {
    let total = 0;
    let holdCount = 0;
    let sess = 0;
    for (const s of sessions) {
      let hasEx = false;
      for (const ex of s.exercises) {
        if (normalize(ex.name) !== key) continue;
        hasEx = true;
        const perSet = ex.targetDurationSeconds || 30;
        for (const st of ex.sets) {
          if (!st.completed) continue;
          total += perSet;
          holdCount++;
        }
      }
      if (hasEx) sess++;
    }
    return {
      kind: 'mobility',
      stats: {
        totalHoldSec: Math.round(total),
        avgHoldSec: holdCount ? Math.round(total / holdCount) : 0,
        sessions: sess,
      },
    };
  }

  // Musculation
  let maxW = 0;
  let vol = 0;
  let totalReps = 0;
  let bestSet: { weight: number; reps: number } | null = null;
  let firstVolumeDate: string | null = null;
  let firstVolumeVal = 0;
  let lastVolumeDate: string | null = null;
  let lastVolumeVal = 0;
  let sess = 0;

  const perDayVol: Record<string, number> = {};

  for (const s of sessions) {
    let hasEx = false;
    let dayVol = 0;
    const dateKey = new Date(s.startedAt).toISOString().slice(0, 10);
    for (const ex of s.exercises) {
      if (normalize(ex.name) !== key) continue;
      hasEx = true;
      for (const st of ex.sets) {
        if (!st.completed) continue;
        const w = parseFloat((st.weight ?? '').replace(',', '.')) || 0;
        const r = parseFloat((st.reps ?? '').replace(/[^0-9.]/g, '')) || 0;
        vol += w * r;
        dayVol += w * r;
        totalReps += r;
        if (w > maxW) maxW = w;
        if (!bestSet || w * r > bestSet.weight * bestSet.reps) {
          bestSet = { weight: w, reps: r };
        }
      }
    }
    if (hasEx) {
      sess++;
      perDayVol[dateKey] = (perDayVol[dateKey] ?? 0) + dayVol;
    }
  }
  const sortedDays = Object.keys(perDayVol).sort();
  if (sortedDays.length > 0) {
    firstVolumeDate = sortedDays[0];
    firstVolumeVal = perDayVol[sortedDays[0]];
    lastVolumeDate = sortedDays[sortedDays.length - 1];
    lastVolumeVal = perDayVol[sortedDays[sortedDays.length - 1]];
  }
  const progression =
    firstVolumeVal > 0
      ? ((lastVolumeVal - firstVolumeVal) / firstVolumeVal) * 100
      : 0;
  void firstVolumeDate;
  void lastVolumeDate;

  return {
    kind: 'musculation',
    stats: {
      maxWeightKg: maxW,
      totalVolumeKg: Math.round(vol),
      bestSet,
      totalReps: Math.round(totalReps),
      progressionPct: Math.round(progression),
      sessions: sess,
    },
  };
}

// ---------- Chart series builder ----------

export type MetricKey =
  // musculation
  | 'volume'
  | 'max_weight'
  | 'max_reps'
  | 'total_reps'
  // cardio
  | 'distance'
  | 'duration'
  | 'pace'
  // mobility
  | 'hold_time';

export const METRIC_LABEL: Record<MetricKey, string> = {
  volume: 'Volume (kg)',
  max_weight: 'Charge max (kg)',
  max_reps: 'Reps max (par set)',
  total_reps: 'Reps totales',
  distance: 'Distance (m)',
  duration: 'Temps (min)',
  pace: 'Allure (s/km)',
  hold_time: 'Durée totale (s)',
};

export const METRICS_BY_CATEGORY: Record<ExerciseCategory, MetricKey[]> = {
  musculation: ['volume', 'max_weight', 'max_reps', 'total_reps'],
  cardio_machine: ['duration', 'distance', 'pace'],
  mobility: ['hold_time'],
};

export type SeriesPoint = { date: string; value: number };

export function buildSeries(
  name: string,
  category: ExerciseCategory,
  metric: MetricKey,
  sessions: WorkoutSession[],
): SeriesPoint[] {
  const key = normalize(name);
  const perDay: Record<string, number> = {};
  const perDayDistance: Record<string, number> = {};
  const perDayDuration: Record<string, number> = {};

  for (const s of sessions) {
    const dateKey = new Date(s.startedAt).toISOString().slice(0, 10);
    let hit = false;
    let dayVal = 0;
    let dayMax = 0;
    let dayMaxReps = 0;
    let dayTotalReps = 0;
    let dayHold = 0;
    let dayDur = 0;

    for (const ex of s.exercises) {
      if (normalize(ex.name) !== key) continue;
      hit = true;
      const dur = ex.targetDurationSeconds || 0;
      for (const st of ex.sets) {
        if (!st.completed) continue;
        const w = parseFloat((st.weight ?? '').replace(',', '.')) || 0;
        const r = parseFloat((st.reps ?? '').replace(/[^0-9.]/g, '')) || 0;
        dayVal += w * r;
        dayTotalReps += r;
        if (w > dayMax) dayMax = w;
        if (r > dayMaxReps) dayMaxReps = r;
        if (dur > 0) {
          dayHold += dur;
          dayDur += dur;
        } else if (ex.mode === 'reps' && r > 0) {
          dayDur += r * 3;
        }
      }
    }
    if (!hit) continue;

    if (s.cardio_metrics?.distance_m) {
      perDayDistance[dateKey] =
        (perDayDistance[dateKey] ?? 0) + s.cardio_metrics.distance_m;
    }
    perDayDuration[dateKey] = (perDayDuration[dateKey] ?? 0) + dayDur;

    if (category === 'musculation') {
      if (metric === 'volume') perDay[dateKey] = (perDay[dateKey] ?? 0) + dayVal;
      else if (metric === 'max_weight')
        perDay[dateKey] = Math.max(perDay[dateKey] ?? 0, dayMax);
      else if (metric === 'max_reps')
        perDay[dateKey] = Math.max(perDay[dateKey] ?? 0, dayMaxReps);
      else if (metric === 'total_reps')
        perDay[dateKey] = (perDay[dateKey] ?? 0) + dayTotalReps;
    } else if (category === 'cardio_machine') {
      if (metric === 'duration') {
        perDay[dateKey] = Math.round((perDayDuration[dateKey] ?? 0) / 60);
      } else if (metric === 'distance') {
        perDay[dateKey] = perDayDistance[dateKey] ?? 0;
      } else if (metric === 'pace') {
        const d = perDayDistance[dateKey] ?? 0;
        const t = perDayDuration[dateKey] ?? 0;
        if (d > 0) perDay[dateKey] = Math.round((t * 1000) / d);
      }
    } else if (category === 'mobility') {
      perDay[dateKey] = (perDay[dateKey] ?? 0) + dayHold;
    }
  }

  return Object.entries(perDay)
    .sort()
    .map(([date, value]) => ({ date, value }));
}

// ---------- Period filter ----------

export type PeriodKey = '7d' | '30d' | '6m' | '1y' | 'all';

export const PERIOD_LABEL: Record<PeriodKey, string> = {
  '7d': '7 jours',
  '30d': '30 jours',
  '6m': '6 mois',
  '1y': '1 an',
  all: 'Toujours',
};

export function filterSessionsByPeriod(
  sessions: WorkoutSession[],
  period: PeriodKey,
): WorkoutSession[] {
  if (period === 'all') return sessions;
  const now = new Date();
  let cutoff = new Date(0);
  if (period === '7d') cutoff = new Date(now.getTime() - 7 * 86400000);
  else if (period === '30d') cutoff = new Date(now.getTime() - 30 * 86400000);
  else if (period === '6m') {
    cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 6);
  } else if (period === '1y') {
    cutoff = new Date(now);
    cutoff.setFullYear(cutoff.getFullYear() - 1);
  }
  return sessions.filter((s) => new Date(s.startedAt) >= cutoff);
}
