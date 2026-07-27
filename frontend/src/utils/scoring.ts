import {
  DailyJournalEntry,
  DEFAULT_CALORIES_TARGET_KCAL,
  DEFAULT_WATER_TARGET_ML,
  Habit,
  HabitLog,
  habitProgress,
  UserProfile,
  WellnessLog,
  WorkoutSession,
} from '@/src/utils/gym-storage';

/**
 * IronFlow Score — one simple, transparent, real-time daily score out of
 * 100, split into 6 fixed-weight pillars. Replaces the two previous scoring
 * systems (a dashboard-only dynamic-weight score and a separate 7-day
 * rolling "Ironflow Score" on the Progression tab), which used different
 * formulas and confused users about what actually moved the number.
 */
export type PillarKey =
  | 'training'
  | 'sleep'
  | 'nutrition'
  | 'mood'
  | 'hydration'
  | 'habits';

export const PILLAR_MAX: Record<PillarKey, number> = {
  training: 25,
  sleep: 20,
  nutrition: 20,
  mood: 15,
  hydration: 10,
  habits: 10,
};

export type ScoreBreakdownItem = {
  key: PillarKey;
  label: string;
  icon: any;
  value: number;
  max: number;
  hint?: string;
};

export type ScoreSummaryLine = { label: string; points: number };

export type DailyIronflowScore = {
  score: number; // 0..100
  breakdown: ScoreBreakdownItem[];
  gains: ScoreSummaryLine[];
  losses: ScoreSummaryLine[];
  workoutDone: boolean;
};

const PILLAR_ICON: Record<PillarKey, any> = {
  training: 'barbell',
  sleep: 'moon',
  nutrition: 'nutrition',
  mood: 'happy',
  hydration: 'water',
  habits: 'checkbox',
};

const PILLAR_LABEL: Record<PillarKey, string> = {
  training: 'Entraînement',
  sleep: 'Sommeil',
  nutrition: 'Nutrition',
  mood: 'Humeur',
  hydration: 'Hydratation',
  habits: 'Habitudes',
};

/** Compute the IronFlow Score for a single given day (YYYY-MM-DD). Pass
 * the same underlying data for a different date to compare (e.g. today vs
 * yesterday) — the score is always derived live from that day's records,
 * never stored separately, so it's guaranteed to stay in sync. */
export function computeDailyIronflowScore(
  date: string,
  sessions: WorkoutSession[],
  habits: Habit[],
  habitLogs: HabitLog[],
  wellnessLogs: WellnessLog[],
  dailyJournal: DailyJournalEntry[],
  profile: UserProfile,
): DailyIronflowScore {
  const trainedThatDay = sessions.some(
    (s) => new Date(s.startedAt).toISOString().slice(0, 10) === date,
  );
  const wellness = wellnessLogs.find((w) => w.date === date) ?? null;
  const journal = dailyJournal.find((j) => j.date === date) ?? null;

  const trainingAchieved = trainedThatDay ? 1 : 0;

  const sleepHours = wellness?.sleep_hours ?? journal?.sleep_hours ?? null;
  const sleepAchieved = sleepHours != null ? sleepQualityCurve(sleepHours) : 0;

  const calTarget = profile.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL;
  const cal = wellness?.calories_kcal ?? 0;
  let nutritionAchieved = 0;
  if (cal > 0) {
    const ratio = cal / calTarget;
    if (ratio >= 0.8 && ratio <= 1.2) nutritionAchieved = 1;
    else if (ratio < 0.8) nutritionAchieved = ratio / 0.8;
    else nutritionAchieved = Math.max(0, 1 - (ratio - 1.2) / 0.8);
  }

  const moodAchieved = journal?.mood != null ? journal.mood / 10 : 0;

  const waterTarget = profile.water_target_ml || DEFAULT_WATER_TARGET_ML;
  const hydrationAchieved = Math.min(1, (wellness?.water_ml ?? 0) / waterTarget);

  const scoredHabits = habits.filter((h) => h.includedInScore !== false);
  let habitsAchieved = 0;
  if (scoredHabits.length > 0) {
    const total = scoredHabits.reduce((a, h) => {
      const val =
        habitLogs.find((l) => l.habitId === h.id && l.date === date)?.value ?? 0;
      return a + habitProgress(h, val);
    }, 0);
    habitsAchieved = total / scoredHabits.length;
  }

  const achieved: Record<PillarKey, number> = {
    training: trainingAchieved,
    sleep: sleepAchieved,
    nutrition: nutritionAchieved,
    mood: moodAchieved,
    hydration: hydrationAchieved,
    habits: habitsAchieved,
  };

  const hints: Record<PillarKey, string | undefined> = {
    training: trainedThatDay ? 'Séance faite' : 'Aucune séance',
    sleep: sleepHours != null ? formatHoursHint(sleepHours) : 'Non renseigné',
    nutrition: cal > 0 ? `${cal} kcal` : 'Non renseignée',
    mood: journal?.mood != null ? `${journal.mood}/10` : 'Non renseignée',
    hydration: `${Math.round(hydrationAchieved * 100)}% de la cible`,
    habits: scoredHabits.length
      ? `${Math.round(habitsAchieved * 100)}% complétées`
      : 'Aucune habitude',
  };

  const keys: PillarKey[] = ['training', 'sleep', 'nutrition', 'mood', 'hydration', 'habits'];
  const breakdown: ScoreBreakdownItem[] = keys.map((key) => ({
    key,
    label: PILLAR_LABEL[key],
    icon: PILLAR_ICON[key],
    value: Math.round(achieved[key] * PILLAR_MAX[key]),
    max: PILLAR_MAX[key],
    hint: hints[key],
  }));

  const score = breakdown.reduce((a, b) => a + b.value, 0);
  const { gains, losses } = summarizeScore(breakdown, scoredHabits.length > 0);

  return {
    score: Math.max(0, Math.min(100, score)),
    breakdown,
    gains,
    losses,
    workoutDone: trainedThatDay,
  };
}

const GAIN_LABEL: Record<PillarKey, string> = {
  training: 'Entraînement terminé',
  sleep: 'Objectif sommeil atteint',
  nutrition: 'Nutrition dans la cible',
  mood: "Bonne humeur aujourd'hui",
  hydration: 'Hydratation atteinte',
  habits: 'Toutes les habitudes complétées',
};

const MISSING_LABEL: Record<PillarKey, string> = {
  training: "Aucune séance aujourd'hui",
  sleep: 'Sommeil non renseigné',
  nutrition: 'Nutrition non renseignée',
  mood: 'Humeur non renseignée',
  hydration: 'Hydratation non renseignée',
  habits: 'Aucune habitude complétée',
};

function partialLabel(key: PillarKey, pct: number, hasHabits: boolean): string {
  switch (key) {
    case 'sleep':
      return `Sommeil : objectif atteint à ${pct}%`;
    case 'nutrition':
      return `Nutrition à ${pct}% de la cible`;
    case 'mood':
      return "Humeur moyenne aujourd'hui";
    case 'hydration':
      return `Hydratation à ${pct}% de l'objectif`;
    case 'habits':
      return hasHabits
        ? `Seulement ${pct}% des habitudes complétées`
        : MISSING_LABEL.habits;
    case 'training':
      return 'Séance partielle';
  }
}

function summarizeScore(
  breakdown: ScoreBreakdownItem[],
  hasHabits: boolean,
): { gains: ScoreSummaryLine[]; losses: ScoreSummaryLine[] } {
  const gains: ScoreSummaryLine[] = [];
  const losses: ScoreSummaryLine[] = [];
  for (const b of breakdown) {
    const pct = b.max > 0 ? b.value / b.max : 0;
    if (pct >= 0.95) {
      gains.push({ label: GAIN_LABEL[b.key], points: b.value });
    } else if (b.value > 0) {
      losses.push({
        label: partialLabel(b.key, Math.round(pct * 100), hasHabits),
        points: -(b.max - b.value),
      });
    } else {
      losses.push({ label: MISSING_LABEL[b.key], points: -b.max });
    }
  }
  return { gains, losses };
}

/** Short qualitative label shown next to the percentage. */
export function scoreQualitativeLabel(score: number): string {
  if (score >= 85) return 'Excellente journée';
  if (score >= 70) return 'Très bonne journée';
  if (score >= 50) return 'Bonne journée';
  if (score >= 30) return 'Journée moyenne';
  return 'Peut mieux faire';
}

function sleepQualityCurve(hours: number): number {
  if (hours <= 0) return 0;
  if (hours < 5) return (hours / 5) * 0.5; // <5h: max 0.5
  if (hours < 7) return 0.5 + ((hours - 5) / 2) * 0.5; // 5-7 → 0.5..1
  if (hours <= 9) return 1; // 7-9 = ideal
  if (hours <= 11) return 1 - ((hours - 9) / 2) * 0.4; // 9-11 → 1..0.6
  return 0.3; // >11h
}

function formatHoursHint(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h${String(mm).padStart(2, '0')} / nuit`;
}
