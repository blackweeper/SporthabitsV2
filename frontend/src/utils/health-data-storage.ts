import { bigStoreGet, bigStoreSet } from "@/src/utils/big-kv-store";

/**
 * Stockage local des données de santé importées depuis le backend Health
 * Auto Export (voir `backend/health_import.py`) — potentiellement volumineux
 * (des mois d'échantillons de fréquence cardiaque), d'où `big-kv-store`
 * plutôt qu'AsyncStorage brut (même raison que `exercise-records.ts`).
 *
 * Ces données ne touchent jamais aux séances/stats propres à IronFlow
 * (`gym-storage.ts`) — c'est un import externe affiché séparément.
 */

export type HealthMetricSample = {
  name: string;
  units: string | null;
  date: string;
  qty: number | null;
  raw?: Record<string, unknown>;
};

export type HealthWorkoutEntry = {
  name: string;
  start: string;
  end: string | null;
  duration: number | null;
  energyKcal: number | null;
  raw?: Record<string, unknown>;
};

export type HealthSyncState = {
  lastSyncedAt: string | null;
  metricsCursor: string | null;
  workoutsCursor: string | null;
};

const METRICS_KEY = "@ironflow/healthMetrics";
const WORKOUTS_KEY = "@ironflow/healthWorkouts";
const SYNC_STATE_KEY = "@ironflow/healthSyncState";

// Notifie les écrans montés (ex. le widget Pas du Dashboard) dès qu'une
// synchro (manuelle ou silencieuse en arrière-plan, voir _layout.tsx) a
// réellement rapporté de nouvelles données — sans ça, un écran déjà ouvert
// ne verrait la mise à jour qu'au prochain re-render déclenché par autre
// chose (jusqu'à 60s de retard avec l'intervalle existant du Dashboard).
const listeners = new Set<() => void>();

export function subscribeHealthDataChanged(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyHealthDataChanged(): void {
  listeners.forEach((cb) => cb());
}

const DEFAULT_SYNC_STATE: HealthSyncState = {
  lastSyncedAt: null,
  metricsCursor: null,
  workoutsCursor: null,
};

async function readJsonArray<T>(key: string): Promise<T[]> {
  const raw = await bigStoreGet(key);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function metricKey(m: Pick<HealthMetricSample, "name" | "date">): string {
  return `${m.name}|${m.date}`;
}

function workoutKey(w: Pick<HealthWorkoutEntry, "name" | "start">): string {
  return `${w.name}|${w.start}`;
}

export async function getHealthMetrics(): Promise<HealthMetricSample[]> {
  return readJsonArray<HealthMetricSample>(METRICS_KEY);
}

export async function getHealthWorkouts(): Promise<HealthWorkoutEntry[]> {
  return readJsonArray<HealthWorkoutEntry>(WORKOUTS_KEY);
}

// Nom de métrique envoyé par Health Auto Export pour le nombre de pas
// (identifiant HealthKit `step_count`, en snake_case dans son export JSON).
// `"steps"` toléré en alias défensif si une version de l'app envoie un nom
// légèrement différent — mieux vaut un match tolérant qu'un widget à 0.
const STEP_METRIC_NAMES = new Set(["step_count", "steps"]);

/** Somme des échantillons de pas importés dont la date (locale, pas UTC —
 * Health Auto Export envoie des dates sans fuseau) commence par `dateYYYYMMDD`.
 * Apple Santé enregistre les pas par petits intervalles, jamais un total
 * journalier unique — l'agrégation se fait donc ici, pas côté backend. */
export async function getImportedStepsForDate(dateYYYYMMDD: string): Promise<number> {
  const metrics = await getHealthMetrics();
  let total = 0;
  for (const m of metrics) {
    if (!STEP_METRIC_NAMES.has(m.name.toLowerCase())) continue;
    if (!m.date.startsWith(dateYYYYMMDD)) continue;
    total += m.qty ?? 0;
  }
  return total;
}

/** Variante en lot de `getImportedStepsForDate` — une seule lecture de
 * `getHealthMetrics()` pour plusieurs dates (graphique 7 jours), au lieu de
 * 7 lectures séparées. */
export async function getImportedStepsForDates(dates: string[]): Promise<Record<string, number>> {
  const metrics = await getHealthMetrics();
  const result: Record<string, number> = {};
  for (const d of dates) result[d] = 0;
  for (const m of metrics) {
    if (!STEP_METRIC_NAMES.has(m.name.toLowerCase())) continue;
    const dateStr = m.date.slice(0, 10);
    if (dateStr in result) result[dateStr] += m.qty ?? 0;
  }
  return result;
}

// Sommeil / FC repos / VFC — noms HealthKit devinés (convention snake_case
// déjà confirmée pour `step_count`/`heart_rate`), mais **non vérifiés**
// contre un vrai payload Health Auto Export. Construits de façon tolérante :
// jamais d'exception, un état "pas encore de données" propre si absents ou
// si le vrai nom diffère — à ajuster une fois de vraies données reçues.
const SLEEP_METRIC_NAMES = new Set(["sleep_analysis", "sleep_hours", "sleep"]);
const RESTING_HR_METRIC_NAMES = new Set(["resting_heart_rate"]);
const HRV_METRIC_NAMES = new Set(["heart_rate_variability", "heart_rate_variability_sdnn", "hrv"]);

function unitsToHoursMultiplier(units: string | null): number {
  if (!units) return 1; // suppose déjà en heures si l'unité est absente
  const u = units.toLowerCase();
  if (u.includes("min")) return 1 / 60;
  if (u.includes("sec")) return 1 / 3600;
  return 1; // "hr"/"hour"/inconnu → suppose déjà en heures
}

/** Somme des échantillons de sommeil dont la date commence par `dateYYYYMMDD`
 * (même patron que les pas — Health Auto Export peut envoyer plusieurs
 * segments par nuit, ex. par stade de sommeil), convertie en heures via
 * `units` quand disponible. */
export async function getImportedSleepHoursForDate(dateYYYYMMDD: string): Promise<number> {
  const metrics = await getHealthMetrics();
  let total = 0;
  for (const m of metrics) {
    if (!SLEEP_METRIC_NAMES.has(m.name.toLowerCase())) continue;
    if (!m.date.startsWith(dateYYYYMMDD)) continue;
    total += (m.qty ?? 0) * unitsToHoursMultiplier(m.units);
  }
  return total;
}

/** Échantillon le plus récent parmi `names` (ex. FC repos, VFC) — ces
 * métriques sont des valeurs ponctuelles (une par jour), pas à sommer. */
export async function getLatestMetricSample(names: Set<string>): Promise<HealthMetricSample | null> {
  const metrics = await getHealthMetrics();
  let latest: HealthMetricSample | null = null;
  for (const m of metrics) {
    if (!names.has(m.name.toLowerCase())) continue;
    if (!latest || m.date > latest.date) latest = m;
  }
  return latest;
}

function dateStrsInWindow(days: number, referenceDateYYYYMMDD: string): Set<string> {
  const ref = new Date(`${referenceDateYYYYMMDD}T00:00:00Z`).getTime();
  const set = new Set<string>();
  for (let i = 1; i <= days; i++) {
    set.add(new Date(ref - i * 86400000).toISOString().slice(0, 10));
  }
  return set;
}

/** Moyenne de `names` sur les `days` jours PRÉCÉDANT `referenceDateYYYYMMDD`
 * (celui-ci exclu) — utilisée pour comparer une valeur du jour à la moyenne
 * récente (recommandation santé). `null` si aucun échantillon dans la fenêtre. */
export async function getRecentMetricAverage(
  names: Set<string>,
  days: number,
  referenceDateYYYYMMDD: string,
): Promise<number | null> {
  const windowDates = dateStrsInWindow(days, referenceDateYYYYMMDD);
  const metrics = await getHealthMetrics();
  const values: number[] = [];
  for (const m of metrics) {
    if (!names.has(m.name.toLowerCase())) continue;
    if (m.qty == null) continue;
    if (windowDates.has(m.date.slice(0, 10))) values.push(m.qty);
  }
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export { SLEEP_METRIC_NAMES, RESTING_HR_METRIC_NAMES, HRV_METRIC_NAMES };

/** Fusionne de nouveaux échantillons, dédupliqués par (name, date) — le serveur
 * dédoublonne déjà, ceci est une défense en profondeur bon marché côté app. */
export async function mergeHealthMetrics(incoming: HealthMetricSample[]): Promise<number> {
  if (incoming.length === 0) return 0;
  const existing = await getHealthMetrics();
  const byKey = new Map(existing.map((m) => [metricKey(m), m]));
  let added = 0;
  for (const m of incoming) {
    const key = metricKey(m);
    if (!byKey.has(key)) added++;
    byKey.set(key, m);
  }
  const merged = Array.from(byKey.values()).sort((a, b) => a.date.localeCompare(b.date));
  await bigStoreSet(METRICS_KEY, JSON.stringify(merged));
  notifyHealthDataChanged();
  return added;
}

export async function mergeHealthWorkouts(incoming: HealthWorkoutEntry[]): Promise<number> {
  if (incoming.length === 0) return 0;
  const existing = await getHealthWorkouts();
  const byKey = new Map(existing.map((w) => [workoutKey(w), w]));
  let added = 0;
  for (const w of incoming) {
    const key = workoutKey(w);
    if (!byKey.has(key)) added++;
    byKey.set(key, w);
  }
  const merged = Array.from(byKey.values()).sort((a, b) => a.start.localeCompare(b.start));
  await bigStoreSet(WORKOUTS_KEY, JSON.stringify(merged));
  notifyHealthDataChanged();
  return added;
}

export async function getHealthSyncState(): Promise<HealthSyncState> {
  const raw = await bigStoreGet(SYNC_STATE_KEY);
  if (!raw) return DEFAULT_SYNC_STATE;
  try {
    return { ...DEFAULT_SYNC_STATE, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_SYNC_STATE;
  }
}

export async function saveHealthSyncState(patch: Partial<HealthSyncState>): Promise<HealthSyncState> {
  const current = await getHealthSyncState();
  const next = { ...current, ...patch };
  await bigStoreSet(SYNC_STATE_KEY, JSON.stringify(next));
  return next;
}
