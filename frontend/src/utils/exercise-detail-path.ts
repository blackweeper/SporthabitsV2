import type { ExerciseRecord } from "@/src/utils/exercise-records";

/**
 * Chemin de la fiche d'un exercice (`/exercise-detail/[name]`).
 *
 * La fiche retrouve l'exercice par son nom EXACT dans la bibliothèque. Quand
 * l'exercice est lié à un `ExerciseRecord` (`exerciseRecordId`), on passe donc
 * le nom canonique du record plutôt que le libellé affiché : un programme
 * transcrit d'un PDF peut nommer un exercice autrement que la bibliothèque
 * (ex. "Développé incliné aux haltères" pour "Développé couché incliné aux
 * haltères"), ce qui menait à "Exercice introuvable". Sans lien, on retombe sur
 * le libellé affiché (comportement historique).
 */
export function exerciseDetailPath(
  displayName: string,
  exerciseRecordId: string | null | undefined,
  records: ExerciseRecord[],
): string {
  const record = exerciseRecordId ? records.find((r) => r.id === exerciseRecordId) : undefined;
  return `/exercise-detail/${encodeURIComponent(record?.nameFr ?? displayName)}`;
}
