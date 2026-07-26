import { ExerciseCategory } from '@/src/utils/exercise-category';

export type LibraryExercise = {
  name: string;
  category: ExerciseCategory;
  emoji?: string;
};

/**
 * Pre-filled exercise library organised by category.
 * Users can still create additional exercises on top of these.
 */
export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ── Musculation ────────────────────────────────────────────────
  { name: 'Squat avec barre', category: 'musculation', emoji: '🏋️' },
  { name: 'Développé couché', category: 'musculation', emoji: '💪' },
  { name: 'Soulevé de terre', category: 'musculation', emoji: '🔥' },
  { name: 'Fentes arrière aux haltères', category: 'musculation', emoji: '🦵' },
  { name: 'Développé militaire aux haltères', category: 'musculation', emoji: '🙆' },
  {
    name: 'Soulevés de terre jambes tendues aux haltères',
    category: 'musculation',
    emoji: '🦵',
  },
  { name: 'Dumbbell Snatches alternés', category: 'musculation', emoji: '⚡' },
  { name: 'Tirage poitrine à la poulie', category: 'musculation', emoji: '🎯' },
  { name: 'Wall Balls', category: 'musculation', emoji: '🏐' },
  { name: 'Box Step-ups', category: 'musculation', emoji: '📦' },
  { name: 'Pompes', category: 'musculation', emoji: '💪' },
  { name: 'Tractions strictes', category: 'musculation', emoji: '🧗' },
  { name: 'Gainage (Planche)', category: 'musculation', emoji: '🧘' },

  // ── Cardio machine ─────────────────────────────────────────────
  { name: 'BikeErg', category: 'cardio_machine', emoji: '🚴' },
  { name: 'Rameur', category: 'cardio_machine', emoji: '🚣' },
  { name: 'SkiErg', category: 'cardio_machine', emoji: '⛷️' },
  { name: 'Assault Bike', category: 'cardio_machine', emoji: '🚲' },
  { name: 'Tapis de course (Marche inclinée)', category: 'cardio_machine', emoji: '🏃' },
  { name: 'Tapis de course (Course à pied)', category: 'cardio_machine', emoji: '🏃' },

  // ── Mobilité ───────────────────────────────────────────────────
  { name: 'Couch Stretch', category: 'mobility', emoji: '🧘' },
  { name: 'Poliquin Step-Downs', category: 'mobility', emoji: '👇' },
  { name: 'Wall Sit (Chaise)', category: 'mobility', emoji: '🪑' },
  {
    name: 'Extensions et flexions excentriques du poignet',
    category: 'mobility',
    emoji: '✋',
  },
  {
    name: 'Pronation / Supination contrôlée du poignet',
    category: 'mobility',
    emoji: '🔄',
  },
  { name: "World's Greatest Stretch", category: 'mobility', emoji: '🌍' },
  {
    name: 'Rotations articulaires des épaules (Pass-throughs)',
    category: 'mobility',
    emoji: '🙆',
  },
  { name: 'Active Hang (Suspension active)', category: 'mobility', emoji: '🧗' },
];

/** Group library exercises by category. */
export function libraryByCategory(): Record<ExerciseCategory, LibraryExercise[]> {
  return {
    musculation: EXERCISE_LIBRARY.filter((e) => e.category === 'musculation'),
    cardio_machine: EXERCISE_LIBRARY.filter((e) => e.category === 'cardio_machine'),
    mobility: EXERCISE_LIBRARY.filter((e) => e.category === 'mobility'),
  };
}
