import AsyncStorage from "@react-native-async-storage/async-storage";
import { ExerciseRecord, getExerciseRecords, isCoreVisible } from "@/src/utils/exercise-records";
import { addToLibrary, getAllExerciseUserData } from "@/src/utils/exercise-user-data";
import { buildExerciseIndex, matchExercise } from "@/src/utils/exercise-matching";

/**
 * Fait en sorte qu'un programme (créé manuellement, importé, dupliqué, ou
 * prédéfini/activé) n'utilise jamais un exercice absent de la bibliothèque
 * personnelle. Les 300 exercices officiels sont déjà "dans la bibliothèque"
 * par construction (`isCoreVisible`) — rien à écrire pour eux. Seuls les
 * exercices `collection_only` réellement utilisés sont ajoutés
 * (`addToLibrary(id, "usage")`, même source déjà utilisée par le
 * rétro-remplissage depuis l'historique de séances, `exercise-library-backfill.ts`).
 *
 * Résolution par exercice : `exerciseRecordId` s'il est déjà renseigné
 * (exercices importés, déjà liés par `exercise-matching.ts`), sinon un
 * match exact/alias par nom (jamais fuzzy — un mauvais ajout automatique
 * serait pire qu'un ajout manqué). Un nom qui ne se résout vers aucun
 * `ExerciseRecord` (texte libre pur, ou programme prédéfini référençant un
 * nom qui n'existe pas dans le catalogue actuel) est consigné dans un
 * rapport persistant plutôt que silencieusement ignoré — jamais forcé vers
 * une correspondance incertaine.
 */

const UNRESOLVED_REPORT_KEY = "@ironflow/unresolvedProgramExercises";

export type UnresolvedProgramExercise = {
  name: string;
  firstSeenAt: string;
  lastSeenAt: string;
  occurrences: number;
};

function normalizeName(s: string): string {
  return s.toLowerCase().trim();
}

async function getUnresolvedReportMap(): Promise<Record<string, UnresolvedProgramExercise>> {
  const raw = await AsyncStorage.getItem(UNRESOLVED_REPORT_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

/** Liste triée (plus récent en premier) pour affichage — voir
 * `app/exercise-library-settings.tsx`. */
export async function getUnresolvedProgramExercisesReport(): Promise<UnresolvedProgramExercise[]> {
  const map = await getUnresolvedReportMap();
  return Object.values(map).sort((a, b) => b.lastSeenAt.localeCompare(a.lastSeenAt));
}

/** Remise à zéro manuelle depuis l'écran de réglages — le rapport n'est
 * jamais auto-nettoyé (un nom peut redevenir résolvable après une mise à
 * jour de bibliothèque sans qu'on le sache), donc l'utilisateur reste
 * maître de le vider une fois les entrées traitées. */
export async function clearUnresolvedProgramExercisesReport(): Promise<void> {
  await AsyncStorage.removeItem(UNRESOLVED_REPORT_KEY);
}

async function recordUnresolvedNames(names: Set<string>): Promise<void> {
  if (names.size === 0) return;
  const map = await getUnresolvedReportMap();
  const now = new Date().toISOString();
  for (const name of names) {
    const key = normalizeName(name);
    const existing = map[key];
    map[key] = existing
      ? { ...existing, lastSeenAt: now, occurrences: existing.occurrences + 1 }
      : { name, firstSeenAt: now, lastSeenAt: now, occurrences: 1 };
  }
  await AsyncStorage.setItem(UNRESOLVED_REPORT_KEY, JSON.stringify(map));
}

/** Accepte `any` (comme `saveCustomProgram`/le stockage des programmes en
 * général) plutôt que `Program` strict — appelée aussi bien pour des
 * programmes fraîchement importés que pour des objets bundlés dont la forme
 * est garantie par construction mais pas typée à ce point d'appel. */
export async function ensureProgramExercisesInLibrary(
  program: any,
): Promise<{ addedCount: number; unresolvedNames: string[] }> {
  if (!program?.days?.length) return { addedCount: 0, unresolvedNames: [] };

  const [records, userData] = await Promise.all([getExerciseRecords(), getAllExerciseUserData()]);
  const recordById = new Map(records.map((r) => [r.id, r]));
  const index = buildExerciseIndex(records);

  const toAdd = new Set<string>();
  const unresolved = new Set<string>();

  for (const day of program.days ?? []) {
    for (const session of day.sessions ?? []) {
      for (const exercise of session.exercises ?? []) {
        if (!exercise?.name) continue;
        let record: ExerciseRecord | undefined;
        if (exercise.exerciseRecordId) record = recordById.get(exercise.exerciseRecordId);
        if (!record) {
          const m = matchExercise(exercise.name, index);
          if (m.exerciseRecordId) record = recordById.get(m.exerciseRecordId);
        }
        if (!record) {
          unresolved.add(exercise.name.trim());
          continue;
        }
        if (isCoreVisible(record.exerciseTier)) continue;
        if (userData[record.id]?.addedToLibraryAt) continue;
        toAdd.add(record.id);
      }
    }
  }

  for (const id of toAdd) await addToLibrary(id, "usage");
  await recordUnresolvedNames(unresolved);

  return { addedCount: toAdd.size, unresolvedNames: Array.from(unresolved) };
}
