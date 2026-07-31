/**
 * Recalcule `media-manifest.json` de la version actuellement publiée
 * (`exercise-library/current.json`) en re-scannant les dossiers média
 * partagés — sans toucher à `exercises.json` ni couper une nouvelle version.
 *
 * À utiliser chaque fois que des fichiers sont ajoutés/modifiés directement
 * dans `media/{ironflow,gymgifsdb,workoutx}/` sans passer par
 * `commit-library-version.ts` (ex. import média seul, comme
 * `import-gymgifsdb-media.ts --apply`) — `media-manifest.json` est le
 * garde-fou d'intégrité vérifié par `publish-library-to-app.ts` avant toute
 * publication ; le laisser périmé ferait échouer cette vérification (fichier
 * présent sur disque mais absent du manifeste, ou inversement).
 *
 * Usage (depuis frontend/) : node -r ts-node/register scripts/refresh-media-manifest.ts
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";

const LIBRARY_ROOT = "../exercise-library";
const MEDIA_SOURCES = ["ironflow", "gymgifsdb", "workoutx"] as const;

function sha256File(path: string): string {
  return createHash("sha256").update(readFileSync(path)).digest("hex");
}

function main() {
  const currentPath = `${LIBRARY_ROOT}/current.json`;
  if (!existsSync(currentPath)) {
    throw new Error(`${currentPath} introuvable.`);
  }
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const versionDir = `${LIBRARY_ROOT}/${current.path}`;
  const manifestPath = `${versionDir}/media-manifest.json`;
  if (!existsSync(manifestPath)) {
    throw new Error(`${manifestPath} introuvable — cette version n'a pas encore de media-manifest.json.`);
  }

  const before: Record<string, { sha256: string; size: number }> = JSON.parse(
    readFileSync(manifestPath, "utf-8"),
  );

  const sharedMediaDir = `${LIBRARY_ROOT}/media`;
  const after: Record<string, { sha256: string; size: number }> = {};
  for (const source of MEDIA_SOURCES) {
    const dir = `${sharedMediaDir}/${source}`;
    if (!existsSync(dir)) continue;
    for (const filename of readdirSync(dir)) {
      const path = `${dir}/${filename}`;
      const stat = statSync(path);
      if (!stat.isFile()) continue;
      after[`media/${source}/${filename}`] = { sha256: sha256File(path), size: stat.size };
    }
  }

  writeFileSync(manifestPath, JSON.stringify(after, null, 2), "utf-8");

  const beforeKeys = new Set(Object.keys(before));
  const afterKeys = new Set(Object.keys(after));
  const added = [...afterKeys].filter((k) => !beforeKeys.has(k));
  const removed = [...beforeKeys].filter((k) => !afterKeys.has(k));

  console.log(`media-manifest.json (${manifestPath}) régénéré.`);
  console.log(`  Avant : ${beforeKeys.size} fichier(s)`);
  console.log(`  Après : ${afterKeys.size} fichier(s)`);
  console.log(`  Ajoutés : ${added.length}`);
  console.log(`  Retirés : ${removed.length}`);
  const bySource: Record<string, number> = {};
  for (const k of afterKeys) {
    const source = k.split("/")[1];
    bySource[source] = (bySource[source] ?? 0) + 1;
  }
  console.log(`  Répartition :`, bySource);
}

main();
