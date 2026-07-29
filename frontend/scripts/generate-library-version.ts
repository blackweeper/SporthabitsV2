/**
 * Phase B4 — compares the freshly-imported WorkoutX batch
 * (`scripts/output/workoutx-exercises.json`, produced by
 * `scripts/import-workoutx.ts`) against the official IronFlow library
 * (`exercise-library/`) and stages a candidate next version for review.
 *
 * Nothing under `exercise-library/` is touched by this script — it only
 * writes to `scripts/output/next-version/`. Read `changes.json` there
 * before running `scripts/commit-library-version.ts`, which is the step
 * that actually makes a version official.
 *
 * Usage (from frontend/): node scripts/generate-library-version.ts [--version=N]
 *
 * Note on `customExercises`: the master library never contains any specific
 * user's custom exercises — those stay on-device and are merged in live by
 * `useLibraryUpdate.ts` when a user updates their app. This script always
 * passes an empty custom-exercise list to `buildMigratedLibrary`.
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { EXERCISE_LIBRARY } from "../src/data/exercise-library";
import { ExerciseRecord } from "../src/utils/exercise-records";
import { buildMigratedLibrary, deriveSystemBaseline } from "../src/utils/exercise-library-merge";

type CurrentPointer = { version: number; path: string | null };

function readCurrentPointer(): CurrentPointer {
  const path = "../exercise-library/current.json";
  if (!existsSync(path)) return { version: 0, path: null };
  return JSON.parse(readFileSync(path, "utf-8"));
}

function loadBaseline(current: CurrentPointer): ExerciseRecord[] {
  if (!current.path) {
    return deriveSystemBaseline(EXERCISE_LIBRARY);
  }
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const existing: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));
  // Custom exercises never live in the master library — nothing to filter
  // out here in practice, but kept for correctness if that ever changes.
  return existing.filter((r) => r.source !== "custom");
}

function main() {
  const args = process.argv.slice(2);
  const versionArg = args.find((a) => a.startsWith("--version="));

  const incomingPath = "scripts/output/workoutx-exercises.json";
  if (!existsSync(incomingPath)) {
    throw new Error(
      `${incomingPath} not found — run scripts/import-workoutx.ts first.`,
    );
  }
  const incoming: ExerciseRecord[] = JSON.parse(readFileSync(incomingPath, "utf-8"));

  const current = readCurrentPointer();
  const baseline = loadBaseline(current);
  const nextVersion = versionArg ? parseInt(versionArg.split("=")[1], 10) : current.version + 1;

  const { merged, report } = buildMigratedLibrary(baseline, [], incoming);

  const outDir = "scripts/output/next-version";
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const manifest = {
    version: nextVersion,
    generatedAt: new Date().toISOString(),
    count: merged.length,
    exercisesUrl: "exercises.json",
  };

  writeFileSync(`${outDir}/exercises.json`, JSON.stringify(merged, null, 2), "utf-8");
  writeFileSync(`${outDir}/manifest.json`, JSON.stringify(manifest, null, 2), "utf-8");
  writeFileSync(`${outDir}/changes.json`, JSON.stringify(report, null, 2), "utf-8");

  console.log(`Candidate version ${nextVersion} staged in ${outDir}/`);
  console.log(
    `  ${report.addedCount} added · ${report.replacedCount} replaced · ${report.updatedCount} updated · ` +
      `${report.unmatchedExistingKept} kept · ${report.duplicatesSkipped} duplicates skipped`,
  );
  if (report.warnings.length > 0) {
    console.log(`  ${report.warnings.length} warning(s) — see ${outDir}/changes.json`);
  }
  if (report.possibleMatches.length > 0) {
    console.log(`  ${report.possibleMatches.length} possible match(es) to review — see ${outDir}/changes.json`);
  }
  console.log(`\nReview ${outDir}/changes.json, then run scripts/commit-library-version.ts.`);
}

main();
