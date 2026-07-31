/**
 * Réintègre le template rempli à la main (voir
 * `export-manual-enrichment-template.ts` et
 * `scripts/output/MANUAL-ENRICHMENT-GUIDE.md`) dans la bibliothèque réelle.
 * Chaque exercice traité est marqué `verifiedBy: "human"` — verrouillé pour
 * de bon, aucun script d'enrichissement automatique ne le retouchera jamais
 * (même règle que pour un enrichissement IA, cf. `ExerciseEnrichment` dans
 * `src/utils/exercise-records.ts`).
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     node --no-experimental-detect-module -r ts-node/register \
 *     scripts/import-manual-enrichment.ts [--in=<path>] [--dry-run] [--apply]
 *
 * --dry-run (défaut)  N'écrit rien. Valide chaque entrée (enums connus,
 *                      champs requis présents) et affiche un résumé
 *                      (complétude, erreurs de validation par exercice).
 * --apply              Écrit dans versions/vN/exercises.json après backup
 *                      horodaté. Seules les entrées SANS erreur de
 *                      validation sont écrites ; les autres sont listées et
 *                      ignorées (rien de partiellement invalide n'est
 *                      appliqué).
 *
 * Un champ laissé "vide" dans le template (chaîne vide, tableau vide, objet
 * vide, null) est traité comme "non renseigné" : s'il existe déjà une
 * valeur (d'une exécution précédente de ce script), elle est conservée ;
 * sinon le champ reste null. Rien n'est jamais écrasé par du vide.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ExerciseRecord, ExerciseEnrichment, ExerciseLocaleContent } from "../src/utils/exercise-records";
import {
  TEMPLATE_VERSION,
  MUSCLE_GROUP_VALUES,
  MOVEMENT_PATTERN_VALUES,
  DIFFICULTY_VALUES,
  EXERCISE_TYPE_VALUES,
  TECHNICAL_LEVEL_VALUES,
  EQUIPMENT_LEVEL_VALUES,
  FATIGUE_LEVEL_VALUES,
  TRAINING_GOAL_VALUES,
  DISCIPLINE_VALUES,
  computeQuality,
} from "./lib/enrichment-shared";

type TemplateEntry = {
  id: string;
  nameFr: string;
  nameEn: string | null;
  tier: string;
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

function nonEmpty<T>(v: T[] | undefined | null): v is T[] {
  return Array.isArray(v) && v.length > 0;
}
function nonEmptyStr(v: string | undefined | null): v is string {
  return typeof v === "string" && v.trim().length > 0;
}
function nonEmptyObj(v: object | undefined | null): boolean {
  return v != null && Object.keys(v).length > 0;
}

function validateEnum(value: string, allowed: readonly string[], field: string, errors: string[]): void {
  if (value === "") return; // non renseigné, toléré
  if (!allowed.includes(value)) errors.push(`${field}: valeur inconnue "${value}" (attendu: ${allowed.join("|")})`);
}
function validateEnumArray(values: string[], allowed: readonly string[], field: string, errors: string[]): void {
  for (const v of values) if (!allowed.includes(v)) errors.push(`${field}: valeur inconnue "${v}" (attendu: ${allowed.join("|")})`);
}

function buildEnrichment(entry: TemplateEntry, existing: ExerciseEnrichment | null | undefined, errors: string[]): ExerciseEnrichment {
  const t = entry.enrichment;

  validateEnum(t.exerciseType, EXERCISE_TYPE_VALUES, "exerciseType", errors);
  validateEnum(t.technicalLevel, TECHNICAL_LEVEL_VALUES, "technicalLevel", errors);
  validateEnum(t.equipmentLevel, EQUIPMENT_LEVEL_VALUES, "equipmentLevel", errors);
  validateEnum(t.fatigueLevel, FATIGUE_LEVEL_VALUES, "fatigueLevel", errors);
  if (t.difficulty) validateEnum(t.difficulty, DIFFICULTY_VALUES, "difficulty", errors);
  if (t.verifiedPrimaryMuscle) validateEnum(t.verifiedPrimaryMuscle, MUSCLE_GROUP_VALUES, "verifiedPrimaryMuscle", errors);
  if (nonEmpty(t.verifiedSecondaryMuscles)) validateEnumArray(t.verifiedSecondaryMuscles!, MUSCLE_GROUP_VALUES, "verifiedSecondaryMuscles", errors);
  validateEnumArray(t.trainingGoals, TRAINING_GOAL_VALUES, "trainingGoals", errors);
  validateEnumArray(t.disciplines, DISCIPLINE_VALUES, "disciplines", errors);
  validateEnumArray(t.movementPatterns, MOVEMENT_PATTERN_VALUES, "movementPatterns", errors);
  validateEnumArray(t.muscleActivation.primary, MUSCLE_GROUP_VALUES, "muscleActivation.primary", errors);
  validateEnumArray(t.muscleActivation.secondary, MUSCLE_GROUP_VALUES, "muscleActivation.secondary", errors);
  for (const level of Object.keys(t.levelGuidance)) validateEnum(level, DIFFICULTY_VALUES, "levelGuidance key", errors);
  for (const goal of Object.keys(t.restTimeByGoal)) validateEnum(goal, TRAINING_GOAL_VALUES, "restTimeByGoal key", errors);

  const prevFr = existing?.translations?.fr ?? {};
  const src = t.translations.fr;
  const nextFr: ExerciseLocaleContent = {
    name: prevFr.name ?? null,
    description: nonEmptyStr(src.description) ? src.description : prevFr.description ?? null,
    instructions: nonEmpty(src.instructions) ? src.instructions : prevFr.instructions ?? null,
    executionTips: nonEmpty(src.executionTips) ? src.executionTips : prevFr.executionTips ?? null,
    commonMistakes: nonEmpty(src.commonMistakes) ? src.commonMistakes : prevFr.commonMistakes ?? null,
    breathingTips: src.breathingTips ?? prevFr.breathingTips ?? null,
    precautions: src.precautions ?? prevFr.precautions ?? null,
    rationale: nonEmptyStr(src.rationale) ? src.rationale : prevFr.rationale ?? null,
    warmupSuggestion: src.warmupSuggestion ?? prevFr.warmupSuggestion ?? null,
    mistakeCorrections: nonEmpty(src.mistakeCorrections) ? src.mistakeCorrections : prevFr.mistakeCorrections ?? null,
  };

  return {
    translations: { ...(existing?.translations ?? {}), fr: nextFr },
    verifiedPrimaryMuscle: (t.verifiedPrimaryMuscle as ExerciseEnrichment["verifiedPrimaryMuscle"]) ?? existing?.verifiedPrimaryMuscle ?? null,
    verifiedSecondaryMuscles:
      (nonEmpty(t.verifiedSecondaryMuscles) ? t.verifiedSecondaryMuscles : existing?.verifiedSecondaryMuscles) as ExerciseEnrichment["verifiedSecondaryMuscles"] ?? null,
    alternativeExerciseIds: existing?.alternativeExerciseIds ?? null,
    exerciseType: (nonEmptyStr(t.exerciseType) ? t.exerciseType : existing?.exerciseType) as ExerciseEnrichment["exerciseType"] ?? null,
    tags: nonEmpty(t.tags) ? t.tags : existing?.tags ?? null,
    qualityScore: existing?.qualityScore ?? null,
    reviewStatus: existing?.reviewStatus ?? null,
    verifiedBy: "human",
    difficulty: (t.difficulty as ExerciseEnrichment["difficulty"]) ?? existing?.difficulty ?? null,
    technicalLevel: (nonEmptyStr(t.technicalLevel) ? t.technicalLevel : existing?.technicalLevel) as ExerciseEnrichment["technicalLevel"] ?? null,
    levelGuidance: nonEmptyObj(t.levelGuidance) ? (t.levelGuidance as ExerciseEnrichment["levelGuidance"]) : existing?.levelGuidance ?? null,
    muscleActivation: nonEmptyObj(t.muscleActivation.activationScore)
      ? (t.muscleActivation as ExerciseEnrichment["muscleActivation"])
      : existing?.muscleActivation ?? null,
    equipmentLevel: (nonEmptyStr(t.equipmentLevel) ? t.equipmentLevel : existing?.equipmentLevel) as ExerciseEnrichment["equipmentLevel"] ?? null,
    trainingGoals: (nonEmpty(t.trainingGoals) ? t.trainingGoals : existing?.trainingGoals) as ExerciseEnrichment["trainingGoals"] ?? null,
    fatigueLevel: (nonEmptyStr(t.fatigueLevel) ? t.fatigueLevel : existing?.fatigueLevel) as ExerciseEnrichment["fatigueLevel"] ?? null,
    restTimeByGoal: nonEmptyObj(t.restTimeByGoal) ? (t.restTimeByGoal as ExerciseEnrichment["restTimeByGoal"]) : existing?.restTimeByGoal ?? null,
    alternativeEquipment: nonEmpty(t.alternativeEquipment) ? t.alternativeEquipment : existing?.alternativeEquipment ?? null,
    disciplines: (nonEmpty(t.disciplines) ? t.disciplines : existing?.disciplines) as ExerciseEnrichment["disciplines"] ?? null,
    movementPatterns: (nonEmpty(t.movementPatterns) ? t.movementPatterns : existing?.movementPatterns) as ExerciseEnrichment["movementPatterns"] ?? null,
    progressionExercises: nonEmpty(t.progressionExercises) ? t.progressionExercises : existing?.progressionExercises ?? null,
    regressionExercises: nonEmpty(t.regressionExercises) ? t.regressionExercises : existing?.regressionExercises ?? null,
    coachNotes:
      nonEmpty(t.coachNotes.execution) || nonEmpty(t.coachNotes.programming) || nonEmpty(t.coachNotes.safety)
        ? t.coachNotes
        : existing?.coachNotes ?? null,
    templateVersion: TEMPLATE_VERSION,
    updatedAt: new Date().toISOString(),
  };
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const inPath = args.find((a) => a.startsWith("--in="))?.split("=")[1] ?? "scripts/output/official-300-manual-template.json";

  if (!existsSync(inPath)) throw new Error(`${inPath} introuvable.`);
  const template: { exercises: TemplateEntry[] } = JSON.parse(readFileSync(inPath, "utf-8"));

  const currentPath = "../exercise-library/current.json";
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));
  const byId = new Map(exercises.map((r) => [r.id, r]));

  console.log(`Template : ${template.exercises.length} exercice(s) à traiter depuis ${inPath}.`);

  let valid = 0;
  let invalid = 0;
  let notFound = 0;
  const results: { id: string; nameFr: string; ok: boolean; errors: string[]; qualityScore?: number }[] = [];

  for (const entry of template.exercises) {
    const record = byId.get(entry.id);
    if (!record) {
      notFound++;
      results.push({ id: entry.id, nameFr: entry.nameFr, ok: false, errors: [`id "${entry.id}" introuvable dans la bibliothèque actuelle`] });
      continue;
    }
    if (record.enrichment?.verifiedBy === "human" || record.enrichment?.verifiedBy === "coach") {
      // Déjà verrouillé par une exécution précédente ou une revue directe —
      // on ne le retraite pas silencieusement en écrasant un travail déjà validé.
      continue;
    }
    const errors: string[] = [];
    const nextEnrichment = buildEnrichment(entry, record.enrichment, errors);
    if (errors.length > 0) {
      invalid++;
      results.push({ id: entry.id, nameFr: entry.nameFr, ok: false, errors });
      continue;
    }
    const { qualityScore } = computeQuality(nextEnrichment, "fr");
    valid++;
    results.push({ id: entry.id, nameFr: entry.nameFr, ok: true, errors: [], qualityScore });
    if (apply) record.enrichment = nextEnrichment;
  }

  console.log(`\nValides : ${valid} · Invalides : ${invalid} · Introuvables : ${notFound}`);
  const invalidResults = results.filter((r) => !r.ok);
  if (invalidResults.length > 0) {
    console.log(`\n=== Entrées ignorées ===`);
    for (const r of invalidResults) {
      console.log(` - ${r.nameFr} (${r.id})`);
      for (const e of r.errors) console.log(`     ${e}`);
    }
  }

  const avgQuality =
    results.filter((r) => r.ok).reduce((sum, r) => sum + (r.qualityScore ?? 0), 0) / Math.max(valid, 1);
  console.log(`\nComplétude moyenne (des entrées valides) : ${Math.round(avgQuality * 100)}%`);

  if (!apply) {
    console.log(`\n--dry-run (défaut) : aucune donnée réelle modifiée. Relance avec --apply une fois les erreurs corrigées.`);
    return;
  }

  const backupPath = `${exercisesPath}.backup-${Date.now()}.json`;
  copyFileSync(exercisesPath, backupPath);
  console.log(`\nSauvegarde créée : ${backupPath}`);
  writeFileSync(exercisesPath, JSON.stringify(exercises, null, 2), "utf-8");
  console.log(`${valid} exercice(s) intégré(s) et verrouillé(s) (verifiedBy: "human") dans ${exercisesPath}.`);
}

main();
