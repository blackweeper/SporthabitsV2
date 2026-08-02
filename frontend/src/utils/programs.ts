import { Program } from '@/src/data/programs';
import { getCustomPrograms, UserProfile } from '@/src/utils/gym-storage';

/** Tous les programmes existent désormais dans le stockage utilisateur
 * (créés à la main, importés, ou générés par le Coach IronFlow) — plus
 * aucun contenu n'est embarqué dans le bundle de l'app. */
export async function getAllPrograms(): Promise<Program[]> {
  return (await getCustomPrograms()) as Program[];
}

/** Only workout-category programs. */
export async function getWorkoutPrograms(): Promise<Program[]> {
  const all = await getAllPrograms();
  return all.filter((p) => (p.category ?? 'workout') === 'workout');
}

/** Only cardio-category programs. */
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
