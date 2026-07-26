import AsyncStorage from '@react-native-async-storage/async-storage';
import { Habit, HabitLog, WorkoutSession, habitProgress, PersonalRecord } from '@/src/utils/gym-storage';

/**
 * XP formula: level N requires cumulative XP = 100 * N * (N + 1) / 2
 *   L1 → 100, L2 → 300, L3 → 600, L4 → 1000, L5 → 1500, …
 * XP is derived deterministically from the user's data (no persistent
 * counter to keep in sync). Every time the dashboard renders we recompute.
 *
 * Sources (all cumulative):
 *   +50 xp per completed workout session
 *   +10 xp per completed habit-day
 *   +100 xp per personal record recorded
 *   +5 xp per daily objective (workout/wellness/habits) hit on a given day
 *
 * Badges are unlocked every 5 levels (level 5, 10, 15, 20, 25).
 */

const XP_UNLOCKED_KEY = '@ironflow/xpUnlockedLevels';

export type BadgeDef = {
  level: number;
  title: string;
  emoji: string;
  color: string;
};

export const BADGES: BadgeDef[] = [
  { level: 5, title: 'Débutant motivé', emoji: '🔥', color: '#FF6B00' },
  { level: 10, title: 'Régulier', emoji: '💪', color: '#F97316' },
  { level: 15, title: 'Confirmé', emoji: '🥉', color: '#CD7F32' },
  { level: 20, title: 'Avancé', emoji: '🥈', color: '#C0C0C0' },
  { level: 25, title: 'Expert', emoji: '🥇', color: '#FFD700' },
  { level: 30, title: 'Athlète', emoji: '🏆', color: '#FF5722' },
  { level: 40, title: 'Machine', emoji: '⚡', color: '#00E676' },
  { level: 50, title: 'Légende', emoji: '👑', color: '#8B5CF6' },
];

/** Total XP required to reach `level` (from L0). */
export function xpForLevel(level: number): number {
  if (level <= 0) return 0;
  return 100 * (level * (level + 1)) / 2;
}

/** Compute the level reached by given cumulative XP. */
export function levelFromXP(xp: number): number {
  let n = 0;
  while (xp >= xpForLevel(n + 1)) n++;
  return n;
}

export type XPState = {
  xp: number;
  level: number;
  xpIntoLevel: number;
  xpToNext: number;
  progress: number; // 0..1
  unlockedBadges: BadgeDef[];
  nextBadge: BadgeDef | null;
};

export function computeXPState(input: {
  sessions: WorkoutSession[];
  habits: Habit[];
  habitLogs: HabitLog[];
  prs: PersonalRecord[];
}): XPState {
  let xp = 0;
  xp += input.sessions.length * 50;
  xp += input.prs.length * 100;

  // Habit completions across all history (approx: iterate logs)
  for (const log of input.habitLogs) {
    const habit = input.habits.find((h) => h.id === log.habitId);
    if (!habit) continue;
    const pct = habitProgress(habit, log.value);
    if (pct >= 1) xp += 10;
  }

  // Also: reward each active day (min 1 session that day)
  const daysWithSessions = new Set(
    input.sessions.map((s) =>
      new Date(s.startedAt).toISOString().slice(0, 10),
    ),
  );
  xp += daysWithSessions.size * 5;

  const level = levelFromXP(xp);
  const currentThreshold = xpForLevel(level);
  const nextThreshold = xpForLevel(level + 1);
  const xpIntoLevel = xp - currentThreshold;
  const xpToNext = nextThreshold - xp;
  const progress = nextThreshold > currentThreshold
    ? xpIntoLevel / (nextThreshold - currentThreshold)
    : 0;

  const unlocked = BADGES.filter((b) => level >= b.level);
  const next = BADGES.find((b) => level < b.level) ?? null;

  return {
    xp,
    level,
    xpIntoLevel,
    xpToNext,
    progress,
    unlockedBadges: unlocked,
    nextBadge: next,
  };
}

/**
 * Compare the freshly computed unlocked levels against the persisted set
 * and return the levels that were unlocked *just now*, so the UI can
 * celebrate them.
 */
export async function checkNewBadgeUnlocks(
  currentLevel: number,
): Promise<BadgeDef[]> {
  const raw = await AsyncStorage.getItem(XP_UNLOCKED_KEY);
  const already: number[] = raw ? JSON.parse(raw) : [];
  const newlyUnlocked = BADGES.filter(
    (b) => currentLevel >= b.level && !already.includes(b.level),
  );
  if (newlyUnlocked.length > 0) {
    await AsyncStorage.setItem(
      XP_UNLOCKED_KEY,
      JSON.stringify([...already, ...newlyUnlocked.map((b) => b.level)]),
    );
  }
  return newlyUnlocked;
}
