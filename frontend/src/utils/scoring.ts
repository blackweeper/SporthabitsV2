import {
  DEFAULT_CALORIES_TARGET_KCAL,
  DEFAULT_STEPS_TARGET,
  DEFAULT_WATER_TARGET_ML,
  Habit,
  HabitLog,
  habitProgress,
  todayYYYYMMDD,
  UserProfile,
  WellnessLog,
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
 * Compute today's score (widget on the dashboard).
 *   Workout (30%) + Water/Calories/Steps combined (30%) + Habits (40%).
 * If wellness data is not provided, weight is redistributed.
 */
export function computeDailyScore(
  sessions: WorkoutSession[],
  habits: Habit[],
  habitLogs: HabitLog[],
  wellness?: {
    log: import('@/src/utils/gym-storage').WellnessLog | null;
    waterTarget: number;
    caloriesTarget: number;
    stepsTarget: number;
  },
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
      weight: 0, // set later
      achieved: workoutAchieved,
      color: '#FF5722',
    },
  ];

  // Wellness items — only if a target > 0 provided and data known
  if (wellness) {
    const { log, waterTarget, caloriesTarget, stepsTarget } = wellness;
    if (waterTarget > 0) {
      scored.push({
        id: 'water',
        label: 'Eau',
        icon: 'water',
        weight: 0,
        achieved: Math.min(1, (log?.water_ml ?? 0) / waterTarget),
        color: '#3B82F6',
      });
    }
    if (caloriesTarget > 0) {
      const cur = log?.calories_kcal ?? 0;
      // Full credit when within 80–120% of goal, gradient otherwise.
      let achv = 0;
      if (cur > 0) {
        const ratio = cur / caloriesTarget;
        if (ratio >= 0.8 && ratio <= 1.2) achv = 1;
        else if (ratio < 0.8) achv = ratio / 0.8;
        else achv = Math.max(0, 1 - (ratio - 1.2) / 0.8);
      }
      scored.push({
        id: 'calories',
        label: 'Calories',
        icon: 'nutrition',
        weight: 0,
        achieved: achv,
        color: '#F97316',
      });
    }
    if (stepsTarget > 0) {
      scored.push({
        id: 'steps',
        label: 'Pas',
        icon: 'footsteps',
        weight: 0,
        achieved: Math.min(1, (log?.steps ?? 0) / stepsTarget),
        color: '#10B981',
      });
    }
  }

  const scoredHabits = habits.filter((h) => h.includedInScore !== false);
  for (const h of scoredHabits) {
    const val = habitLogs.find((l) => l.habitId === h.id && l.date === today)?.value ?? 0;
    scored.push({
      id: h.id,
      label: h.title,
      icon: iconForHabit(h),
      weight: 0,
      achieved: habitProgress(h, val),
      color: h.color ?? '#4CAF50',
    });
  }

  // Distribute weights: workout 30%, wellness bucket 30%, habits 40%.
  const wellnessCount = scored.filter(
    (i) => i.id === 'water' || i.id === 'calories' || i.id === 'steps',
  ).length;
  const habitCount = scoredHabits.length;
  let wWorkout = 0.3;
  let wWellness = 0.3;
  let wHabits = 0.4;
  if (wellnessCount === 0 && habitCount === 0) wWorkout = 1;
  else if (wellnessCount === 0) {
    wWorkout = 0.4;
    wWellness = 0;
    wHabits = 0.6;
  } else if (habitCount === 0) {
    wWorkout = 0.4;
    wWellness = 0.6;
    wHabits = 0;
  }

  for (const it of scored) {
    if (it.id === 'workout') it.weight = wWorkout;
    else if (it.id === 'water' || it.id === 'calories' || it.id === 'steps') {
      it.weight = wellnessCount ? wWellness / wellnessCount : 0;
    } else {
      it.weight = habitCount ? wHabits / habitCount : 0;
    }
  }

  const total = scored.reduce((a, i) => a + i.weight * i.achieved, 0);
  return {
    score: Math.round(total * 100),
    items: scored,
    workoutDone: workoutAchieved === 1,
  };
}

function iconForHabit(h: Habit): any {
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
 * IRONFLOW Score /100 rebuilt around lifestyle & training pillars.
 * Weighted combination (total = 100):
 *   - Régularité 20%          → sessions / week + best streak
 *   - Sommeil 15%             → avg last 7 days vs 7-9h target
 *   - Nutrition 15%           → % of last 7 days where calories logged within ±20% of goal
 *   - Eau 15%                 → avg water_ml achieved vs goal (last 7 days)
 *   - Pas journaliers 15%     → avg steps achieved vs goal (last 7 days)
 *   - Habitudes 20%           → avg habit completion (last 30 days)
 */
export type IronflowScore = {
  score: number;
  breakdown: { key: string; label: string; icon: any; value: number; max: number; hint?: string }[];
};

export function computeIronflowScore(
  sessions: WorkoutSession[],
  habits: Habit[],
  habitLogs: HabitLog[],
  wellnessLogs: WellnessLog[],
  profile: UserProfile,
): IronflowScore {
  const stats = computeAdvancedStats(sessions);
  const now = new Date();

  // ─── Régularité (20) ─────────────────────────────────────────
  const weekAgo = new Date(now.getTime() - 7 * 86400000);
  const sessionsThisWeek = sessions.filter(
    (s) => new Date(s.startedAt) >= weekAgo,
  ).length;
  const regularityScore =
    Math.min(1, sessionsThisWeek / 4) * 13 +
    Math.min(1, stats.bestStreakDays / 14) * 7;

  // Wellness helpers (last 7 days including today)
  const last7Keys: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * 86400000);
    last7Keys.push(d.toISOString().slice(0, 10));
  }
  const logs7 = wellnessLogs.filter((l) => last7Keys.includes(l.date));

  // ─── Sommeil (15) ─────────────────────────────────────────────
  const sleepValues = logs7
    .map((l) => l.sleep_hours ?? null)
    .filter((v): v is number => v != null && v > 0);
  const avgSleep = sleepValues.length
    ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length
    : 0;
  // Sleep quality: peak 7.5–9h → 1, drops linearly outside.
  const sleepQuality = sleepQualityCurve(avgSleep);
  const sleepScore = sleepQuality * 15;

  // ─── Nutrition (15) ───────────────────────────────────────────
  const calTarget = profile.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL;
  const calValues = logs7
    .map((l) => l.calories_kcal ?? null)
    .filter((v): v is number => v != null && v > 0);
  const inRange = calValues.filter(
    (v) => v >= calTarget * 0.8 && v <= calTarget * 1.2,
  ).length;
  const nutritionRatio = calValues.length ? inRange / 7 : 0;
  const nutritionScore = nutritionRatio * 15;

  // ─── Eau (15) ─────────────────────────────────────────────────
  const waterTarget = profile.water_target_ml || DEFAULT_WATER_TARGET_ML;
  const waterAchieved = last7Keys.map((k) => {
    const l = logs7.find((x) => x.date === k);
    return Math.min(1, (l?.water_ml ?? 0) / waterTarget);
  });
  const waterAvg = waterAchieved.reduce((a, b) => a + b, 0) / 7;
  const waterScore = waterAvg * 15;

  // ─── Pas journaliers (15) ─────────────────────────────────────
  const stepsTarget = profile.steps_target || DEFAULT_STEPS_TARGET;
  const stepsAchieved = last7Keys.map((k) => {
    const l = logs7.find((x) => x.date === k);
    return Math.min(1, (l?.steps ?? 0) / stepsTarget);
  });
  const stepsAvg = stepsAchieved.reduce((a, b) => a + b, 0) / 7;
  const stepsScore = stepsAvg * 15;

  // ─── Habitudes (20) ───────────────────────────────────────────
  let habitsScore = 0;
  const now30 = new Date(now.getTime() - 30 * 86400000);
  if (habits.length > 0) {
    let totalPct = 0;
    for (const h of habits) {
      const logs30 = habitLogs.filter(
        (l) => l.habitId === h.id && new Date(l.date) >= now30,
      );
      const avg =
        logs30.reduce((a, l) => a + habitProgress(h, l.value), 0) / 30;
      totalPct += avg;
    }
    habitsScore = (totalPct / habits.length) * 20;
  }

  const score = Math.round(
    regularityScore +
      sleepScore +
      nutritionScore +
      waterScore +
      stepsScore +
      habitsScore,
  );

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown: [
      {
        key: 'regularity',
        label: 'Régularité',
        icon: 'flame',
        value: Math.round(regularityScore),
        max: 20,
      },
      {
        key: 'sleep',
        label: 'Sommeil',
        icon: 'moon',
        value: Math.round(sleepScore),
        max: 15,
        hint: sleepValues.length ? formatHoursHint(avgSleep) : 'Aucune saisie',
      },
      {
        key: 'nutrition',
        label: 'Nutrition',
        icon: 'nutrition',
        value: Math.round(nutritionScore),
        max: 15,
        hint: calValues.length
          ? `${inRange}/7 jours dans la cible`
          : 'Aucune saisie',
      },
      {
        key: 'water',
        label: 'Eau',
        icon: 'water',
        value: Math.round(waterScore),
        max: 15,
        hint: `${Math.round(waterAvg * 100)}% de la cible`,
      },
      {
        key: 'steps',
        label: 'Pas journaliers',
        icon: 'footsteps',
        value: Math.round(stepsScore),
        max: 15,
        hint: `${Math.round(stepsAvg * 100)}% de la cible`,
      },
      {
        key: 'habits',
        label: 'Habitudes',
        icon: 'checkbox',
        value: Math.round(habitsScore),
        max: 20,
      },
    ],
  };
}

function sleepQualityCurve(hours: number): number {
  if (hours <= 0) return 0;
  if (hours < 5) return hours / 5 * 0.5;         // <5h: max 0.5
  if (hours < 7) return 0.5 + (hours - 5) / 2 * 0.5; // 5-7 → 0.5..1
  if (hours <= 9) return 1;                       // 7-9 = ideal
  if (hours <= 11) return 1 - (hours - 9) / 2 * 0.4; // 9-11 → 1..0.6
  return 0.3;                                     // >11h
}

function formatHoursHint(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h${String(mm).padStart(2, '0')} / nuit`;
}
