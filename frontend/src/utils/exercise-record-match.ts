import { ExerciseRecord } from "@/src/utils/exercise-records";

/**
 * Résout un `ExerciseRecord` à partir d'un simple nom d'exercice (pas d'id)
 * — le cas de tout écran qui ne connaît que le nom saisi/affiché (séance
 * active, lignes de plan/programme...). Match par `nameFr`/`nameEn`/`aliases`,
 * insensible à la casse/aux espaces. Logique reprise telle quelle de
 * `app/exercise-detail/[name].tsx` (seule source avant cette extraction),
 * pour que tout appelant qui n'a qu'un nom résolve un exercice de la même
 * façon que la fiche.
 */
export function matchExerciseRecord(
  name: string,
  records: ExerciseRecord[],
): ExerciseRecord | undefined {
  const key = name.toLowerCase().trim();
  return records.find(
    (r) =>
      r.nameFr.toLowerCase().trim() === key ||
      r.nameEn?.toLowerCase().trim() === key ||
      (r.aliases ?? []).some((a) => a.toLowerCase().trim() === key),
  );
}
