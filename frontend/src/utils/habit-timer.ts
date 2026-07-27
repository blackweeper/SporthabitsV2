import AsyncStorage from '@react-native-async-storage/async-storage';

const ACTIVE_TIMER_KEY = '@ironflow/activeHabitTimer';

export type ActiveHabitTimer = {
  habitId: string;
  habitTitle: string;
  color: string;
  targetSeconds: number;
  status: 'running' | 'paused';
  // Elapsed time is derived, not stored directly, so the timer stays
  // accurate across app backgrounding/reloads instead of drifting with
  // setInterval ticks:
  //   running -> baseMs + (Date.now() - new Date(runStartedAt).getTime())
  //   paused  -> baseMs
  baseMs: number;
  runStartedAt: string | null;
};

export async function getActiveHabitTimer(): Promise<ActiveHabitTimer | null> {
  const raw = await AsyncStorage.getItem(ACTIVE_TIMER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export async function saveActiveHabitTimer(t: ActiveHabitTimer): Promise<void> {
  await AsyncStorage.setItem(ACTIVE_TIMER_KEY, JSON.stringify(t));
}

export async function clearActiveHabitTimer(): Promise<void> {
  await AsyncStorage.removeItem(ACTIVE_TIMER_KEY);
}

export function computeElapsedMs(t: ActiveHabitTimer): number {
  if (t.status === 'paused' || !t.runStartedAt) return t.baseMs;
  return t.baseMs + (Date.now() - new Date(t.runStartedAt).getTime());
}
