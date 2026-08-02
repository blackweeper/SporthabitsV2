/**
 * Coach IronFlow — filtrage du pool de candidats. Part de la TOTALITÉ du
 * catalogue (1348 exercices), pas seulement des 300 officiels — un profil
 * avec un objectif/matériel spécifique doit pouvoir piocher partout. Le
 * tier (`essential`/`official_core`/`collection_only`) n'est jamais un
 * filtre dur ici, seulement un bonus de score dans `coach-selector.ts`.
 */
import type { ExerciseRecord } from "@/src/utils/exercise-records";
import type { ExerciseEquipment } from "@/src/utils/exercise-equipment";
import type { PainZone } from "@/src/utils/gym-storage";
import { PAIN_ZONE_EXCLUDED_MUSCLES, PAIN_ZONE_EXCLUDED_PATTERNS } from "@/src/utils/coach-rules";

export type PoolFilterInput = {
  availableEquipment?: ExerciseEquipment[] | null;
  painZones?: PainZone[] | null;
};

function isEquipmentAvailable(record: ExerciseRecord, availableEquipment: ExerciseEquipment[] | null | undefined): boolean {
  if (!availableEquipment || availableEquipment.length === 0) return true; // pas de contrainte renseignée
  if (!record.equipment || record.equipment === "bodyweight") return true; // toujours disponible
  return availableEquipment.includes(record.equipment);
}

function isExcludedByPain(record: ExerciseRecord, painZones: PainZone[] | null | undefined): boolean {
  if (!painZones || painZones.length === 0) return false;
  for (const zone of painZones) {
    const excludedPatterns = PAIN_ZONE_EXCLUDED_PATTERNS[zone];
    if (excludedPatterns && record.movementPattern && excludedPatterns.includes(record.movementPattern)) {
      return true;
    }
    const excludedMuscles = PAIN_ZONE_EXCLUDED_MUSCLES[zone];
    if (excludedMuscles) {
      if (record.primaryMuscle && excludedMuscles.includes(record.primaryMuscle)) return true;
      if (record.secondaryMuscles?.some((m) => excludedMuscles.includes(m))) return true;
    }
  }
  return false;
}

/** Retire uniquement ce qui est structurellement inutilisable (matériel
 * absent, contre-indiqué par une douleur déclarée) ou explicitement
 * `deprecated`. Ne filtre jamais par tier — c'est `coach-selector.ts` qui
 * privilégie les exercices officiels via un bonus de score, sans exclure
 * le reste. */
export function buildCandidatePool(
  allExercises: ExerciseRecord[],
  input: PoolFilterInput,
): ExerciseRecord[] {
  return allExercises.filter((record) => {
    if (record.exerciseTier === "deprecated") return false;
    if (!isEquipmentAvailable(record, input.availableEquipment)) return false;
    if (isExcludedByPain(record, input.painZones)) return false;
    return true;
  });
}
