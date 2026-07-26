import { WorkoutSession } from '@/src/utils/gym-storage';

export type AdvancedStats = {
  totalSessions: number;
  totalVolumeKg: number;
  totalCalories: number;
  totalDurationSec: number;
  currentStreakDays: number;
  bestStreakDays: number;
  distinctExercises: number;
  favoriteExercise: string | null;
  forgottenExercise: string | null;
  avgDurationSec: number;
  cardioKmYear: number;
  cardioKmTotal: number;
};

export function computeAdvancedStats(sessions: WorkoutSession[]): AdvancedStats {
  const totalSessions = sessions.length;
  let totalVolumeKg = 0;
  let totalCalories = 0;
  let totalDurationSec = 0;
  const exFreq: Record<string, number> = {};
  const exLastDate: Record<string, Date> = {};

  for (const s of sessions) {
    totalCalories += s.caloriesBurned ?? 0;
    totalDurationSec += s.durationSeconds ?? 0;
    for (const ex of s.exercises) {
      const key = ex.name.toLowerCase().trim();
      exFreq[key] = (exFreq[key] ?? 0) + 1;
      const d = new Date(s.startedAt);
      if (!exLastDate[key] || d > exLastDate[key]) exLastDate[key] = d;
      for (const st of ex.sets) {
        if (!st.completed) continue;
        const w = parseFloat((st.weight ?? '').replace(',', '.')) || 0;
        const r = parseFloat((st.reps ?? '').replace(/[^0-9.]/g, '')) || 0;
        totalVolumeKg += w * r;
      }
    }
  }

  // Streaks
  const days = new Set(
    sessions.map((s) => new Date(s.startedAt).toISOString().slice(0, 10)),
  );
  const sortedDays = Array.from(days).sort();

  // Best streak
  let best = sortedDays.length > 0 ? 1 : 0;
  let cur = sortedDays.length > 0 ? 1 : 0;
  for (let i = 1; i < sortedDays.length; i++) {
    const prev = new Date(sortedDays[i - 1]);
    const now = new Date(sortedDays[i]);
    const diff = Math.round((now.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }

  // Current streak = counting back from today or yesterday
  let currentStreak = 0;
  const todayStr = new Date().toISOString().slice(0, 10);
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  let cursor: Date | null = null;
  if (days.has(todayStr)) cursor = new Date();
  else if (days.has(yesterdayStr)) cursor = new Date(Date.now() - 86400000);
  while (cursor && days.has(cursor.toISOString().slice(0, 10))) {
    currentStreak++;
    cursor = new Date(cursor.getTime() - 86400000);
  }

  // Favorite = most frequent
  const sortedExercises = Object.entries(exFreq).sort((a, b) => b[1] - a[1]);
  const favoriteExercise = sortedExercises[0]?.[0] ?? null;

  // Forgotten = present but last seen > 30 days ago (or the LEAST recent one)
  let forgottenExercise: string | null = null;
  let oldestDate: Date | null = null;
  const now = new Date();
  for (const [k, d] of Object.entries(exLastDate)) {
    const ageDays = (now.getTime() - d.getTime()) / 86400000;
    if (ageDays > 30) {
      if (!oldestDate || d < oldestDate) {
        oldestDate = d;
        forgottenExercise = k;
      }
    }
  }

  // Cardio kms
  let cardioKmYear = 0;
  let cardioKmTotal = 0;
  const yearStart = new Date(new Date().getFullYear(), 0, 1).getTime();
  for (const s of sessions) {
    const km = (s.cardio_metrics?.distance_m ?? 0) / 1000;
    cardioKmTotal += km;
    if (new Date(s.startedAt).getTime() >= yearStart) cardioKmYear += km;
  }

  return {
    totalSessions,
    totalVolumeKg: Math.round(totalVolumeKg),
    totalCalories,
    totalDurationSec,
    currentStreakDays: currentStreak,
    bestStreakDays: best,
    distinctExercises: Object.keys(exFreq).length,
    favoriteExercise,
    forgottenExercise,
    avgDurationSec: totalSessions ? Math.round(totalDurationSec / totalSessions) : 0,
    cardioKmYear,
    cardioKmTotal,
  };
}
