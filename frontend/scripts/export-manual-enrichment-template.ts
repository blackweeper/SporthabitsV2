/**
 * Extrait les ~300 exercices `essential`/`official_core` (curés par
 * `curate-official-library.ts`) dans un fichier séparé, petit et éditable à
 * la main — plutôt que de faire modifier directement
 * `exercise-library/versions/v2/exercises.json` (1348 enregistrements,
 * 5.5 Mo), risqué à éditer manuellement. Ce template est ensuite rempli par
 * l'utilisateur puis réintégré via `import-manual-enrichment.ts`.
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     node --no-experimental-detect-module -r ts-node/register \
 *     scripts/export-manual-enrichment-template.ts [--out=<path>]
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ExerciseRecord } from "../src/utils/exercise-records";

type TemplateEntry = {
  id: string;
  nameFr: string;
  nameEn: string | null;
  tier: "essential" | "official_core";
  // Contexte en lecture seule — déjà correct dans la bibliothèque de base ;
  // à ne modifier ici que si tu veux le CORRIGER (voir guide, ces valeurs se
  // reportent alors dans enrichment.verifiedPrimaryMuscle/difficulty, qui
  // prennent le dessus sur les champs bruts ci-dessous à l'affichage).
  reference: {
    category: string;
    primaryMuscle: string | null;
    secondaryMuscles: string[] | null;
    equipment: string | null;
    movementPattern: string | null;
    difficulty: string | null;
  };
  enrichment: {
    translations: {
      fr: {
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
    exerciseType: string;
    tags: string[];
    difficulty: string | null;
    technicalLevel: string;
    levelGuidance: Record<string, { note?: string | null; prerequisites?: string[] }>;
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

function main() {
  const args = process.argv.slice(2);
  const outPath = args.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "scripts/output/official-300-manual-template.json";

  const currentPath = "../exercise-library/current.json";
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));

  const curated = exercises.filter((r) => r.exerciseTier === "essential" || r.exerciseTier === "official_core");
  // Essential d'abord — ce sont les mouvements à traiter en priorité.
  curated.sort((a, b) => (a.exerciseTier === "essential" ? -1 : 1) - (b.exerciseTier === "essential" ? -1 : 1));

  const entries: TemplateEntry[] = curated.map((r) => ({
    id: r.id,
    nameFr: r.nameFr,
    nameEn: r.nameEn ?? null,
    tier: r.exerciseTier as "essential" | "official_core",
    reference: {
      category: r.category,
      primaryMuscle: r.primaryMuscle ?? null,
      secondaryMuscles: r.secondaryMuscles ?? null,
      equipment: r.equipment ?? null,
      movementPattern: r.movementPattern ?? null,
      difficulty: r.difficulty ?? null,
    },
    enrichment: {
      translations: {
        fr: {
          // Pré-rempli avec le texte brut WorkoutX existant comme brouillon de
          // départ — à réécrire dans la voix IronFlow, pas à laisser tel quel.
          description: r.description ?? "",
          instructions: r.instructions ?? [],
          executionTips: [],
          commonMistakes: r.commonMistakes ?? [],
          breathingTips: null,
          precautions: null,
          rationale: "",
          warmupSuggestion: null,
          mistakeCorrections: [],
        },
      },
      verifiedPrimaryMuscle: null,
      verifiedSecondaryMuscles: null,
      exerciseType: "",
      tags: [],
      difficulty: null,
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
  }));

  const output = {
    _readme:
      "Voir scripts/output/MANUAL-ENRICHMENT-GUIDE.md pour la structure complète, un exemple rempli à 100%, et la liste des champs obligatoires/optionnels. Renvoie ce fichier (entier ou partiellement rempli) pour intégration via import-manual-enrichment.ts.",
    generatedAt: new Date().toISOString(),
    count: entries.length,
    exercises: entries,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  if (existsSync(outPath)) {
    console.log(`Attention : ${outPath} existe déjà — écris dans un autre --out= si tu as déjà commencé à le remplir.`);
  }
  writeFileSync(outPath, JSON.stringify(output, null, 2), "utf-8");
  console.log(`${entries.length} exercice(s) exporté(s) (essential + official_core) : ${outPath}`);
}

main();
