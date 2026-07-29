/**
 * Phase B4 — makes the candidate staged by `scripts/generate-library-version.ts`
 * official: moves it into `exercise-library/versions/vN/`, merges any new/
 * changed media into the shared `exercise-library/media/` pool, computes a
 * `media-manifest.json` (checksum + size per referenced media file — the
 * guard-rail `scripts/publish-library-to-app.ts` checks before publishing),
 * and updates `exercise-library/current.json` to point at the new version.
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
  readFileSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createHash } from "node:crypto";
import { ExerciseRecord } from "../src/utils/exercise-records";

const STAGED_DIR = "scripts/output/next-version";
const STAGED_MEDIA_DIR = "scripts/output/media";
const LIBRARY_ROOT = "../exercise-library";

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
  if (!existsSync(sharedMediaDir)) mkdirSync(sharedMediaDir, { recursive: true });

  // Merge new/changed media into the shared pool, and build the checksum
  // manifest for every media file this version's exercises actually
  // reference (whether it was just copied or already present from a
  // previous version).
  const mediaManifest: Record<string, { sha256: string; size: number }> = {};
  const missing: string[] = [];

  for (const ex of exercises) {
    const url = ex.media?.primaryImage?.remoteUrl;
    if (!url || !url.startsWith("media/")) continue;
    const filename = url.slice("media/".length);
    const stagedPath = `${STAGED_MEDIA_DIR}/${filename}`;
    const sharedPath = `${sharedMediaDir}/${filename}`;

    if (existsSync(stagedPath)) {
      copyFileSync(stagedPath, sharedPath);
    } else if (!existsSync(sharedPath)) {
      // Referenced by exercises.json but never downloaded and not already
      // in the shared pool from a previous version — a real gap to flag.
      missing.push(url);
      continue;
    }

    const stat = statSync(sharedPath);
    mediaManifest[url] = { sha256: sha256File(sharedPath), size: stat.size };
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
  if (missing.length > 0) {
    console.log(`\n⚠ ${missing.length} referenced media file(s) missing from both staging and the shared pool:`);
    for (const m of missing) console.log(` - ${m}`);
  }
  console.log(
    `\nexercise-library/current.json now points at version ${manifest.version}. ` +
      `Next: cd ../exercise-library && git add . && git commit && git push.`,
  );
}

main();
