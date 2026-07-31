/**
 * V3 — génère la bibliothèque de base embarquée dans l'app (les 300
 * exercices officiels `essential`/`official_core`, avec leurs illustrations
 * IronFlow disponibles), pour un accès zéro-réseau dès la première ouverture
 * (voir plan "IronFlow — Bibliothèque V3").
 *
 * Produit deux fichiers committés dans `frontend/` :
 * - `src/data/core-library-v3.json` — `ExerciseRecord[]` complet des 300.
 * - `src/data/core-library-assets.generated.ts` — un `require()` statique
 *   par illustration IronFlow réellement disponible (Metro exige un chemin
 *   littéral, pas de `require()` dynamique — ce fichier est donc régénéré
 *   à chaque exécution, jamais édité à la main).
 * Et copie les fichiers `.webp` correspondants dans `assets/exercise-media/`.
 *
 * Usage (depuis frontend/) :
 *   TS_NODE_COMPILER_OPTIONS='{"module":"commonjs","moduleResolution":"node"}' \
 *     node --no-experimental-detect-module -r ts-node/register \
 *     scripts/build-core-library.ts [--check]
 *
 * `--check` : ne rien écrire, juste vérifier que chaque exercice retenu dont
 * l'illustration existe dans `exercise-library/media/ironflow/` a bien un
 * asset copié et référencé — utile pour repérer un module généré incohérent
 * avant de le committer.
 */
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import type { ExerciseRecord } from "../src/utils/exercise-records";

const LIBRARY_ROOT = "../exercise-library";
const DATA_OUT = "src/data/core-library-v3.json";
const ASSETS_GENERATED_OUT = "src/data/core-library-assets.generated.ts";
const ASSETS_DIR = "assets/exercise-media";
const ASSETS_IMPORT_PREFIX = "../../assets/exercise-media";

function main() {
  const checkOnly = process.argv.includes("--check");

  const currentPath = `${LIBRARY_ROOT}/current.json`;
  const current: { version: number; path: string } = JSON.parse(readFileSync(currentPath, "utf-8"));
  const exercisesPath = `${LIBRARY_ROOT}/${current.path}/exercises.json`;
  const allExercises: ExerciseRecord[] = JSON.parse(readFileSync(exercisesPath, "utf-8"));

  const core = allExercises.filter(
    (r) => r.exerciseTier === "essential" || r.exerciseTier === "official_core",
  );
  if (core.length === 0) {
    throw new Error(
      `Aucun exercice essential/official_core trouvé dans ${exercisesPath} — la curation a-t-elle bien tourné ?`,
    );
  }

  const ironflowDir = `${LIBRARY_ROOT}/media/ironflow`;
  const availableIds = new Set(
    existsSync(ironflowDir) ? readdirSync(ironflowDir).map((f) => f.replace(/\.webp$/, "")) : [],
  );
  const withIllustration = core.filter((r) => availableIds.has(r.id));

  if (checkOnly) {
    const generatedSrc = existsSync(ASSETS_GENERATED_OUT) ? readFileSync(ASSETS_GENERATED_OUT, "utf-8") : "";
    const missing = withIllustration.filter(
      (r) => !existsSync(`${ASSETS_DIR}/${r.id}.webp`) || !generatedSrc.includes(`"${r.id}"`),
    );
    if (missing.length > 0) {
      console.error(
        `--check a échoué : ${missing.length} illustration(s) attendue(s) mais absente(s) de ${ASSETS_DIR}/ ou de ${ASSETS_GENERATED_OUT} : ${missing.map((r) => r.id).join(", ")}`,
      );
      process.exit(1);
    }
    console.log(`--check OK : ${withIllustration.length} illustration(s) cohérentes.`);
    return;
  }

  // 1. Données complètes des 300 (essential d'abord, cohérent avec le reste du pipeline).
  core.sort((a, b) => (a.exerciseTier === "essential" ? -1 : 1) - (b.exerciseTier === "essential" ? -1 : 1));
  writeFileSync(DATA_OUT, JSON.stringify(core, null, 2), "utf-8");

  // 2. Copie des illustrations disponibles.
  mkdirSync(ASSETS_DIR, { recursive: true });
  for (const r of withIllustration) {
    copyFileSync(`${ironflowDir}/${r.id}.webp`, `${ASSETS_DIR}/${r.id}.webp`);
  }

  // 3. Module généré avec un require() statique par illustration disponible.
  const lines = [
    "/**",
    " * GÉNÉRÉ par scripts/build-core-library.ts — ne pas éditer à la main.",
    " * Un require() statique par illustration IronFlow des 300 exercices de",
    " * base officiellement disponible aujourd'hui (Metro exige un chemin",
    " * littéral, jamais une variable). Un id absent de cette map n'a",
    " * simplement pas encore d'illustration IronFlow produite — les",
    " * appelants retombent sur leur repli existant (emoji, ou GIF WorkoutX",
    " * via le cache média — voir useExerciseMediaSources).",
    " */",
    "import type { ImageSourcePropType } from \"react-native\";",
    "",
    "export const CORE_LIBRARY_ASSETS: Record<string, ImageSourcePropType> = {",
    ...withIllustration.map((r) => `  "${r.id}": require("${ASSETS_IMPORT_PREFIX}/${r.id}.webp"),`),
    "};",
    "",
  ];
  writeFileSync(ASSETS_GENERATED_OUT, lines.join("\n"), "utf-8");

  console.log(
    `${core.length} exercice(s) de base écrit(s) dans ${DATA_OUT} (${withIllustration.length} avec illustration IronFlow bundlée, ${core.length - withIllustration.length} en attente d'illustration).`,
  );
}

main();
