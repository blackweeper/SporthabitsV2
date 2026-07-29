import AsyncStorage from "@react-native-async-storage/async-storage";
import { getExerciseRecords } from "./exercise-records";
import { getCustomExercises, getSessions } from "./gym-storage";
import { listAllExercises } from "./exercise-detail";
import { addToLibrary, getAllExerciseUserData } from "./exercise-user-data";

/**
 * Étape D — rétro-remplissage silencieux de la bibliothèque personnelle,
 * pour que les utilisateurs déjà actifs ne voient rien "disparaître" une
 * fois l'affichage par défaut basculé sur "Ma bibliothèque" (Étape E).
 *
 * Trois sources, chacune avec sa règle :
 *  1. Exercices personnalisés → toujours ajoutés (id réel garanti par
 *     construction, gym-storage.ts).
 *  2. Exercices utilisés dans l'historique de séances → ajoutés
 *     uniquement s'ils se résolvent vers un id réel (`ExerciseRecord.id`
 *     ou `CustomExercise.id`, même résolution par nom que la migration
 *     des favoris — nameFr exact, aliases, nom d'exercice personnalisé).
 *     Un nom qui ne se résout qu'en id synthétique (voir
 *     useExerciseLibraryItems.ts) est **ignoré**, jamais persisté sous cet
 *     id temporaire — règle validée explicitement avant cette étape. Les
 *     noms non résolus restent dans une liste "en attente" (même patron
 *     que exercise-user-data-migration.ts) retentée à chaque démarrage,
 *     pour rattraper une future mise à jour de bibliothèque.
 *  3. Favoris déjà posés sans appartenance bibliothèque → réparation
 *     défensive (en pratique déjà garanti par l'invariant de `setFavorite`
 *     pour tout favori posé après le durcissement, mais gardé ici comme
 *     filet de cohérence).
 *
 * N'affecte jamais l'historique de séances/PRs — ce fichier ne fait
 * qu'ajouter des entrées dans ExerciseUserData, jamais en supprimer.
 */

const PENDING_USAGE_NAMES_KEY = "@ironflow/pendingLibraryBackfillNames";

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export type LibraryBackfillReport = {
  addedFromUsage: number;
  addedFromFavorites: number;
  addedFromCustom: number;
  skippedNoStableId: string[];
};

async function getPendingUsageNames(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(PENDING_USAGE_NAMES_KEY);
  if (raw == null) return null; // jamais initialisé — distinct d'une liste vide ([])
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function logReport(report: LibraryBackfillReport): void {
  const total = report.addedFromUsage + report.addedFromFavorites + report.addedFromCustom;
  console.log(
    `[backfillPersonalLibrary] ${total} exercice(s) ajouté(s) à la bibliothèque personnelle — ` +
      `${report.addedFromUsage} depuis l'historique de séances, ` +
      `${report.addedFromCustom} exercice(s) personnalisé(s), ` +
      `${report.addedFromFavorites} favori(s) réparé(s) (sans appartenance bibliothèque au préalable).`,
  );
  if (report.skippedNoStableId.length > 0) {
    console.warn(
      `[backfillPersonalLibrary] ${report.skippedNoStableId.length} exercice(s) de l'historique ignoré(s) ` +
        `(pas d'id stable — introuvable dans le catalogue actuel, en attente d'une future mise à jour) : ` +
        report.skippedNoStableId.join(", "),
    );
  }
}

export async function backfillPersonalLibrary(): Promise<LibraryBackfillReport> {
  const [records, customExercises, sessions, userDataSnapshot] = await Promise.all([
    getExerciseRecords(),
    getCustomExercises(),
    getSessions(),
    getAllExerciseUserData(),
  ]);

  const alreadyInLibrary = new Set(
    Object.entries(userDataSnapshot)
      .filter(([, d]) => d.addedToLibraryAt)
      .map(([id]) => id),
  );

  // 1. Exercices personnalisés — id réel garanti, toujours éligibles.
  let addedFromCustom = 0;
  for (const c of customExercises) {
    if (alreadyInLibrary.has(c.id)) continue;
    await addToLibrary(c.id, "custom");
    alreadyInLibrary.add(c.id);
    addedFromCustom++;
  }

  // 2. Historique de séances — résolution par nom vers un id réel
  // uniquement (même stratégie que exercise-user-data-migration.ts).
  const idByName = new Map<string, string>();
  for (const r of records) {
    if (r.source === "custom") continue; // déjà couvert par customExercises ci-dessus
    idByName.set(normalize(r.nameFr), r.id);
    for (const alias of r.aliases ?? []) idByName.set(normalize(alias), r.id);
  }
  for (const c of customExercises) idByName.set(normalize(c.nameFr), c.id);

  let pendingNames = await getPendingUsageNames();
  if (pendingNames == null) {
    pendingNames = listAllExercises(sessions).map((u) => u.name);
  }

  let addedFromUsage = 0;
  const stillPending: string[] = [];
  for (const name of pendingNames) {
    const id = idByName.get(normalize(name));
    if (!id) {
      stillPending.push(name);
      continue;
    }
    if (alreadyInLibrary.has(id)) continue;
    await addToLibrary(id, "usage");
    alreadyInLibrary.add(id);
    addedFromUsage++;
  }
  await AsyncStorage.setItem(PENDING_USAGE_NAMES_KEY, JSON.stringify(stillPending));

  // 3. Favoris sans appartenance bibliothèque — réparation défensive.
  let addedFromFavorites = 0;
  for (const [id, data] of Object.entries(userDataSnapshot)) {
    if (data.favoritedAt && !alreadyInLibrary.has(id)) {
      await addToLibrary(id, "manual");
      alreadyInLibrary.add(id);
      addedFromFavorites++;
    }
  }

  const report: LibraryBackfillReport = {
    addedFromUsage,
    addedFromFavorites,
    addedFromCustom,
    skippedNoStableId: stillPending,
  };
  logReport(report);
  return report;
}
