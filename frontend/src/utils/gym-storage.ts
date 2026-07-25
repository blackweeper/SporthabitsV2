import AsyncStorage from '@react-native-async-storage/async-storage';

export type ExerciseMode = 'reps' | 'time' | 'amrap' | 'emom';

export type Exercise = {
  id: string;
  name: string;
  mode: ExerciseMode; // 'reps' = classic sets×reps, 'time' = do X seconds per set, 'amrap' = timed round with rounds counter
  sets: number;
  reps: string;
  weight: string | null;
  rest_seconds: number;
  duration_seconds: number | null; // used when mode = 'time' or 'amrap'
  notes: string | null;
};

export type Plan = {
  id: string;
  title: string;
  type: 'musculation' | 'hiit' | 'cardio' | 'mixte';
  createdAt: string;
  exercises: Exercise[];
};

export type SetLog = {
  reps: string; // for reps mode: reps count. For amrap: rounds count. For time: unused.
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
};

// MET values (approximate)
// musculation ~ 5, HIIT ~ 8, cardio ~ 9, mixte ~ 7
const MET_BY_TYPE: Record<Plan['type'], number> = {
  musculation: 5,
  hiit: 8,
  cardio: 9,
  mixte: 7,
};

// Approximate calories burned. Uses default 70 kg mass since we have no auth/profile.
// Formula: kcal = MET × mass_kg × hours
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
};

export async function getProfile(): Promise<UserProfile> {
  const raw = await AsyncStorage.getItem(PROFILE_KEY);
  if (!raw) return { weight_kg: null, height_cm: null, sex: null, age: null };
  try {
    return JSON.parse(raw);
  } catch {
    return { weight_kg: null, height_cm: null, sex: null, age: null };
  }
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  await AsyncStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
}

// ---------- Measurements ----------
export type Measurement = {
  id: string;
  date: string; // ISO
  weight_kg: number | null;
  waist_cm: number | null;
  thigh_cm: number | null;
  chest_cm: number | null;
  photoBase64: string | null; // just the base64 payload, no prefix
  notes: string | null;
};

export async function getMeasurements(): Promise<Measurement[]> {
  const raw = await AsyncStorage.getItem(MEASUREMENTS_KEY);
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw) as Measurement[];
    // sort desc by date
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

// ---------- Personal Records ----------
export type PersonalRecord = {
  id: string;
  exerciseName: string;
  weight_kg: number;
  reps: number;
  date: string;
  notes: string | null;
};

export async function getPRs(): Promise<PersonalRecord[]> {
  const raw = await AsyncStorage.getItem(PRS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
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
  };
}

export async function getPlans(): Promise<Plan[]> {
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
  const plans = await getPlans();
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
