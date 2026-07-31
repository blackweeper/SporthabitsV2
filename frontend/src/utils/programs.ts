import {
  BUNDLED_CARDIO_PROGRAMS,
  BUNDLED_PROGRAMS,
  BUNDLED_STRETCH_PROGRAMS,
  Program,
} from '@/src/data/programs';
import { getCustomPrograms, UserProfile } from '@/src/utils/gym-storage';

export async function getAllPrograms(): Promise<Program[]> {
  const custom = (await getCustomPrograms()) as Program[];
  return [...BUNDLED_PROGRAMS, ...BUNDLED_CARDIO_PROGRAMS, ...BUNDLED_STRETCH_PROGRAMS, ...custom];
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
    BUNDLED_CARDIO_PROGRAMS.some((p) => p.id === programId) ||
    BUNDLED_STRETCH_PROGRAMS.some((p) => p.id === programId)
  );
}

/** Score de pertinence d'un programme pour le profil renseigné — un simple
 * bonus par correspondance (objectif, niveau), jamais un filtre dur : un
 * profil non renseigné ou un programme sans correspondance reste à 0,
 * donc l'ordre par défaut (index d'origine) est préservé. Le sexe n'est
 * volontairement pas utilisé comme signal — aucun programme n'est conçu
 * différemment par genre aujourd'hui, ce serait un signal inventé. */
export function scoreProgramForProfile(program: Program, profile: UserProfile | null): number {
  if (!profile) return 0;
  let score = 0;
  if (profile.primaryGoal && program.goalTag === profile.primaryGoal) score += 2;
  if (profile.experienceLevel && program.level === profile.experienceLevel) score += 1;
  return score;
}
