import {
  PersonalRecord,
  SessionExerciseLog,
  WorkoutSession,
} from '@/src/utils/gym-storage';

export type ExerciseDetail = {
  name: string;
  totalOccurrences: number;
  totalVolumeKg: number;
  lastSession: {
    date: string;
    reps: string;
    weight: string;
    setsDone: number;
  } | null;
  historyPoints: { date: string; volume: number }[]; // per date sum of volume
  bestByReps: { reps: number; weight: number }[]; // e.g. best load @ 1/3/5/10 reps
  linkedPRs: PersonalRecord[];
};

/** Aggregates data across all sessions matching this exercise name (case-insensitive). */
export function computeExerciseDetail(
  name: string,
  sessions: WorkoutSession[],
  prs: PersonalRecord[],
): ExerciseDetail {
  const key = name.toLowerCase().trim();
  let occurrences = 0;
  let totalVolume = 0;
  let last: ExerciseDetail['lastSession'] = null;
  let lastDate: Date | null = null;
  const points: Record<string, number> = {};
  const bestPerReps: Record<number, number> = {};

  for (const s of sessions) {
    for (const ex of s.exercises) {
      if (ex.name.toLowerCase().trim() !== key) continue;
      occurrences++;
      const dateKey = new Date(s.startedAt).toISOString().slice(0, 10);
      let vol = 0;
      let setsDone = 0;
      let lastReps = '';
      let lastWeight = '';
      for (const st of ex.sets) {
        if (!st.completed) continue;
        setsDone++;
        const w = parseFloat((st.weight ?? '').replace(',', '.')) || 0;
        const r = parseFloat((st.reps ?? '').replace(/[^0-9.]/g, '')) || 0;
        vol += w * r;
        // Best weight for this rep count
        if (r > 0 && w > 0) {
          const rInt = Math.round(r);
          if (!bestPerReps[rInt] || w > bestPerReps[rInt]) bestPerReps[rInt] = w;
        }
        lastReps = st.reps;
        lastWeight = st.weight;
      }
      totalVolume += vol;
      points[dateKey] = (points[dateKey] ?? 0) + vol;
      const d = new Date(s.startedAt);
      if (!lastDate || d > lastDate) {
        lastDate = d;
        last = {
          date: s.startedAt,
          reps: lastReps,
          weight: lastWeight,
          setsDone,
        };
      }
    }
  }

  const historyPoints = Object.entries(points)
    .sort()
    .map(([date, volume]) => ({ date, volume }));

  const bestByReps = Object.entries(bestPerReps)
    .map(([r, w]) => ({ reps: Number(r), weight: w }))
    .sort((a, b) => a.reps - b.reps);

  const linkedPRs = prs.filter(
    (p) => p.exerciseName.toLowerCase().trim() === key,
  );

  return {
    name,
    totalOccurrences: occurrences,
    totalVolumeKg: Math.round(totalVolume),
    lastSession: last,
    historyPoints,
    bestByReps,
    linkedPRs,
  };
}

/** List all unique exercise names across sessions (sorted by frequency desc). */
export function listAllExercises(
  sessions: WorkoutSession[],
): { name: string; count: number }[] {
  const map: Record<string, { name: string; count: number }> = {};
  for (const s of sessions) {
    for (const ex of s.exercises) {
      const key = ex.name.toLowerCase().trim();
      if (!map[key]) map[key] = { name: ex.name, count: 0 };
      map[key].count++;
    }
  }
  return Object.values(map).sort((a, b) => b.count - a.count);
}
