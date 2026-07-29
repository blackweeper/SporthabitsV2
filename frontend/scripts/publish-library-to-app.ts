/**
 * Phase B4 (revised) — makes the current official version of
 * `exercise-library/` ready to host as its own static site, independent of
 * the app's own build/deploy. The app fetches `exercise-library/manifest.json`
 * directly from wherever that directory is hosted (see
 * `EXERCISE_LIBRARY_MANIFEST_URL`, src/utils/exercise-library-source-config.ts)
 * — never WorkoutX, never GitHub directly, and never through the app's own
 * bundle. This decouples library updates from app releases: publishing a new
 * exercise version never requires rebuilding/redeploying the app itself.
 *
 * Every media file referenced by `versions/vN/exercises.json` is verified
 * against `media-manifest.json` (checksum + size) — publishing stops with a
 * clear error rather than shipping a library with broken/missing media.
 *
 * Usage (from frontend/): node scripts/publish-library-to-app.ts
 * Then (from exercise-library/): push the directory's contents to whatever
 * static host serves it (see exercise-library/README.md).
 */

import { existsSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { createHash } from "node:crypto";
import { ExerciseRecord } from "../src/utils/exercise-records";

const LIBRARY_ROOT = "../exercise-library";

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main() {
  const currentPath = `${LIBRARY_ROOT}/current.json`;
  if (!existsSync(currentPath)) {
    throw new Error(`${currentPath} not found — is exercise-library/ present at the repo root?`);
  }
  const current = JSON.parse(readFileSync(currentPath, "utf-8"));
  if (!current.path) {
    throw new Error(
      "No version to publish yet — run scripts/generate-library-version.ts and scripts/commit-library-version.ts first.",
    );
  }

  const versionDir = `${LIBRARY_ROOT}/${current.path}`;
  for (const f of ["manifest.json", "exercises.json", "media-manifest.json"]) {
    if (!existsSync(`${versionDir}/${f}`)) {
      throw new Error(`${versionDir}/${f} missing — this version looks incomplete.`);
    }
  }

  const versionManifest = JSON.parse(readFileSync(`${versionDir}/manifest.json`, "utf-8"));
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(`${versionDir}/exercises.json`, "utf-8"));
  const mediaManifest: Record<string, { sha256: string; size: number }> = JSON.parse(
    readFileSync(`${versionDir}/media-manifest.json`, "utf-8"),
  );

  // Verify every media reference before publishing anything.
  const problems: string[] = [];
  let referencedCount = 0;
  for (const ex of exercises) {
    const url = ex.media?.primaryImage?.remoteUrl;
    if (!url || !url.startsWith("media/")) continue;
    referencedCount++;

    const entry = mediaManifest[url];
    if (!entry) {
      problems.push(`"${ex.nameFr}" (${ex.id}) references ${url}, missing from media-manifest.json`);
      continue;
    }
    const filename = url.slice("media/".length);
    const sharedPath = `${LIBRARY_ROOT}/media/${filename}`;
    if (!existsSync(sharedPath)) {
      problems.push(`${url} listed in media-manifest.json but not found on disk (${sharedPath})`);
      continue;
    }
    const stat = statSync(sharedPath);
    if (stat.size !== entry.size) {
      problems.push(`${url} size mismatch (expected ${entry.size}, found ${stat.size})`);
      continue;
    }
    if (sha256File(sharedPath) !== entry.sha256) {
      problems.push(`${url} checksum mismatch — file may be corrupted`);
    }
  }

  if (problems.length > 0) {
    console.error(`Publish aborted — ${problems.length} media problem(s) found:`);
    for (const p of problems) console.error(` - ${p}`);
    process.exitCode = 1;
    return;
  }

  // All good — write the top-level, app-facing manifest.json. Distinct from
  // current.json (internal pointer used by generate-library-version.ts for
  // baseline diffing) and from versions/vN/manifest.json (whose exercisesUrl
  // is relative to ITS OWN directory) — this one's exercisesUrl is relative
  // to the library root, since that's what gets fetched first
  // (EXERCISE_LIBRARY_MANIFEST_URL) and resolves every other URL against.
  const publicManifest = {
    version: versionManifest.version,
    generatedAt: versionManifest.generatedAt,
    count: exercises.length,
    exercisesUrl: `${current.path}/exercises.json`,
  };
  writeFileSync(`${LIBRARY_ROOT}/manifest.json`, JSON.stringify(publicManifest, null, 2), "utf-8");

  console.log(
    `Ready to host: version ${publicManifest.version} (${exercises.length} exercises, ${referencedCount} media reference(s) verified).`,
  );
  console.log(`Wrote ${LIBRARY_ROOT}/manifest.json`);
  console.log(
    "\nNext: push exercise-library/ (manifest.json, versions/, media/) to whatever static host serves it, " +
      "then point EXERCISE_LIBRARY_MANIFEST_URL (src/utils/exercise-library-source-config.ts) at " +
      "<host>/manifest.json. See exercise-library/README.md.",
  );
}

main();
