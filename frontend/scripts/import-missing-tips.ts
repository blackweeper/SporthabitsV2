/**
 * Réintègre un rapport "infos manquantes" rempli à la main (voir
 * `export-missing-info-report.ts`) où l'utilisateur a ajouté directement
 * `tips`/`commonMistakes` à chaque entrée de
 * `exercicesOfficielsAvecInfosManquantes` — n'ENRICHIT que des
 * `ExerciseRecord` déjà existants (contrairement à `import-new-exercises.ts`
 * qui peut aussi en créer), et seulement ces deux champs : les autres clés
 * éventuellement présentes dans une entrée (`movementPattern`, `missing`...)
 * sont ignorées ici, hors périmètre de ce format de retour précis.
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     node --no-experimental-detect-module -r ts-node/register -r tsconfig-paths/register \
 *     scripts/import-missing-tips.ts --in=<path> [--dry-run] [--apply]
 *
 * --dry-run (défaut)  N'écrit rien. Valide chaque id (doit exister dans la
 *                      bibliothèque) et affiche un résumé.
 * --apply              Écrit dans versions/vN/exercises.json après backup
 *                      horodaté. Ne remplace jamais un `tips`/`commonMistakes`
 *                      déjà non-vide (même règle que le reste du pipeline) —
 *                      un id déjà rempli entre-temps est simplement ignoré.
 */
import { copyFileSync, existsSync, readFileSync, writeFileSync } from "node:fs";
import type { ExerciseRecord } from "../src/utils/exercise-records";

type ReportEntry = {
  id: string;
  nameFr?: string;
  tips?: string[];
  commonMistakes?: string[];
};

function nonEmpty(v: string[] | undefined | null): v is string[] {
  return Array.isArray(v) && v.length > 0;
}

function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const inPath = args.find((a) => a.startsWith("--in="))?.split("=")[1];
  if (!inPath) throw new Error("--in=<path> requis.");
  if (!existsSync(inPath)) throw new Error(`${inPath} introuvable.`);

  const report: { exercicesOfficielsAvecInfosManquantes: ReportEntry[] } = JSON.parse(readFileSync(inPath, "utf-8"));
  const entries = report.exercicesOfficielsAvecInfosManquantes ?? [];

  const currentPath = "../exercise-library/current.json";
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));
  const byId = new Map(exercises.map((r) => [r.id, r]));

  console.log(`Rapport : ${entries.length} entrée(s) à traiter depuis ${inPath}.`);

  let updated = 0;
  let unchanged = 0;
  let notFound = 0;
  const notFoundIds: string[] = [];

  for (const entry of entries) {
    const record = byId.get(entry.id);
    if (!record) {
      notFound++;
      notFoundIds.push(`${entry.id} (${entry.nameFr ?? "?"})`);
      continue;
    }

    const nextTips = nonEmpty(record.tips) ? record.tips : nonEmpty(entry.tips) ? entry.tips : record.tips ?? null;
    const nextMistakes = nonEmpty(record.commonMistakes)
      ? record.commonMistakes
      : nonEmpty(entry.commonMistakes)
        ? entry.commonMistakes
        : record.commonMistakes ?? null;

    const changed = nextTips !== record.tips || nextMistakes !== record.commonMistakes;
    if (!changed) {
      unchanged++;
      continue;
    }

    updated++;
    if (apply) {
      byId.set(entry.id, { ...record, tips: nextTips, commonMistakes: nextMistakes, updatedAt: new Date().toISOString() });
    }
  }

  console.log(`\nÀ mettre à jour : ${updated} · Déjà remplis (ignorés) : ${unchanged} · Id introuvable : ${notFound}`);
  if (notFoundIds.length > 0) {
    console.log(`\n=== Id introuvables dans la bibliothèque ===`);
    for (const s of notFoundIds) console.log(` - ${s}`);
  }

  if (!apply) {
    console.log(`\n--dry-run (défaut) : aucune donnée réelle modifiée. Relance avec --apply pour écrire.`);
    return;
  }

  const nextExercises = Array.from(byId.values());
  const backupPath = `${exercisesPath}.backup-${Date.now()}.json`;
  copyFileSync(exercisesPath, backupPath);
  console.log(`\nSauvegarde créée : ${backupPath}`);
  writeFileSync(exercisesPath, JSON.stringify(nextExercises, null, 2), "utf-8");
  console.log(`${updated} exercice(s) mis à jour dans ${exercisesPath}.`);
}

main();
