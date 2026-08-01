import AsyncStorage from "@react-native-async-storage/async-storage";
import { bigStoreGet, bigStoreSet } from "@/src/utils/big-kv-store";
import type { ExerciseRecordCategory } from "@/src/utils/exercise-record-category";
import type { ExerciseMuscleGroup } from "@/src/utils/exercise-muscle-groups";
import type { ExerciseEquipment } from "@/src/utils/exercise-equipment";
import type { ExerciseDifficulty } from "@/src/utils/exercise-difficulty";
import type { MovementPattern } from "@/src/utils/exercise-movement-pattern";
import type { TrainingGoal } from "@/src/utils/exercise-training-goal";
import type { Discipline } from "@/src/utils/exercise-discipline";
import type { FutureCollection } from "@/src/utils/exercise-collection";

/**
 * Phase B1/B3 — professional exercise library data model.
 *
 * This is a fresh, standalone model: it does not replace or migrate the
 * existing `LibraryExercise` (`src/data/exercise-library.ts`) or
 * `CustomExercise` (`src/utils/gym-storage.ts`) used by the Phase A
 * Bibliothèque tab — those keep working exactly as they do today. Wiring
 * `ExerciseRecord` into the UI (and migrating `CustomExercise` into it) is a
 * later, separate step once this architecture is validated.
 */

/**
 * `system`  — official IronFlow exercise (the Phase A dev library, once
 *             migrated, or any exercise WorkoutX has no equivalent for).
 * `workoutx` — imported from the WorkoutX catalogue.
 * `custom`  — created by the user.
 * Distinguishing these lets future edit/delete rules differ per source
 * (e.g. a user shouldn't be able to delete a `system`/`workoutx` entry,
 * only hide/favorite it) and lets a future re-import safely update
 * `workoutx` records without touching `custom` ones.
 */
export type ExerciseRecordSource = "system" | "workoutx" | "custom";

/**
 * Bibliothèque officielle IronFlow 300 — editorial/catalogue priority, not
 * AI-generated content (hence top-level on `ExerciseRecord`, not nested in
 * `enrichment`). An exercise can be `essential` before it has any
 * enrichment at all; that will even be the norm at first.
 *
 * `essential`       — the ~50 flagship IronFlow movements, highlighted in the app.
 * `official_core`   — the rest of the curated ~300, included by default (not highlighted).
 * `collection_only`  — the remaining ~1048, hidden by default, reserved for future downloadable Collections.
 * `deprecated`       — never shown, not even in a Collection (short manual exclusion list, not automated).
 *
 * `essential` and `official_core` both count as "in the official 300"; only
 * visual prominence differs. `undefined`/`null` behaves like `collection_only`.
 */
export type ExerciseTier = "essential" | "official_core" | "collection_only" | "deprecated";

/** Bibliothèque Core par défaut : `true` pour tout ce qui doit apparaître
 * dans les listes/recherches principales (les ~300 `essential`/
 * `official_core`, et tout exercice sans tier — customs, bibliothèque
 * statique, historique de séances, jamais concernés par la curation). Les
 * `collection_only`/`deprecated` restent hors des listes par défaut, visibles
 * uniquement via la section "Découvrir" dédiée (`library.tsx`). */
export function isCoreVisible(tier: ExerciseTier | null | undefined): boolean {
  return tier !== "collection_only" && tier !== "deprecated";
}

/** A single local or (future) remote media asset. Cloud storage isn't wired
 * up yet — `remoteUrl` exists only so a future sync layer can populate it
 * without a shape change; today only `base64` (WebP, no `data:` prefix, same
 * convention as `CustomExercise.imageBase64`) is ever set. */
export type ExerciseMediaRef = {
  base64?: string | null;
  remoteUrl?: string | null;
};

export type ExerciseMedia = {
  primaryImage?: ExerciseMediaRef | null;
  stepImages?: ExerciseMediaRef[] | null;
  /** Future feature — demonstration video URL. Not implemented yet. */
  videoUrl?: string | null;
};

/**
 * Phase B5 — IronFlow's own coaching content for one locale. Never a
 * literal translation of the raw WorkoutX fields on `ExerciseRecord` —
 * written (by a human or by the enrichment pipeline) as a professional
 * coach would. Every field is individually optional so a fiche can be
 * partially filled and completed incrementally without ever being treated
 * as an all-or-nothing block.
 */
export type ExerciseLocaleContent = {
  name?: string | null;
  description?: string | null;
  instructions?: string[] | null;
  executionTips?: string[] | null;
  commonMistakes?: string[] | null;
  breathingTips?: string | null;
  precautions?: string | null;
  /** "Pourquoi faire cet exercice" — un court paragraphe qui justifie sa
   * place dans un programme, écrit dans la voix IronFlow (jamais une
   * reformulation de la description). */
  rationale?: string | null;
  /** Échauffement spécifique conseillé avant cet exercice. */
  warmupSuggestion?: string | null;
  /** Erreurs fréquentes appariées à leur correction technique — remplace
   * progressivement `commonMistakes` (simple liste, sans la correction) une
   * fois l'enrichment passé sur un exercice ; les deux champs coexistent
   * (additif) pour ne jamais casser l'affichage existant. */
  mistakeCorrections?: { mistake: string; correction: string }[] | null;
};

/** One entry of the "Niveau utilisateur" system — a note and/or
 * prerequisites for practicing this exercise at a given level. Both
 * optional: a level can have just a note, just prerequisites, or (most
 * often) neither if that level needs no special guidance for this
 * exercise. */
export type ExerciseLevelGuidance = {
  note?: string | null;
  prerequisites?: string[] | null;
};

/**
 * Phase B5 — IronFlow's knowledge-base layer on top of a raw
 * `ExerciseRecord`. Entirely additive: nothing on `ExerciseRecord` itself
 * (nameEn, description, category, primaryMuscle, equipment, difficulty,
 * raw...) is ever modified by enrichment — that stays "what WorkoutX said".
 * `enrichment` is "what IronFlow's coach wrote/verified". Display priority
 * for any future screen: prefer the `enrichment` value when present, fall
 * back to the raw `ExerciseRecord` field otherwise (e.g.
 * `enrichment.translations.fr.description` over `description`;
 * `enrichment.verifiedPrimaryMuscle` over `primaryMuscle`).
 */
export type ExerciseEnrichment = {
  /** Keyed by ISO locale ("fr" today; "es"/"de"/"it"/"pt" later) — adding a
   * language is adding a key here, never a structural change. "en" is also a
   * valid key here if IronFlow ever wants its own improved English rewrite —
   * distinct from the raw WorkoutX `nameEn`/`description` on `ExerciseRecord`,
   * which are never touched by enrichment. */
  translations: Partial<Record<string, ExerciseLocaleContent>>;

  verifiedPrimaryMuscle?: ExerciseMuscleGroup | null;
  verifiedSecondaryMuscles?: ExerciseMuscleGroup[] | null;
  /** V3 — muscles stabilisateurs (gainage/maintien, distincts des muscles
   * moteurs principaux/secondaires ci-dessus). Additif, vide tant qu'une
   * passe d'enrichissement ne l'a pas rempli — la fiche masque proprement
   * la section tant que ce champ est vide, même discipline que le reste de
   * `ExerciseEnrichment`. */
  stabilizerMuscles?: ExerciseMuscleGroup[] | null;
  alternativeExerciseIds?: string[] | null;

  exerciseType?: "compound" | "isolation" | "cardio" | "mobility" | "stretch" | "plyometric" | "olympic" | null;
  /** Controlled vocabulary only (see the enrichment prompt) — never invented
   * freely, to keep search/filters/future-AI features consistent across
   * every exercise. */
  tags?: string[] | null;
  qualityScore?: number | null;
  reviewStatus?: "generated" | "validated" | "needs_review" | null;

  /** Provenance — ABSOLUTE RULE enforced by every enrichment script
   * (`enrich-library-content.ts` for Claude, `enrich-library-content-ollama.ts`
   * for local Ollama): once this is "human" or "coach", no script touches
   * ANY field of this exercise's enrichment again, regardless of
   * `templateVersion`. */
  verifiedBy?: "claude" | "ollama" | "human" | "coach" | null;
  /** Coach re-assessment of PHYSICAL difficulty — overrides the raw
   * WorkoutX-derived `ExerciseRecord.difficulty` when present. */
  difficulty?: ExerciseDifficulty | null;
  /** TECHNICAL complexity — distinct from physical difficulty (e.g. a
   * snatch is physically demanding AND technically very hard; a goblet
   * squat is moderately demanding but technically easy). */
  technicalLevel?: "low" | "medium" | "high" | null;

  /** "Système Niveau utilisateur" — pour chaque niveau (débutant/
   * intermédiaire/avancé), une note pédagogique et/ou des prérequis quand
   * c'est pertinent (une entrée par niveau seulement si elle apporte
   * vraiment quelque chose — jamais remplie artificiellement pour les 3
   * niveaux). Sert aussi à enrichir l'affichage du badge de difficulté de
   * l'exercice (`difficulty` ci-dessus) avec ses propres prérequis. */
  levelGuidance?: Partial<Record<ExerciseDifficulty, ExerciseLevelGuidance>> | null;

  muscleActivation?: {
    primary?: ExerciseMuscleGroup[];
    secondary?: ExerciseMuscleGroup[];
    /** 0-100 per muscle group. */
    activationScore?: Partial<Record<ExerciseMuscleGroup, number>>;
  } | null;
  /** What's needed to actually perform this at home vs at a gym — distinct
   * from `ExerciseRecord.equipment` (WorkoutX's free-text description). */
  equipmentLevel?: "none" | "basic" | "gym" | null;
  trainingGoals?: TrainingGoal[] | null;
  /** Coût systémique/fatigue perçue de l'exercice — utile pour construire une
   * séance équilibrée (éviter d'enchaîner plusieurs exercices "high"). */
  fatigueLevel?: "low" | "medium" | "high" | null;
  /** Repos conseillé selon l'objectif visé (mêmes clés que `trainingGoals`) —
   * partiel : seuls les objectifs pertinents pour cet exercice ont besoin
   * d'une entrée (ex. { strength: "3-5 min", hypertrophy: "60-90s" }). */
  restTimeByGoal?: Partial<Record<TrainingGoal, string>> | null;
  /** Matériel de substitution quand `ExerciseRecord.equipment` n'est pas
   * disponible (ex. barre → haltères/élastique) — texte libre, le "comment"
   * compte souvent autant que le "quoi". */
  alternativeEquipment?: string[] | null;
  /** Disciplines/programmes auxquels cet exercice est adapté — même champ
   * qui deviendra le filtre d'appartenance aux Collections IronFlow
   * téléchargeables une fois la curation lancée. */
  disciplines?: Discipline[] | null;
  /** Reuses `MovementPattern` (src/utils/exercise-movement-pattern.ts) —
   * plural because one exercise can span several patterns (e.g. a thruster
   * is squat + push). Complements the existing singular
   * `ExerciseRecord.movementPattern`. */
  movementPatterns?: MovementPattern[] | null;

  /** The generator may know a related exercise's name without knowing its
   * exact id yet — `id` is resolved later by a name-matching pass, kept
   * optional so a not-yet-resolved link is never a broken/null reference. */
  progressionExercises?: { name: string; id?: string | null }[] | null;
  regressionExercises?: { name: string; id?: string | null }[] | null;

  /** Genuinely proprietary IronFlow value — never a reformulation of the
   * WorkoutX data. */
  coachNotes?: {
    execution?: string[];
    programming?: string[];
    safety?: string[];
  } | null;

  /** Coach IronFlow engine — internal scoring, never displayed to the user,
   * consumed only by `coach-selector.ts`/`coach-scheduler.ts`. `goalValue`
   * reuses `TrainingGoal` (already 11 values covering strength/hypertrophy/
   * hyrox/crossfit/running/...) instead of one hardcoded field per goal, so
   * the same map serves both "how good is this exercise for hypertrophy"
   * and "how much should HYROX prioritize this exercise" — one axis, not
   * two parallel ones. Populated first by a deterministic default computed
   * from existing fields (see `scripts/` bootstrap), refined manually later
   * exactly like the rest of `ExerciseEnrichment` — never a blocking
   * prerequisite for the engine to run. */
  coachScores?: {
    fatigueNervous?: number | null;
    fatigueMuscular?: number | null;
    technicalDifficulty?: number | null;
    goalValue?: Partial<Record<TrainingGoal, number>> | null;
  } | null;

  /** Bumped whenever the generation template/prompt changes — lets the
   * pipeline detect which fiches were produced by an older template and
   * could be worth regenerating. */
  templateVersion: number;
  updatedAt: string;
};

export type ExerciseRecord = {
  id: string;
  source: ExerciseRecordSource;

  // Informations générales
  nameFr: string;
  nameEn?: string | null;
  category: ExerciseRecordCategory;

  // Classification musculaire
  primaryMuscle?: ExerciseMuscleGroup | null;
  secondaryMuscles?: ExerciseMuscleGroup[] | null;

  // Équipement
  equipment?: ExerciseEquipment | null;

  // Informations pédagogiques
  description?: string | null;
  musclesWorkedNote?: string | null;
  instructions?: string[] | null;
  tips?: string[] | null;
  commonMistakes?: string[] | null;
  difficulty?: ExerciseDifficulty | null;

  // Médias
  media?: ExerciseMedia | null;

  /** Best-effort movement classification — optional, may stay unset. */
  movementPattern?: MovementPattern | null;

  /** Variant grouping (Phase B3): e.g. "Développé couché" (parent) with
   * variants "Développé couché incliné"/"...décliné"/"...à la Smith Machine"
   * each pointing back to it via `parentExerciseId`, with `variantLabel`
   * describing what differs ("Incliné", "Smith Machine"...). No UI/grouping
   * logic is built yet — this only reserves the relationship so exercises
   * don't need re-modeling once that logic is added. */
  parentExerciseId?: string | null;
  variantLabel?: string | null;

  /** Other names this exercise is/was known by (e.g. the Phase A dev-library
   * name it replaced during a WorkoutX migration). Session logs, favorites,
   * and category overrides are all matched by free-text name — keeping the
   * old name here lets a migrated record keep resolving old data without
   * touching a single `WorkoutSession`. */
  aliases?: string[] | null;

  /** Bibliothèque officielle IronFlow 300 — see `ExerciseTier`. Set by
   * `scripts/curate-official-library.ts`, never by the user. */
  exerciseTier?: ExerciseTier | null;
  /** Future downloadable Collections this exercise should ship in — see
   * `FutureCollection` (`exercise-collection.ts`). Distinct from
   * `enrichment.disciplines` (pedagogical content, not curation/packaging). */
  collections?: FutureCollection[] | null;

  favoritedAt?: string | null;
  createdAt: string;
  updatedAt?: string | null;

  /** Original WorkoutX payload (or any other future import source),
   * preserved as-is for compatibility/traceability — never rendered
   * directly, only used for re-processing or debugging an import. */
  raw?: Record<string, unknown> | null;

  /** IronFlow's own knowledge-base layer (Phase B5) — see `ExerciseEnrichment`.
   * Additive and optional: absent until `enrich-library-content.ts` (or a
   * human) fills it in; every field above this stays exactly as WorkoutX
   * provided it regardless. */
  enrichment?: ExerciseEnrichment | null;
};

const EXERCISE_RECORDS_KEY = "@ironflow/exerciseRecords";

export async function getExerciseRecords(): Promise<ExerciseRecord[]> {
  const raw = await bigStoreGet(EXERCISE_RECORDS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function getExerciseRecordById(id: string): Promise<ExerciseRecord | undefined> {
  const list = await getExerciseRecords();
  return list.find((e) => e.id === id);
}

export async function saveExerciseRecord(record: ExerciseRecord): Promise<void> {
  const list = await getExerciseRecords();
  const idx = list.findIndex((e) => e.id === record.id);
  const next = { ...record, updatedAt: new Date().toISOString() };
  if (idx >= 0) list[idx] = next;
  else list.push(next);
  await bigStoreSet(EXERCISE_RECORDS_KEY, JSON.stringify(list));
}

export async function deleteExerciseRecord(id: string): Promise<void> {
  const list = await getExerciseRecords();
  await bigStoreSet(
    EXERCISE_RECORDS_KEY,
    JSON.stringify(list.filter((e) => e.id !== id)),
  );
}

/** Incremental upsert — replaces entries matching by id, appends new ones,
 * leaves everything else already in storage untouched. Use this only when
 * adding/refreshing a handful of records; it can never remove one. */
export async function upsertExerciseRecords(records: ExerciseRecord[]): Promise<void> {
  const list = await getExerciseRecords();
  const byId = new Map(list.map((e) => [e.id, e]));
  for (const r of records) byId.set(r.id, { ...r, updatedAt: new Date().toISOString() });
  await bigStoreSet(EXERCISE_RECORDS_KEY, JSON.stringify(Array.from(byId.values())));
}

/** Full replace — used by the library-update finalize step, where
 * `buildMigratedLibrary`'s `merged` output already represents the complete
 * desired final state (including records that must now disappear, e.g. a
 * dev/system exercise superseded by its WorkoutX replacement). Using
 * `upsertExerciseRecords` here would leave superseded records behind
 * forever, since upsert can only add/update, never remove. */
export async function replaceAllExerciseRecords(records: ExerciseRecord[]): Promise<void> {
  await bigStoreSet(EXERCISE_RECORDS_KEY, JSON.stringify(records));
}

// ---------- Library metadata, backup, and update history (Phase B3.5) ----------

export type ExerciseLibraryMeta = {
  version: number;
  lastUpdatedAt: string | null;
  exerciseCount: number;
};

const LIBRARY_META_KEY = "@ironflow/exerciseLibraryMeta";
const LIBRARY_BACKUP_KEY = "@ironflow/exerciseLibraryBackup";
const LIBRARY_UPDATE_HISTORY_KEY = "@ironflow/exerciseLibraryUpdateHistory";

const DEFAULT_LIBRARY_META: ExerciseLibraryMeta = {
  version: 0,
  lastUpdatedAt: null,
  exerciseCount: 0,
};

export async function getLibraryMeta(): Promise<ExerciseLibraryMeta> {
  const raw = await AsyncStorage.getItem(LIBRARY_META_KEY);
  if (!raw) return DEFAULT_LIBRARY_META;
  try {
    return { ...DEFAULT_LIBRARY_META, ...JSON.parse(raw) };
  } catch {
    return DEFAULT_LIBRARY_META;
  }
}

export async function saveLibraryMeta(meta: ExerciseLibraryMeta): Promise<void> {
  await AsyncStorage.setItem(LIBRARY_META_KEY, JSON.stringify(meta));
}

type LibraryBackupPayload = {
  savedAt: string;
  records: ExerciseRecord[];
  meta: ExerciseLibraryMeta;
};

/** Snapshots the current library + meta as the single "previous version" —
 * one slot, not a stack, so backup storage stays bounded. Called right
 * before a merge is committed, never before (so a failed download/validation
 * never even needs a restore — nothing was touched yet). */
export async function backupCurrentLibrary(): Promise<void> {
  const [records, meta] = await Promise.all([getExerciseRecords(), getLibraryMeta()]);
  const payload: LibraryBackupPayload = { savedAt: new Date().toISOString(), records, meta };
  await bigStoreSet(LIBRARY_BACKUP_KEY, JSON.stringify(payload));
}

export async function getLibraryBackupInfo(): Promise<{
  exists: boolean;
  savedAt: string | null;
  exerciseCount: number;
}> {
  const raw = await bigStoreGet(LIBRARY_BACKUP_KEY);
  if (!raw) return { exists: false, savedAt: null, exerciseCount: 0 };
  try {
    const payload: LibraryBackupPayload = JSON.parse(raw);
    return { exists: true, savedAt: payload.savedAt, exerciseCount: payload.records.length };
  } catch {
    return { exists: false, savedAt: null, exerciseCount: 0 };
  }
}

/** Restores the library to whatever `backupCurrentLibrary` last snapshotted.
 * Returns false (no-op) if there is no backup to restore. */
export async function restoreLibraryBackup(): Promise<boolean> {
  const raw = await bigStoreGet(LIBRARY_BACKUP_KEY);
  if (!raw) return false;
  try {
    const payload: LibraryBackupPayload = JSON.parse(raw);
    await replaceAllExerciseRecords(payload.records);
    await saveLibraryMeta(payload.meta);
    return true;
  } catch {
    return false;
  }
}

export type ExerciseLibraryUpdateLogEntry = {
  version: number;
  date: string;
  addedCount: number;
  replacedCount: number;
  warningsCount: number;
  status: "success" | "error";
  errorMessage?: string | null;
};

/** Minimal update history — no dedicated UI yet, kept so a future settings
 * screen can show it without any storage changes. Short by nature (a manual,
 * occasional action, not a continuous stream), so left unbounded for now. */
export async function getLibraryUpdateHistory(): Promise<ExerciseLibraryUpdateLogEntry[]> {
  const raw = await AsyncStorage.getItem(LIBRARY_UPDATE_HISTORY_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export async function appendLibraryUpdateLogEntry(
  entry: ExerciseLibraryUpdateLogEntry,
): Promise<void> {
  const history = await getLibraryUpdateHistory();
  history.push(entry);
  await AsyncStorage.setItem(LIBRARY_UPDATE_HISTORY_KEY, JSON.stringify(history));
}
