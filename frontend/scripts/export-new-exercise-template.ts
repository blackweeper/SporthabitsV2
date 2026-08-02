/**
 * Génère un template JSON "prêt à remplir" pour ajouter N nouveaux exercices
 * IronFlow originaux (pas un import WorkoutX, pas un enrichissement d'un
 * exercice existant — voir `export-manual-enrichment-template.ts` pour ça).
 * Chaque entrée est un `ExerciseRecord` complet avec absolument tous les
 * champs déjà présents (base + `enrichment`), valeurs vides typées
 * correctement (`null`/`[]`/`""` selon le type attendu) — l'utilisateur n'a
 * qu'à remplacer les valeurs, jamais à deviner un nom de champ.
 *
 * Convention d'id/média (choisie plutôt que "image_0301.webp" proposé) :
 * chaque exercice reçoit un id définitif `if_XXXX` ("IronFlow", 4 chiffres,
 * même style que les `wx_XXXX` importés de WorkoutX — jamais de collision,
 * aucun `if_*` n'existe dans la bibliothèque actuelle). Le résolveur média
 * (`useExerciseMedia.ts`) essaie déjà `media/ironflow/{id}.webp` en premier
 * pour CHAQUE exercice de la bibliothèque, sans aucun changement de code
 * nécessaire : il suffit de nommer chaque image `{id}.webp` (ex.
 * `if_0001.webp`) et de la déposer dans `exercise-library/media/ironflow/`.
 * Aucune correspondance séparée à tenir à jour.
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     TS_NODE_PROJECT=tsconfig.scripts.json \
 *     node --no-experimental-detect-module -r ts-node/register -r tsconfig-paths/register \
 *     scripts/export-new-exercise-template.ts [--count=100] [--start=1] [--out=<path>]
 */
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { EXERCISE_RECORD_CATEGORIES } from "../src/utils/exercise-record-category";
import { EXERCISE_MUSCLE_GROUPS } from "../src/utils/exercise-muscle-groups";
import { EXERCISE_EQUIPMENT } from "../src/utils/exercise-equipment";
import { MOVEMENT_PATTERNS } from "../src/utils/exercise-movement-pattern";
import { TRAINING_GOALS } from "../src/utils/exercise-training-goal";
import { DISCIPLINES } from "../src/utils/exercise-discipline";
import { FUTURE_COLLECTIONS } from "../src/utils/exercise-collection";

const ID_PREFIX = "if_";

// Valeurs dupliquées volontairement plutôt qu'importées depuis
// `exercise-difficulty.ts`/`scripts/lib/enrichment-shared.ts` : ces deux
// modules tirent `@/src/theme` (pour `EXERCISE_DIFFICULTY_COLOR`) qui importe
// `react-native`, ce que ts-node ne sait pas charger en script Node pur —
// même hasard déjà rencontré et documenté pour `coach-compute-scores.ts`
// (voir `scripts/lib/bucket-classification.ts`). Ces 5 listes sont stables
// et déjà utilisées ailleurs avec exactement ces valeurs.
const DIFFICULTY_VALUES = ["beginner", "intermediate", "advanced"] as const;
const EXERCISE_TYPE_VALUES = ["compound", "isolation", "cardio", "mobility", "stretch", "plyometric", "olympic"] as const;
const TECHNICAL_LEVEL_VALUES = ["low", "medium", "high"] as const;
const EQUIPMENT_LEVEL_VALUES = ["none", "basic", "gym"] as const;
const FATIGUE_LEVEL_VALUES = ["low", "medium", "high"] as const;
const TEMPLATE_VERSION = 3;

// Reprend exactement la forme JSON de `ExerciseRecord`/`ExerciseEnrichment`
// (src/utils/exercise-records.ts) — types "à plat" (string au lieu des
// unions TS) puisque ce fichier est un template JSON, validé plus tard par
// `import-new-exercises.ts`, pas compilé comme du TypeScript.
type NewExerciseTemplateEntry = {
  id: string;
  _mediaFile: string;
  source: "system";
  nameFr: string;
  nameEn: string | null;
  category: string;
  primaryMuscle: string | null;
  secondaryMuscles: string[];
  equipment: string | null;
  description: string | null;
  musclesWorkedNote: string | null;
  instructions: string[];
  tips: string[];
  commonMistakes: string[];
  difficulty: string | null;
  movementPattern: string | null;
  parentExerciseId: string | null;
  variantLabel: string | null;
  aliases: string[];
  exerciseTier: string | null;
  collections: string[];
  createdAt: string;
  enrichment: {
    translations: {
      fr: {
        name: string | null;
        description: string;
        instructions: string[];
        executionTips: string[];
        commonMistakes: string[];
        breathingTips: string | null;
        precautions: string | null;
        rationale: string;
        warmupSuggestion: string | null;
        mistakeCorrections: { mistake: string; correction: string }[];
      };
    };
    verifiedPrimaryMuscle: string | null;
    verifiedSecondaryMuscles: string[] | null;
    stabilizerMuscles: string[];
    alternativeExerciseIds: string[];
    exerciseType: string;
    tags: string[];
    technicalLevel: string;
    levelGuidance: Record<string, { note: string | null; prerequisites: string[] }>;
    muscleActivation: { primary: string[]; secondary: string[]; activationScore: Record<string, number> };
    equipmentLevel: string;
    trainingGoals: string[];
    fatigueLevel: string;
    restTimeByGoal: Record<string, string>;
    alternativeEquipment: string[];
    disciplines: string[];
    movementPatterns: string[];
    progressionExercises: { name: string }[];
    regressionExercises: { name: string }[];
    coachNotes: { execution: string[]; programming: string[]; safety: string[] };
  };
};

function padId(n: number): string {
  return `${ID_PREFIX}${String(n).padStart(4, "0")}`;
}

function buildEntry(n: number, generatedAt: string): NewExerciseTemplateEntry {
  const id = padId(n);
  return {
    id,
    _mediaFile: `${id}.webp`,
    source: "system",
    nameFr: "",
    nameEn: null,
    category: "",
    primaryMuscle: null,
    secondaryMuscles: [],
    equipment: null,
    description: null,
    musclesWorkedNote: null,
    instructions: [],
    tips: [],
    commonMistakes: [],
    difficulty: null,
    movementPattern: null,
    parentExerciseId: null,
    variantLabel: null,
    aliases: [],
    exerciseTier: null,
    collections: [],
    createdAt: generatedAt,
    enrichment: {
      translations: {
        fr: {
          name: null,
          description: "",
          instructions: [],
          executionTips: [],
          commonMistakes: [],
          breathingTips: null,
          precautions: null,
          rationale: "",
          warmupSuggestion: null,
          mistakeCorrections: [],
        },
      },
      verifiedPrimaryMuscle: null,
      verifiedSecondaryMuscles: null,
      stabilizerMuscles: [],
      alternativeExerciseIds: [],
      exerciseType: "",
      tags: [],
      technicalLevel: "",
      levelGuidance: {},
      muscleActivation: { primary: [], secondary: [], activationScore: {} },
      equipmentLevel: "",
      trainingGoals: [],
      fatigueLevel: "",
      restTimeByGoal: {},
      alternativeEquipment: [],
      disciplines: [],
      movementPatterns: [],
      progressionExercises: [],
      regressionExercises: [],
      coachNotes: { execution: [], programming: [], safety: [] },
    },
  };
}

function arg(name: string, fallback: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
}

function main() {
  const count = parseInt(arg("count", "100"), 10);
  const start = parseInt(arg("start", "1"), 10);
  const outPath = arg("out", "scripts/output/ironflow-new-exercises-template.json");

  const generatedAt = new Date().toISOString();
  const entries: NewExerciseTemplateEntry[] = [];
  for (let i = 0; i < count; i++) entries.push(buildEntry(start + i, generatedAt));

  const output = {
    _readme:
      "Voir scripts/output/NEW-EXERCISE-TEMPLATE-GUIDE.md pour la structure complète, un exemple rempli, et la liste des valeurs autorisées. Renvoie ce fichier (entier ou partiellement rempli) pour intégration via scripts/import-new-exercises.ts. Un exercice avec nameFr et category encore vides est ignoré à l'import (voir --dry-run).",
    generatedAt,
    count: entries.length,
    idRange: [entries[0]?.id, entries[entries.length - 1]?.id],
    allowedValues: {
      category: EXERCISE_RECORD_CATEGORIES,
      primaryMuscle_secondaryMuscles_verifiedPrimaryMuscle_verifiedSecondaryMuscles_stabilizerMuscles_muscleActivation:
        EXERCISE_MUSCLE_GROUPS.map((g) => g.key),
      equipment: EXERCISE_EQUIPMENT.map((e) => e.key),
      difficulty_technicalDifficulty_levelGuidanceKeys: DIFFICULTY_VALUES,
      movementPattern_movementPatterns: MOVEMENT_PATTERNS,
      trainingGoals_restTimeByGoalKeys: TRAINING_GOALS,
      disciplines: DISCIPLINES,
      collections: FUTURE_COLLECTIONS,
      exerciseType: EXERCISE_TYPE_VALUES,
      technicalLevel: TECHNICAL_LEVEL_VALUES,
      equipmentLevel: EQUIPMENT_LEVEL_VALUES,
      fatigueLevel: FATIGUE_LEVEL_VALUES,
      exerciseTier: ["essential", "official_core", "collection_only", "deprecated"],
    },
    templateVersion: TEMPLATE_VERSION,
    exercises: entries,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  if (existsSync(outPath)) {
    console.log(`Attention : ${outPath} existe déjà — écris dans un autre --out= si tu as déjà commencé à le remplir.`);
  }
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`${entries.length} entrée(s) générée(s) (${entries[0]?.id} → ${entries[entries.length - 1]?.id}) : ${outPath}`);
}

main();
