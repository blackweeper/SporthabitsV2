import type { ExerciseRecordCategory } from "@/src/utils/exercise-record-category";
import type { ExerciseEquipment } from "@/src/utils/exercise-equipment";
import { normalize } from "@/src/utils/exercise-library-merge";

/**
 * Devine catégorie/équipement à partir du seul nom d'un exercice — utilisé
 * uniquement pour pré-remplir la création d'un `ExerciseRecord` depuis
 * l'écran de revue d'import (`app/import-review/[id].tsx`), jamais pour
 * écraser une valeur déjà choisie par l'utilisateur. Heuristique par
 * mots-clés volontairement simple : un mauvais résultat reste toujours
 * modifiable ensuite depuis la fiche exercice, donc pas de sur-ingénierie
 * ici (pas de score de confiance, juste un premier meilleur choix).
 */

const CATEGORY_KEYWORDS: { re: RegExp; category: ExerciseRecordCategory }[] = [
  { re: /etirement|assouplissement|stretch/, category: "stretching" },
  { re: /mobilite|mobility/, category: "mobility" },
  { re: /\bsaut\b|jump|pliometrie|burpee|box jump/, category: "plyometric" },
  {
    re: /rameur|course|running|\bvelo\b|corde a sauter|tapis|assault bike|ski erg|skierg|cardio|hiit|sprint/,
    category: "cardio",
  },
];

const EQUIPMENT_KEYWORDS: { re: RegExp; equipment: ExerciseEquipment }[] = [
  { re: /kettlebell/, equipment: "kettlebell" },
  { re: /haltere/, equipment: "dumbbell" },
  { re: /elastique|\bband\b/, equipment: "resistance_band" },
  { re: /corde a sauter/, equipment: "jump_rope" },
  { re: /rameur/, equipment: "rowing_machine" },
  { re: /assault bike/, equipment: "assault_bike" },
  { re: /ski erg|skierg/, equipment: "ski_erg" },
  { re: /tapis de course|tapis roulant/, equipment: "treadmill" },
  { re: /machine|poulie|smith/, equipment: "machine" },
  { re: /\bbarre\b/, equipment: "barbell" },
  { re: /poids du corps|au sol|\bpompe|\btraction|\bdips?\b|\bgainage/, equipment: "bodyweight" },
];

export function guessCategory(rawName: string): ExerciseRecordCategory {
  const n = normalize(rawName);
  return CATEGORY_KEYWORDS.find((k) => k.re.test(n))?.category ?? "musculation";
}

/** `null` = aucun indice fiable — laisser le champ vide plutôt que de
 * deviner à tort (ex. "other"/"bodyweight" par défaut serait souvent faux). */
export function guessEquipment(rawName: string): ExerciseEquipment | null {
  const n = normalize(rawName);
  return EQUIPMENT_KEYWORDS.find((k) => k.re.test(n))?.equipment ?? null;
}

export function guessExerciseFields(rawName: string): {
  category: ExerciseRecordCategory;
  equipment: ExerciseEquipment | null;
} {
  return { category: guessCategory(rawName), equipment: guessEquipment(rawName) };
}
