import AsyncStorage from '@react-native-async-storage/async-storage';
import { addPlansIfAbsent, getAllPlansIncludingProgram, replacePlansIfPresent } from '@/src/utils/gym-storage';
import { WOD_LIBRARY } from '@/src/data/wod-library';

const WOD_SEEDED_IDS_KEY = '@ironflow/wodLibrarySeededIds';
// One-time force-relink: the exercise-library audit pass added
// `exerciseRecordId` to ~630 WOD exercise slots that were previously
// unlinked free text (round-robin bodyweight/HYROX movements like Air
// Squat, Double Under, Sled Push... that either didn't exist in the library
// yet or existed under a different name). Installs that already seeded a
// WOD keep the old unlinked snapshot forever (`seedWodLibraryIfNeeded`
// never rewrites an id it has already seeded) — this force-replaces every
// already-seeded WOD still present in storage with the corrected `exercises`
// array so real thumbnails/fiches actually resolve. Safe: `SessionLog`
// entries capture their own exercise name/data independently at logging
// time, so replacing a Plan's `exercises` array never corrupts past
// progress (same guarantee already relied on by
// `applyComebackCircuitFixIfNeeded` in `program-bootstrap.ts`).
const WOD_RELINK_FIX_KEY = '@ironflow/wodExerciseRelinkApplied_v1';

/**
 * Amorce la bibliothèque de WODs curés (`WOD_LIBRARY`) dans le stockage
 * utilisateur, un seul jour sans que l'utilisateur ne les ait demandés. Même
 * discipline que `seedStarterProgramsIfNeeded` : un id déjà semé une fois
 * n'est plus jamais réécrit (l'utilisateur reste libre de supprimer un WOD
 * sans qu'il ne réapparaisse), et un WOD ajouté à `WOD_LIBRARY` après le
 * premier lancement de l'utilisateur est bien semé au lancement suivant.
 */
export async function seedWodLibraryIfNeeded(): Promise<void> {
  await applyWodExerciseRelinkIfNeeded();

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

async function applyWodExerciseRelinkIfNeeded(): Promise<void> {
  const applied = await AsyncStorage.getItem(WOD_RELINK_FIX_KEY);
  if (applied) return;

  const replaced = await replacePlansIfPresent(WOD_LIBRARY);
  if (replaced > 0) {
    console.log(`[applyWodExerciseRelinkIfNeeded] ${replaced} WOD(s) relié(s) à leurs exercices.`);
  }

  await AsyncStorage.setItem(WOD_RELINK_FIX_KEY, '1');
}
