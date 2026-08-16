import AsyncStorage from '@react-native-async-storage/async-storage';
import { getCustomPrograms, saveCustomProgram } from '@/src/utils/gym-storage';
import { STARTER_PROGRAMS } from '@/src/data/starter-programs';

const SEEDED_FLAG_KEY = '@ironflow/starterProgramsSeeded';

/**
 * Amorce les 5 programmes de mobilité "Flexy Series" (transcrits depuis les
 * PDFs fournis par l'utilisateur) dans le stockage utilisateur, une seule
 * fois par installation. Contrairement à `seedCoreLibraryIfNeeded` (qui
 * migre/fusionne à chaque montée de version de la bibliothèque), ces
 * programmes n'ont pas vocation à être remplacés automatiquement : une fois
 * le flag posé, l'utilisateur reste libre de les modifier ou de les
 * supprimer sans qu'ils ne réapparaissent au prochain lancement — un simple
 * flag "déjà semé", pas un système de version.
 */
export async function seedStarterProgramsIfNeeded(): Promise<void> {
  const alreadySeeded = await AsyncStorage.getItem(SEEDED_FLAG_KEY);
  if (alreadySeeded) return;

  const existing = await getCustomPrograms();
  const existingIds = new Set(existing.map((p) => p.id));
  for (const program of STARTER_PROGRAMS) {
    if (existingIds.has(program.id)) continue;
    await saveCustomProgram(program);
  }

  await AsyncStorage.setItem(SEEDED_FLAG_KEY, '1');
  console.log(
    `[seedStarterProgramsIfNeeded] ${STARTER_PROGRAMS.length} programme(s) de démarrage amorcé(s).`,
  );
}
