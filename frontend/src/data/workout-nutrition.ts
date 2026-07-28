import { MealPreset, WorkoutSession } from '@/src/utils/gym-storage';

/** Generic pre-workout snacks — kept simple and not intensity-dependent,
 * since "avant" is asked retrospectively regardless of how the session went. */
export const BEFORE_SUGGESTIONS: MealPreset[] = [
  { id: 'before_banana_pb', emoji: '🍌', label: 'Banane + beurre de cacahuète', kcal: 220 },
  { id: 'before_rice_chicken', emoji: '🍚', label: 'Riz + poulet léger', kcal: 350 },
  { id: 'before_oats', emoji: '🥣', label: "Flocons d'avoine", kcal: 250 },
];

export type PostWorkoutIntensity = 'light' | 'intense' | 'musculation';

const AFTER_SUGGESTIONS: Record<PostWorkoutIntensity, MealPreset[]> = {
  light: [
    { id: 'after_yogurt', emoji: '🍶', label: 'Yaourt grec + fruits', kcal: 220 },
    { id: 'after_fruit', emoji: '🍎', label: 'Fruit', kcal: 80 },
  ],
  intense: [
    { id: 'after_shake_carbs', emoji: '🥤', label: 'Shake glucides + protéines', kcal: 300 },
    { id: 'after_banana_pb', emoji: '🍌', label: 'Banane + beurre de cacahuète', kcal: 220 },
    { id: 'after_rice_chicken', emoji: '🍚', label: 'Riz + poulet', kcal: 350 },
  ],
  musculation: [
    { id: 'after_protein_shake', emoji: '🥤', label: 'Shake protéiné', kcal: 200 },
    { id: 'after_eggs', emoji: '🍳', label: 'Œufs', kcal: 220 },
    { id: 'after_cottage_cheese', emoji: '🧀', label: 'Fromage blanc', kcal: 150 },
  ],
};

/** No AI/network — a simple deterministic classification from data the
 * session already has (type, duration, calories burned). */
export function classifyPostWorkoutIntensity(session: WorkoutSession): PostWorkoutIntensity {
  if (session.planType === 'musculation') return 'musculation';
  const longOrIntense =
    session.durationSeconds >= 60 * 60 ||
    session.caloriesBurned >= 500 ||
    session.planType === 'cardio' ||
    !!session.cardio_activity;
  return longOrIntense ? 'intense' : 'light';
}

export function getNutritionSuggestions(
  session: WorkoutSession,
  timing: 'before' | 'after',
): MealPreset[] {
  if (timing === 'before') return BEFORE_SUGGESTIONS;
  return AFTER_SUGGESTIONS[classifyPostWorkoutIntensity(session)];
}
