/**
 * Migration média — ExerciseGymGifsDB → IronFlow (médias uniquement).
 *
 * RÈGLE ABSOLUE : ce script ne lit `exercise-library/versions/vN/exercises.json`
 * qu'en LECTURE SEULE et ne le réécrit JAMAIS. Aucun champ d'`ExerciseRecord`
 * (id, nom, muscles, équipement, enrichment, favoris, etc.) n'est modifié.
 * La seule sortie de ce script est :
 *   1. un rapport JSON (table de correspondance, jamais appliqué à l'aveugle) ;
 *   2. en `--apply`, des fichiers copiés dans `exercise-library/media/gymgifsdb/`,
 *      nommés par ID IronFlow — le Media Resolver (`useExerciseMedia.ts`) les
 *      découvre ensuite exactement comme il découvre déjà `media/ironflow/`
 *      et `media/workoutx/` : par convention de nommage, sans indirection ni
 *      table de correspondance à charger au runtime.
 *
 * Source : `exercise-library/media/ExerciseGymGifsDB-main/api/en/exercises.json`
 * (1323 exercices, GIF + miniature WebP déjà générée par exercice, structure
 * documentée dans son propre README.md — jamais modifiée non plus).
 *
 * Matching : similarité de nom (bigrammes normalisés, même algorithme que
 * `src/utils/exercise-library-merge.ts`) sur `nameEn` en priorité (repli
 * `nameFr`), corroborée par le groupe musculaire (mapping FR 14 groupes →
 * EN 19 groupes) et, à titre indicatif seulement dans le rapport, par
 * l'équipement et la catégorie. AUCUNE association n'est automatique sous le
 * seuil de confiance — une correspondance non fiable finit dans la file de
 * révision manuelle (`--out-review`), jamais appliquée silencieusement.
 *
 * Usage (depuis frontend/) :
 *   node --no-experimental-detect-module -r ts-node/register scripts/import-gymgifsdb-media.ts [--dry-run] [--apply] [--out=<path>]
 *
 * --dry-run (défaut)  N'écrit et ne copie AUCUN fichier. Génère uniquement
 *                      les rapports.
 * --apply              Copie les fichiers gif/webp des associations
 *                      "auto" vers `exercise-library/media/gymgifsdb/` et
 *                      recalcule `media-manifest.json` (délégué au pipeline
 *                      de publication existant, pas ici). N'écrit jamais
 *                      dans `exercises.json`.
 */

import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import type { ExerciseRecord } from "../src/utils/exercise-records";
import type { ExerciseMuscleGroup } from "../src/utils/exercise-muscle-groups";
import type { ExerciseEquipment } from "../src/utils/exercise-equipment";

// ---------- Name normalization / similarity (même algorithme que exercise-library-merge.ts) ----------

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function bigrams(s: string): Set<string> {
  const n = normalize(s);
  const grams = new Set<string>();
  for (let i = 0; i < n.length - 1; i++) grams.add(n.slice(i, i + 2));
  return grams;
}

function similarity(a: string, b: string): number {
  const ga = bigrams(a);
  const gb = bigrams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let overlap = 0;
  for (const g of ga) if (gb.has(g)) overlap++;
  return (2 * overlap) / (ga.size + gb.size);
}

// ---------- Taxonomy mapping (corroboration only — never blocking on its own) ----------

const MUSCLE_MAP: Partial<Record<ExerciseMuscleGroup, string[]>> = {
  chest: ["pectorals"],
  back: ["lats", "upper-back", "spine"],
  shoulders: ["delts"],
  biceps: ["biceps"],
  triceps: ["triceps"],
  forearms: ["forearms"],
  abs: ["abs"],
  quads: ["quads"],
  hamstrings: ["hamstrings"],
  glutes: ["glutes"],
  calves: ["calves"],
  traps: ["traps", "levator-scapulae", "serratus-anterior"],
  lower_back: ["spine"],
  // `full_body` couvre en pratique le cardio/plyo chez WorkoutX comme chez
  // GymGifsDB (jumping jacks, burpees, courses...) — sans ce repli, ~15 des
  // 18 cas "score parfait mais non corroboré" observés à l'analyse (ex.
  // "Burpee"/"Mountain Climber"/"Course") seraient injustement recalés en
  // révision manuelle malgré un nom strictement identique.
  full_body: ["cardio"],
};

const EQUIPMENT_MAP: Partial<Record<ExerciseEquipment, string[]>> = {
  barbell: ["barbell", "ez-bar", "smith"],
  dumbbell: ["dumbbell"],
  kettlebell: ["kettlebell"],
  machine: ["machine", "lever", "cable", "sled", "smith"],
  bodyweight: ["bodyweight"],
  resistance_band: ["band"],
  other: ["other"],
};

// ---------- Types ----------

type GymExercise = {
  id: string;
  slug: string;
  name: string;
  muscle: string;
  bodyPart: string;
  equipment: string;
  category: string;
  file: string;
};

type Decision = "auto" | "review" | "none";

type MatchResult = {
  ironflowId: string;
  nameFr: string;
  nameEn: string | null;
  primaryMuscle: string | null;
  equipment: string | null;
  gymId: string | null;
  gymName: string | null;
  gymMuscle: string | null;
  score: number;
  nameExact: boolean;
  muscleCorroborated: boolean;
  equipmentCorroborated: boolean;
  decision: Decision;
  reason: string;
};

const HIGH_THRESHOLD = 0.55;
const MEDIUM_THRESHOLD = 0.4;

function findBestMatch(
  ex: ExerciseRecord,
  pool: GymExercise[],
): { gym: GymExercise | null; score: number; nameExact: boolean } {
  const nameEn = ex.nameEn ?? "";
  const nameFr = ex.nameFr ?? "";
  const normEn = nameEn ? normalize(nameEn) : "";
  const normFr = normalize(nameFr);

  let best: GymExercise | null = null;
  let bestScore = 0;
  let nameExact = false;

  for (const g of pool) {
    const normGym = normalize(g.name);
    const normSlug = normalize(g.slug.replace(/-/g, " "));
    const isExact = (normEn !== "" && normEn === normGym) || normFr === normGym;

    const score = Math.max(
      nameEn ? similarity(nameEn, g.name) : 0,
      similarity(nameFr, g.name),
      nameEn ? similarity(nameEn, g.slug.replace(/-/g, " ")) : 0,
    );

    if (isExact) {
      // Une correspondance de nom exacte (après normalisation) l'emporte
      // toujours, même si un autre candidat a un score bigramme légèrement
      // supérieur par coïncidence — c'est le signal le plus fiable possible.
      best = g;
      bestScore = 1;
      nameExact = true;
      break;
    }
    if (score > bestScore) {
      best = g;
      bestScore = score;
    }
    void normSlug;
  }

  return { gym: best, score: bestScore, nameExact };
}

function classify(
  ex: ExerciseRecord,
  gym: GymExercise | null,
  score: number,
  nameExact: boolean,
): { decision: Decision; reason: string; muscleCorrob: boolean; equipCorrob: boolean } {
  if (!gym) return { decision: "none", reason: "Aucun candidat trouvé.", muscleCorrob: false, equipCorrob: false };

  const muscle = ex.primaryMuscle ?? null;
  const equipment = ex.equipment ?? null;
  const muscleCorrob = !!muscle && (MUSCLE_MAP[muscle] ?? []).includes(gym.muscle);
  const equipCorrob = !!equipment && (EQUIPMENT_MAP[equipment] ?? []).includes(gym.equipment);

  if (nameExact) {
    return {
      decision: "auto",
      reason: "Nom identique après normalisation.",
      muscleCorrob,
      equipCorrob,
    };
  }
  if (score >= HIGH_THRESHOLD && muscleCorrob) {
    return {
      decision: "auto",
      reason: `Similarité forte (${score.toFixed(2)}) + muscle corroboré.`,
      muscleCorrob,
      equipCorrob,
    };
  }
  if (score >= HIGH_THRESHOLD) {
    return {
      decision: "review",
      reason: `Similarité forte (${score.toFixed(2)}) mais muscle non corroboré — à valider.`,
      muscleCorrob,
      equipCorrob,
    };
  }
  if (score >= MEDIUM_THRESHOLD) {
    return {
      decision: "review",
      reason: `Similarité moyenne (${score.toFixed(2)}) — à valider.`,
      muscleCorrob,
      equipCorrob,
    };
  }
  return {
    decision: "none",
    reason: `Similarité trop faible (${score.toFixed(2)}).`,
    muscleCorrob,
    equipCorrob,
  };
}

// ---------- Main ----------

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");
  const outPath =
    args.find((a) => a.startsWith("--out="))?.split("=")[1] ??
    "scripts/output/gymgifsdb-import-report.json";
  const reviewPath = "scripts/output/gymgifsdb-review.json";

  const currentPath = "../exercise-library/current.json";
  if (!existsSync(currentPath)) {
    throw new Error(`${currentPath} introuvable — aucune version officielle publiée.`);
  }
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `../exercise-library/${current.path}/exercises.json`;
  const exercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));

  const gymApiPath =
    "../exercise-library/media/ExerciseGymGifsDB-main/api/en/exercises.json";
  if (!existsSync(gymApiPath)) {
    throw new Error(`${gymApiPath} introuvable.`);
  }
  const gymData: { count: number; exercises: GymExercise[] } = JSON.parse(
    readFileSync(gymApiPath, "utf-8"),
  );
  const gymPool = gymData.exercises;
  const gymRootDir = "../exercise-library/media/ExerciseGymGifsDB-main";

  console.log(
    `Bibliothèque IronFlow : ${exercises.length} exercice(s) (version ${current.version}, lecture seule).`,
  );
  console.log(`ExerciseGymGifsDB : ${gymPool.length} exercice(s) source.`);

  const results: MatchResult[] = [];
  let autoCount = 0;
  let reviewCount = 0;
  let noneCount = 0;

  for (const ex of exercises) {
    // `custom` n'existe jamais dans ce fichier partagé (les exercices
    // personnels vivent dans le stockage de l'utilisateur), mais on
    // l'exclut explicitement par prudence si jamais la donnée évoluait.
    if (ex.source === "custom") continue;

    const { gym, score, nameExact } = findBestMatch(ex, gymPool);
    const { decision, reason, muscleCorrob, equipCorrob } = classify(ex, gym, score, nameExact);

    results.push({
      ironflowId: ex.id,
      nameFr: ex.nameFr,
      nameEn: ex.nameEn ?? null,
      primaryMuscle: ex.primaryMuscle ?? null,
      equipment: ex.equipment ?? null,
      gymId: gym?.id ?? null,
      gymName: gym?.name ?? null,
      gymMuscle: gym?.muscle ?? null,
      score: Math.round(score * 100) / 100,
      nameExact,
      muscleCorroborated: muscleCorrob,
      equipmentCorroborated: equipCorrob,
      decision,
      reason,
    });

    if (decision === "auto") autoCount++;
    else if (decision === "review") reviewCount++;
    else noneCount++;
  }

  console.log(`\n=== Résultat du matching ===`);
  console.log(`  Auto-associés (haute confiance) : ${autoCount}`);
  console.log(`  À valider manuellement           : ${reviewCount}`);
  console.log(`  Aucun candidat fiable             : ${noneCount}`);
  console.log(`  Total traité                      : ${results.length}`);

  const report = {
    generatedAt: new Date().toISOString(),
    ironflowVersion: current.version,
    gymgifsdbSourceCount: gymPool.length,
    totals: { auto: autoCount, review: reviewCount, none: noneCount, total: results.length },
    results,
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");
  console.log(`\nRapport complet écrit : ${outPath}`);

  const reviewList = results.filter((r) => r.decision === "review");
  writeFileSync(
    reviewPath,
    JSON.stringify(
      {
        generatedAt: report.generatedAt,
        count: reviewList.length,
        note:
          "Exercices nécessitant une validation manuelle avant d'être associés à un média GymGifsDB. Aucune association automatique n'a été faite pour ces entrées.",
        exercises: reviewList,
      },
      null,
      2,
    ),
    "utf-8",
  );
  console.log(`Rapport de révision manuelle écrit : ${reviewPath} (${reviewList.length} entrées)`);

  if (!apply) {
    console.log(
      `\n--dry-run (défaut) : aucun fichier média copié, exercises.json non touché. Relance avec --apply après revue des rapports.`,
    );
    return;
  }

  console.log(`\n--apply : copie des médias associés en haute confiance...`);
  const destDir = "../exercise-library/media/gymgifsdb";
  mkdirSync(destDir, { recursive: true });

  let copiedGif = 0;
  let copiedWebp = 0;
  let missingSourceFile = 0;

  for (const r of results) {
    if (r.decision !== "auto" || !r.gymId) continue;
    const gifSrc = join(gymRootDir, `${r.gymId}.gif`);
    const thumbSrc = join(gymRootDir, `${r.gymId}.thumb.webp`);
    const gifDest = join(destDir, `${r.ironflowId}.gif`);
    const webpDest = join(destDir, `${r.ironflowId}.webp`);

    if (existsSync(gifSrc)) {
      copyFileSync(gifSrc, gifDest);
      copiedGif++;
    } else {
      missingSourceFile++;
      console.warn(`  ⚠ GIF source manquant pour ${r.ironflowId} (${r.gymId})`);
    }
    if (existsSync(thumbSrc)) {
      copyFileSync(thumbSrc, webpDest);
      copiedWebp++;
    }
  }

  const totalFiles = readdirSync(destDir).length;
  console.log(`  GIF copiés   : ${copiedGif}`);
  console.log(`  WebP copiés  : ${copiedWebp}`);
  if (missingSourceFile > 0) console.log(`  ⚠ Fichiers source manquants : ${missingSourceFile}`);
  console.log(`  Total dans media/gymgifsdb/ : ${totalFiles}`);
  console.log(
    `\nAucune modification de exercises.json. Prochaine étape : relancer le pipeline de publication (commit-library-version.ts / publish-library-to-app.ts) une fois prêt à republier.`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
