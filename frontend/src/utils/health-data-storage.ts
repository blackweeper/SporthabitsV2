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
