/**
 * Coach IronFlow — calcul des valeurs par défaut de `ExerciseEnrichment.coachScores`
 * (fatigueNervous, fatigueMuscular, technicalDifficulty, goalValue) sur la
 * TOTALITÉ des exercices de la bibliothèque (les 1348, pas seulement les 300
 * officiels) — un programme généré pour un besoin spécifique (matériel
 * niche, discipline peu couverte par les 300) doit pouvoir piocher dans le
 * reste du catalogue plutôt que d'être bloqué à un sous-ensemble curaté.
 *
 * Deux sources selon ce qui existe déjà par exercice :
 *  - Les 300 `essential`/`official_core` ont un `enrichment` vérifié humain
 *    (trainingGoals/disciplines/fatigueLevel/technicalLevel, 100% rempli) —
 *    utilisé directement comme source la plus fiable.
 *  - Les ~1048 `collection_only` n'ont aucun enrichment — un score par
 *    défaut est dérivé des champs bruts (equipment/primaryMuscle/
 *    movementPattern/raw.mechanic/category), en réutilisant `classifyBucket`
 *    de `curate-official-library.ts` (même heuristique déjà validée sur ces
 *    1348 exercices, pas une nouvelle logique parallèle).
 *
 * Ce sont des valeurs de DÉPART, jamais un prérequis bloquant pour que le
 * moteur fonctionne — un raffinement manuel exercice par exercice reste
 * possible plus tard, comme pour le reste de `enrichment` (additif, jamais
 * écrasé si déjà présent, sauf `--force`).
 *
 * Usage (depuis frontend/) :
 *   node -r ts-node/register scripts/coach-compute-scores.ts [--dry-run] [--apply] [--force] [--out=<path>]
 *
 * --dry-run (défaut)  N'écrit aucune donnée réelle, génère un rapport (JSON + résumé console).
 * --apply              Écrit `enrichment.coachScores` dans versions/vN/exercises.json, après backup horodaté.
 * --force              Recalcule même les exercices qui ont déjà un `coachScores` (sinon ignorés).
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ExerciseRecord } from "../src/utils/exercise-records";
import type { TrainingGoal } from "../src/utils/exercise-training-goal";
import { classifyBucket, type Bucket } from "./lib/bucket-classification";

// ---------- Heuristic defaults per bucket (used only when no enrichment exists) ----------

const BUCKET_GOAL_VALUES: Record<Bucket, Partial<Record<TrainingGoal, number>>> = {
  fondamentaux_force: { strength: 8, power: 6, hypertrophy: 4, stability: 4 },
  musculation_hypertrophie: { hypertrophy: 8, strength: 4, stability: 3 },
  crossfit_hyrox: { crossfit: 8, hyrox: 8, conditioning: 7, power: 5, endurance: 4 },
  poids_du_corps_gymnastique: { hypertrophy: 5, strength: 4, stability: 6, conditioning: 4, power: 3 },
  running_cardio: { endurance: 8, conditioning: 6 },
  mobilite_prevention: { mobility: 8, rehabilitation: 5, stability: 4 },
};

const RUNNING_KEYWORDS = ["course", "running", "sprint", "tapis"];
const OLYMPIC_KEYWORDS = ["snatch", "clean", "jerk", "arrache", "epaule", "epaule-jete"];
const CARDIO_EQUIPMENT = new Set(["rowing_machine", "assault_bike", "ski_erg", "jump_rope", "treadmill"]);
const DIFFICULTY_BASE_TECHNICAL: Record<string, number> = { beginner: 2, intermediate: 5, advanced: 7 };

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function nameHasAny(record: ExerciseRecord, keywords: string[]): boolean {
  const name = stripDiacritics(`${record.nameFr} ${record.nameEn ?? ""}`.toLowerCase());
  return keywords.some((k) => name.includes(stripDiacritics(k)));
}

function heuristicGoalValue(record: ExerciseRecord, bucket: Bucket): Partial<Record<TrainingGoal, number>> {
  const values = { ...BUCKET_GOAL_VALUES[bucket] };
  if (bucket === "running_cardio" && nameHasAny(record, RUNNING_KEYWORDS)) {
    values.running = 8;
  }
  return values;
}

function heuristicFatigue(record: ExerciseRecord, bucket: Bucket): { nervous: number; muscular: number } {
  if (record.category === "mobility" || record.category === "stretching") return { nervous: 1, muscular: 2 };
  if (CARDIO_EQUIPMENT.has(record.equipment ?? "")) return { nervous: 3, muscular: 7 };
  const mechanic = (record.raw as Record<string, unknown> | null)?.mechanic as string | undefined;
  const heavyEquip = record.equipment === "barbell" || record.equipment === "machine";
  if (mechanic === "compound") return { nervous: heavyEquip ? 8 : 6, muscular: 8 };
  if (mechanic === "isolation") return { nervous: 2, muscular: 5 };
  if (["squat", "hinge", "carry"].includes(record.movementPattern ?? "")) return { nervous: 7, muscular: 8 };
  // Aucun signal fiable (equipment/raw/movementPattern absents, ex. les
  // sys_* historiques) : se rabat sur le bucket déjà calculé par nom plutôt
  // que sur une fatigue générique — un squat/développé couché/soulevé de
  // terre classé "fondamentaux_force" par FOUNDATIONAL_BARBELL_KEYWORDS ne
  // doit pas hériter d'une fatigue d'isolation.
  if (!mechanic && !record.movementPattern && bucket === "fondamentaux_force") {
    return { nervous: 7, muscular: 8 };
  }
  return { nervous: 4, muscular: 5 };
}

function heuristicTechnicalDifficulty(record: ExerciseRecord, bucket: Bucket): number {
  if (nameHasAny(record, OLYMPIC_KEYWORDS)) return 9;
  const base = DIFFICULTY_BASE_TECHNICAL[record.difficulty ?? "intermediate"] ?? 5;
  const bump = bucket === "crossfit_hyrox" ? 1 : 0;
  return Math.min(10, base + bump);
}

const FATIGUE_LEVEL_TO_NUMBER: Record<string, number> = { low: 2, medium: 5, high: 8 };
const TECHNICAL_LEVEL_TO_NUMBER: Record<string, number> = { low: 2, medium: 5, high: 8 };

type ComputedScores = NonNullable<NonNullable<ExerciseRecord["enrichment"]>["coachScores"]>;
type Source = "enrichment" | "heuristic";

function computeScores(record: ExerciseRecord): { scores: ComputedScores; source: Source } {
  const bucket = classifyBucket(record);
  const e = record.enrichment;

  if (e && (e.trainingGoals?.length || e.fatigueLevel || e.technicalLevel)) {
    const goalValue: Partial<Record<TrainingGoal, number>> = {};
    for (const g of e.trainingGoals ?? []) goalValue[g] = 7;
    const fatigueBase = e.fatigueLevel ? FATIGUE_LEVEL_TO_NUMBER[e.fatigueLevel] : heuristicFatigue(record, bucket).nervous;
    return {
      source: "enrichment",
      scores: {
        fatigueNervous: fatigueBase,
        fatigueMuscular: e.fatigueLevel ? FATIGUE_LEVEL_TO_NUMBER[e.fatigueLevel] : heuristicFatigue(record, bucket).muscular,
        technicalDifficulty: e.technicalLevel
          ? TECHNICAL_LEVEL_TO_NUMBER[e.technicalLevel]
          : heuristicTechnicalDifficulty(record, bucket),
        goalValue: Object.keys(goalValue).length ? goalValue : heuristicGoalValue(record, bucket),
      },
    };
  }

  const fatigue = heuristicFatigue(record, bucket);
  return {
    source: "heuristic",
    scores: {
      fatigueNervous: fatigue.nervous,
      fatigueMuscular: fatigue.muscular,
      technicalDifficulty: heuristicTechnicalDifficulty(record, bucket),
      goalValue: heuristicGoalValue(record, bucket),
    },
  };
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const force = args.includes("--force");
  const outPath = args.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "scripts/output/coach-scores-report.json";

  const currentPath = "../exercise-library/current.json";
  if (!existsSync(currentPath)) {
    throw new Error(`${currentPath} introuvable — aucune version officielle publiée.`);
  }
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));

  console.log(`Bibliothèque : ${exercises.length} exercice(s), version ${current.version}.`);

  let fromEnrichment = 0;
  let fromHeuristic = 0;
  let skippedAlreadyScored = 0;
  const bucketCounts: Partial<Record<Bucket, number>> = {};

  const results: { id: string; nameFr: string; source: Source; scores: ComputedScores }[] = [];

  for (const record of exercises) {
    if (!force && record.enrichment?.coachScores) {
      skippedAlreadyScored++;
      continue;
    }
    const bucket = classifyBucket(record);
    bucketCounts[bucket] = (bucketCounts[bucket] ?? 0) + 1;
    const { scores, source } = computeScores(record);
    if (source === "enrichment") fromEnrichment++;
    else fromHeuristic++;
    results.push({ id: record.id, nameFr: record.nameFr, source, scores });
  }

  console.log(`\nÀ calculer : ${results.length} (déjà scorés, ignorés : ${skippedAlreadyScored}${force ? " — ignoré car --force" : ""})`);
  console.log(`  Source enrichment (300 officiels) : ${fromEnrichment}`);
  console.log(`  Source heuristique (reste du catalogue) : ${fromHeuristic}`);
  console.log(`\nRépartition par bucket :`);
  for (const [bucket, count] of Object.entries(bucketCounts)) {
    console.log(`  ${bucket.padEnd(30)} ${count}`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    libraryVersion: current.version,
    totalExercises: exercises.length,
    computed: results.length,
    fromEnrichment,
    fromHeuristic,
    skippedAlreadyScored,
    bucketCounts,
    sample: results.slice(0, 20),
  };
  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nRapport écrit : ${outPath} (aperçu des 20 premiers résultats — les ${results.length} sont appliqués si --apply).`);

  if (!apply) {
    console.log(`\n--dry-run (défaut) : aucune donnée réelle modifiée. Relance avec --apply après revue du rapport.`);
    return;
  }

  console.log(`\n--apply : écriture de enrichment.coachScores dans ${exercisesPath}...`);
  const backupPath = `${exercisesPath}.backup-${Date.now()}.json`;
  copyFileSync(exercisesPath, backupPath);
  console.log(`Sauvegarde créée : ${backupPath}`);

  const byId = new Map(results.map((r) => [r.id, r.scores]));
  let written = 0;
  for (const record of exercises) {
    const scores = byId.get(record.id);
    if (!scores) continue;
    if (!record.enrichment) {
      record.enrichment = {
        translations: {},
        templateVersion: 0,
        updatedAt: new Date().toISOString(),
        coachScores: scores,
      };
    } else {
      record.enrichment.coachScores = scores;
    }
    written++;
  }
  writeFileSync(exercisesPath, JSON.stringify(exercises, null, 2), "utf-8");
  console.log(`Terminé : ${written} exercice(s) mis à jour avec un coachScores.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
