import AsyncStorage from '@react-native-async-storage/async-storage';

export type Exercise = {
  id: string;
  name: string;
  sets: number;
  reps: string;
  weight: string | null;
  rest_seconds: number;
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
  reps: string;
  weight: string;
  completed: boolean;
};

export type SessionExerciseLog = {
  exerciseId: string;
  name: string;
  targetSets: number;
  targetReps: string;
  targetWeight: string | null;
  targetRestSeconds: number;
  sets: SetLog[];
};

export type WorkoutSession = {
  id: string;
  planId: string;
  planTitle: string;
  startedAt: string;
  endedAt: string | null;
  durationSeconds: number;
  totalRestSeconds: number;
  exercises: SessionExerciseLog[];
};

const PLANS_KEY = '@ironflow/plans';
const SESSIONS_KEY = '@ironflow/sessions';

// ---------- Plans ----------
export async function getPlans(): Promise<Plan[]> {
  const raw = await AsyncStorage.getItem(PLANS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
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

export function uid(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
