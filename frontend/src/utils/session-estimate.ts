import { ExerciseTemplate } from '@/src/data/programs';
import { Exercise } from '@/src/utils/gym-storage';

/**
 * Realistic estimate of how long a session should take.
 * Heuristics per exercise mode:
 *  - reps:  sets * (2s * repsAvg or 20s default) + (sets - 1) * rest_seconds
 *  - time:  sets * duration_seconds + (sets - 1) * rest_seconds
 *  - amrap: duration_seconds
 *  - emom:  sets * 60s (rounds × 1 min)
 * + 20s transition between exercises.
 */
export function estimateSessionDurationSeconds(
  exercises: (ExerciseTemplate | Exercise)[],
): number {
  if (!exercises || exercises.length === 0) return 0;
  let total = 0;
  for (const ex of exercises) {
    total += singleExerciseSeconds(ex);
  }
  // Transition between exercises
  total += Math.max(0, exercises.length - 1) * 20;
  return Math.round(total);
}

function singleExerciseSeconds(ex: ExerciseTemplate | Exercise): number {
  const sets = Math.max(1, ex.sets || 1);
  const rest = Math.max(0, ex.rest_seconds || 0);

  switch (ex.mode) {
    case 'reps': {
      // Estimate reps mid value
      const repsAvg = parseRepsAverage(ex.reps) || 10;
      const perSet = Math.max(15, Math.min(90, repsAvg * 2.5));
      return sets * perSet + Math.max(0, sets - 1) * rest;
    }
    case 'time': {
      const d = ex.duration_seconds || 30;
      return sets * d + Math.max(0, sets - 1) * rest;
    }
    case 'amrap':
      return ex.duration_seconds || 600;
    case 'emom':
      // Rounds × 1 minute
      return sets * 60;
    default:
      return 30 * sets + rest * (sets - 1);
  }
}

function parseRepsAverage(reps: string | number | null | undefined): number {
  if (reps == null) return 0;
  const s = String(reps);
  // "10-12" -> 11 ; "10" -> 10 ; "10 par jambe" -> 20 ; "30s" -> 30/2.5 ~ 12
  const range = s.match(/(\d+)\s*[-–]\s*(\d+)/);
  if (range) {
    return (parseInt(range[1], 10) + parseInt(range[2], 10)) / 2;
  }
  const num = parseFloat(s.replace(/[^0-9.]/g, '')) || 0;
  const perLeg = /par\s*jambe|par\s*côté|per\s*side/i.test(s);
  return perLeg ? num * 2 : num;
}

/**
 * Format seconds -> "≈ 50 min" / "≈ 1h05" / "≈ 45 s"
 */
export function formatEstimatedDuration(sec: number): string {
  if (!sec || sec <= 0) return '—';
  if (sec < 60) return `≈ ${sec} s`;
  const totalMin = Math.round(sec / 60);
  if (totalMin < 60) return `≈ ${totalMin} min`;
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return m === 0 ? `≈ ${h}h` : `≈ ${h}h${String(m).padStart(2, '0')}`;
}

/**
 * Compute the date at which a given day index of an active program is planned.
 * "day 1" starts on `startedAt`, "day 2" is +1 calendar day, etc.
 */
export function plannedDateForDayIndex(
  startedAtISO: string,
  dayIndex: number,
): Date {
  const start = new Date(startedAtISO);
  start.setHours(0, 0, 0, 0);
  const d = new Date(start);
  d.setDate(d.getDate() + (dayIndex - 1));
  return d;
}

export function formatPlannedDate(d: Date): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(d);
  target.setHours(0, 0, 0, 0);
  const diffDays = Math.round(
    (target.getTime() - today.getTime()) / 86400000,
  );
  if (diffDays === 0) return "Aujourd'hui";
  if (diffDays === 1) return 'Demain';
  if (diffDays === -1) return 'Hier';
  if (diffDays > 1 && diffDays < 7) {
    return d.toLocaleDateString('fr-FR', { weekday: 'long' });
  }
  return d.toLocaleDateString('fr-FR', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}
