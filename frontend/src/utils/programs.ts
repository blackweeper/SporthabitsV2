import {
  BUNDLED_PROGRAMS,
  Program,
} from '@/src/data/programs';
import { getCustomPrograms } from '@/src/utils/gym-storage';

export async function getAllPrograms(): Promise<Program[]> {
  const custom = (await getCustomPrograms()) as Program[];
  return [...BUNDLED_PROGRAMS, ...custom];
}

export async function findProgram(id: string): Promise<Program | null> {
  const all = await getAllPrograms();
  return all.find((p) => p.id === id) ?? null;
}

export function isBundled(programId: string): boolean {
  return BUNDLED_PROGRAMS.some((p) => p.id === programId);
}
