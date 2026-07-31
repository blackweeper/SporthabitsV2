/**
 * Bibliothèque officielle IronFlow 300 — sélection assistée d'un sous-ensemble
 * curaté (~300 exercices) parmi la bibliothèque complète, sans rien
 * supprimer. Suit les mêmes conventions que `enrich-library-content*.ts` :
 * lit `exercise-library/current.json` → `versions/vN/exercises.json`, écrit
 * en place avec backup horodaté.
 *
 * Usage (depuis frontend/) :
 *   node -r ts-node/register scripts/curate-official-library.ts [--dry-run] [--apply] [--out=<path>]
 *
 * --dry-run (défaut)  N'écrit AUCUNE donnée réelle. Génère un rapport de
 *                      revue (JSON + résumé console) listant les candidats
 *                      proposés, leur score/raison/tier/bucket/collection
 *                      probable, et une table de couverture par bucket.
 * --apply              Écrit `exerciseTier`/`collections` dans
 *                      versions/vN/exercises.json pour les 1348 exercices
 *                      (candidats retenus + le reste en collection_only),
 *                      après un backup horodaté. À lancer seulement après
 *                      revue du rapport dry-run.
 * --out                Chemin du rapport JSON (défaut : scripts/output/official-300-proposal.json).
 *
 * `deprecated` n'est jamais assigné automatiquement par ce script — c'est
 * une liste d'exclusion manuelle courte, à compléter après revue. Un
 * exercice déjà `deprecated` (mis à jour manuellement) n'est jamais
 * reconsidéré par une exécution ultérieure.
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import type { ExerciseRecord, ExerciseTier } from "../src/utils/exercise-records";
import type { FutureCollection } from "../src/utils/exercise-collection";
import { FOUNDATIONAL_MOVEMENT_KEYWORDS } from "./lib/enrichment-shared";

// ---------- Buckets & quotas ----------

type Bucket =
  | "fondamentaux_force"
  | "musculation_hypertrophie"
  | "crossfit_hyrox"
  | "poids_du_corps_gymnastique"
  | "running_cardio"
  | "mobilite_prevention";

const BUCKET_LABEL: Record<Bucket, string> = {
  fondamentaux_force: "Fondamentaux force",
  musculation_hypertrophie: "Musculation / hypertrophie",
  crossfit_hyrox: "CrossFit / HYROX",
  poids_du_corps_gymnastique: "Poids du corps / gymnastique",
  running_cardio: "Running / cardio",
  mobilite_prevention: "Mobilité / prévention",
};

// Cibles molles (gardes-fous, pas des règles absolues) — somme = 300, cf. plan.
const BUCKET_QUOTA: Record<Bucket, number> = {
  fondamentaux_force: 60,
  musculation_hypertrophie: 70,
  crossfit_hyrox: 50,
  poids_du_corps_gymnastique: 40,
  running_cardio: 30,
  mobilite_prevention: 50,
};

const TOTAL_TARGET = 300;
const ESSENTIAL_TARGET = 50;

// ---------- Name normalization / clustering ----------

const VARIANT_QUALIFIER_WORDS = [
  "machine",
  "smith",
  "poulie",
  "cable",
  "câble",
  "haltere",
  "halteres",
  "barre",
  "elastique",
  "assis",
  "assise",
  "debout",
  "incline",
  "inclinee",
  "decline",
  "declinee",
  "unilateral",
  "unilaterale",
  "bilateral",
  "genoux",
  "sol",
  "banc",
  "guide",
  "guidee",
  "libre",
  "kettlebell",
  "leste",
  "lestee",
  "prise",
  "large",
  "serree",
  "serre",
  "supination",
  "pronation",
  "neutre",
  "avec",
  "sur",
  "une",
  "jambe",
  "bras",
  "du",
  "de",
  "la",
  "le",
  "les",
  "et",
  "a",
];

function stripDiacritics(s: string): string {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

function normalizeWords(name: string): string[] {
  return stripDiacritics(name.toLowerCase())
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** Base-movement key: the exercise name stripped of equipment/variant
 * qualifier words, combined with muscle+movement+equipment. Two exercises
 * sharing this key are treated as the same "family" (e.g. the 5 Smith
 * Machine calf raise variants) — only one becomes an official candidate. */
function familyKey(record: ExerciseRecord): string {
  const words = normalizeWords(record.nameFr).filter((w) => !VARIANT_QUALIFIER_WORDS.includes(w));
  const core = words.sort().join("-") || stripDiacritics(record.nameFr.toLowerCase());
  return `${core}|${record.primaryMuscle ?? ""}|${record.movementPattern ?? ""}`;
}

// ---------- Name-quality heuristics ----------

/** Flags names that look like raw/unfinished import artifacts rather than a
 * clean, display-ready fiche name — used both as a scoring penalty and as
 * the final "official_core" gate (candidates failing this are replaced by
 * the next-best in their bucket, never silently kept). Deliberately does
 * NOT gate on a missing `nameEn` — ~2% of exercises (mostly the canonical
 * `system` records like "Squat avec barre"/"Développé couché") have none
 * yet but are otherwise perfectly clean reference names; treating that as
 * "dirty" would silently exclude exactly the staples a curated library
 * should prefer. Missing English names are reported separately
 * (`needsEnglishName`) as a to-complete note, not a replacement trigger. */
function hasCleanName(record: ExerciseRecord): { ok: boolean; reason?: string } {
  const fr = (record.nameFr ?? "").trim();
  if (fr.length < 3) return { ok: false, reason: "nom FR trop court" };
  if (/\s{2,}/.test(fr)) return { ok: false, reason: "espaces multiples" };
  if (/^[A-Z\s]+$/.test(fr) && fr.length > 3) return { ok: false, reason: "nom FR tout en majuscules" };
  if (/[_{}<>]|n\/a/i.test(fr)) return { ok: false, reason: "artefact d'import" };
  if (!record.category) return { ok: false, reason: "catégorie manquante" };
  return { ok: true };
}

function needsEnglishName(record: ExerciseRecord): boolean {
  return !record.nameEn || record.nameEn.trim().length < 3;
}

// ---------- Bucket classification (heuristic, script-internal only — never
// persisted to enrichment.disciplines/trainingGoals, cf. plan) ----------

const HYROX_CROSSFIT_KEYWORDS = [
  "clean", "snatch", "jerk", "thruster", "wall ball", "wall-ball",
  "burpee", "box jump", "sled", "farmer", "kettlebell swing",
  "double-under", "double under", "muscle-up", "muscle up",
  "rameur", "row erg", "ski erg", "assault bike", "sac de sable", "sandbag",
  "arraché", "épaulé", "développé militaire", "snatch", "wallball",
];

const GYMNASTIC_BODYWEIGHT_KEYWORDS = [
  "traction", "pompe", "pompes", "dip", "dips", "pistol", "planche",
  "handstand", "poirier", "gainage", "abdominaux", "burpee", "montée",
  "pull-up", "push-up", "pull up", "push up",
];

function nameHasAny(record: ExerciseRecord, keywords: string[]): boolean {
  const name = stripDiacritics(`${record.nameFr} ${record.nameEn ?? ""}`.toLowerCase());
  const tags = ((record.raw as Record<string, unknown> | null)?.movement_tags as string[] | undefined) ?? [];
  const haystack = `${name} ${tags.join(" ").toLowerCase()}`;
  return keywords.some((k) => haystack.includes(stripDiacritics(k.toLowerCase())));
}

function classifyBucket(record: ExerciseRecord): Bucket {
  if (nameHasAny(record, HYROX_CROSSFIT_KEYWORDS)) return "crossfit_hyrox";

  if (record.category === "cardio") return "running_cardio";
  if (record.category === "mobility" || record.category === "stretching") return "mobilite_prevention";

  if (record.equipment === "bodyweight" && nameHasAny(record, GYMNASTIC_BODYWEIGHT_KEYWORDS)) {
    return "poids_du_corps_gymnastique";
  }
  if (record.equipment === "bodyweight") return "poids_du_corps_gymnastique";

  if (record.category === "plyometric") return "crossfit_hyrox";

  // Musculation restante : compound -> "fondamentaux force", isolation ->
  // "hypertrophie". `raw.mechanic` (WorkoutX) is the reliable signal (100%
  // filled on workoutx records) and takes priority — `movementPattern`
  // alone is NOT a safe proxy (a biceps curl or triceps extension is
  // "pull"/"push" too, despite being pure isolation) and is only used as a
  // fallback for `system` records with no `raw`, restricted to patterns
  // that are unambiguously compound (squat/hinge/carry, never push/pull).
  const mechanic = (record.raw as Record<string, unknown> | null)?.mechanic as string | undefined;
  if (mechanic === "compound") return "fondamentaux_force";
  if (mechanic === "isolation") return "musculation_hypertrophie";
  const isCompoundPattern = ["squat", "hinge", "carry"].includes(record.movementPattern ?? "");
  return isCompoundPattern ? "fondamentaux_force" : "musculation_hypertrophie";
}

function probableCollections(record: ExerciseRecord, bucket: Bucket): FutureCollection[] {
  const tags = new Set<FutureCollection>();
  if (bucket === "crossfit_hyrox") {
    tags.add("crossfit");
    tags.add("hyrox");
  }
  if (bucket === "mobilite_prevention") tags.add("mobility_longevity");
  if (bucket === "running_cardio") tags.add("running_performance");
  if (bucket === "poids_du_corps_gymnastique") tags.add("home_gym");
  if (bucket === "fondamentaux_force" || bucket === "musculation_hypertrophie") tags.add("bodybuilding");
  if (["bodyweight", "dumbbell", "resistance_band"].includes(record.equipment ?? "")) tags.add("home_gym");
  if (record.difficulty === "beginner") tags.add("beginner_journey");
  return Array.from(tags);
}

// ---------- Scoring ----------

function isFoundational(record: ExerciseRecord): boolean {
  const name = (record.nameEn ?? record.nameFr ?? "").toLowerCase();
  return FOUNDATIONAL_MOVEMENT_KEYWORDS.some((k) => name.includes(k));
}

function isMachineTooSpecific(record: ExerciseRecord): boolean {
  if (record.equipment !== "machine") return false;
  const words = normalizeWords(record.nameFr);
  return ["smith", "assis", "guide", "guidee"].some((w) => words.includes(w));
}

type ScoreResult = { score: number; reasons: string[] };

function scoreCandidate(record: ExerciseRecord): ScoreResult {
  const reasons: string[] = [];
  let score = 0;

  const popularityRank = (record.raw as Record<string, unknown> | null)?.popularityRank as number | undefined;
  if (popularityRank != null) {
    const normalized = (popularityRank - 2) / 3; // 2-5 -> 0-1
    score += normalized * 0.3;
    if (popularityRank >= 4) reasons.push(`populaire (WorkoutX ${popularityRank}/5)`);
  }

  if (isFoundational(record)) {
    score += 0.25;
    reasons.push("mouvement fondamental");
  }

  const hasQualityContent = Boolean(record.description) && Boolean(record.instructions?.length) && Boolean(record.media);
  if (hasQualityContent) {
    score += 0.15;
    reasons.push("contenu de base complet");
  }

  const mappingWarnings = (record.raw as Record<string, unknown> | null)?._mappingWarnings as unknown[] | undefined;
  if (mappingWarnings && mappingWarnings.length > 0) {
    score -= 0.35;
    reasons.push("pénalité : avertissement de mapping WorkoutX");
  }

  if (isMachineTooSpecific(record)) {
    score -= 0.3;
    reasons.push("pénalité : machine trop spécifique");
  }

  const nameCheck = hasCleanName(record);
  if (!nameCheck.ok) {
    score -= 0.4;
    reasons.push(`pénalité : nom ambigu (${nameCheck.reason})`);
  }

  return { score: Math.round(score * 1000) / 1000, reasons };
}

// ---------- Selection ----------

type Candidate = {
  record: ExerciseRecord;
  bucket: Bucket;
  score: number;
  reasons: string[];
  nameCheck: { ok: boolean; reason?: string };
};

type Selected = Candidate & { tier: Exclude<ExerciseTier, "collection_only" | "deprecated">; collections: FutureCollection[] };

function selectOfficial300(candidates: Candidate[]): {
  selected: Selected[];
  flaggedForNameCleanup: Candidate[];
  bucketCoverage: { bucket: Bucket; target: number; actual: number }[];
} {
  const byBucket = new Map<Bucket, Candidate[]>();
  for (const c of candidates) {
    const list = byBucket.get(c.bucket) ?? [];
    list.push(c);
    byBucket.set(c.bucket, list);
  }
  for (const list of byBucket.values()) list.sort((a, b) => b.score - a.score);

  const selected: Candidate[] = [];
  const flaggedForNameCleanup: Candidate[] = [];
  const bucketCoverage: { bucket: Bucket; target: number; actual: number }[] = [];

  for (const bucket of Object.keys(BUCKET_QUOTA) as Bucket[]) {
    const pool = byBucket.get(bucket) ?? [];
    const target = BUCKET_QUOTA[bucket];
    let taken = 0;
    for (const c of pool) {
      if (taken >= target) break;
      if (!c.nameCheck.ok) {
        flaggedForNameCleanup.push(c);
        continue; // remplacé par le candidat suivant du même bucket
      }
      selected.push(c);
      taken++;
    }
    bucketCoverage.push({ bucket, target, actual: taken });
  }

  // Complément global si le plafond de 300 n'est pas atteint (bucket(s) en
  // sous-effectif) : on pioche dans le meilleur reliquat, tous buckets
  // confondus, plutôt que de forcer un mauvais candidat dans son bucket.
  if (selected.length < TOTAL_TARGET) {
    const selectedIds = new Set(selected.map((c) => c.record.id));
    const remainder = candidates
      .filter((c) => !selectedIds.has(c.record.id) && c.nameCheck.ok)
      .sort((a, b) => b.score - a.score);
    for (const c of remainder) {
      if (selected.length >= TOTAL_TARGET) break;
      selected.push(c);
    }
  }

  selected.sort((a, b) => b.score - a.score);
  const capped = selected.slice(0, TOTAL_TARGET);

  // Tier "essential" : ~50 mouvements emblématiques, répartis proportionnellement
  // au poids de chaque bucket dans les 300 (pas un pur classement global) — sinon
  // les buckets à score moyen plus haut (ex. fondamentaux force, dopé par le bonus
  // "mouvement fondamental") monopolisent la vitrine au détriment de la diversité
  // CrossFit/Hyrox/running/mobilité que la philosophie de sélection vise à garantir.
  const essentialIds = new Set<string>();
  const totalQuota = Object.values(BUCKET_QUOTA).reduce((a, b) => a + b, 0);
  for (const bucket of Object.keys(BUCKET_QUOTA) as Bucket[]) {
    const bucketSelected = capped.filter((c) => c.bucket === bucket).sort((a, b) => b.score - a.score);
    const proportionalTarget = Math.round((BUCKET_QUOTA[bucket] / totalQuota) * ESSENTIAL_TARGET);
    for (const c of bucketSelected.slice(0, proportionalTarget)) essentialIds.add(c.record.id);
  }
  for (const c of capped) {
    if (essentialIds.size >= ESSENTIAL_TARGET) break;
    essentialIds.add(c.record.id);
  }

  const withTierAndCollections: Selected[] = capped.map((c) => ({
    ...c,
    tier: essentialIds.has(c.record.id) ? "essential" : "official_core",
    collections: probableCollections(c.record, c.bucket),
  }));

  return { selected: withTierAndCollections, flaggedForNameCleanup, bucketCoverage };
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const outPath = args.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "scripts/output/official-300-proposal.json";

  const currentPath = "../exercise-library/current.json";
  if (!existsSync(currentPath)) {
    throw new Error(`${currentPath} introuvable — aucune version officielle publiée.`);
  }
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));

  console.log(`Bibliothèque : ${exercises.length} exercice(s), version ${current.version}.`);

  const eligible = exercises.filter((r) => r.exerciseTier !== "deprecated");
  const skippedDeprecated = exercises.length - eligible.length;
  if (skippedDeprecated > 0) {
    console.log(`${skippedDeprecated} exercice(s) déjà "deprecated" ignoré(s) (jamais reconsidéré automatiquement).`);
  }

  // Regroupement en familles de variantes — un seul représentant par
  // famille entre dans le pool de candidats officiels.
  const families = new Map<string, ExerciseRecord[]>();
  for (const r of eligible) {
    const key = familyKey(r);
    const list = families.get(key) ?? [];
    list.push(r);
    families.set(key, list);
  }

  const candidates: Candidate[] = [];
  let familiesWithVariants = 0;
  for (const members of families.values()) {
    if (members.length > 1) familiesWithVariants++;
    let best: { record: ExerciseRecord; score: number; reasons: string[] } | null = null;
    for (const m of members) {
      const { score, reasons } = scoreCandidate(m);
      if (!best || score > best.score) best = { record: m, score, reasons };
    }
    if (!best) continue;
    candidates.push({
      record: best.record,
      bucket: classifyBucket(best.record),
      score: best.score,
      reasons: best.reasons,
      nameCheck: hasCleanName(best.record),
    });
  }

  console.log(`Familles de variantes détectées : ${families.size} (${familiesWithVariants} avec >1 variante).`);
  console.log(`Candidats (1 représentant par famille) : ${candidates.length}\n`);

  const { selected, flaggedForNameCleanup, bucketCoverage } = selectOfficial300(candidates);

  console.log(`=== Couverture par bucket (cible vs réel) ===`);
  for (const { bucket, target, actual } of bucketCoverage) {
    console.log(`  ${BUCKET_LABEL[bucket].padEnd(30)} cible ${target.toString().padStart(3)} · réel ${actual.toString().padStart(3)}`);
  }
  const essentialCount = selected.filter((s) => s.tier === "essential").length;
  console.log(`\nTotal sélectionné : ${selected.length} (essential: ${essentialCount}, official_core: ${selected.length - essentialCount})`);
  if (flaggedForNameCleanup.length > 0) {
    console.log(`${flaggedForNameCleanup.length} candidat(s) écarté(s) pour nom à nettoyer (remplacés par le suivant du bucket).`);
  }
  const missingEnglish = selected.filter((c) => needsEnglishName(c.record)).length;
  if (missingEnglish > 0) {
    console.log(`${missingEnglish} exercice(s) retenu(s) sans nom EN (à compléter, ne bloque pas la sélection).`);
  }

  const report = {
    generatedAt: new Date().toISOString(),
    libraryVersion: current.version,
    totalExercises: exercises.length,
    totalSelected: selected.length,
    bucketCoverage: bucketCoverage.map((b) => ({ bucket: b.bucket, label: BUCKET_LABEL[b.bucket], target: b.target, actual: b.actual })),
    candidates: selected.map((c) => ({
      id: c.record.id,
      nameFr: c.record.nameFr,
      nameEn: c.record.nameEn ?? null,
      category: c.record.category,
      tier: c.tier,
      bucket: c.bucket,
      bucketLabel: BUCKET_LABEL[c.bucket],
      score: c.score,
      reasons: c.reasons,
      needsEnglishName: needsEnglishName(c.record),
      probableCollections: c.collections,
    })),
    flaggedForNameCleanup: flaggedForNameCleanup.map((c) => ({
      id: c.record.id,
      nameFr: c.record.nameFr,
      bucket: c.bucket,
      reason: c.nameCheck.reason,
    })),
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nRapport écrit : ${outPath}`);

  if (!apply) {
    console.log(`\n--dry-run (défaut) : aucune donnée réelle modifiée. Relance avec --apply après revue du rapport.`);
    return;
  }

  console.log(`\n--apply : écriture de exerciseTier/collections dans ${exercisesPath}...`);
  const backupPath = `${exercisesPath}.backup-${Date.now()}.json`;
  copyFileSync(exercisesPath, backupPath);
  console.log(`Sauvegarde créée : ${backupPath}`);

  // Les 300 retenus obtiennent leur tier + collections déjà calculés. Les
  // ~1048 restants ne sont PAS supprimés — consigne explicite — et sont
  // aussi classés par Collection future probable (même heuristique bucket
  // -> collections, appliquée exercice par exercice cette fois, pas
  // seulement au représentant de famille) pour que le futur système de
  // Collections téléchargeables puisse déjà les proposer.
  const selectedById = new Map(selected.map((c) => [c.record.id, c]));
  let collectionOnlyTagged = 0;
  for (const r of exercises) {
    if (r.exerciseTier === "deprecated") continue;
    const sel = selectedById.get(r.id);
    if (sel) {
      r.exerciseTier = sel.tier;
      r.collections = sel.collections;
    } else {
      r.exerciseTier = "collection_only";
      r.collections = probableCollections(r, classifyBucket(r));
      collectionOnlyTagged++;
    }
  }
  console.log(`${collectionOnlyTagged} exercice(s) "collection_only" classé(s) pour les futures Collections.`);
  writeFileSync(exercisesPath, JSON.stringify(exercises, null, 2), "utf-8");
  console.log(`Terminé : ${selected.length} exercice(s) classé(s) essential/official_core, le reste en collection_only.`);
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
