/**
 * Rapport de couverture média — migration progressive WorkoutX → IronFlow.
 * Ne modifie AUCUNE donnée (ni la bibliothèque, ni les fichiers média) :
 * sortie = résumé console + rapport JSON à lire.
 *
 * Le résolveur réel (`src/hooks/useExerciseMedia.ts`, `useExerciseMedia()`)
 * essaie, pour CHAQUE exercice, exactement cette chaîne de priorité (jamais
 * autre chose) :
 *   1. media/ironflow/{id}.webp puis .png/.jpg/.jpeg — illustration IronFlow
 *      définitive (.webp reste le format recommandé, les autres sont
 *      tolérés pour ne jamais perdre silencieusement un mauvais export)
 *   2. media/workoutx/{id}.gif    — dernier repli, la source à remplacer
 *   sinon : repli emoji (pas de fichier "placeholder" statique aujourd'hui)
 * `media/workoutx/` reste strictement `.gif` (jeu de données déjà normalisé,
 * pas du contenu produit au fil de l'eau) — un fichier présent sous une AUTRE
 * extension à cet endroit n'est jamais trouvé par le résolveur ; ce script le
 * signale explicitement.
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     TS_NODE_PROJECT=tsconfig.scripts.json \
 *     node --no-experimental-detect-module -r ts-node/register -r tsconfig-paths/register \
 *     scripts/media-coverage-report.ts [--out=<path>]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ExerciseRecord } from "../src/utils/exercise-records";

const IRONFLOW_DIR = "../exercise-library/media/ironflow";
const WORKOUTX_DIR = "../exercise-library/media/workoutx";
// Doit rester en phase avec IRONFLOW_IMAGE_EXTENSIONS dans useExerciseMedia.ts.
const IRONFLOW_EXTS = ["webp", "png", "jpg", "jpeg"];
const WORKOUTX_EXT = "gif";

type FileEntry = { file: string; base: string; ext: string };
type Source = "ironflow" | "workoutx" | "none";

function listDir(dir: string): FileEntry[] {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => !f.startsWith("."))
    .map((file) => {
      const dot = file.lastIndexOf(".");
      return dot === -1
        ? { file, base: file, ext: "" }
        : { file, base: file.slice(0, dot), ext: file.slice(dot + 1).toLowerCase() };
    });
}

function groupByBase(entries: FileEntry[]): Map<string, FileEntry[]> {
  const map = new Map<string, FileEntry[]>();
  for (const e of entries) {
    const list = map.get(e.base) ?? [];
    list.push(e);
    map.set(e.base, list);
  }
  return map;
}

function wrongExtensionAnomalies(
  byBase: Map<string, FileEntry[]>,
  expectedExts: string[],
): { id: string; file: string; hasUsableSibling: boolean }[] {
  const out: { id: string; file: string; hasUsableSibling: boolean }[] = [];
  for (const [base, files] of byBase) {
    const usable = files.find((f) => expectedExts.includes(f.ext));
    for (const f of files) {
      if (!expectedExts.includes(f.ext)) out.push({ id: base, file: f.file, hasUsableSibling: !!usable });
    }
  }
  return out;
}

function arg(name: string, fallback: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
}

function main() {
  const outPath = arg("out", "scripts/output/media-coverage-report.json");

  const currentPath = "../exercise-library/current.json";
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(`../exercise-library/${current.path}/exercises.json`, "utf-8"));

  const ironflowFiles = listDir(IRONFLOW_DIR);
  const workoutxFiles = listDir(WORKOUTX_DIR);
  const ironflowByBase = groupByBase(ironflowFiles);
  const workoutxByBase = groupByBase(workoutxFiles);

  const byStatus: Record<Exclude<Source, "none">, { id: string; nameFr: string; file: string }[]> = {
    ironflow: [],
    workoutx: [],
  };
  const noImageAtAll: { id: string; nameFr: string }[] = [];

  for (const r of exercises) {
    const ironflowFilesForId = ironflowByBase.get(r.id) ?? [];
    // Même ordre de préférence que le résolveur (webp d'abord).
    const ironflowUsable = IRONFLOW_EXTS.map((ext) => ironflowFilesForId.find((f) => f.ext === ext)).find(Boolean);
    const workoutxGif = (workoutxByBase.get(r.id) ?? []).find((f) => f.ext === WORKOUTX_EXT);

    if (ironflowUsable) byStatus.ironflow.push({ id: r.id, nameFr: r.nameFr, file: ironflowUsable.file });
    else if (workoutxGif) byStatus.workoutx.push({ id: r.id, nameFr: r.nameFr, file: workoutxGif.file });
    else noImageAtAll.push({ id: r.id, nameFr: r.nameFr });
  }

  const exerciseIds = new Set(exercises.map((r) => r.id));

  // Orphelines : un fichier existe (n'importe quelle extension) mais aucun
  // exercice de la bibliothèque courante ne porte cet id.
  const orphanIronflow = ironflowFiles.filter((f) => !exerciseIds.has(f.base)).map((f) => f.file);
  const orphanWorkoutx = workoutxFiles.filter((f) => !exerciseIds.has(f.base)).map((f) => f.file);

  // Anomalies d'extension : fichier présent sous une extension totalement
  // inconnue du résolveur (ex. .bmp/.heic) — invisible quel que soit le cas.
  // ironflow tolère webp/png/jpg/jpeg (voir IRONFLOW_EXTS) ; workoutx reste
  // strictement gif.
  const wrongExtIronflow = wrongExtensionAnomalies(ironflowByBase, IRONFLOW_EXTS);
  const wrongExtWorkoutx = wrongExtensionAnomalies(workoutxByBase, [WORKOUTX_EXT]);

  // Non-webp mais utilisable (png/jpg/jpeg) : fonctionne déjà (le résolveur
  // tolère ces extensions), mais recommandé de reconvertir en .webp pour la
  // cohérence/le poids — juste une recommandation, pas un bug.
  const nonWebpUsableIronflow = ironflowFiles.filter((f) => f.ext !== "webp" && IRONFLOW_EXTS.includes(f.ext) && exerciseIds.has(f.base));

  // Doublons : plusieurs fichiers utilisables (extensions tolérées) pour le
  // même id — le résolveur n'en affiche qu'un (webp gagne toujours), les
  // autres sont du poids mort à nettoyer.
  const duplicateUsableIronflow = Array.from(ironflowByBase.entries())
    .filter(([, files]) => files.filter((f) => IRONFLOW_EXTS.includes(f.ext)).length > 1)
    .map(([base, files]) => {
      const usable = files.filter((f) => IRONFLOW_EXTS.includes(f.ext));
      const winner = IRONFLOW_EXTS.map((ext) => usable.find((f) => f.ext === ext)).find(Boolean)!;
      return { id: base, used: winner.file, unused: usable.filter((f) => f.file !== winner.file).map((f) => f.file) };
    });

  const pct = (n: number) => Math.round((n / exercises.length) * 1000) / 10;

  const report = {
    generatedAt: new Date().toISOString(),
    libraryVersion: current.version,
    totalExercises: exercises.length,
    summary: {
      avecIllustrationIronflow: byStatus.ironflow.length,
      pourcentageMigrationIronflow: pct(byStatus.ironflow.length),
      surWorkoutxTemporaire: byStatus.workoutx.length,
      sansAucuneImage: noImageAtAll.length,
      imagesIronflowOrphelines: orphanIronflow.length,
      imagesWorkoutxOrphelines: orphanWorkoutx.length,
      fichiersIronflowExtensionInconnue: wrongExtIronflow.length,
      fichiersWorkoutxExtensionIgnoree: wrongExtWorkoutx.length,
      ironflowNonWebpARenconvertir: nonWebpUsableIronflow.length,
      doublonsIronflow: duplicateUsableIronflow.length,
    },
    avecIllustrationIronflow: byStatus.ironflow,
    surWorkoutxTemporaire: byStatus.workoutx,
    sansAucuneImage: noImageAtAll,
    imagesIronflowOrphelines: orphanIronflow,
    imagesWorkoutxOrphelines: orphanWorkoutx,
    fichiersIronflowExtensionInconnue: wrongExtIronflow,
    fichiersWorkoutxExtensionIgnoree: wrongExtWorkoutx,
    ironflowNonWebpARenconvertir: nonWebpUsableIronflow.map((f) => f.file),
    doublonsIronflow: duplicateUsableIronflow,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n=== Rapport de couverture média (bibliothèque v${current.version}, ${exercises.length} exercices) ===\n`);
  console.log(`Illustration IronFlow définitive : ${byStatus.ironflow.length} (${report.summary.pourcentageMigrationIronflow}%)`);
  console.log(`Sur GIF WorkoutX temporaire (dernier repli) : ${byStatus.workoutx.length}`);
  console.log(`Aucune image du tout              : ${noImageAtAll.length}`);

  console.log(`\nImages IronFlow orphelines (fichier présent, aucun exercice ne le référence) : ${orphanIronflow.length}`);
  if (orphanIronflow.length > 0) console.log(`  ${orphanIronflow.slice(0, 20).join(", ")}${orphanIronflow.length > 20 ? "…" : ""}`);
  console.log(`Images WorkoutX orphelines : ${orphanWorkoutx.length}`);

  if (wrongExtIronflow.length > 0) {
    const invisible = wrongExtIronflow.filter((f) => !f.hasUsableSibling);
    const redundant = wrongExtIronflow.filter((f) => f.hasUsableSibling);
    console.log(`\n⚠️  ${wrongExtIronflow.length} fichier(s) dans media/ironflow/ avec une extension totalement inconnue du résolveur (ni webp/png/jpg/jpeg) :`);
    if (invisible.length > 0) {
      console.log(`   ${invisible.length} INVISIBLE(S) pour de vrai (aucun fichier utilisable pour ce même id) :`);
      for (const f of invisible) console.log(`     - ${f.file} (id: ${f.id})`);
    }
    if (redundant.length > 0) {
      console.log(`   ${redundant.length} redondant(s) (un fichier utilisable existe déjà, à nettoyer) : ${redundant.map((f) => f.file).join(", ")}`);
    }
  }
  if (wrongExtWorkoutx.length > 0) {
    console.log(`\n${wrongExtWorkoutx.length} fichier(s) dans media/workoutx/ avec une extension ignorée (seul .gif est reconnu) — attendu, source en cours de remplacement.`);
  }
  if (nonWebpUsableIronflow.length > 0) {
    console.log(`\n${nonWebpUsableIronflow.length} illustration(s) IronFlow fonctionnelle(s) mais pas en .webp (png/jpg tolérés, affichées quand même) — recommandé de reconvertir pour la cohérence/le poids : ${nonWebpUsableIronflow.slice(0, 15).map((f) => f.file).join(", ")}${nonWebpUsableIronflow.length > 15 ? "…" : ""}`);
  }
  if (duplicateUsableIronflow.length > 0) {
    console.log(`\nDoublons pour le même id dans media/ironflow/ (plusieurs extensions utilisables — une seule sert, les autres sont du poids mort) : ${duplicateUsableIronflow.length}`);
    for (const d of duplicateUsableIronflow) console.log(`   - ${d.id} : affiché=${d.used}, inutile(s)=${d.unused.join(", ")}`);
  }

  console.log(`\nRapport complet : ${outPath}`);
}

main();
