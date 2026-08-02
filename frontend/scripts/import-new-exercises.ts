/**
 * Réintègre le template "nouveaux exercices" (voir
 * `export-new-exercise-template.ts` et
 * `scripts/output/NEW-EXERCISE-TEMPLATE-GUIDE.md`) dans la bibliothèque
 * réelle — CRÉE de nouveaux `ExerciseRecord` (id `if_XXXX`), contrairement à
 * `import-manual-enrichment.ts` qui n'enrichit que des exercices déjà
 * existants. Ré-exécutable sans risque : un id déjà présent dans la
 * bibliothèque est mis à jour (jamais dupliqué), en ne remplaçant jamais une
 * valeur déjà renseignée par du vide (même règle que le reste du pipeline).
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     TS_NODE_PROJECT=tsconfig.scripts.json \
 *     node --no-experimental-detect-module -r ts-node/register -r tsconfig-paths/register \
 *     scripts/import-new-exercises.ts [--in=<path>] [--dry-run] [--apply]
 *
 * --dry-run (défaut)  N'écrit rien. Valide chaque entrée (enums connus,
 *                      nameFr/category renseignés) et affiche un résumé.
 * --apply              Écrit dans versions/vN/exercises.json après backup
 *                      horodaté. Seules les entrées SANS erreur sont
 *                      écrites ; les autres sont listées et ignorées.
 *
 * Un exercice dont `nameFr` ou `category` sont encore vides est considéré
 * "pas encore rempli" — ignoré silencieusement (compté séparément dans le
 * résumé), pas une erreur : c'est normal de renvoyer un fichier partiellement
 * complété. `coachScores`/`qualityScore`/`reviewStatus` restent `null` à
 * l'import — `coachScores` est recalculé séparément pour tout le catalogue
 * par `coach-compute-scores.ts`, pas ici.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ExerciseRecord, ExerciseEnrichment, ExerciseLocaleContent } from "../src/utils/exercise-records";
import { EXERCISE_RECORD_CATEGORIES } from "../src/utils/exercise-record-category";
import { EXERCISE_MUSCLE_GROUPS } from "../src/utils/exercise-muscle-groups";
import { EXERCISE_EQUIPMENT } from "../src/utils/exercise-equipment";
import { MOVEMENT_PATTERNS } from "../src/utils/exercise-movement-pattern";
import { TRAINING_GOALS } from "../src/utils/exercise-training-goal";
import { DISCIPLINES } from "../src/utils/exercise-discipline";
import { FUTURE_COLLECTIONS } from "../src/utils/exercise-collection";

// Dupliqué volontairement plutôt qu'importé depuis `exercise-difficulty.ts`/
// `scripts/lib/enrichment-shared.ts` — même hasard ts-node/theme.ts que
// `export-new-exercise-template.ts` (voir son commentaire), toujours non
// résolu à ce jour (affecte aussi `import-manual-enrichment.ts` existant,
// signalé séparément — pas corrigé ici, hors périmètre de ce script).
const DIFFICULTY_VALUES = ["beginner", "intermediate", "advanced"] as const;
const EXERCISE_TYPE_VALUES = ["compound", "isolation", "cardio", "mobility", "stretch", "plyometric", "olympic"] as const;
const TECHNICAL_LEVEL_VALUES = ["low", "medium", "high"] as const;
const EQUIPMENT_LEVEL_VALUES = ["none", "basic", "gym"] as const;
const FATIGUE_LEVEL_VALUES = ["low", "medium", "high"] as const;
const TEMPLATE_VERSION = 3;
const TIER_VALUES = ["essential", "official_core", "collection_only", "deprecated"] as const;

const CATEGORY_VALUES = EXERCISE_RECORD_CATEGORIES;
const MUSCLE_VALUES = EXERCISE_MUSCLE_GROUPS.map((g) => g.key);
const EQUIPMENT_VALUES = EXERCISE_EQUIPMENT.map((e) => e.key);

type TemplateEntry = {
  id: string;
  source?: string;
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
/** Normalise une valeur d'enum tolérante à la casse/aux espaces avant
 * comparaison ("Hip Flexors" / "hip-flexors" → "hip_flexors") — la
 * convention réelle du schéma est toujours snake_case, mais un fichier
 * rempli à la main (ou par un LLM) écrit naturellement en anglais avec des
 * espaces. Ne change jamais le SENS d'une valeur, seulement son format. */
function normalizeEnumString(v: string): string {
  return v.trim().toLowerCase().replace(/[\s-]+/g, "_");
}
function normalizeEnumArray(values: string[]): string[] {
  return values.map(normalizeEnumString);
}
/** Normalise, in place, tous les champs de type enum d'une entrée de
 * template avant validation/écriture — même règle appliquée partout, une
 * seule fois, plutôt que dispersée à chaque site d'appel. */
function normalizeEntry(entry: TemplateEntry): TemplateEntry {
  if (entry.category) entry.category = normalizeEnumString(entry.category);
  if (entry.primaryMuscle) entry.primaryMuscle = normalizeEnumString(entry.primaryMuscle);
  entry.secondaryMuscles = normalizeEnumArray(entry.secondaryMuscles);
  if (entry.equipment) entry.equipment = normalizeEnumString(entry.equipment);
  if (entry.difficulty) entry.difficulty = normalizeEnumString(entry.difficulty);
  if (entry.movementPattern) entry.movementPattern = normalizeEnumString(entry.movementPattern);
  if (entry.exerciseTier) entry.exerciseTier = normalizeEnumString(entry.exerciseTier);
  entry.collections = normalizeEnumArray(entry.collections);

  const t = entry.enrichment;
  if (t.verifiedPrimaryMuscle) t.verifiedPrimaryMuscle = normalizeEnumString(t.verifiedPrimaryMuscle);
  if (t.verifiedSecondaryMuscles) t.verifiedSecondaryMuscles = normalizeEnumArray(t.verifiedSecondaryMuscles);
  t.stabilizerMuscles = normalizeEnumArray(t.stabilizerMuscles);
  if (t.exerciseType) t.exerciseType = normalizeEnumString(t.exerciseType);
  if (t.technicalLevel) t.technicalLevel = normalizeEnumString(t.technicalLevel);
  if (t.equipmentLevel) t.equipmentLevel = normalizeEnumString(t.equipmentLevel);
  if (t.fatigueLevel) t.fatigueLevel = normalizeEnumString(t.fatigueLevel);
  t.trainingGoals = normalizeEnumArray(t.trainingGoals);
  t.disciplines = normalizeEnumArray(t.disciplines);
  t.movementPatterns = normalizeEnumArray(t.movementPatterns);
  t.muscleActivation.primary = normalizeEnumArray(t.muscleActivation.primary);
  t.muscleActivation.secondary = normalizeEnumArray(t.muscleActivation.secondary);
  t.levelGuidance = Object.fromEntries(Object.entries(t.levelGuidance).map(([k, v]) => [normalizeEnumString(k), v]));
  t.restTimeByGoal = Object.fromEntries(Object.entries(t.restTimeByGoal).map(([k, v]) => [normalizeEnumString(k), v]));
  return entry;
}

function validateEnum(value: string | null | undefined, allowed: readonly string[], field: string, errors: string[]): void {
  if (!value) return; // non renseigné, toléré (sauf champs vraiment requis, vérifiés séparément)
  if (!allowed.includes(value)) errors.push(`${field}: valeur inconnue "${value}" (attendu: ${allowed.join("|")})`);
}
function validateEnumArray(values: string[], allowed: readonly string[], field: string, errors: string[]): void {
  for (const v of values) if (!allowed.includes(v)) errors.push(`${field}: valeur inconnue "${v}" (attendu: ${allowed.join("|")})`);
}

function buildEnrichment(entry: TemplateEntry, existing: ExerciseEnrichment | null | undefined, errors: string[]): ExerciseEnrichment {
  const t = entry.enrichment;

  if (t.verifiedPrimaryMuscle) validateEnum(t.verifiedPrimaryMuscle, MUSCLE_VALUES, "enrichment.verifiedPrimaryMuscle", errors);
  if (nonEmpty(t.verifiedSecondaryMuscles)) validateEnumArray(t.verifiedSecondaryMuscles!, MUSCLE_VALUES, "enrichment.verifiedSecondaryMuscles", errors);
  validateEnumArray(t.stabilizerMuscles, MUSCLE_VALUES, "enrichment.stabilizerMuscles", errors);
  validateEnum(t.exerciseType, EXERCISE_TYPE_VALUES, "enrichment.exerciseType", errors);
  validateEnum(t.technicalLevel, TECHNICAL_LEVEL_VALUES, "enrichment.technicalLevel", errors);
  validateEnum(t.equipmentLevel, EQUIPMENT_LEVEL_VALUES, "enrichment.equipmentLevel", errors);
  validateEnum(t.fatigueLevel, FATIGUE_LEVEL_VALUES, "enrichment.fatigueLevel", errors);
  validateEnumArray(t.trainingGoals, TRAINING_GOALS, "enrichment.trainingGoals", errors);
  validateEnumArray(t.disciplines, DISCIPLINES, "enrichment.disciplines", errors);
  validateEnumArray(t.movementPatterns, MOVEMENT_PATTERNS, "enrichment.movementPatterns", errors);
  validateEnumArray(t.muscleActivation.primary, MUSCLE_VALUES, "enrichment.muscleActivation.primary", errors);
  validateEnumArray(t.muscleActivation.secondary, MUSCLE_VALUES, "enrichment.muscleActivation.secondary", errors);
  for (const level of Object.keys(t.levelGuidance)) validateEnum(level, DIFFICULTY_VALUES, "enrichment.levelGuidance key", errors);
  for (const goal of Object.keys(t.restTimeByGoal)) validateEnum(goal, TRAINING_GOALS, "enrichment.restTimeByGoal key", errors);

  const prevFr = existing?.translations?.fr ?? {};
  const src = t.translations.fr;
  const nextFr: ExerciseLocaleContent = {
    name: src.name ?? prevFr.name ?? null,
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
    stabilizerMuscles: (nonEmpty(t.stabilizerMuscles) ? t.stabilizerMuscles : existing?.stabilizerMuscles) as ExerciseEnrichment["stabilizerMuscles"] ?? null,
    alternativeExerciseIds: nonEmpty(t.alternativeExerciseIds) ? t.alternativeExerciseIds : existing?.alternativeExerciseIds ?? null,
    exerciseType: (nonEmptyStr(t.exerciseType) ? t.exerciseType : existing?.exerciseType) as ExerciseEnrichment["exerciseType"] ?? null,
    tags: nonEmpty(t.tags) ? t.tags : existing?.tags ?? null,
    qualityScore: existing?.qualityScore ?? null,
    reviewStatus: existing?.reviewStatus ?? null,
    verifiedBy: existing?.verifiedBy ?? "human",
    difficulty: existing?.difficulty ?? null,
    technicalLevel: (nonEmptyStr(t.technicalLevel) ? t.technicalLevel : existing?.technicalLevel) as ExerciseEnrichment["technicalLevel"] ?? null,
    levelGuidance: nonEmptyObj(t.levelGuidance) ? (t.levelGuidance as ExerciseEnrichment["levelGuidance"]) : existing?.levelGuidance ?? null,
    muscleActivation: nonEmptyObj(t.muscleActivation.activationScore) || nonEmpty(t.muscleActivation.primary) || nonEmpty(t.muscleActivation.secondary)
      ? (t.muscleActivation as ExerciseEnrichment["muscleActivation"])
      : existing?.muscleActivation ?? null,
    equipmentLevel: (nonEmptyStr(t.equipmentLevel) ? t.equipmentLevel : existing?.equipmentLevel) as ExerciseEnrichment["equipmentLevel"] ?? null,
    trainingGoals: (nonEmpty(t.trainingGoals) ? t.trainingGoals : existing?.trainingGoals) as ExerciseEnrichment["trainingGoals"] ?? null,
    fatigueLevel: (nonEmptyStr(t.fatigueLevel) ? t.fatigueLevel : existing?.fatigueLevel) as ExerciseEnrichment["fatigueLevel"] ?? null,
    restTimeByGoal: nonEmptyObj(t.restTimeByGoal) ? (t.restTimeByGoal as ExerciseEnrichment["restTimeByGoal"]) : existing?.restTimeByGoal ?? null,
    alternativeEquipment: nonEmpty(t.alternativeEquipment) ? t.alternativeEquipment : existing?.alternativeEquipment ?? null,
    disciplines: (nonEmpty(t.disciplines) ? t.disciplines : existing?.disciplines) as ExerciseEnrichment["disciplines"] ?? null,
    movementPatterns: (nonEmpty(t.movementPatterns) ? t.movementPatterns : existing?.movementPatterns) as ExerciseEnrichment["movementPatterns"] ?? null,
    progressionExercises: nonEmpty(t.progressionExercises) ? t.progressionExercises.map((p) => ({ name: p.name, id: null })) : existing?.progressionExercises ?? null,
    regressionExercises: nonEmpty(t.regressionExercises) ? t.regressionExercises.map((p) => ({ name: p.name, id: null })) : existing?.regressionExercises ?? null,
    coachNotes:
      nonEmpty(t.coachNotes.execution) || nonEmpty(t.coachNotes.programming) || nonEmpty(t.coachNotes.safety)
        ? t.coachNotes
        : existing?.coachNotes ?? null,
    coachScores: existing?.coachScores ?? null,
    templateVersion: TEMPLATE_VERSION,
    updatedAt: new Date().toISOString(),
  };
}

function buildRecord(entry: TemplateEntry, existing: ExerciseRecord | undefined, errors: string[]): ExerciseRecord {
  if (entry.primaryMuscle) validateEnum(entry.primaryMuscle, MUSCLE_VALUES, "primaryMuscle", errors);
  validateEnumArray(entry.secondaryMuscles, MUSCLE_VALUES, "secondaryMuscles", errors);
  if (entry.equipment) validateEnum(entry.equipment, EQUIPMENT_VALUES, "equipment", errors);
  if (entry.difficulty) validateEnum(entry.difficulty, DIFFICULTY_VALUES, "difficulty", errors);
  if (entry.movementPattern) validateEnum(entry.movementPattern, MOVEMENT_PATTERNS, "movementPattern", errors);
  if (entry.exerciseTier) validateEnum(entry.exerciseTier, TIER_VALUES, "exerciseTier", errors);
  validateEnumArray(entry.collections, FUTURE_COLLECTIONS, "collections", errors);

  const now = new Date().toISOString();
  return {
    id: entry.id,
    source: "system",
    nameFr: entry.nameFr.trim(),
    nameEn: entry.nameEn ?? existing?.nameEn ?? null,
    category: entry.category as ExerciseRecord["category"],
    primaryMuscle: (entry.primaryMuscle as ExerciseRecord["primaryMuscle"]) ?? existing?.primaryMuscle ?? null,
    secondaryMuscles: (nonEmpty(entry.secondaryMuscles) ? entry.secondaryMuscles : existing?.secondaryMuscles) as ExerciseRecord["secondaryMuscles"] ?? null,
    equipment: (entry.equipment as ExerciseRecord["equipment"]) ?? existing?.equipment ?? null,
    description: entry.description ?? existing?.description ?? null,
    musclesWorkedNote: entry.musclesWorkedNote ?? existing?.musclesWorkedNote ?? null,
    instructions: nonEmpty(entry.instructions) ? entry.instructions : existing?.instructions ?? null,
    tips: nonEmpty(entry.tips) ? entry.tips : existing?.tips ?? null,
    commonMistakes: nonEmpty(entry.commonMistakes) ? entry.commonMistakes : existing?.commonMistakes ?? null,
    difficulty: (entry.difficulty as ExerciseRecord["difficulty"]) ?? existing?.difficulty ?? null,
    media: existing?.media ?? null,
    movementPattern: (entry.movementPattern as ExerciseRecord["movementPattern"]) ?? existing?.movementPattern ?? null,
    parentExerciseId: entry.parentExerciseId ?? existing?.parentExerciseId ?? null,
    variantLabel: entry.variantLabel ?? existing?.variantLabel ?? null,
    aliases: nonEmpty(entry.aliases) ? entry.aliases : existing?.aliases ?? null,
    exerciseTier: (entry.exerciseTier as ExerciseRecord["exerciseTier"]) ?? existing?.exerciseTier ?? null,
    collections: (nonEmpty(entry.collections) ? entry.collections : existing?.collections) as ExerciseRecord["collections"] ?? null,
    favoritedAt: existing?.favoritedAt ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    raw: existing?.raw ?? null,
    enrichment: buildEnrichment(entry, existing?.enrichment, errors),
  };
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const inPath = args.find((a) => a.startsWith("--in="))?.split("=")[1] ?? "scripts/output/ironflow-new-exercises-template.json";

  if (!existsSync(inPath)) throw new Error(`${inPath} introuvable.`);
  const template: { exercises: TemplateEntry[] } = JSON.parse(readFileSync(inPath, "utf-8"));

  const currentPath = "../exercise-library/current.json";
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));
  const byId = new Map(exercises.map((r) => [r.id, r]));

  console.log(`Template : ${template.exercises.length} entrée(s) à traiter depuis ${inPath}.`);

  let created = 0;
  let updated = 0;
  let invalid = 0;
  let notFilled = 0;
  const results: { id: string; nameFr: string; ok: boolean; skipped?: boolean; errors: string[] }[] = [];

  for (const rawEntry of template.exercises) {
    const entry = normalizeEntry(rawEntry);
    if (!nonEmptyStr(entry.nameFr) || !nonEmptyStr(entry.category)) {
      notFilled++;
      continue; // pas encore rempli — normal, pas une erreur
    }

    const existing = byId.get(entry.id);
    const errors: string[] = [];
    if (!nonEmptyStr(entry.nameFr)) errors.push("nameFr requis");
    if (!CATEGORY_VALUES.includes(entry.category as (typeof CATEGORY_VALUES)[number])) {
      errors.push(`category: valeur inconnue "${entry.category}" (attendu: ${CATEGORY_VALUES.join("|")})`);
    }

    const record = buildRecord(entry, existing, errors);
    if (errors.length > 0) {
      invalid++;
      results.push({ id: entry.id, nameFr: entry.nameFr, ok: false, errors });
      continue;
    }

    if (existing) updated++;
    else created++;
    results.push({ id: entry.id, nameFr: entry.nameFr, ok: true, errors: [] });
    if (apply) byId.set(entry.id, record);
  }

  console.log(`\nÀ créer : ${created} · À mettre à jour : ${updated} · Invalides : ${invalid} · Pas encore remplis : ${notFilled}`);
  const invalidResults = results.filter((r) => !r.ok);
  if (invalidResults.length > 0) {
    console.log(`\n=== Entrées ignorées (erreurs) ===`);
    for (const r of invalidResults) {
      console.log(` - ${r.nameFr || "(sans nom)"} (${r.id})`);
      for (const e of r.errors) console.log(`     ${e}`);
    }
  }

  if (!apply) {
    console.log(`\n--dry-run (défaut) : aucune donnée réelle modifiée. Relance avec --apply une fois les erreurs corrigées.`);
    return;
  }

  const nextExercises = Array.from(byId.values());
  const backupPath = `${exercisesPath}.backup-${Date.now()}.json`;
  copyFileSync(exercisesPath, backupPath);
  console.log(`\nSauvegarde créée : ${backupPath}`);
  writeFileSync(exercisesPath, JSON.stringify(nextExercises, null, 2), "utf-8");
  console.log(`${created + updated} exercice(s) intégré(s) (${created} créé(s), ${updated} mis à jour) dans ${exercisesPath}.`);
  console.log(`Rappel : lance ensuite scripts/coach-compute-scores.ts --apply pour calculer coachScores sur ces nouveaux exercices.`);
}

main();
