import {
  ExerciseRecord,
  getExerciseRecords,
  getLibraryMeta,
  replaceAllExerciseRecords,
  saveLibraryMeta,
} from "./exercise-records";
import { getCustomExercises } from "./gym-storage";
import { buildMigratedLibrary } from "./exercise-library-merge";
import CORE_LIBRARY_V3 from "@/src/data/core-library-v3.json";

const CORE_LIBRARY_VERSION = 3;

/**
 * V3 — amorce la bibliothèque de base (300 exercices officiels, illustrations
 * IronFlow incluses) directement depuis les données embarquées dans le
 * bundle de l'app, sans aucun réseau. Un install neuf n'a donc jamais de
 * bibliothèque vide : `getExerciseRecords()` renvoie `[]` avant ce seed,
 * les 300 juste après.
 *
 * Réutilise `buildMigratedLibrary` tel quel — le même moteur de fusion
 * qu'une mise à jour réseau classique (`useLibraryUpdate.ts`) — avec
 * `CORE_LIBRARY_V3` comme "incoming" à la place d'un fetch. Sur un install
 * neuf, `existing=[]` donc le résultat est simplement les 300 tels quels ;
 * sur un install qui a déjà une bibliothèque (v2 ou antérieure), le merge
 * préserve favoris/bibliothèque personnelle/exercices persos exactement
 * comme le ferait une vraie mise à jour.
 *
 * Idempotent et bon marché à rappeler : ne fait rien si la bibliothèque est
 * déjà à la version 3 ou plus récente.
 */
export async function seedCoreLibraryIfNeeded(): Promise<void> {
  const meta = await getLibraryMeta();
  if (meta.version >= CORE_LIBRARY_VERSION) return;

  const [existing, customs] = await Promise.all([getExerciseRecords(), getCustomExercises()]);
  const { merged } = buildMigratedLibrary(existing, customs, CORE_LIBRARY_V3 as ExerciseRecord[]);
  await replaceAllExerciseRecords(merged);
  await saveLibraryMeta({
    version: CORE_LIBRARY_VERSION,
    lastUpdatedAt: new Date().toISOString(),
    exerciseCount: merged.length,
  });
  console.log(
    `[seedCoreLibraryIfNeeded] Bibliothèque de base v${CORE_LIBRARY_VERSION} amorcée : ${merged.length} exercice(s) au total.`,
  );
}
