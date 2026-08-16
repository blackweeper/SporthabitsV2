import AsyncStorage from '@react-native-async-storage/async-storage';
import { addPlansIfAbsent, getAllPlansIncludingProgram } from '@/src/utils/gym-storage';
import { WOD_LIBRARY } from '@/src/data/wod-library';

const WOD_SEEDED_IDS_KEY = '@ironflow/wodLibrarySeededIds';

/**
 * Amorce la bibliothèque de WODs curés (`WOD_LIBRARY`) dans le stockage
 * utilisateur, un seul jour sans que l'utilisateur ne les ait demandés. Même
 * discipline que `seedStarterProgramsIfNeeded` : un id déjà semé une fois
 * n'est plus jamais réécrit (l'utilisateur reste libre de supprimer un WOD
 * sans qu'il ne réapparaisse), et un WOD ajouté à `WOD_LIBRARY` après le
 * premier lancement de l'utilisateur est bien semé au lancement suivant.
 */
export async function seedWodLibraryIfNeeded(): Promise<void> {
  const seededIdsRaw = await AsyncStorage.getItem(WOD_SEEDED_IDS_KEY);
  const seededIds = new Set<string>(seededIdsRaw ? JSON.parse(seededIdsRaw) : []);
  const existing = await getAllPlansIncludingProgram();
  const existingIds = new Set(existing.map((p) => p.id));

  const toSeed = WOD_LIBRARY.filter((w) => !seededIds.has(w.id) && !existingIds.has(w.id));
  if (toSeed.length > 0) {
    const added = await addPlansIfAbsent(toSeed);
    if (added > 0) {
      console.log(`[seedWodLibraryIfNeeded] ${added} WOD(s) amorcé(s).`);
    }
  }

  for (const w of WOD_LIBRARY) seededIds.add(w.id);
  await AsyncStorage.setItem(WOD_SEEDED_IDS_KEY, JSON.stringify([...seededIds]));
}
