import { ExerciseCategory } from '@/src/utils/exercise-category';
import { MuscleGroupKey } from '@/src/utils/muscle-groups';

export type LibraryExercise = {
  name: string;
  category: ExerciseCategory;
  emoji?: string;
  muscleGroups?: MuscleGroupKey[];
};

/**
 * Pre-filled exercise library organised by category.
 * Users can still create additional exercises on top of these.
 */
export const EXERCISE_LIBRARY: LibraryExercise[] = [
  // ── Musculation ────────────────────────────────────────────────
  { name: 'Squat avec barre', category: 'musculation', emoji: '🏋️', muscleGroups: ['legs', 'glutes', 'core'] },
  { name: 'Développé couché', category: 'musculation', emoji: '💪', muscleGroups: ['chest', 'arms'] },
  { name: 'Soulevé de terre', category: 'musculation', emoji: '🔥', muscleGroups: ['back', 'legs', 'glutes'] },
  { name: 'Fentes arrière aux haltères', category: 'musculation', emoji: '🦵', muscleGroups: ['legs', 'glutes'] },
  { name: 'Développé militaire aux haltères', category: 'musculation', emoji: '🙆', muscleGroups: ['shoulders', 'arms'] },
  {
    name: 'Soulevés de terre jambes tendues aux haltères',
    category: 'musculation',
    emoji: '🦵',
    muscleGroups: ['legs', 'back', 'glutes'],
  },
  { name: 'Dumbbell Snatches alternés', category: 'musculation', emoji: '⚡', muscleGroups: ['full_body', 'shoulders'] },
  { name: 'Tirage poitrine à la poulie', category: 'musculation', emoji: '🎯', muscleGroups: ['back', 'arms'] },
  { name: 'Wall Balls', category: 'musculation', emoji: '🏐', muscleGroups: ['legs', 'shoulders', 'full_body'] },
  { name: 'Box Step-ups', category: 'musculation', emoji: '📦', muscleGroups: ['legs', 'glutes'] },
  { name: 'Pompes', category: 'musculation', emoji: '💪', muscleGroups: ['chest', 'arms', 'core'] },
  { name: 'Tractions strictes', category: 'musculation', emoji: '🧗', muscleGroups: ['back', 'arms'] },
  { name: 'Gainage (Planche)', category: 'musculation', emoji: '🧘', muscleGroups: ['core'] },

  // ── Cardio machine ─────────────────────────────────────────────
  { name: 'BikeErg', category: 'cardio_machine', emoji: '🚴', muscleGroups: ['cardio', 'legs'] },
  { name: 'Rameur', category: 'cardio_machine', emoji: '🚣', muscleGroups: ['cardio', 'back', 'legs'] },
  { name: 'SkiErg', category: 'cardio_machine', emoji: '⛷️', muscleGroups: ['cardio', 'full_body'] },
  { name: 'Assault Bike', category: 'cardio_machine', emoji: '🚲', muscleGroups: ['cardio', 'full_body'] },
  { name: 'Tapis de course (Marche inclinée)', category: 'cardio_machine', emoji: '🏃', muscleGroups: ['cardio', 'legs'] },
  { name: 'Tapis de course (Course à pied)', category: 'cardio_machine', emoji: '🏃', muscleGroups: ['cardio', 'legs'] },

  // ── Mobilité ───────────────────────────────────────────────────
  { name: 'Couch Stretch', category: 'mobility', emoji: '🧘', muscleGroups: ['legs'] },
  { name: 'Poliquin Step-Downs', category: 'mobility', emoji: '👇', muscleGroups: ['legs'] },
  { name: 'Wall Sit (Chaise)', category: 'mobility', emoji: '🪑', muscleGroups: ['legs'] },
  {
    name: 'Extensions et flexions excentriques du poignet',
    category: 'mobility',
    emoji: '✋',
    muscleGroups: ['arms'],
  },
  {
    name: 'Pronation / Supination contrôlée du poignet',
    category: 'mobility',
    emoji: '🔄',
    muscleGroups: ['arms'],
  },
  { name: "World's Greatest Stretch", category: 'mobility', emoji: '🌍', muscleGroups: ['full_body'] },
  {
    name: 'Rotations articulaires des épaules (Pass-throughs)',
    category: 'mobility',
    emoji: '🙆',
    muscleGroups: ['shoulders'],
  },
  { name: 'Active Hang (Suspension active)', category: 'mobility', emoji: '🧗', muscleGroups: ['back', 'arms'] },
];

/** Group library exercises by category. */
export function libraryByCategory(): Record<ExerciseCategory, LibraryExercise[]> {
  return {
    musculation: EXERCISE_LIBRARY.filter((e) => e.category === 'musculation'),
    cardio_machine: EXERCISE_LIBRARY.filter((e) => e.category === 'cardio_machine'),
    mobility: EXERCISE_LIBRARY.filter((e) => e.category === 'mobility'),
  };
}
