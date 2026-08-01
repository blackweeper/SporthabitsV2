/**
 * Classification heuristique par "bucket" thématique — extraite de
 * `curate-official-library.ts` dans un module autonome pour être réutilisée
 * par `coach-compute-scores.ts` sans tirer la chaîne d'imports de
 * `enrichment-shared.ts` (qui importe `EXERCISE_DIFFICULTIES` en valeur
 * depuis `src/utils/exercise-difficulty.ts`, lequel importe `@/src/theme` →
 * `react-native` — chaîne incompatible avec une exécution ts-node en script
 * Node pur, confirmée en pratique). Ce module n'importe que des types
 * (`import type`, erasés à la compilation, jamais requis au runtime).
 */
import type { ExerciseRecord } from "../../src/utils/exercise-records";
import type { FutureCollection } from "../../src/utils/exercise-collection";

export type Bucket =
  | "fondamentaux_force"
  | "musculation_hypertrophie"
  | "crossfit_hyrox"
  | "poids_du_corps_gymnastique"
  | "running_cardio"
  | "mobilite_prevention";

export const BUCKET_LABEL: Record<Bucket, string> = {
  fondamentaux_force: "Fondamentaux force",
  musculation_hypertrophie: "Musculation / hypertrophie",
  crossfit_hyrox: "CrossFit / HYROX",
  poids_du_corps_gymnastique: "Poids du corps / gymnastique",
  running_cardio: "Running / cardio",
  mobilite_prevention: "Mobilité / prévention",
};

const HYROX_CROSSFIT_KEYWORDS = [
  "clean", "snatch", "jerk", "thruster", "wall ball", "wall-ball",
  "burpee", "box jump", "sled", "farmer", "kettlebell swing",
  "double-under", "double under", "muscle-up", "muscle up",
  "rameur", "row erg", "ski erg", "assault bike", "sac de sable", "sandbag",
  "arraché", "épaulé", "wallball",
  // "développé militaire" retiré (28/01) : faux positif — c'est un mouvement
  // de force/hypertrophie standard (presse épaules), pas spécifique HYROX/
  // CrossFit, découvert en calculant coachScores sur "sys_developpe_militaire_
  // aux_halteres" (classé à tort crossfit_hyrox). Même liste dupliquée dans
  // curate-official-library.ts, non corrigée là-bas (déjà appliquée aux
  // données réelles des 300 officiels — hors scope de ce correctif).
];

const GYMNASTIC_BODYWEIGHT_KEYWORDS = [
  "traction", "pompe", "pompes", "dip", "dips", "pistol", "planche",
  "handstand", "poirier", "gainage", "abdominaux", "burpee", "montée",
  "pull-up", "push-up", "pull up", "push up",
];

/** Grands mouvements de force poly-articulaires — utilisé uniquement en
 * repli quand `raw`/`movementPattern` sont absents (les 27 exercices
 * `sys_*` historiques, sans import WorkoutX), pour éviter que "Squat avec
 * barre"/"Développé couché"/"Soulevé de terre" ne retombent par défaut dans
 * le bucket hypertrophie/isolation faute de signal. */
const FOUNDATIONAL_BARBELL_KEYWORDS = [
  "squat", "developpe couche", "developpe militaire", "souleve", "fente",
];

export function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

export function nameHasAny(record: ExerciseRecord, keywords: string[]): boolean {
  const name = stripDiacritics(`${record.nameFr} ${record.nameEn ?? ""}`.toLowerCase());
  const tags = ((record.raw as Record<string, unknown> | null)?.movement_tags as string[] | undefined) ?? [];
  const haystack = `${name} ${tags.join(" ").toLowerCase()}`;
  return keywords.some((k) => haystack.includes(stripDiacritics(k.toLowerCase())));
}

/** Même heuristique que `curate-official-library.ts` (300 officiels) —
 * fonctionne sur n'importe quel `ExerciseRecord`, enrichi ou non. */
export function classifyBucket(record: ExerciseRecord): Bucket {
  if (nameHasAny(record, HYROX_CROSSFIT_KEYWORDS)) return "crossfit_hyrox";

  if (record.category === "cardio") return "running_cardio";
  if (record.category === "mobility" || record.category === "stretching") return "mobilite_prevention";

  // Vérifié par nom même sans `equipment="bodyweight"` explicite — couvre les
  // 27 exercices `sys_*` historiques (equipment/raw/movementPattern tous
  // null), où "Pompes"/"Tractions strictes"/"Gainage (Planche)" retombaient
  // sinon dans le bucket hypertrophie faute de signal d'équipement.
  if (
    (record.equipment === "bodyweight" || record.equipment == null) &&
    nameHasAny(record, GYMNASTIC_BODYWEIGHT_KEYWORDS)
  ) {
    return "poids_du_corps_gymnastique";
  }
  if (record.equipment === "bodyweight") return "poids_du_corps_gymnastique";

  if (record.category === "plyometric") return "crossfit_hyrox";

  const mechanic = (record.raw as Record<string, unknown> | null)?.mechanic as string | undefined;
  if (mechanic === "compound") return "fondamentaux_force";
  if (mechanic === "isolation") return "musculation_hypertrophie";
  const isCompoundPattern = ["squat", "hinge", "carry"].includes(record.movementPattern ?? "");
  if (isCompoundPattern) return "fondamentaux_force";

  // Dernier repli, uniquement quand aucun signal fiable n'existe (`raw` et
  // `movementPattern` absents — encore le cas `sys_*`) : les grands
  // mouvements de force reconnus par nom plutôt qu'un défaut isolation.
  if (!mechanic && !record.movementPattern && nameHasAny(record, FOUNDATIONAL_BARBELL_KEYWORDS)) {
    return "fondamentaux_force";
  }
  return "musculation_hypertrophie";
}

export function probableCollections(record: ExerciseRecord, bucket: Bucket): FutureCollection[] {
  const tags = new Set<FutureCollection>();
  if (bucket === "crossfit_hyrox") {
    tags.add("crossfit");
    tags.add("hyrox");
  }
  if (bucket === "mobilite_prevention") tags.add("mobility_longevity");
  if (bucket === "running_cardio") tags.add("running_performance");
  if (bucket === "poids_du_corps_gymnastique") tags.add("home_gym");
  if (bucket === "fondamentaux_force" || bucket === "musculation_hypertrophie") tags.add("bodybuilding");
  if (["bodyweight", "dumbbell", "resistance_band"].includes(record.equipment ?? "")) tags.add("home_gym");
  if (record.difficulty === "beginner") tags.add("beginner_journey");
  return Array.from(tags);
}
