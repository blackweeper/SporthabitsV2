import {
  BUNDLED_PROGRAMS,
  BUNDLED_STRETCH_PROGRAMS,
  Program,
} from '@/src/data/programs';
import { getCustomPrograms } from '@/src/utils/gym-storage';

export async function getAllPrograms(): Promise<Program[]> {
  const custom = (await getCustomPrograms()) as Program[];
  return [...BUNDLED_PROGRAMS, ...BUNDLED_STRETCH_PROGRAMS, ...custom];
}

/** Only workout-category programs (custom with category!='stretch' & !='cardio' + bundled workouts). */
export async function getWorkoutPrograms(): Promise<Program[]> {
  const all = await getAllPrograms();
  return all.filter((p) => (p.category ?? 'workout') === 'workout');
}

/** Only cardio-category programs (custom only for now). */
export async function getCardioPrograms(): Promise<Program[]> {
  const all = await getAllPrograms();
  return all.filter((p) => p.category === 'cardio');
}

/** Only stretch-category programs. */
export async function getStretchPrograms(): Promise<Program[]> {
  const all = await getAllPrograms();
  return all.filter((p) => p.category === 'stretch');
}

export async function findProgram(id: string): Promise<Program | null> {
  const all = await getAllPrograms();
  return all.find((p) => p.id === id) ?? null;
}

export function isBundled(programId: string): boolean {
  return (
    BUNDLED_PROGRAMS.some((p) => p.id === programId) ||
    BUNDLED_STRETCH_PROGRAMS.some((p) => p.id === programId)
  );
}
