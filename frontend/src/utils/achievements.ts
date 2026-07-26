import {
  Measurement,
  PersonalRecord,
  WorkoutSession,
} from '@/src/utils/gym-storage';

export type Achievement = {
  id: string;
  title: string;
  description: string;
  emoji: string;
  category: 'debut' | 'volume' | 'cardio' | 'streak' | 'discipline' | 'record' | 'special';
  target: number;
  progress: number; // current value toward target
  unlocked: boolean;
  progressLabel?: string;
};

type Ctx = {
  sessions: WorkoutSession[];
  prs: PersonalRecord[];
  measurements: Measurement[];
};

function totalVolumeKg(sessions: WorkoutSession[]): number {
  let sum = 0;
  for (const s of sessions) {
    for (const ex of s.exercises) {
      for (const st of ex.sets) {
        if (!st.completed) continue;
        const w = parseFloat(st.weight?.replace(',', '.') || '0') || 0;
        const r = parseFloat(st.reps?.replace(/[^0-9.]/g, '') || '0') || 0;
        sum += w * r;
      }
    }
  }
  return sum;
}

function totalCardioKm(sessions: WorkoutSession[]): number {
  let m = 0;
  for (const s of sessions) {
    if (s.cardio_metrics?.distance_m) m += s.cardio_metrics.distance_m;
  }
  return m / 1000;
}

function totalCalories(sessions: WorkoutSession[]): number {
  return sessions.reduce((a, s) => a + (s.caloriesBurned ?? 0), 0);
}

function longestStreakDays(sessions: WorkoutSession[]): number {
  if (sessions.length === 0) return 0;
  const days = new Set(
    sessions.map((s) => new Date(s.startedAt).toISOString().slice(0, 10)),
  );
  const sorted = Array.from(days).sort();
  let best = 1;
  let cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const prev = new Date(sorted[i - 1]);
    const now = new Date(sorted[i]);
    const diff = Math.round((now.getTime() - prev.getTime()) / 86400000);
    if (diff === 1) {
      cur++;
      if (cur > best) best = cur;
    } else {
      cur = 1;
    }
  }
  return best;
}

function distinctExercises(sessions: WorkoutSession[]): number {
  const names = new Set<string>();
  for (const s of sessions) {
    for (const ex of s.exercises) names.add(ex.name.toLowerCase().trim());
  }
  return names.size;
}

function hasSessionBefore(sessions: WorkoutSession[], hour: number): boolean {
  return sessions.some((s) => new Date(s.startedAt).getHours() < hour);
}

function hasSessionAfter(sessions: WorkoutSession[], hour: number): boolean {
  return sessions.some((s) => new Date(s.startedAt).getHours() >= hour);
}

function hasWeekendSessions(sessions: WorkoutSession[], count: number): boolean {
  let n = 0;
  for (const s of sessions) {
    const day = new Date(s.startedAt).getDay();
    if (day === 0 || day === 6) n++;
  }
  return n >= count;
}

/** Returns the full list of achievements, computing progress against user data. */
export function computeAchievements(ctx: Ctx): Achievement[] {
  const { sessions, prs, measurements } = ctx;
  const sessionsCount = sessions.length;
  const volume = totalVolumeKg(sessions);
  const cardioKm = totalCardioKm(sessions);
  const calories = totalCalories(sessions);
  const streak = longestStreakDays(sessions);
  const distinct = distinctExercises(sessions);

  const list: Achievement[] = [
    // Début
    make('first-session', 'Première séance', 'Fait ta première séance', '🎬', 'debut', 1, sessionsCount),
    make('sessions-5', '5 séances', 'Cinq séances au compteur', '🥉', 'debut', 5, sessionsCount),
    make('sessions-25', '25 séances', 'Vingt-cinq séances', '🥈', 'debut', 25, sessionsCount),
    make('sessions-100', '100 séances', 'Le club des cent', '🥇', 'debut', 100, sessionsCount),
    make('sessions-500', '500 séances', 'Athlète confirmé', '🏆', 'debut', 500, sessionsCount),

    // Volume
    make('volume-1t', '1 tonne soulevée', '1 000 kg cumulés', '⚡', 'volume', 1000, volume, `${Math.round(volume)} kg`),
    make('volume-10t', '10 tonnes', '10 000 kg cumulés', '💥', 'volume', 10000, volume, `${Math.round(volume)} kg`),
    make('volume-50t', '50 tonnes', '50 000 kg cumulés', '🔨', 'volume', 50000, volume, `${Math.round(volume)} kg`),
    make('volume-100t', '100 tonnes', 'Camion à toi seul', '🚚', 'volume', 100000, volume, `${Math.round(volume)} kg`),

    // Cardio
    make('cardio-10km', '10 km courus', 'Dix kilomètres au total', '🏃', 'cardio', 10, cardioKm, `${cardioKm.toFixed(1)} km`),
    make('cardio-50km', '50 km courus', 'Cinquante kilomètres', '🏃‍♂️', 'cardio', 50, cardioKm, `${cardioKm.toFixed(1)} km`),
    make('cardio-100km', '100 km courus', 'Cent kilomètres', '🥾', 'cardio', 100, cardioKm, `${cardioKm.toFixed(1)} km`),
    make('cardio-500km', '500 km', 'La distance de Paris-Lyon', '🚀', 'cardio', 500, cardioKm, `${cardioKm.toFixed(1)} km`),

    // Streak
    make('streak-7', 'Semaine parfaite', '7 jours consécutifs', '🔥', 'streak', 7, streak, `${streak} j max`),
    make('streak-30', 'Un mois sans manquer', '30 jours consécutifs', '🔥🔥', 'streak', 30, streak, `${streak} j max`),
    make('streak-100', '100 jours de suite', 'Régularité absolue', '💯', 'streak', 100, streak, `${streak} j max`),

    // Discipline
    make('kcal-10k', '10 000 kcal brûlées', 'Cumul de 10k kcal', '🔥', 'discipline', 10000, calories, `${calories} kcal`),
    make('kcal-100k', '100 000 kcal brûlées', 'Machine à cramer', '🌋', 'discipline', 100000, calories, `${calories} kcal`),
    make('diversity-10', '10 exercices différents', 'Varie tes séances', '🎨', 'discipline', 10, distinct),
    make('diversity-50', '50 exercices différents', 'Athlète polyvalent', '🌈', 'discipline', 50, distinct),

    // Record
    make('first-pr', 'Premier record', 'Enregistre ton premier PR', '⭐', 'record', 1, prs.length),
    make('pr-10', '10 records', 'Dix PR enregistrés', '💫', 'record', 10, prs.length),
    make('pr-25', '25 records', 'Vingt-cinq PR', '✨', 'record', 25, prs.length),
    make('first-measurement', 'Prise de mesures', 'Enregistre ta première mesure', '📏', 'record', 1, measurements.length),
    make('measures-10', '10 mesures', 'Suivi assidu', '📈', 'record', 10, measurements.length),

    // Special
    make('early-bird', 'Lève-tôt', 'Séance avant 8h', '🌅', 'special', 1, hasSessionBefore(sessions, 8) ? 1 : 0),
    make('night-owl', 'Oiseau de nuit', 'Séance après 22h', '🦉', 'special', 1, hasSessionAfter(sessions, 22) ? 1 : 0),
    make('weekend-warrior', 'Warrior du week-end', '10 séances le week-end', '⚔️', 'special', 10, weekendCount(sessions)),
    make(
      'muscle-up',
      'Premier Muscle-up',
      'Ajoute un PR "muscle-up"',
      '🤸‍♂️',
      'special',
      1,
      prs.some((p) => p.exerciseName.toLowerCase().includes('muscle-up')) ? 1 : 0,
    ),
    make(
      'hyrox',
      'Hyrox terminé',
      'Nomme une séance "Hyrox" et termine-la',
      '🏅',
      'special',
      1,
      sessions.some((s) => s.planTitle.toLowerCase().includes('hyrox')) ? 1 : 0,
    ),
  ];

  return list;
}

function weekendCount(sessions: WorkoutSession[]): number {
  return sessions.filter((s) => {
    const d = new Date(s.startedAt).getDay();
    return d === 0 || d === 6;
  }).length;
}

function make(
  id: string,
  title: string,
  description: string,
  emoji: string,
  category: Achievement['category'],
  target: number,
  progress: number,
  progressLabel?: string,
): Achievement {
  const p = Math.max(0, progress);
  return {
    id,
    title,
    description,
    emoji,
    category,
    target,
    progress: p,
    unlocked: p >= target,
    progressLabel: progressLabel ?? `${p}/${target}`,
  };
}
