/**
 * Phase B4 — makes the candidate staged by `scripts/generate-library-version.ts`
 * official: moves it into `exercise-library/versions/vN/`, merges any new
 * WorkoutX GIFs into the shared `exercise-library/media/workoutx/` pool,
 * computes a `media-manifest.json` (checksum + size for every file actually
 * present in `media/ironflow/`, `media/gymgifsdb/` and `media/workoutx/` — the guard-rail
 * `scripts/publish-library-to-app.ts` checks before publishing), and updates
 * `exercise-library/current.json` to point at the new version.
 *
 * Media is checksummed by SCANNING the two source-of-truth directories, not
 * by walking `ExerciseRecord.media` references — the official media library
 * (`src/hooks/useExerciseMedia.ts`) resolves purely from exercise id, so a
 * file's presence on disk is what matters, independent of what any record
 * declares. This also means a new IronFlow illustration just needs to be
 * dropped into `media/ironflow/{id}.webp` and re-published — no
 * `exercises.json` edit required.
 *
 * Run this only after reviewing `scripts/output/next-version/changes.json`.
 * Nothing is pushed to GitHub here — that remains a manual
 * `git add / commit / push` inside `exercise-library/`, per the README.
 *
 * Usage (from frontend/): node scripts/commit-library-version.ts
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { ExerciseRecord } from "../src/utils/exercise-records";

const STAGED_DIR = "scripts/output/next-version";
const STAGED_MEDIA_DIR = "scripts/output/media";
const LIBRARY_ROOT = "../exercise-library";
const MEDIA_SOURCES = ["ironflow", "gymgifsdb", "workoutx"] as const;

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main() {
  for (const f of ["exercises.json", "manifest.json", "changes.json"]) {
    if (!existsSync(`${STAGED_DIR}/${f}`)) {
      throw new Error(
        `${STAGED_DIR}/${f} not found — run scripts/generate-library-version.ts first.`,
      );
    }
  }

  const manifest = JSON.parse(readFileSync(`${STAGED_DIR}/manifest.json`, "utf-8"));
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(`${STAGED_DIR}/exercises.json`, "utf-8"));

  const versionDir = `${LIBRARY_ROOT}/versions/v${manifest.version}`;
  if (existsSync(versionDir)) {
    throw new Error(`${versionDir} already exists — refusing to overwrite an existing version.`);
  }
  mkdirSync(versionDir, { recursive: true });

  const sharedMediaDir = `${LIBRARY_ROOT}/media`;
  const sharedWorkoutxDir = `${sharedMediaDir}/workoutx`;
  if (!existsSync(sharedWorkoutxDir)) mkdirSync(sharedWorkoutxDir, { recursive: true });

  // Merge any newly-downloaded WorkoutX GIFs (staged by import-workoutx.ts)
  // into the shared pool — always workoutx/, since that script never
  // produces IronFlow illustrations.
  if (existsSync(STAGED_MEDIA_DIR)) {
    for (const filename of readdirSync(STAGED_MEDIA_DIR)) {
      copyFileSync(`${STAGED_MEDIA_DIR}/${filename}`, `${sharedWorkoutxDir}/${filename}`);
    }
  }

  // Checksum manifest built by scanning both source-of-truth directories —
  // every file actually on disk, independent of what exercises.json declares.
  const mediaManifest: Record<string, { sha256: string; size: number }> = {};
  for (const source of MEDIA_SOURCES) {
    const dir = `${sharedMediaDir}/${source}`;
    if (!existsSync(dir)) continue;
    for (const filename of readdirSync(dir)) {
      const path = `${dir}/${filename}`;
      const stat = statSync(path);
      if (!stat.isFile()) continue;
      mediaManifest[`media/${source}/${filename}`] = { sha256: sha256File(path), size: stat.size };
    }
  }

  copyFileSync(`${STAGED_DIR}/exercises.json`, `${versionDir}/exercises.json`);
  copyFileSync(`${STAGED_DIR}/manifest.json`, `${versionDir}/manifest.json`);
  copyFileSync(`${STAGED_DIR}/changes.json`, `${versionDir}/changes.json`);
  writeFileSync(`${versionDir}/media-manifest.json`, JSON.stringify(mediaManifest, null, 2), "utf-8");

  writeFileSync(
    `${LIBRARY_ROOT}/current.json`,
    JSON.stringify({ version: manifest.version, path: `versions/v${manifest.version}` }, null, 2),
    "utf-8",
  );

  console.log(`Version ${manifest.version} committed to ${versionDir}/`);
  console.log(`  ${Object.keys(mediaManifest).length} media file(s) checksummed`);
  console.log(
    `\nexercise-library/current.json now points at version ${manifest.version}. ` +
      `Next: cd ../exercise-library && git add . && git commit && git push.`,
  );
}

main();
