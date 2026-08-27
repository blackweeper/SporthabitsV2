import { WorkoutSession } from "@/src/utils/gym-storage";

/**
 * Agrégats journaliers pour le widget à 4 anneaux du Dashboard et l'écran
 * `/day-detail`. Délibérément séparé de `computeAdvancedStats` (`stats.ts`,
 * agrégats all-time/streaks déjà testés ailleurs) — ces fonctions ne
 * calculent que des sommes bornées à une date ou une fenêtre de 7 jours.
 */

/** 7 dates YYYY-MM-DD, la plus ancienne en premier, se terminant à `dateStr` inclus.
 * Même convention UTC que `todayYYYYMMDD()` (gym-storage.ts) — pas de fuseau local. */
export function last7DatesEndingAt(dateStr: string): string[] {
  const end = new Date(`${dateStr}T00:00:00.000Z`).getTime();
  const dates: string[] = [];
  for (let i = 6; i >= 0; i--) {
    dates.push(new Date(end - i * 86400000).toISOString().slice(0, 10));
  }
  return dates;
}

function sessionDateStr(s: WorkoutSession): string {
  return s.startedAt.slice(0, 10);
}

export function sumCaloriesBurnedForDate(sessions: WorkoutSession[], dateStr: string): number {
  return sessions
    .filter((s) => sessionDateStr(s) === dateStr)
    .reduce((sum, s) => sum + (s.caloriesBurned || 0), 0);
}

export function sumTrainingMinutesForDate(sessions: WorkoutSession[], dateStr: string): number {
  const seconds = sessions
    .filter((s) => sessionDateStr(s) === dateStr)
    .reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  return Math.round(seconds / 60);
}

export type WeekTrainingSummary = { count: number; totalMinutes: number };

/** Séances des 7 jours se terminant à `referenceDate` inclus. */
export function trainingsThisWeekSummary(
  sessions: WorkoutSession[],
  referenceDate: string,
): WeekTrainingSummary {
  const dates = new Set(last7DatesEndingAt(referenceDate));
  const inWeek = sessions.filter((s) => dates.has(sessionDateStr(s)));
  const totalSeconds = inWeek.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  return { count: inWeek.length, totalMinutes: Math.round(totalSeconds / 60) };
}
