/**
 * Rapport des exercices avec des informations manquantes, destiné à être
 * rempli manuellement par l'utilisateur (même esprit que
 * `export-manual-enrichment-template.ts`, mais en lecture seule — ne modifie
 * jamais `exercise-library/`, produit juste un JSON à éditer et renvoyer).
 *
 * Périmètre : les 300 exercices de la bibliothèque officielle
 * (`exerciseTier` essential/official_core, ceux réellement mis en avant par
 * l'app) + tout exercice référencé quelque part dans les programmes/WODs
 * statiques (`programs.ts`, `wod-library.ts`, `starter-programs.ts`) mais qui
 * ne correspond à aucun `ExerciseRecord` par nom exact — les ~1048 exercices
 * `collection_only` jamais enrichis ne sont volontairement pas inclus en bloc
 * (ce ne serait qu'un unique "tout est vide" sans valeur actionnable).
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     node --no-experimental-detect-module -r ts-node/register scripts/export-missing-info-report.ts
 */
import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import type { ExerciseRecord } from "../src/utils/exercise-records";

const LIBRARY_ROOT = "../exercise-library";

function loadCurrentExercises(): ExerciseRecord[] {
  const current: { path: string } = JSON.parse(readFileSync(`${LIBRARY_ROOT}/current.json`, "utf-8"));
  return JSON.parse(readFileSync(`${LIBRARY_ROOT}/${current.path}/exercises.json`, "utf-8"));
}

function mediaExists(dir: string, id: string, exts: string[]): boolean {
  return exts.some((ext) => existsSync(`${LIBRARY_ROOT}/media/${dir}/${id}.${ext}`));
}

function hasIronflowMedia(id: string): boolean {
  return mediaExists("ironflow", id, ["webp", "png", "jpg", "jpeg"]);
}
function hasWorkoutxMedia(id: string): boolean {
  return mediaExists("workoutx", id, ["gif"]);
}

// Extrait tous les noms d'exercices (Exercise.name) référencés dans les
// programmes/WODs statiques du bundle, en lisant les fichiers source en texte
// brut (pas d'import TS direct ici — évite de tirer toute la config
// runtime/Expo dans ce script utilitaire).
function extractStaticExerciseNames(): Set<string> {
  const names = new Set<string>();
  const files = [
    "src/data/programs.ts",
    "src/data/wod-library.ts",
    "src/data/starter-programs.ts",
  ];
  for (const f of files) {
    if (!existsSync(f)) continue;
    const text = readFileSync(f, "utf-8");
    // Convention établie dans ce projet : ex("Nom de l'exercice", ...) ou name: "Nom"
    const exCalls = text.matchAll(/\bex\(\s*"((?:[^"\\]|\\.)*)"/g);
    for (const m of exCalls) names.add(m[1].replace(/\\"/g, '"'));
    const nameFields = text.matchAll(/\bname:\s*"((?:[^"\\]|\\.)*)"/g);
    for (const m of nameFields) names.add(m[1].replace(/\\"/g, '"'));
  }
  return names;
}

function normalize(s: string): string {
  return s.trim().toLowerCase();
}

function main() {
  const exercises = loadCurrentExercises();
  const byNormalizedName = new Map<string, ExerciseRecord>();
  for (const r of exercises) {
    byNormalizedName.set(normalize(r.nameFr), r);
    if (r.nameEn) byNormalizedName.set(normalize(r.nameEn), r);
    for (const a of r.aliases ?? []) byNormalizedName.set(normalize(a), r);
  }

  const officialRecords = exercises.filter(
    (r) => r.exerciseTier === "essential" || r.exerciseTier === "official_core",
  );

  type Issue = {
    id: string;
    nameFr: string;
    exerciseTier: string | null;
    missing: string[];
  };

  const issues: Issue[] = [];
  for (const r of officialRecords) {
    const missing: string[] = [];
    if (!r.nameEn) missing.push("nameEn");
    if (!r.primaryMuscle) missing.push("primaryMuscle");
    if (!r.equipment) missing.push("equipment");
    if (!r.difficulty) missing.push("difficulty");
    if (!r.movementPattern) missing.push("movementPattern");
    const descFr = r.enrichment?.translations?.fr?.description ?? r.description;
    if (!descFr) missing.push("description");
    if (!r.instructions || r.instructions.length === 0) missing.push("instructions");
    if (!r.tips || r.tips.length === 0) missing.push("tips");
    if (!r.commonMistakes || r.commonMistakes.length === 0) missing.push("commonMistakes");
    if (!hasIronflowMedia(r.id) && !hasWorkoutxMedia(r.id)) missing.push("media (aucune image ni GIF)");
    else if (!hasIronflowMedia(r.id)) missing.push("media (illustration IronFlow absente, GIF WorkoutX en repli)");
    if (!r.enrichment) missing.push("enrichment (fiche pédagogique complète non générée)");

    if (missing.length > 0) {
      issues.push({ id: r.id, nameFr: r.nameFr, exerciseTier: r.exerciseTier ?? null, missing });
    }
  }

  // Noms utilisés dans les programmes/WODs qui ne matchent AUCUN ExerciseRecord.
  const staticNames = extractStaticExerciseNames();
  const unresolvedProgramNames: string[] = [];
  for (const name of staticNames) {
    if (name.includes("→")) continue; // entrée composite AMRAP/EMOM — pas un nom d'exercice unique
    if (!byNormalizedName.has(normalize(name))) unresolvedProgramNames.push(name);
  }
  unresolvedProgramNames.sort((a, b) => a.localeCompare(b, "fr"));

  const report = {
    generatedAt: new Date().toISOString(),
    note:
      "Complète les champs manquants directement dans ce fichier (ou une copie), puis renvoie-le pour intégration. " +
      "'missing' liste les champs vides pour cet exercice — laisse le champ correspondant à null/absent si tu ne le remplis pas encore.",
    summary: {
      exercicesOfficielsAvecInfosManquantes: issues.length,
      totalExercicesOfficiels: officialRecords.length,
      nomsDeProgrammesSansCorrespondance: unresolvedProgramNames.length,
    },
    exercicesOfficielsAvecInfosManquantes: issues,
    nomsUtilisesDansProgrammesSansExerciceCorrespondant: unresolvedProgramNames,
  };

  const outPath = "scripts/output/missing-info-report.json";
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`Rapport écrit : ${outPath}`);
  console.log(`  ${issues.length}/${officialRecords.length} exercices officiels avec au moins un champ manquant`);
  console.log(`  ${unresolvedProgramNames.length} nom(s) de programme/WOD sans ExerciseRecord correspondant`);
}

main();
