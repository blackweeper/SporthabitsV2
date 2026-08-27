/**
 * Rapport des exercices de la bibliothèque principale IronFlow
 * (exerciseTier essential/official_core, les ~300 exercices officiels)
 * qui n'ont AUCUNE illustration IronFlow (media/ironflow/{id}.webp/png/jpg/jpeg).
 * Ne modifie rien — sortie = JSON à lire (id + description pour savoir quelle
 * photo prendre et comment nommer le fichier) + résumé console.
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     node --no-experimental-detect-module -r ts-node/register \
 *     scripts/report-missing-ironflow-main-library.ts [--out=<path>]
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ExerciseRecord } from "../src/utils/exercise-records";

const IRONFLOW_DIR = "../exercise-library/media/ironflow";
const IRONFLOW_EXTS = ["webp", "png", "jpg", "jpeg"];

function arg(name: string, fallback: string): string {
  const found = process.argv.find((a) => a.startsWith(`--${name}=`));
  return found ? found.split("=").slice(1).join("=") : fallback;
}

function bestDescription(r: ExerciseRecord): string | null {
  const fr = r.enrichment?.translations?.fr?.description;
  if (fr && fr.trim()) return fr.trim();
  if (r.description && r.description.trim()) return r.description.trim();
  return null;
}

function main() {
  const outPath = arg("out", "scripts/output/missing-ironflow-main-library.json");

  const currentPath = "../exercise-library/current.json";
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(`../exercise-library/${current.path}/exercises.json`, "utf-8"));

  const ironflowIds = new Set(
    existsSync(IRONFLOW_DIR)
      ? readdirSync(IRONFLOW_DIR)
          .filter((f) => !f.startsWith("."))
          .filter((f) => {
            const dot = f.lastIndexOf(".");
            const ext = dot === -1 ? "" : f.slice(dot + 1).toLowerCase();
            return IRONFLOW_EXTS.includes(ext);
          })
          .map((f) => f.slice(0, f.lastIndexOf(".")))
      : [],
  );

  const mainLibrary = exercises.filter((r) => r.exerciseTier === "essential" || r.exerciseTier === "official_core");

  const missing = mainLibrary
    .filter((r) => !ironflowIds.has(r.id))
    .map((r) => ({
      id: r.id,
      fichierAttendu: `${r.id}.webp`,
      tier: r.exerciseTier,
      nameFr: r.nameFr,
      nameEn: r.nameEn ?? null,
      category: r.category,
      primaryMuscle: r.primaryMuscle ?? null,
      equipment: r.equipment ?? null,
      description: bestDescription(r),
    }))
    .sort((a, b) => {
      if (a.tier !== b.tier) return a.tier === "essential" ? -1 : 1;
      return a.nameFr.localeCompare(b.nameFr, "fr");
    });

  const report = {
    generatedAt: new Date().toISOString(),
    libraryVersion: current.version,
    totalBibliothequePrincipale: mainLibrary.length,
    totalManquantes: missing.length,
    pourcentageComplet: Math.round(((mainLibrary.length - missing.length) / mainLibrary.length) * 1000) / 10,
    exercicesSansIllustrationIronflow: missing,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log(`\n=== Images IronFlow manquantes — bibliothèque principale (v${current.version}) ===\n`);
  console.log(`Bibliothèque principale (essential + official_core) : ${mainLibrary.length} exercices`);
  console.log(`Avec illustration IronFlow : ${mainLibrary.length - missing.length} (${report.pourcentageComplet}%)`);
  console.log(`Sans illustration IronFlow : ${missing.length}`);
  console.log(`\nRapport complet : ${outPath}`);
}

main();
