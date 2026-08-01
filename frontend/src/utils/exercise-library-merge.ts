import type { ExerciseRecord } from "@/src/utils/exercise-records";
import type { ExerciseRecordCategory } from "@/src/utils/exercise-record-category";
import type { ExerciseMuscleGroup } from "@/src/utils/exercise-muscle-groups";
import type { LibraryExercise } from "@/src/data/exercise-library";
import type { CustomExercise } from "@/src/utils/gym-storage";
import type { ExerciseCategory } from "@/src/utils/exercise-category";
import type { MuscleGroupKey } from "@/src/utils/muscle-groups";

/**
 * Phase B3/B3.5 — turns an existing (persisted or freshly-derived) exercise
 * baseline plus a batch of imported WorkoutX `ExerciseRecord`s into ONE
 * final, deduplicated library. Pure (no AsyncStorage) so the merge logic
 * can be unit-tested with a plain script before anything is committed to
 * storage — the actual persistence + baseline selection lives in the
 * `useLibraryUpdate` hook.
 *
 * `existingRecords` is the caller's responsibility to prepare correctly:
 *  - First-ever update: `deriveSystemBaseline(EXERCISE_LIBRARY)` (the Phase A
 *    dev library, converted to `source: "system"` records).
 *  - Any later update: whatever is already persisted, MINUS `source: "custom"`
 *    entries (those are always re-derived fresh from live `CustomExercise[]`
 *    below, since that's still their real source of truth).
 * Passing the previous merge's own output back in as `existingRecords` is
 * what makes repeated updates idempotent (see the id-match tier below) —
 * passing `deriveSystemBaseline(EXERCISE_LIBRARY)` again on a 2nd update
 * would re-introduce anything already replaced as a "new" duplicate.
 *
 * Matching priority:
 *  1. Exact id match (`incoming.id === existing.id`) — the same WorkoutX
 *     exercise reimported on a later update: refreshed in place, but
 *     `favoritedAt`/`aliases`/`parentExerciseId`/`variantLabel`/
 *     `exerciseTier`/`collections` already set locally are preserved rather
 *     than overwritten by the re-imported data.
 *  2. Exact name match against an unconsumed existing record — first-time
 *     replacement of a Phase A dev/system exercise by its WorkoutX
 *     equivalent; the old name is kept as an alias so session logs /
 *     favorites / category overrides / PRs (all name-keyed, see
 *     src/utils/exercise-progress.ts) keep resolving.
 *  3. No match — brand new exercise.
 * Anything in `existingRecords` not consumed by 1 or 2 is kept as-is.
 * `custom` exercises are never touched by this process.
 */

export type MigrationReport = {
  totalExistingBefore: number;
  totalCustomKept: number;
  totalIncoming: number;
  updatedCount: number;
  replacedCount: number;
  addedCount: number;
  unmatchedExistingKept: number;
  duplicatesSkipped: number;
  warnings: string[];
  /** Existing exercises with no *exact* name match, paired with the closest
   * WorkoutX candidate found (by string similarity) above a low confidence
   * threshold — surfaced for a human to confirm, never auto-applied. Exact
   * name equality is the only thing that triggers an automatic replace;
   * WorkoutX's (translated) names essentially never coincide byte-for-byte
   * with the French names invented for the Phase A dev library, so this is
   * what makes most real replacements actually discoverable. */
  possibleMatches: { systemId: string; systemName: string; candidateId: string; candidateName: string; score: number }[];
};

export function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function slugify(s: string): string {
  return normalize(s).replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

/** Bigram (2-character) sets — cheap, dependency-free approximate-string
 * similarity, good enough for a "here's a candidate, please confirm"
 * suggestion rather than a definitive match. */
export function bigrams(s: string): Set<string> {
  const n = normalize(s).replace(/\s+/g, " ");
  const grams = new Set<string>();
  for (let i = 0; i < n.length - 1; i++) grams.add(n.slice(i, i + 2));
  return grams;
}

export function similarity(a: string, b: string): number {
  const ga = bigrams(a);
  const gb = bigrams(b);
  if (ga.size === 0 || gb.size === 0) return 0;
  let overlap = 0;
  for (const g of ga) if (gb.has(g)) overlap++;
  return (2 * overlap) / (ga.size + gb.size);
}

const FUZZY_MATCH_THRESHOLD = 0.65;

// ---------- Legacy taxonomy → new taxonomy (best-effort, documented) ----------

const LEGACY_CATEGORY_MAP: Record<ExerciseCategory, ExerciseRecordCategory> = {
  musculation: "musculation",
  cardio_machine: "cardio",
  mobility: "mobility",
};

export function mapLegacyCategory(old: ExerciseCategory): ExerciseRecordCategory {
  return LEGACY_CATEGORY_MAP[old];
}

/** Old 9-value groups are coarser than the new 14 — each maps to an ordered
 * list of new equivalents (first = best primary-muscle guess, rest folded
 * into secondary muscles). `cardio` intentionally maps to nothing specific
 * (it described an activity type, not a muscle). */
const LEGACY_MUSCLE_MAP: Record<MuscleGroupKey, ExerciseMuscleGroup[]> = {
  chest: ["chest"],
  back: ["back"],
  shoulders: ["shoulders"],
  arms: ["biceps", "triceps", "forearms"],
  legs: ["quads", "hamstrings", "calves"],
  glutes: ["glutes"],
  core: ["abs"],
  cardio: [],
  full_body: ["full_body"],
};

export function mapLegacyMuscleGroups(
  old: MuscleGroupKey[] | undefined,
): { primary: ExerciseMuscleGroup | null; secondary: ExerciseMuscleGroup[] } {
  const mapped = (old ?? []).flatMap((k) => LEGACY_MUSCLE_MAP[k]);
  const unique = Array.from(new Set(mapped));
  return { primary: unique[0] ?? null, secondary: unique.slice(1) };
}

// ---------- Step 1: convert Phase A sources into ExerciseRecord ----------

export function systemRecordFromLibraryExercise(lib: LibraryExercise): ExerciseRecord {
  const { primary, secondary } = mapLegacyMuscleGroups(lib.muscleGroups);
  return {
    id: `sys_${slugify(lib.name)}`,
    source: "system",
    nameFr: lib.name,
    nameEn: null,
    category: mapLegacyCategory(lib.category),
    primaryMuscle: primary,
    secondaryMuscles: secondary.length > 0 ? secondary : null,
    equipment: null,
    description: null,
    musclesWorkedNote: null,
    instructions: null,
    tips: null,
    commonMistakes: null,
    difficulty: null,
    media: null,
    movementPattern: null,
    parentExerciseId: null,
    variantLabel: null,
    aliases: null,
    favoritedAt: null,
    createdAt: new Date(0).toISOString(),
    updatedAt: null,
    raw: null,
  };
}

/** Converts the Phase A static dev library into the `source: "system"`
 * baseline used the very first time a library update ever runs. On any
 * subsequent update, the caller should pass the previously persisted
 * records instead (see module doc comment). */
export function deriveSystemBaseline(devExercises: LibraryExercise[]): ExerciseRecord[] {
  return devExercises.map(systemRecordFromLibraryExercise);
}

export function customRecordFromCustomExercise(c: CustomExercise): ExerciseRecord {
  const { primary, secondary } = mapLegacyMuscleGroups(c.muscleGroups);
  return {
    id: c.id,
    source: "custom",
    nameFr: c.nameFr,
    nameEn: c.nameEn ?? null,
    category: mapLegacyCategory(c.category),
    primaryMuscle: primary,
    secondaryMuscles: secondary.length > 0 ? secondary : null,
    equipment: null, // legacy equipment is free text; not force-mapped to the new enum
    description: c.description ?? null,
    musclesWorkedNote: c.equipment ? `Matériel : ${c.equipment}` : null,
    instructions: null,
    tips: null,
    commonMistakes: null,
    difficulty: null,
    media: c.imageBase64 ? { primaryImage: { base64: c.imageBase64 } } : null,
    movementPattern: null,
    parentExerciseId: null,
    variantLabel: null,
    aliases: null,
    favoritedAt: null,
    createdAt: c.createdAt,
    updatedAt: null,
    raw: null,
  };
}

// ---------- Step 2: merge ----------

export function buildMigratedLibrary(
  existingRecords: ExerciseRecord[],
  customExercises: CustomExercise[],
  incoming: ExerciseRecord[],
): { merged: ExerciseRecord[]; report: MigrationReport } {
  const warnings: string[] = [];

  const existingById = new Map(existingRecords.map((r) => [r.id, r]));
  const existingByName = new Map(existingRecords.map((r) => [normalize(r.nameFr), r]));
  const existingConsumed = new Set<string>(); // ids consumed by an id- or name-match

  const customRecords = customExercises.map(customRecordFromCustomExercise);

  const finalWorkoutX: ExerciseRecord[] = [];
  const seenIncomingNames = new Set<string>();
  let updatedCount = 0;
  let replacedCount = 0;
  let addedCount = 0;
  let duplicatesSkipped = 0;

  for (const wx of incoming) {
    const keyFr = normalize(wx.nameFr);
    const keyEn = wx.nameEn ? normalize(wx.nameEn) : null;

    if (seenIncomingNames.has(keyFr) || (keyEn && seenIncomingNames.has(keyEn))) {
      duplicatesSkipped++;
      continue;
    }
    seenIncomingNames.add(keyFr);
    if (keyEn) seenIncomingNames.add(keyEn);

    // Tier 1: exact id match — the same WorkoutX exercise reimported later.
    const idMatch = existingById.get(wx.id);
    if (idMatch) {
      existingConsumed.add(idMatch.id);
      finalWorkoutX.push({
        ...wx,
        favoritedAt: idMatch.favoritedAt ?? null,
        aliases: idMatch.aliases ?? null,
        parentExerciseId: idMatch.parentExerciseId ?? null,
        variantLabel: idMatch.variantLabel ?? null,
        exerciseTier: idMatch.exerciseTier ?? null,
        collections: idMatch.collections ?? null,
      });
      updatedCount++;
      continue;
    }

    // Tier 2: exact name match against an unconsumed existing record —
    // first-time replacement of a dev/system exercise.
    const nameMatch =
      existingByName.get(keyFr) ?? (keyEn ? existingByName.get(keyEn) : undefined);
    if (nameMatch && !existingConsumed.has(nameMatch.id)) {
      existingConsumed.add(nameMatch.id);
      const priorAliases = nameMatch.nameFr !== wx.nameFr ? [nameMatch.nameFr] : [];
      finalWorkoutX.push({
        ...wx,
        aliases: priorAliases.length > 0 ? priorAliases : nameMatch.aliases ?? null,
      });
      replacedCount++;
      continue;
    }

    // Tier 3: brand new.
    finalWorkoutX.push(wx);
    addedCount++;
  }

  const unmatchedExisting = existingRecords.filter((r) => !existingConsumed.has(r.id));

  // Best-effort fuzzy suggestions between exercises that had no exact match
  // on either side — reviewed by a human, never merged automatically.
  const possibleMatches: MigrationReport["possibleMatches"] = [];
  for (const sys of unmatchedExisting) {
    let best: { candidate: ExerciseRecord; score: number } | null = null;
    for (const wx of finalWorkoutX) {
      const score = Math.max(
        similarity(sys.nameFr, wx.nameFr),
        wx.nameEn ? similarity(sys.nameFr, wx.nameEn) : 0,
      );
      if (score >= FUZZY_MATCH_THRESHOLD && (!best || score > best.score)) {
        best = { candidate: wx, score };
      }
    }
    if (best) {
      possibleMatches.push({
        systemId: sys.id,
        systemName: sys.nameFr,
        candidateId: best.candidate.id,
        candidateName: best.candidate.nameFr,
        score: Math.round(best.score * 100) / 100,
      });
    }
  }

  const merged = [...unmatchedExisting, ...finalWorkoutX, ...customRecords];

  // Consistency check: no two records should share a final display name
  // (comparing nameFr and every alias).
  const nameOwners = new Map<string, string>(); // normalized name -> record id
  for (const r of merged) {
    const names = [r.nameFr, ...(r.aliases ?? [])].map(normalize);
    for (const n of names) {
      const owner = nameOwners.get(n);
      if (owner && owner !== r.id) {
        warnings.push(`Nom en doublon après fusion : "${r.nameFr}" (${owner} / ${r.id})`);
      } else {
        nameOwners.set(n, r.id);
      }
    }
    if (!r.category) warnings.push(`Catégorie manquante : "${r.nameFr}" (${r.id})`);
    if (r.category === "musculation" && !r.primaryMuscle) {
      warnings.push(`Muscle principal manquant pour un exercice de musculation : "${r.nameFr}" (${r.id})`);
    }
  }

  return {
    merged,
    report: {
      totalExistingBefore: existingRecords.length,
      totalCustomKept: customRecords.length,
      totalIncoming: incoming.length,
      updatedCount,
      replacedCount,
      addedCount,
      unmatchedExistingKept: unmatchedExisting.length,
      duplicatesSkipped,
      warnings,
      possibleMatches,
    },
  };
}
