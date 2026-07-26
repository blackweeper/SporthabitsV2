import {
  Habit,
  HabitLog,
  habitProgress,
  todayYYYYMMDD,
  WorkoutSession,
} from '@/src/utils/gym-storage';
import { computeAdvancedStats } from '@/src/utils/stats';

export type DailyChecklistItem = {
  id: string;
  label: string;
  icon: any;
  weight: number; // 0..1
  achieved: number; // 0..1
  color: string;
};

export type DailyScore = {
  score: number; // 0..100
  items: DailyChecklistItem[];
  workoutDone: boolean;
};

/**
 * Compute today's score:
 *   Workout (30%) + each active habit distributed on 70% by frequency
 * If user has no habits, workout accounts for 100%.
 */
export function computeDailyScore(
  sessions: WorkoutSession[],
  habits: Habit[],
  habitLogs: HabitLog[],
): DailyScore {
  const today = todayYYYYMMDD();
  const sessionsToday = sessions.filter(
    (s) => new Date(s.startedAt).toISOString().slice(0, 10) === today,
  );
  const workoutAchieved = sessionsToday.length > 0 ? 1 : 0;

  const scored: DailyChecklistItem[] = [
    {
      id: 'workout',
      label: 'Séance',
      icon: 'barbell',
      weight: 0.3,
      achieved: workoutAchieved,
      color: '#FF5722',
    },
  ];

  const scoredHabits = habits.filter((h) => h.includedInScore !== false);
  const perHabitWeight = scoredHabits.length
    ? 0.7 / scoredHabits.length
    : 0;

  for (const h of scoredHabits) {
    const val = habitLogs.find((l) => l.habitId === h.id && l.date === today)?.value ?? 0;
    scored.push({
      id: h.id,
      label: h.title,
      icon: iconForHabit(h),
      weight: perHabitWeight,
      achieved: habitProgress(h, val),
      color: h.color ?? '#4CAF50',
    });
  }

  // If no habits, workout counts for 100%.
  if (scoredHabits.length === 0) scored[0].weight = 1;

  const total = scored.reduce((a, i) => a + i.weight * i.achieved, 0);
  return {
    score: Math.round(total * 100),
    items: scored,
    workoutDone: workoutAchieved === 1,
  };
}

function iconForHabit(h: Habit): any {
  // Reuse HABIT_KIND_ICON from types, but keep it simple:
  switch (h.kind) {
    case 'water': return 'water';
    case 'steps': return 'footsteps';
    case 'nutrition': return 'nutrition';
    case 'mobility': return 'body';
    case 'sleep': return 'moon';
    case 'meditation': return 'leaf';
    case 'reading': return 'book';
    default: return 'star';
  }
}

/**
 * IRONFLOW Score /100 based on training / regularity / performance progress / habits / physical evolution.
 * Weighted combination:
 *   - Regularity 30% (streak & sessions/week)
 *   - Volume progression 20% (last 30d vs prior 30d)
 *   - Habits average 20% (average completion in last 30 days across all active habits)
 *   - Diversity of exercises 10%
 *   - Number of PRs 10%
 *   - Recent activity 10%
 */
export type IronflowScore = {
  score: number;
  breakdown: { label: string; value: number; max: number }[];
};

export function computeIronflowScore(
  sessions: WorkoutSession[],
  habits: Habit[],
  habitLogs: HabitLog[],
  prsCount: number,
): IronflowScore {
  const stats = computeAdvancedStats(sessions);

  // Regularity: 5+ sessions/week ideal → cap at 5
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const sessionsThisWeek = sessions.filter(
    (s) => new Date(s.startedAt) >= weekAgo,
  ).length;
  const regularityScore =
    Math.min(1, sessionsThisWeek / 4) * 20 +
    Math.min(1, stats.bestStreakDays / 14) * 10;

  // Volume progression: last 30d vs previous 30d
  const now30 = new Date(now.getTime() - 30 * 86400000);
  const prev60 = new Date(now.getTime() - 60 * 86400000);
  const vol30 = volumeInRange(sessions, now30, now);
  const volPrev = volumeInRange(sessions, prev60, now30);
  let progScore = 0;
  if (volPrev > 0) {
    const growth = (vol30 - volPrev) / volPrev;
    progScore = Math.min(1, Math.max(0, growth)) * 20;
  } else if (vol30 > 0) {
    progScore = 20;
  }

  // Habits: average completion last 30d
  let habitsScore = 0;
  if (habits.length > 0) {
    let totalPct = 0;
    let count = 0;
    for (const h of habits) {
      const logs30 = habitLogs.filter(
        (l) => l.habitId === h.id && new Date(l.date) >= now30,
      );
      const avg = logs30.reduce((a, l) => a + habitProgress(h, l.value), 0) / 30;
      totalPct += avg;
      count++;
    }
    habitsScore = (totalPct / Math.max(1, count)) * 20;
  }

  // Diversity: cap 15 exercises
  const diversityScore = Math.min(1, stats.distinctExercises / 15) * 10;

  // PRs: cap 15
  const prScore = Math.min(1, prsCount / 15) * 10;

  // Recent activity: session in last 3 days = 10, else scaled down
  const last3 = new Date(now.getTime() - 3 * 86400000);
  const hasRecent = sessions.some((s) => new Date(s.startedAt) >= last3);
  const recentScore = hasRecent ? 10 : 0;

  const score = Math.round(
    regularityScore + progScore + habitsScore + diversityScore + prScore + recentScore,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: [
      { label: 'Régularité', value: Math.round(regularityScore), max: 30 },
      { label: 'Progression', value: Math.round(progScore), max: 20 },
      { label: 'Habitudes', value: Math.round(habitsScore), max: 20 },
      { label: 'Diversité', value: Math.round(diversityScore), max: 10 },
      { label: 'Records', value: Math.round(prScore), max: 10 },
      { label: 'Activité récente', value: Math.round(recentScore), max: 10 },
    ],
  };
}

function volumeInRange(sessions: WorkoutSession[], from: Date, to: Date): number {
  let sum = 0;
  for (const s of sessions) {
    const d = new Date(s.startedAt);
    if (d < from || d >= to) continue;
    for (const ex of s.exercises) {
      for (const st of ex.sets) {
        if (!st.completed) continue;
        const w = parseFloat((st.weight ?? '').replace(',', '.')) || 0;
        const r = parseFloat((st.reps ?? '').replace(/[^0-9.]/g, '')) || 0;
        sum += w * r;
      }
    }
  }
  return sum;
}
