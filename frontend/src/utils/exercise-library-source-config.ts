/**
 * Where the app looks for library update manifests. Hosted independently of
 * the app's own build/deploy on the `gh-pages` branch of this repo (see
 * exercise-library/README.md §4) — publishing a new exercise version never
 * requires rebuilding or redeploying the app itself.
 */
export const EXERCISE_LIBRARY_MANIFEST_URL: string | null =
  "https://blackweeper.github.io/SporthabitsV2/manifest.json";
