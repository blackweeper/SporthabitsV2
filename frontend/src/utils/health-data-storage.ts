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

/** `sleep_analysis` (Health Auto Export réel, confirmé sur un vrai payload)
 * n'utilise PAS `qty` (toujours `null`) — la durée et le détail par stade
 * vivent entièrement dans `raw` : `totalSleep`/`inBed`/`deep`/`core` (léger)/
 * `rem`/`awake` (en heures), `sleepStart`/`sleepEnd`/`inBedStart`/`inBedEnd`
 * (horodatages). Sans ce lecteur dédié, `getImportedSleepHoursForDate` (qui
 * ne lit que `qty`) calcule silencieusement 0h pour CHAQUE nuit réelle —
 * bug confirmé en direct sur de vraies données, pas une supposition. Retourne
 * `null` quand `raw.totalSleep` est absent plutôt que 0 (donnée vraiment
 * absente ≠ 0, voir la règle du brief). */
function sleepHoursFromRaw(raw: Record<string, unknown> | undefined): number | null {
  const v = raw?.totalSleep;
  return typeof v === "number" ? v : null;
}

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

// Horodatage de la dernière fusion ayant réellement modifié le stockage
// local — distinct de `HealthSyncState.lastSyncedAt` (mis à jour même quand
// une synchro ne rapporte rien de neuf). Sert de diagnostic : si ce
// timestamp n'avance jamais malgré des synchros régulières, le problème est
// en amont (rien de nouveau côté backend, ou la synchro échoue avant même
// d'atteindre la fusion) — voir `HealthDataDebugScreen`.
let lastChangeAt: string | null = null;

export function getLastHealthDataChangeAt(): string | null {
  return lastChangeAt;
}

export function subscribeHealthDataChanged(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function notifyHealthDataChanged(): void {
  lastChangeAt = new Date().toISOString();
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

/** Date locale (fuseau de l'appareil), au format YYYY-MM-DD. Contrairement à
 * `todayYYYYMMDD()` (`gym-storage.ts`, basé sur `toISOString()` donc en UTC),
 * nécessaire ici car Health Auto Export horodate ses échantillons en heure
 * locale de l'iPhone — comparer un échantillon "aujourd'hui" local à une
 * clé "aujourd'hui" en UTC décale la journée pendant les quelques heures qui
 * suivent minuit local pour tout fuseau à l'est de Greenwich (l'essentiel de
 * l'Europe), ce qui peut faire apparaître le widget comme "bloqué". */
export function localDateYYYYMMDD(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Normalise un nom de métrique pour la comparaison : insensible à la casse,
 * aux séparateurs (`_`/espace/aucun) et au préfixe brut HealthKit
 * (`HKQuantityTypeIdentifier...`) que certaines versions/exports peuvent
 * laisser passer — Health Auto Export n'a jamais garanti une seule
 * convention de nommage exacte, un match tolérant évite un widget à 0 pour
 * une simple différence de format plutôt qu'une vraie absence de donnée. */
function normalizeMetricName(name: string): string {
  const stripped = name.toLowerCase().replace(/[^a-z0-9]/g, "");
  return stripped.replace(/^hk(quantity|category)typeidentifier/, "");
}

// Nom de métrique envoyé par Health Auto Export pour le nombre de pas
// (identifiant HealthKit `step_count`). Alias défensifs tolérés (casse/
// séparateurs déjà gérés par `normalizeMetricName`, donc listés ici sans
// underscore) au cas où une version enverrait un nom légèrement différent.
const STEP_METRIC_NAMES = new Set(["stepcount", "steps"]);

/** Somme des échantillons de pas importés dont la date (locale, pas UTC —
 * Health Auto Export envoie des dates sans fuseau) commence par `dateYYYYMMDD`.
 * Apple Santé enregistre les pas par petits intervalles, jamais un total
 * journalier unique — l'agrégation se fait donc ici, pas côté backend. */
export async function getImportedStepsForDate(dateYYYYMMDD: string): Promise<number> {
  const metrics = await getHealthMetrics();
  let total = 0;
  for (const m of metrics) {
    if (!STEP_METRIC_NAMES.has(normalizeMetricName(m.name))) continue;
    if (!m.date.startsWith(dateYYYYMMDD)) continue;
    total += m.qty ?? 0;
  }
  if (__DEV__) {
    console.log(`[HealthData] querying date: ${dateYYYYMMDD}`);
    console.log(`[HealthData] steps today: ${total} (${metrics.length} samples in local storage)`);
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
    if (!STEP_METRIC_NAMES.has(normalizeMetricName(m.name))) continue;
    const dateStr = m.date.slice(0, 10);
    if (dateStr in result) result[dateStr] += m.qty ?? 0;
  }
  return result;
}

// Sommeil / FC repos / VFC — noms confirmés contre un vrai payload Health
// Auto Export (`sleep_analysis`, `resting_heart_rate`, `heart_rate_variability`,
// un échantillon/jour chacun) inspecté en direct lors de la construction de
// l'écran Santé. Construits de façon tolérante malgré tout : jamais
// d'exception, un état "pas encore de données" propre si absents.
const SLEEP_METRIC_NAMES = new Set(["sleepanalysis", "sleephours", "sleep", "timeasleep", "sleepdata"]);
const RESTING_HR_METRIC_NAMES = new Set(["restingheartrate", "restingheartrateaverage"]);
const HRV_METRIC_NAMES = new Set(["heartratevariability", "heartratevariabilitysdnn", "hrv"]);
const HEART_RATE_METRIC_NAMES = new Set(["heartrate", "heartrateaverage"]);
// Respiration / SpO2 / distance / temps d'exercice — noms confirmés contre
// un vrai payload Health Auto Export réel (`respiratory_rate`,
// `oxygen_saturation`, `distance_walking_running`, `apple_exercise_time`,
// un échantillon/jour chacun) inspecté en direct lors de la construction de
// l'écran Santé. Alias supplémentaires conservés en défense en profondeur
// (autres conventions de nommage possibles selon la version), même patron
// tolérant que sommeil/FC repos/VFC ci-dessus. NB : Health Auto Export
// envoie aussi `walking_running_distance` (segments intra-journaliers) en
// plus de `distance_walking_running` (total quotidien déjà agrégé) — ce
// dernier seul est utilisé ici pour ne jamais compter la distance en double.
const RESPIRATORY_RATE_METRIC_NAMES = new Set(["respiratoryrate"]);
// "blood_oxygen_saturation" confirmé sur un vrai payload (source Zepp,
// vérifié en direct en IndexedDB) — absent jusqu'ici, faisait échouer tout
// mapping SpO2 malgré une donnée réellement importée (widget bloqué sur
// "Non disponible" avec un échantillon présent en stockage).
const SPO2_METRIC_NAMES = new Set(["oxygensaturation", "bloodoxygensaturation", "bloodoxygen", "spo2"]);
const DISTANCE_METRIC_NAMES = new Set(["distancewalkingrunning", "distance", "walkingrunningdistance"]);
const EXERCISE_TIME_METRIC_NAMES = new Set(["appleexercisetime", "exercisetime", "exerciseminutes"]);
// Énergie active (calories brûlées mesurées par l'Apple Watch/l'iPhone) —
// identifiant HealthKit `active_energy`/`ActiveEnergyBurned`. Volontairement
// exposée séparément du widget "Calories" du Dashboard (celui-ci reste basé
// sur les séances IronFlow elles-mêmes, une source déjà cohérente avec
// Niveau/Défis — voir §19 du brief : une seule source de vérité par concept,
// pas question de faire cohabiter deux définitions différentes de "calories
// brûlées" sur le même widget). Utilisée pour l'instant uniquement par le
// panneau de diagnostic (`HealthDataDebugScreen`) et disponible pour un futur
// widget dédié si besoin.
const ACTIVE_ENERGY_METRIC_NAMES = new Set(["activeenergyburned", "activeenergy", "activecalories"]);

// Poids / IMC / Masse grasse — noms non confirmés contre un vrai payload
// Health Auto Export pour CES métriques précises (contrairement à
// sommeil/FC repos/VFC/SpO2/distance/temps d'exercice ci-dessus, jamais
// encore inspectées en direct) ; alias posés sur la convention de nommage
// HealthKit habituelle (`weight_body_mass`, `body_mass_index`,
// `body_fat_percentage`), avec le même filet tolérant que le reste de ce
// fichier — jamais d'exception, un état "pas encore de données" propre si le
// nom réel diffère. À ajuster une fois un vrai payload confirmé.
const WEIGHT_METRIC_NAMES = new Set(["weightbodymass", "bodyweight", "weight", "bodymass"]);
const BMI_METRIC_NAMES = new Set(["bodymassindex", "bmi"]);
const BODY_FAT_METRIC_NAMES = new Set(["bodyfatpercentage", "bodyfat", "percentagebodyfat"]);

export function unitsToHoursMultiplier(units: string | null): number {
  if (!units) return 1; // suppose déjà en heures si l'unité est absente
  const u = units.toLowerCase();
  if (u.includes("min")) return 1 / 60;
  if (u.includes("sec")) return 1 / 3600;
  return 1; // "hr"/"hour"/inconnu → suppose déjà en heures
}

function unitsToKmMultiplier(units: string | null): number {
  if (!units) return 1; // suppose déjà en km si l'unité est absente
  const u = units.toLowerCase();
  if (u.includes("mi")) return 1.60934;
  if (u === "m" || u.includes("meter") || u.includes("metre")) return 0.001;
  return 1; // "km"/inconnu → suppose déjà en km
}

/** Health Auto Export peut envoyer le poids en `lb` selon les réglages
 * régionaux de l'iPhone (jamais vérifié en direct pour cette métrique
 * précise) — conversion posée par prudence, même patron que distance/
 * calories ci-dessus. */
function unitsToKgMultiplier(units: string | null): number {
  if (!units) return 1; // suppose déjà en kg si l'unité est absente
  const u = units.toLowerCase();
  if (u.includes("lb") || u.includes("pound")) return 0.453592;
  return 1; // "kg"/inconnu → suppose déjà en kg
}

/** Health Auto Export envoie `active_energy`/`basal_energy_burned` en `kJ`
 * (confirmé sur un vrai payload : `units: "kJ"`) — jamais converti jusqu'ici,
 * ce qui aurait affiché un nombre ~4,184× trop grand si jamais libellé
 * "kcal" dans l'UI. 1 kcal = 4.184 kJ. */
function unitsToKcalMultiplier(units: string | null): number {
  if (!units) return 1; // suppose déjà en kcal si l'unité est absente
  const u = units.toLowerCase();
  if (u === "kj" || u.includes("kilojoule")) return 1 / 4.184;
  if (u === "j" || u === "joule" || u.includes("joule")) return 1 / 4184;
  return 1; // "kcal"/"cal"/inconnu → suppose déjà en kcal
}

/** Détail réel des stades de sommeil pour une nuit — voir `sleepHoursFromRaw` :
 * `sleep_analysis` porte ces champs (heures) et horodatages directement dans
 * `raw` sur un vrai payload Health Auto Export. Toute valeur absente reste
 * `null` plutôt que 0 — jamais fabriquée. */
export type SleepStageDetail = {
  totalSleepHours: number | null;
  inBedHours: number | null;
  deepHours: number | null;
  coreHours: number | null; // "sommeil léger" (core, terminologie Apple)
  remHours: number | null;
  awakeHours: number | null;
  sleepStart: string | null;
  sleepEnd: string | null;
  inBedStart: string | null;
  inBedEnd: string | null;
};

function numOrNull(v: unknown): number | null {
  return typeof v === "number" ? v : null;
}
function strOrNull(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

export function sleepStageDetailFromRaw(raw: Record<string, unknown> | undefined): SleepStageDetail {
  return {
    totalSleepHours: numOrNull(raw?.totalSleep),
    inBedHours: numOrNull(raw?.inBed),
    deepHours: numOrNull(raw?.deep),
    coreHours: numOrNull(raw?.core),
    remHours: numOrNull(raw?.rem),
    awakeHours: numOrNull(raw?.awake),
    sleepStart: strOrNull(raw?.sleepStart),
    sleepEnd: strOrNull(raw?.sleepEnd),
    inBedStart: strOrNull(raw?.inBedStart),
    inBedEnd: strOrNull(raw?.inBedEnd),
  };
}

/** Détail de sommeil le plus récent — même logique jour/veille que
 * `getLatestSleepHours` (voir son commentaire : `sleep_analysis` est daté du
 * soir du coucher, pas du réveil). */
export async function getLatestSleepStageDetail(): Promise<{ detail: SleepStageDetail; dateYYYYMMDD: string } | null> {
  const metrics = await getHealthMetrics();
  const today = localDateYYYYMMDD();
  const yesterday = localDateYYYYMMDD(new Date(Date.now() - 86400000));
  for (const dateYYYYMMDD of [today, yesterday]) {
    const sample = metrics.find(
      (m) => SLEEP_METRIC_NAMES.has(normalizeMetricName(m.name)) && m.date.startsWith(dateYYYYMMDD),
    );
    if (sample) return { detail: sleepStageDetailFromRaw(sample.raw), dateYYYYMMDD };
  }
  return null;
}

/** Efficacité de sommeil réelle (`totalSleep`/`inBed`) — jamais recalculée
 * ailleurs, un seul endroit pour cette formule. `null` si l'un des deux
 * champs manque (jamais un pourcentage fabriqué à partir d'une seule
 * valeur). Plafonnée à 100% (un léger désaccord d'échantillonnage entre les
 * deux champs source peut techniquement dépasser 100%, ce qui n'a pas de
 * sens pour "part du temps au lit passée à dormir"). */
export function sleepEfficiencyPercent(detail: SleepStageDetail): number | null {
  if (detail.totalSleepHours == null || detail.inBedHours == null || detail.inBedHours <= 0) return null;
  return Math.min(100, (detail.totalSleepHours / detail.inBedHours) * 100);
}

/** Parse le format d'horodatage réel envoyé par Health Auto Export dans les
 * champs `raw` (ex. `sleepStart`/`inBedStart`) : "2026-08-29 01:37:00 +0200"
 * — un simple `replace(" ", "T")` laisse un espace résiduel avant le fuseau
 * que `Date` ne sait pas parser (confirmé en direct : retombe silencieusement
 * sur `Invalid Date`). Centralisé ici (au lieu d'une copie locale par écran)
 * pour que toute future consommation de ce format profite du même correctif. */
export function parseHealthTimestamp(raw: string): Date | null {
  const iso = raw.replace(" ", "T").replace(/\s+/g, "");
  const d = new Date(iso);
  return isNaN(d.getTime()) ? null : d;
}

/** "01:37" — jamais le timestamp technique brut en repli (voir
 * `parseHealthTimestamp`) : "—" si le format est inattendu/absent plutôt
 * qu'une chaîne illisible pour l'utilisateur. */
export function formatHealthTime(raw: string): string {
  const d = parseHealthTimestamp(raw);
  if (!d) return "—";
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/** Échantillons SpO2 dont l'horodatage RÉEL tombe dans la fenêtre de sommeil
 * de la nuit donnée (`nightStart`/`nightEnd`, champs `raw` de la même nuit —
 * jamais une heure de nuit devinée) — distinct d'une moyenne journalière
 * générale (voir §14 du brief Sommeil : ne jamais confondre les deux).
 * `null`/tableau vide si la fenêtre ou les échantillons sont absents —
 * jamais une estimation à partir d'une plage horaire arbitraire. */
export async function getNocturnalSpo2Samples(
  nightStart: string | null,
  nightEnd: string | null,
): Promise<HealthMetricSample[]> {
  if (!nightStart || !nightEnd) return [];
  const start = parseHealthTimestamp(nightStart);
  const end = parseHealthTimestamp(nightEnd);
  if (!start || !end) return [];
  const samples = await getRawSamplesForMetric(SPO2_METRIC_NAMES);
  return samples.filter((s) => {
    const t = parseHealthTimestamp(s.date);
    return t != null && t.getTime() >= start.getTime() && t.getTime() <= end.getTime() && s.qty != null;
  });
}

function unitsToMinutesMultiplier(units: string | null): number {
  if (!units) return 1; // suppose déjà en minutes si l'unité est absente
  const u = units.toLowerCase();
  if (u.includes("sec")) return 1 / 60;
  if (u.includes("hr") || u.includes("hour")) return 60;
  return 1; // "min"/inconnu → suppose déjà en minutes
}

/** Même patron que `getImportedStepsForDate`/`getImportedSleepHoursForDate`
 * pour la distance parcourue du jour (km). */
export async function getImportedDistanceKmForDate(dateYYYYMMDD: string): Promise<number> {
  const metrics = await getHealthMetrics();
  let total = 0;
  for (const m of metrics) {
    if (!DISTANCE_METRIC_NAMES.has(normalizeMetricName(m.name))) continue;
    if (!m.date.startsWith(dateYYYYMMDD)) continue;
    total += (m.qty ?? 0) * unitsToKmMultiplier(m.units);
  }
  return total;
}

/** Même patron pour l'énergie active (kcal) du jour — voir le commentaire
 * sur `ACTIVE_ENERGY_METRIC_NAMES` : n'alimente pas le widget "Calories" du
 * Dashboard (qui reste basé sur les séances IronFlow), disponible pour le
 * panneau de diagnostic santé et un futur usage dédié. */
export async function getImportedActiveCaloriesForDate(dateYYYYMMDD: string): Promise<number> {
  const metrics = await getHealthMetrics();
  let total = 0;
  for (const m of metrics) {
    if (!ACTIVE_ENERGY_METRIC_NAMES.has(normalizeMetricName(m.name))) continue;
    if (!m.date.startsWith(dateYYYYMMDD)) continue;
    total += (m.qty ?? 0) * unitsToKcalMultiplier(m.units);
  }
  return total;
}

/** Même patron pour les minutes d'exercice du jour. */
export async function getImportedExerciseMinutesForDate(dateYYYYMMDD: string): Promise<number> {
  const metrics = await getHealthMetrics();
  let total = 0;
  for (const m of metrics) {
    if (!EXERCISE_TIME_METRIC_NAMES.has(normalizeMetricName(m.name))) continue;
    if (!m.date.startsWith(dateYYYYMMDD)) continue;
    total += (m.qty ?? 0) * unitsToMinutesMultiplier(m.units);
  }
  return total;
}

export type DailyMetricPoint = { date: string; value: number };

/** Série journalière d'une métrique sur `days` jours se terminant à
 * `referenceDateYYYYMMDD` (inclus par défaut, voir `includeReferenceDate`) —
 * généralisation de l'agrégation par jour déjà utilisée pour les pas/le
 * sommeil, réutilisée pour les graphiques d'évolution Santé (Sommeil/VFC/
 * FC repos/Respiration/SpO2). `aggregation:"sum"` pour une métrique répartie
 * en plusieurs échantillons/jour à additionner (sommeil), `"avg"` pour une
 * métrique ponctuelle (VFC/FC repos/Respiration/SpO2, ~1 échantillon/jour —
 * moyenne au cas où Health Auto Export en enverrait plusieurs). */
export async function getDailyMetricSeries(
  names: Set<string>,
  days: number,
  referenceDateYYYYMMDD: string,
  aggregation: "avg" | "sum" = "avg",
  unitsConvert?: (units: string | null) => number,
  includeReferenceDate: boolean = true,
  /** Extraction de valeur alternative à `m.qty` — nécessaire pour
   * `sleep_analysis` (voir `sleepHoursFromRaw`), dont `qty` est toujours
   * `null` sur un vrai payload Health Auto Export ; la vraie durée vit dans
   * `raw.totalSleep`. `undefined` = comportement historique (`m.qty`). */
  valueExtractor?: (m: HealthMetricSample) => number | null,
): Promise<DailyMetricPoint[]> {
  const metrics = await getHealthMetrics();
  const ref = new Date(`${referenceDateYYYYMMDD}T00:00:00Z`).getTime();
  const minTime = ref - (days - 1) * 86400000;
  const byDate = new Map<string, number[]>();
  for (const m of metrics) {
    if (!names.has(normalizeMetricName(m.name))) continue;
    const rawValue = valueExtractor ? valueExtractor(m) : m.qty;
    if (rawValue == null) continue;
    const dateStr = m.date.slice(0, 10);
    const t = new Date(`${dateStr}T00:00:00Z`).getTime();
    if (t < minTime || t > ref) continue;
    if (!includeReferenceDate && t === ref) continue;
    const mult = unitsConvert ? unitsConvert(m.units) : 1;
    const arr = byDate.get(dateStr) ?? [];
    arr.push(rawValue * mult);
    byDate.set(dateStr, arr);
  }
  const result: DailyMetricPoint[] = [];
  for (const [date, values] of byDate.entries()) {
    const value =
      aggregation === "sum"
        ? values.reduce((s, v) => s + v, 0)
        : values.reduce((s, v) => s + v, 0) / values.length;
    result.push({ date, value });
  }
  return result.sort((a, b) => a.date.localeCompare(b.date));
}

/** Moyenne des totaux journaliers de `names` sur les `days` jours PRÉCÉDANT
 * `referenceDateYYYYMMDD` (celui-ci exclu) — variante de
 * `getRecentMetricAverage` qui agrège d'abord par jour avant de moyenner,
 * nécessaire pour le sommeil (plusieurs segments/nuit : moyenner les
 * échantillons bruts sous-estimerait le total nocturne). */
export async function getRecentDailyAverage(
  names: Set<string>,
  days: number,
  referenceDateYYYYMMDD: string,
  aggregation: "avg" | "sum" = "avg",
  unitsConvert?: (units: string | null) => number,
  valueExtractor?: (m: HealthMetricSample) => number | null,
): Promise<number | null> {
  const series = await getDailyMetricSeries(
    names,
    days,
    referenceDateYYYYMMDD,
    aggregation,
    unitsConvert,
    false,
    valueExtractor,
  );
  if (series.length === 0) return null;
  return series.reduce((s, p) => s + p.value, 0) / series.length;
}

/** Somme des échantillons de sommeil dont la date commence par `dateYYYYMMDD`
 * (même patron que les pas — Health Auto Export peut envoyer plusieurs
 * segments par nuit, ex. par stade de sommeil), convertie en heures via
 * `units` quand disponible. */
export async function getImportedSleepHoursForDate(dateYYYYMMDD: string): Promise<number> {
  const metrics = await getHealthMetrics();
  let total = 0;
  for (const m of metrics) {
    if (!SLEEP_METRIC_NAMES.has(normalizeMetricName(m.name))) continue;
    if (!m.date.startsWith(dateYYYYMMDD)) continue;
    const fromRaw = sleepHoursFromRaw(m.raw);
    if (fromRaw != null) {
      total += fromRaw;
      continue;
    }
    // Repli historique — au cas où une variante de Health Auto Export
    // enverrait un jour la durée directement dans `qty`.
    total += (m.qty ?? 0) * unitsToHoursMultiplier(m.units);
  }
  return total;
}

/** Le sommeil affiché comme "Sommeil" du jour désigne conceptuellement la
 * nuit précédente, pas une plage calendaire — confirmé sur un vrai payload
 * Health Auto Export réel : `sleep_analysis` arrive daté d'une simple date
 * (pas d'horodatage), et ce champ correspond au soir du coucher, pas au
 * réveil. Chercher uniquement "aujourd'hui" masque donc systématiquement la
 * nuit qui vient de s'écouler (elle reste datée d'hier tant qu'une nouvelle
 * nuit n'a pas commencé) — c'est le bug réel derrière "le widget Sommeil
 * n'affiche jamais rien" : la donnée existe bien, juste sous la date
 * d'hier. Vérifie donc aujourd'hui d'abord (au cas où une version future
 * daterait au réveil), puis hier — jamais plus loin, pour ne jamais
 * afficher un sommeil "vieux" comme s'il datait de cette nuit. */
export async function getLatestSleepHours(): Promise<{ hours: number; dateYYYYMMDD: string } | null> {
  const today = localDateYYYYMMDD();
  const todayHours = await getImportedSleepHoursForDate(today);
  if (todayHours > 0) return { hours: todayHours, dateYYYYMMDD: today };
  const yesterday = localDateYYYYMMDD(new Date(Date.now() - 86400000));
  const yesterdayHours = await getImportedSleepHoursForDate(yesterday);
  if (yesterdayHours > 0) return { hours: yesterdayHours, dateYYYYMMDD: yesterday };
  return null;
}

/** Échantillon le plus récent parmi `names` (ex. FC repos, VFC) — ces
 * métriques sont des valeurs ponctuelles (une par jour), pas à sommer. */
export async function getLatestMetricSample(names: Set<string>): Promise<HealthMetricSample | null> {
  const metrics = await getHealthMetrics();
  let latest: HealthMetricSample | null = null;
  for (const m of metrics) {
    if (!names.has(normalizeMetricName(m.name))) continue;
    if (!latest || m.date > latest.date) latest = m;
  }
  return latest;
}

/** Tous les échantillons bruts d'une métrique, triés du plus récent au plus
 * ancien — pour la vue détaillée d'un indicateur Santé ("toutes les
 * données récupérées via l'import santé pour cette métrique"), au-delà de
 * ce que le graphique d'évolution résume déjà par jour. */
export async function getRawSamplesForMetric(names: Set<string>): Promise<HealthMetricSample[]> {
  const metrics = await getHealthMetrics();
  return metrics.filter((m) => names.has(normalizeMetricName(m.name))).sort((a, b) => (a.date < b.date ? 1 : -1));
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
    if (!names.has(normalizeMetricName(m.name))) continue;
    if (m.qty == null) continue;
    if (windowDates.has(m.date.slice(0, 10))) values.push(m.qty);
  }
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

export {
  SLEEP_METRIC_NAMES,
  RESTING_HR_METRIC_NAMES,
  HRV_METRIC_NAMES,
  HEART_RATE_METRIC_NAMES,
  RESPIRATORY_RATE_METRIC_NAMES,
  SPO2_METRIC_NAMES,
  DISTANCE_METRIC_NAMES,
  EXERCISE_TIME_METRIC_NAMES,
  ACTIVE_ENERGY_METRIC_NAMES,
  STEP_METRIC_NAMES,
  WEIGHT_METRIC_NAMES,
  BMI_METRIC_NAMES,
  BODY_FAT_METRIC_NAMES,
  normalizeMetricName,
  unitsToKcalMultiplier,
  unitsToKmMultiplier,
  unitsToKgMultiplier,
  sleepHoursFromRaw,
};

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
  // Compteurs uniquement — jamais de valeur de santé individuelle en clair
  // dans les logs (voir §23 du brief sécurité). `__DEV__` : silencieux en
  // production, visible pendant le diagnostic/`expo start`.
  if (__DEV__) console.log(`[HealthData] samples persisted locally: +${added} new, ${merged.length} total`);
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
