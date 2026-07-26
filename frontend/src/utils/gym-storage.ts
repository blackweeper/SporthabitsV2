import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExerciseMode = 'reps' | 'time' | 'amrap' | 'emom';

export type Exercise = {
  id: string;
  name: string;
  mode: ExerciseMode;
  sets: number;
  reps: string;
  weight: string | null;
  rest_seconds: number;
  duration_seconds: number | null;
  notes: string | null;
  /** Base64 photo (no data-uri prefix) OR null. Optional custom photo. */
  photoBase64?: string | null;
  /** Key from EXERCISE_ICONS library (fallback when no photoBase64). */
  iconKey?: string | null;
};

/** category: 'workout' or 'stretch' — enables re-using the whole program engine for stretching programs. */
export type PlanCategory = 'workout' | 'stretch';

export type Plan = {
  id: string;
  title: string;
  type: 'musculation' | 'hiit' | 'cardio' | 'mixte' | 'stretch';
  category?: PlanCategory;
  createdAt: string;
  exercises: Exercise[];
  programSource?: {
    programId: string;
    dayIndex: number;
    sessionIndex: number;
  };
};

export type SetLog = {
  reps: string;
  weight: string;
  completed: boolean;
};

export type SessionExerciseLog = {
  exerciseId: string;
  name: string;
  mode: ExerciseMode;
  targetSets: number;
  targetReps: string;
  targetWeight: string | null;
  targetRestSeconds: number;
  targetDurationSeconds: number | null;
  sets: SetLog[];
};

export type CardioActivity =
  | 'course'
  | 'velo'
  | 'rameur'
  | 'skierg'
  | 'assault_bike'
  | 'natation'
  | 'corde'
  | 'autre';

export const CARDIO_ACTIVITY_LABEL: Record<CardioActivity, string> = {
  course: 'Course à pied',
  velo: 'Vélo',
  rameur: 'Rameur',
  skierg: 'SkiErg',
  assault_bike: 'Assault Bike',
  natation: 'Natation',
  corde: 'Corde à sauter',
  autre: 'Autre',
};

export const CARDIO_ACTIVITY_EMOJI: Record<CardioActivity, string> = {
  course: '🏃',
  velo: '🚴',
  rameur: '🚣',
  skierg: '⛷️',
  assault_bike: '🚴‍♂️',
  natation: '🏊',
  corde: '🤸',
  autre: '💨',
};

export type SessionJournal = {
  mood?: number | null; // 1-10
  energy?: number | null; // 1-10
  motivation?: number | null; // 1-10
  pain?: string | null;
  sleep_hours?: number | null;
  nutrition?: string | null;
  comment?: string | null;
};

export type CardioMetrics = {
  distance_m?: number | null;
  avg_hr?: number | null;
  max_hr?: number | null;
  elevation_m?: number | null;
  cadence?: number | null;
  vo2max?: number | null;
};

export type WorkoutSession = {
  id: string;
  planId: string;
  planTitle: string;
  planType: Plan['type'];
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  totalRestSeconds: number;
  caloriesBurned: number;
  exercises: SessionExerciseLog[];
  /** Optional cardio activity classification (when planType is cardio/mixte/hiit). */
  cardio_activity?: CardioActivity | null;
  cardio_metrics?: CardioMetrics | null;
  /** Optional post-session journal entry. */
  journal?: SessionJournal | null;
};

const MET_BY_TYPE: Record<Plan['type'], number> = {
  musculation: 5,
  hiit: 8,
  cardio: 9,
  mixte: 7,
  stretch: 2.3,
};

export function estimateCalories(
  type: Plan['type'],
  durationSeconds: number,
  bodyMassKg: number = 70,
): number {
  const met = MET_BY_TYPE[type] ?? 6;
  const hours = durationSeconds / 3600;
  return Math.round(met * bodyMassKg * hours);
}

const PLANS_KEY = '@ironflow/plans';
const SESSIONS_KEY = '@ironflow/sessions';
const PROFILE_KEY = '@ironflow/profile';
const MEASUREMENTS_KEY = '@ironflow/measurements';
const PRS_KEY = '@ironflow/prs';

// ---------- Profile ----------
export type Sex = 'homme' | 'femme' | 'autre';

export type UserProfile = {
  weight_kg: number | null;
  height_cm: number | null;
  sex: Sex | null;
  age: number | null;
  /** Base64 avatar (no data-uri prefix). */
  photoBase64?: string | null;
};

export async function getProfile(): Promise<UserProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return { weight_kg: null, height_cm: null, sex: null, age: null, photoBase64: null };
  try {
    const p = JSON.parse(raw);
    return { photoBase64: null, ...p };
  } catch {
    return { weight_kg: null, height_cm: null, sex: null, age: null, photoBase64: null };
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ---------- Measurements ----------
export type Measurement = {
  id: string;
  date: string;
  weight_kg: number | null;
  waist_cm: number | null;
  thigh_cm: number | null;
  chest_cm: number | null;
  /** NEW measurements */
  neck_cm?: number | null;
  hips_cm?: number | null;
  arm_cm?: number | null;
  forearm_cm?: number | null;
  calf_cm?: number | null;
  waist_navel_cm?: number | null;
  body_fat_pct?: number | null;
  photoBase64: string | null;
  notes: string | null;
};

export async function getMeasurements(): Promise<Measurement[]> {
  const raw = await AsyncStorage.getItem(MEASUREMENTS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Measurement[];
    return arr.sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  } catch {
    return [];
  }
}

export async function saveMeasurement(m: Measurement): Promise<void> {
  const list = await getMeasurements();
  const idx = list.findIndex((x) => x.id === m.id);
  if (idx >= 0) list[idx] = m;
  else list.unshift(m);
  await AsyncStorage.setItem(MEASUREMENTS_KEY, JSON.stringify(list));
}

export async function deleteMeasurement(id: string): Promise<void> {
  const list = await getMeasurements();
  await AsyncStorage.setItem(
    MEASUREMENTS_KEY,
    JSON.stringify(list.filter((m) => m.id !== id)),
  );
}

export async function getMeasurement(id: string): Promise<Measurement | null> {
  const list = await getMeasurements();
  return list.find((m) => m.id === id) ?? null;
}

// Navy body-fat estimation. Waist & neck (& hips for women) in cm, height in cm.
export function estimateBodyFatNavy(input: {
  sex: Sex | null;
  height_cm: number | null;
  waist_cm: number | null;
  neck_cm: number | null | undefined;
  hips_cm: number | null | undefined;
}): number | null {
  const { sex, height_cm, waist_cm, neck_cm, hips_cm } = input;
  if (!sex || !height_cm || !waist_cm || !neck_cm) return null;
  const h = height_cm;
  try {
    if (sex === 'homme') {
      const val =
        495 /
          (1.0324 -
            0.19077 * Math.log10(waist_cm - neck_cm) +
            0.15456 * Math.log10(h)) -
        450;
      return Math.round(val * 10) / 10;
    }
    if (sex === 'femme') {
      if (!hips_cm) return null;
      const val =
        495 /
          (1.29579 -
            0.35004 * Math.log10(waist_cm + hips_cm - neck_cm) +
            0.221 * Math.log10(h)) -
        450;
      return Math.round(val * 10) / 10;
    }
    return null;
  } catch {
    return null;
  }
}

// ---------- Personal Records ----------
export type PRType = 'weight' | 'reps' | 'run';

export type PersonalRecord = {
  id: string;
  exerciseName: string;
  type?: PRType; // default 'weight' for legacy records
  /** WEIGHT type */
  weight_kg: number;
  reps: number;
  /** REPS-ONLY type (bodyweight): stored also in `reps` above, weight_kg = 0 */
  /** RUN type */
  distance_m?: number | null;
  time_seconds?: number | null;
  date: string;
  notes: string | null;
};

function normalizePR(pr: any): PersonalRecord {
  return {
    id: pr.id,
    exerciseName: pr.exerciseName ?? 'Exercice',
    type: (pr.type as PRType) ?? 'weight',
    weight_kg: typeof pr.weight_kg === 'number' ? pr.weight_kg : 0,
    reps: typeof pr.reps === 'number' ? pr.reps : parseInt(pr.reps, 10) || 0,
    distance_m: pr.distance_m ?? null,
    time_seconds: pr.time_seconds ?? null,
    date: pr.date ?? new Date().toISOString(),
    notes: pr.notes ?? null,
  };
}

export async function getPRs(): Promise<PersonalRecord[]> {
  const raw = await AsyncStorage.getItem(PRS_KEY);
  if (!raw) return [];
  try {
    return (JSON.parse(raw) as any[]).map(normalizePR);
  } catch {
    return [];
  }
}

export async function savePR(pr: PersonalRecord): Promise<void> {
  const list = await getPRs();
  const idx = list.findIndex((x) => x.id === pr.id);
  if (idx >= 0) list[idx] = pr;
  else list.unshift(pr);
  await AsyncStorage.setItem(PRS_KEY, JSON.stringify(list));
}

export async function deletePR(id: string): Promise<void> {
  const list = await getPRs();
  await AsyncStorage.setItem(
    PRS_KEY,
    JSON.stringify(list.filter((p) => p.id !== id)),
  );
}

// Epley formula for estimated 1RM
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return weight;
  return weight * (1 + reps / 30);
}

// For bodyweight reps PR: compute expected reps for given % of max (linear).
export function repsForPercent(maxReps: number, percent: number): number {
  return Math.max(0, Math.round((maxReps * percent) / 100));
}

// Running pace helpers
export function paceSecondsPerKm(distance_m: number, time_seconds: number): number {
  if (distance_m <= 0) return 0;
  return (time_seconds * 1000) / distance_m;
}

export function formatDurationHMS(totalSeconds: number): string {
  totalSeconds = Math.max(0, Math.round(totalSeconds));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const mm = String(m).padStart(2, '0');
  const ss = String(s).padStart(2, '0');
  if (h > 0) return `${h}:${mm}:${ss}`;
  return `${m}:${ss}`;
}

export function formatPace(secPerKm: number): string {
  if (!secPerKm || !isFinite(secPerKm)) return '—';
  const m = Math.floor(secPerKm / 60);
  const s = Math.round(secPerKm % 60);
  return `${m}:${String(s).padStart(2, '0')}/km`;
}

// ---------- Active programs (up to 2 simultaneous) ----------
const ACTIVE_PROGRAMS_KEY = '@ironflow/activePrograms';
// legacy single-active-program key kept for one-time migration
const LEGACY_ACTIVE_PROGRAM_KEY = '@ironflow/activeProgram';
const CUSTOM_PROGRAMS_KEY = '@ironflow/customPrograms';

export type CompletedSessionRef = { dayIndex: number; sessionIndex: number };

export type ActiveProgram = {
  programId: string;
  startedAt: string;
  completedSessions: CompletedSessionRef[];
  completedDayIndexes?: number[]; // legacy
};

function normalizeActive(raw: any): ActiveProgram {
  if (Array.isArray(raw?.completedSessions)) {
    return {
      programId: raw.programId,
      startedAt: raw.startedAt,
      completedSessions: raw.completedSessions,
    };
  }
  const migrated: CompletedSessionRef[] = Array.isArray(raw?.completedDayIndexes)
    ? raw.completedDayIndexes.map((d: number) => ({
        dayIndex: d,
        sessionIndex: 0,
      }))
    : [];
  return {
    programId: raw?.programId,
    startedAt: raw?.startedAt,
    completedSessions: migrated,
  };
}

export async function getActivePrograms(): Promise<ActiveProgram[]> {
  const raw = await AsyncStorage.getItem(ACTIVE_PROGRAMS_KEY);
  if (raw) {
    try {
      const arr = JSON.parse(raw);
      if (Array.isArray(arr)) return arr.map(normalizeActive);
    } catch {}
  }
  // legacy migration
  const legacy = await AsyncStorage.getItem(LEGACY_ACTIVE_PROGRAM_KEY);
  if (legacy) {
    try {
      const single = normalizeActive(JSON.parse(legacy));
      if (single?.programId) {
        await AsyncStorage.setItem(
          ACTIVE_PROGRAMS_KEY,
          JSON.stringify([single]),
        );
        await AsyncStorage.removeItem(LEGACY_ACTIVE_PROGRAM_KEY);
        return [single];
      }
    } catch {}
  }
  return [];
}

export async function setActivePrograms(list: ActiveProgram[]): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_PROGRAMS_KEY, JSON.stringify(list));
}

/** Add or replace an active program; capped at 2 simultaneously. */
export async function addActiveProgram(p: ActiveProgram): Promise<void> {
  const list = await getActivePrograms();
  const idx = list.findIndex((x) => x.programId === p.programId);
  if (idx >= 0) {
    list[idx] = p;
  } else {
    list.push(p);
    if (list.length > 2) list.shift(); // FIFO drop oldest if > 2
  }
  await setActivePrograms(list);
}

export async function removeActiveProgram(programId: string): Promise<void> {
  const list = await getActivePrograms();
  await setActivePrograms(list.filter((x) => x.programId !== programId));
}

/** Legacy single-active helpers kept for callers that only care about the "primary" active program. */
export async function getActiveProgram(): Promise<ActiveProgram | null> {
  const list = await getActivePrograms();
  return list[0] ?? null;
}

export async function setActiveProgram(p: ActiveProgram | null): Promise<void> {
  if (!p) {
    await setActivePrograms([]);
  } else {
    await setActivePrograms([p]);
  }
}

export async function markProgramSessionCompleted(
  programId: string,
  dayIndex: number,
  sessionIndex: number,
): Promise<void> {
  const list = await getActivePrograms();
  const idx = list.findIndex((x) => x.programId === programId);
  if (idx < 0) return;
  const active = list[idx];
  const exists = active.completedSessions.some(
    (s) => s.dayIndex === dayIndex && s.sessionIndex === sessionIndex,
  );
  if (!exists) {
    active.completedSessions.push({ dayIndex, sessionIndex });
    list[idx] = active;
    await setActivePrograms(list);
  }
}

// Legacy alias kept for one existing call site
export async function markProgramDayCompleted(dayIndex: number): Promise<void> {
  const list = await getActivePrograms();
  if (!list[0]) return;
  return markProgramSessionCompleted(list[0].programId, dayIndex, 0);
}

export function currentDayIndex(
  active: ActiveProgram,
  totalDays: number,
): number {
  const start = new Date(active.startedAt);
  start.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const days = Math.floor(
    (today.getTime() - start.getTime()) / (1000 * 60 * 60 * 24),
  );
  return Math.max(1, Math.min(totalDays, days + 1));
}

// ---------- Custom programs storage (workouts + stretch, differentiated by `category`) ----------
export async function getCustomPrograms(): Promise<any[]> {
  const raw = await AsyncStorage.getItem(CUSTOM_PROGRAMS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveCustomProgram(program: any): Promise<void> {
  const list = await getCustomPrograms();
  const idx = list.findIndex((p) => p.id === program.id);
  if (idx >= 0) list[idx] = program;
  else list.unshift(program);
  await AsyncStorage.setItem(CUSTOM_PROGRAMS_KEY, JSON.stringify(list));
}

export async function deleteCustomProgram(id: string): Promise<void> {
  const list = await getCustomPrograms();
  await AsyncStorage.setItem(
    CUSTOM_PROGRAMS_KEY,
    JSON.stringify(list.filter((p) => p.id !== id)),
  );
}

// ---------- Plans ----------
function normalizeExercise(ex: any): Exercise {
  return {
    id: ex.id ?? uid(),
    name: ex.name ?? 'Exercice',
    mode: (ex.mode as ExerciseMode) ?? 'reps',
    sets: typeof ex.sets === 'number' ? ex.sets : parseInt(ex.sets, 10) || 3,
    reps: String(ex.reps ?? '10'),
    weight: ex.weight ?? null,
    rest_seconds:
      typeof ex.rest_seconds === 'number'
        ? ex.rest_seconds
        : parseInt(ex.rest_seconds, 10) || 60,
    duration_seconds:
      ex.duration_seconds != null
        ? typeof ex.duration_seconds === 'number'
          ? ex.duration_seconds
          : parseInt(ex.duration_seconds, 10) || null
        : null,
    notes: ex.notes ?? null,
    photoBase64: ex.photoBase64 ?? null,
    iconKey: ex.iconKey ?? null,
  };
}

export async function getPlans(): Promise<Plan[]> {
  const raw = await AsyncStorage.getItem(PLANS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Plan[];
    return parsed
      .filter((p) => !p.programSource)
      .map((p) => ({
        ...p,
        exercises: (p.exercises ?? []).map(normalizeExercise),
      }));
  } catch {
    return [];
  }
}

export async function getAllPlansIncludingProgram(): Promise<Plan[]> {
  const raw = await AsyncStorage.getItem(PLANS_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as Plan[];
    return parsed.map((p) => ({
      ...p,
      exercises: (p.exercises ?? []).map(normalizeExercise),
    }));
  } catch {
    return [];
  }
}

export async function findOrCreateProgramPlan(
  programId: string,
  dayIndex: number,
  sessionIndex: number,
  build: () => Omit<Plan, 'id'>,
): Promise<Plan> {
  const all = await getAllPlansIncludingProgram();
  const existing = all.find(
    (p) =>
      p.programSource?.programId === programId &&
      p.programSource.dayIndex === dayIndex &&
      (p.programSource.sessionIndex ?? 0) === sessionIndex,
  );
  if (existing) return existing;
  const plan: Plan = { id: uid(), ...build() };
  const raw = await AsyncStorage.getItem(PLANS_KEY);
  const list: Plan[] = raw ? JSON.parse(raw) : [];
  list.unshift(plan);
  await AsyncStorage.setItem(PLANS_KEY, JSON.stringify(list));
  return plan;
}

export async function savePlan(plan: Plan): Promise<void> {
  const plans = await getPlans();
  const idx = plans.findIndex((p) => p.id === plan.id);
  if (idx >= 0) plans[idx] = plan;
  else plans.unshift(plan);
  await AsyncStorage.setItem(PLANS_KEY, JSON.stringify(plans));
}

export async function deletePlan(id: string): Promise<void> {
  const plans = await getPlans();
  await AsyncStorage.setItem(
    PLANS_KEY,
    JSON.stringify(plans.filter((p) => p.id !== id)),
  );
}

export async function getPlan(id: string): Promise<Plan | null> {
  const plans = await getAllPlansIncludingProgram();
  return plans.find((p) => p.id === id) ?? null;
}

// ---------- Sessions ----------
export async function getSessions(): Promise<WorkoutSession[]> {
  const raw = await AsyncStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveSession(session: WorkoutSession): Promise<void> {
  const sessions = await getSessions();
  const idx = sessions.findIndex((s) => s.id === session.id);
  if (idx >= 0) sessions[idx] = session;
  else sessions.unshift(session);
  await AsyncStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
}

export async function deleteSession(id: string): Promise<void> {
  const sessions = await getSessions();
  await AsyncStorage.setItem(
    SESSIONS_KEY,
    JSON.stringify(sessions.filter((s) => s.id !== id)),
  );
}

export async function getSession(id: string): Promise<WorkoutSession | null> {
  const sessions = await getSessions();
  return sessions.find((s) => s.id === id) ?? null;
}

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ---------- Goals ----------
export type GoalCategory =
  | 'weight_pr'
  | 'reps_pr'
  | 'run_distance'
  | 'body_weight'
  | 'body_fat'
  | 'measurement'
  | 'sessions_count'
  | 'streak'
  | 'other';

export const GOAL_CATEGORY_LABEL: Record<GoalCategory, string> = {
  weight_pr: 'Record de poids (kg)',
  reps_pr: 'Record de répétitions',
  run_distance: 'Distance de course (km)',
  body_weight: 'Poids corporel (kg)',
  body_fat: 'Masse grasse (%)',
  measurement: 'Mesure corporelle (cm)',
  sessions_count: 'Nombre de séances',
  streak: 'Streak (jours)',
  other: 'Autre',
};

export const GOAL_CATEGORY_ICON: Record<GoalCategory, any> = {
  weight_pr: 'barbell',
  reps_pr: 'repeat',
  run_distance: 'stopwatch',
  body_weight: 'body',
  body_fat: 'pulse',
  measurement: 'resize',
  sessions_count: 'checkmark-done',
  streak: 'flame',
  other: 'flag',
};

export type Goal = {
  id: string;
  title: string;
  category: GoalCategory;
  startValue: number;
  targetValue: number;
  unit: string;
  createdAt: string;
  achievedAt?: string | null;
  notes?: string | null;
};

const GOALS_KEY = '@ironflow/goals';

export async function getGoals(): Promise<Goal[]> {
  const raw = await AsyncStorage.getItem(GOALS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function saveGoal(goal: Goal): Promise<void> {
  const list = await getGoals();
  const idx = list.findIndex((g) => g.id === goal.id);
  if (idx >= 0) list[idx] = goal;
  else list.unshift(goal);
  await AsyncStorage.setItem(GOALS_KEY, JSON.stringify(list));
}

export async function deleteGoal(id: string): Promise<void> {
  const list = await getGoals();
  await AsyncStorage.setItem(
    GOALS_KEY,
    JSON.stringify(list.filter((g) => g.id !== id)),
  );
}

// ---------- Unlocked Achievements (persistent so we know what has been "seen") ----------
const ACHIEVEMENTS_KEY = '@ironflow/achievementsSeen';

export type SeenAchievement = { id: string; unlockedAt: string };

export async function getSeenAchievements(): Promise<SeenAchievement[]> {
  const raw = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function markAchievementSeen(id: string): Promise<void> {
  const list = await getSeenAchievements();
  if (!list.find((a) => a.id === id)) {
    list.push({ id, unlockedAt: new Date().toISOString() });
    await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(list));
  }
}
