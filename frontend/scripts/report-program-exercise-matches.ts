/**
 * Phase 2 (Entraînement premium) — recense, pour chaque exercice référencé
 * par les 6 programmes embarqués (`BUNDLED_PROGRAMS`/`BUNDLED_STRETCH_PROGRAMS`/
 * `BUNDLED_CARDIO_PROGRAMS`, `src/data/programs.ts`), s'il résout un
 * `ExerciseRecord` réel dans la bibliothèque courante — et si non, propose
 * (sans jamais l'appliquer) un candidat de remplacement par similarité de
 * nom. Ne modifie AUCUNE donnée : sortie = rapport markdown à revue humaine.
 *
 * Matching exact reproduit volontairement la même logique que
 * `matchExerciseRecord` (`src/utils/exercise-record-match.ts`, non importé
 * ici pour rester sur des imports relatifs type-only, convention déjà
 * suivie par les autres scripts de ce dossier) : comparaison
 * case/espaces-insensible sur `nameFr`/`nameEn`/`aliases`.
 *
 * Matching flou : `normalize`/`bigrams`/`similarity` importés tels quels
 * depuis `exercise-library-merge.ts` (même algorithme, même seuil 0.65,
 * déjà utilisé pour la migration WorkoutX) — pas de réimplémentation.
 *
 * Usage (depuis frontend/) :
 *   node --no-experimental-detect-module -r ts-node/register scripts/report-program-exercise-matches.ts
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ExerciseRecord } from "../src/utils/exercise-records";
import { BUNDLED_PROGRAMS, BUNDLED_STRETCH_PROGRAMS, BUNDLED_CARDIO_PROGRAMS } from "../src/data/programs";
import { normalize, similarity } from "../src/utils/exercise-library-merge";

const FUZZY_THRESHOLD = 0.65;
const NOISE_THRESHOLD = 0.4;
const OUT_PATH = "scripts/reports/program-exercise-matches.md";

type Row = {
  name: string;
  status: "exact" | "fuzzy" | "no_match" | "unlikely";
  candidates: { name: string; id: string; tier: string; score: number }[];
};

function exactMatch(name: string, records: ExerciseRecord[]): ExerciseRecord | undefined {
  const key = name.toLowerCase().trim();
  return records.find(
    (r) =>
      r.nameFr.toLowerCase().trim() === key ||
      r.nameEn?.toLowerCase().trim() === key ||
      (r.aliases ?? []).some((a) => a.toLowerCase().trim() === key),
  );
}

function topCandidates(name: string, records: ExerciseRecord[], n = 3) {
  const scored = records.map((r) => {
    const sFr = similarity(name, r.nameFr);
    const sEn = r.nameEn ? similarity(name, r.nameEn) : 0;
    const score = Math.max(sFr, sEn);
    return { name: r.nameFr, id: r.id, tier: r.exerciseTier ?? "collection_only", score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, n);
}

async function main() {
  const currentPath = "../exercise-library/current.json";
  if (!existsSync(currentPath)) {
    throw new Error(`${currentPath} introuvable — aucune version officielle publiée.`);
  }
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const records: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));
  console.log(`Bibliothèque : ${records.length} exercice(s), version ${current.version}.`);

  const allPrograms = [...BUNDLED_PROGRAMS, ...BUNDLED_STRETCH_PROGRAMS, ...BUNDLED_CARDIO_PROGRAMS];
  const names = new Set<string>();
  for (const p of allPrograms) {
    for (const d of p.days) {
      for (const s of d.sessions) {
        for (const ex of s.exercises) names.add(ex.name);
      }
    }
  }
  console.log(`${allPrograms.length} programme(s) embarqué(s), ${names.size} nom(s) d'exercice unique(s).`);

  const rows: Row[] = [];
  for (const name of names) {
    if (exactMatch(name, records)) {
      rows.push({ name, status: "exact", candidates: [] });
      continue;
    }
    const top = topCandidates(name, records, 3);
    const best = top[0]?.score ?? 0;
    if (best >= FUZZY_THRESHOLD) rows.push({ name, status: "fuzzy", candidates: top });
    else if (best >= NOISE_THRESHOLD) rows.push({ name, status: "no_match", candidates: top });
    else rows.push({ name, status: "unlikely", candidates: top });
  }

  const exact = rows.filter((r) => r.status === "exact");
  const fuzzy = rows.filter((r) => r.status === "fuzzy").sort((a, b) => a.candidates[0].score - b.candidates[0].score);
  const noMatch = rows.filter((r) => r.status === "no_match").sort((a, b) => b.candidates[0].score - a.candidates[0].score);
  const unlikely = rows.filter((r) => r.status === "unlikely").sort((a, b) => b.candidates[0].score - a.candidates[0].score);

  const lines: string[] = [];
  lines.push("# Rapport de correspondance — exercices des programmes vs bibliothèque IronFlow");
  lines.push("");
  lines.push(
    `Bibliothèque version ${current.version} (${records.length} exercices). ${names.size} noms d'exercice uniques trouvés dans les 6 programmes embarqués (${allPrograms.map((p) => p.id).join(", ")}).`,
  );
  lines.push("");
  lines.push(
    "**Aucune association n'est appliquée automatiquement.** Remplir la colonne Décision puis appliquer manuellement dans `src/data/programs.ts` (simple édition de chaîne dans les appels `ex(...)`, sans risque — voir le plan pour la justification).",
  );
  lines.push("");

  lines.push(`## ✅ Correspondance exacte (${exact.length}) — rien à faire`);
  lines.push("");
  for (const r of exact.sort((a, b) => a.name.localeCompare(b.name))) lines.push(`- ${r.name}`);
  lines.push("");

  lines.push(`## ⚠️ Correspondance floue ≥${FUZZY_THRESHOLD} — À VALIDER (${fuzzy.length})`);
  lines.push("");
  lines.push("Triées par score croissant (les cas limites, les plus risqués de faux positif, en premier).");
  lines.push("");
  lines.push("| Nom programme | Meilleur candidat | Score | Tier | Autres candidats | Décision |");
  lines.push("|---|---|---|---|---|---|");
  for (const r of fuzzy) {
    const best = r.candidates[0];
    const others = r.candidates.slice(1).map((c) => `${c.name} (${c.score.toFixed(2)})`).join(", ") || "—";
    lines.push(`| ${r.name} | ${best.name} (\`${best.id}\`) | ${best.score.toFixed(2)} | ${best.tier} | ${others} | |`);
  }
  lines.push("");

  lines.push(`## ❌ Sans correspondance fiable (score <${FUZZY_THRESHOLD}, ≥${NOISE_THRESHOLD}) (${noMatch.length})`);
  lines.push("");
  lines.push("| Nom programme | Meilleur candidat (pour contexte, non suggéré) | Score | Décision |");
  lines.push("|---|---|---|---|");
  for (const r of noMatch) {
    const best = r.candidates[0];
    lines.push(`| ${r.name} | ${best.name} (\`${best.id}\`) | ${best.score.toFixed(2)} | |`);
  }
  lines.push("");

  lines.push(`## 🚫 Probablement pas un exercice réel (score <${NOISE_THRESHOLD}) (${unlikely.length})`);
  lines.push("");
  lines.push("Vraisemblablement des libellés de format d'entraînement (AMRAP, circuit…) plutôt que de vrais noms d'exercices — à reformuler plutôt qu'à faire correspondre.");
  lines.push("");
  for (const r of unlikely.sort((a, b) => a.name.localeCompare(b.name))) lines.push(`- ${r.name}`);
  lines.push("");

  mkdirSync(dirname(OUT_PATH), { recursive: true });
  writeFileSync(OUT_PATH, lines.join("\n"), "utf-8");

  console.log(
    `Rapport écrit dans ${OUT_PATH} : ${exact.length} exact, ${fuzzy.length} flou à valider, ${noMatch.length} sans correspondance, ${unlikely.length} probablement pas un exercice.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
