import type { ExerciseRecord } from "@/src/utils/exercise-records";
import type { ExerciseRecordCategory } from "@/src/utils/exercise-record-category";
import type { ExerciseMuscleGroup } from "@/src/utils/exercise-muscle-groups";
import type { ExerciseEquipment } from "@/src/utils/exercise-equipment";
import type { ExerciseDifficulty } from "@/src/utils/exercise-difficulty";
import type { MovementPattern } from "@/src/utils/exercise-movement-pattern";

/**
 * Phase B3 — pure (no AsyncStorage, no network) transformation from a raw
 * WorkoutX API exercise into IronFlow's `ExerciseRecord`. Kept side-effect
 * free so it can be unit-tested directly (see scripts/import-workoutx.ts)
 * without any React Native runtime.
 *
 * Shape based on the real sample response the exercise came with:
 * { id, name, bodyPart, equipment, target, secondaryMuscles, instructions,
 *   gifUrl, category, difficulty, mechanic, force, met, caloriesPerMinute,
 *   description, isUnilateral, popularityRank, recommendedSets,
 *   recommendedReps, joint_focus, intensity_level, movement_tags }
 * Optional `nameFr`/`descriptionFr`/`instructionsFr` are accepted for
 * whichever French-translated dataset/endpoint WorkoutX exposes — when
 * absent, the mapper falls back to the English fields untranslated rather
 * than inventing a translation.
 */
export type WorkoutXExercise = {
  id: string;
  name: string;
  nameFr?: string | null;
  bodyPart: string;
  equipment: string;
  target: string;
  secondaryMuscles?: string[];
  instructions?: string[];
  instructionsFr?: string[] | null;
  gifUrl?: string | null;
  category?: string | null;
  difficulty?: string | null;
  mechanic?: string | null;
  force?: string | null;
  description?: string | null;
  descriptionFr?: string | null;
  recommendedSets?: string | null;
  recommendedReps?: string | null;
  movement_tags?: string[];
  [key: string]: unknown; // every other field is preserved verbatim in `raw`
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

// ---------- Muscle mapping (bodyPart + target + secondaryMuscles → ExerciseMuscleGroup) ----------

const MUSCLE_MAP: Record<string, ExerciseMuscleGroup> = {
  // chest
  chest: "chest",
  pectorals: "chest",
  // back
  back: "back",
  lats: "back",
  "upper back": "back",
  // shoulders
  shoulders: "shoulders",
  delts: "shoulders",
  // biceps / triceps / forearms
  biceps: "biceps",
  triceps: "triceps",
  forearms: "forearms",
  "lower arms": "forearms",
  "upper arms": "biceps",
  // abs / waist
  abs: "abs",
  waist: "abs",
  obliques: "abs",
  // legs
  quads: "quads",
  quadriceps: "quads",
  "upper legs": "quads",
  hamstrings: "hamstrings",
  glutes: "glutes",
  calves: "calves",
  "lower legs": "calves",
  adductors: "quads",
  abductors: "glutes",
  "hip flexors": "quads",
  // traps / lower back
  traps: "traps",
  trapezius: "traps",
  "spine": "lower_back",
  "lower back": "lower_back",
  rhomboids: "back",
  // cardio / full body
  cardiovascular: "full_body",
  "cardiovascular system": "full_body",
  neck: "full_body",
  "serratus anterior": "chest",
};

function mapMuscle(raw: string | undefined | null): ExerciseMuscleGroup | null {
  if (!raw) return null;
  return MUSCLE_MAP[normalize(raw)] ?? null;
}

// ---------- Category mapping ----------

const CATEGORY_MAP: Record<string, ExerciseRecordCategory> = {
  strength: "musculation",
  cardio: "cardio",
  stretching: "stretching",
  flexibility: "stretching",
  plyometrics: "plyometric",
  plyometric: "plyometric",
  balance: "mobility",
  "olympic weightlifting": "musculation",
  powerlifting: "musculation",
  strongman: "sport",
};

function mapCategory(raw: string | undefined | null): { category: ExerciseRecordCategory; unmapped: boolean } {
  if (!raw) return { category: "sport", unmapped: true };
  const mapped = CATEGORY_MAP[normalize(raw)];
  return mapped ? { category: mapped, unmapped: false } : { category: "sport", unmapped: true };
}

// ---------- Equipment mapping ----------

const EQUIPMENT_MAP: Record<string, ExerciseEquipment> = {
  "body weight": "bodyweight",
  bodyweight: "bodyweight",
  barbell: "barbell",
  "ez barbell": "barbell",
  "olympic barbell": "barbell",
  "trap bar": "barbell",
  dumbbell: "dumbbell",
  kettlebell: "kettlebell",
  cable: "machine",
  "leverage machine": "machine",
  "smith machine": "machine",
  machine: "machine",
  "sled machine": "machine",
  "elliptical machine": "machine",
  "stationary bike": "assault_bike",
  "assault bike": "assault_bike",
  "resistance band": "resistance_band",
  band: "resistance_band",
  rope: "jump_rope",
  "jump rope": "jump_rope",
  "skierg machine": "ski_erg",
  "rowing machine": "rowing_machine",
  treadmill: "treadmill",
};

function mapEquipment(raw: string | undefined | null): { equipment: ExerciseEquipment; unmapped: boolean } {
  if (!raw) return { equipment: "other", unmapped: true };
  const mapped = EQUIPMENT_MAP[normalize(raw)];
  return mapped ? { equipment: mapped, unmapped: false } : { equipment: "other", unmapped: true };
}

// ---------- Difficulty (already matches our taxonomy) ----------

function mapDifficulty(raw: string | undefined | null): ExerciseDifficulty | null {
  const n = raw ? normalize(raw) : "";
  if (n === "beginner" || n === "intermediate" || n === "advanced") return n as ExerciseDifficulty;
  return null;
}

// ---------- Movement pattern (best-effort heuristic — optional field) ----------

function guessMovementPattern(wx: WorkoutXExercise, category: ExerciseRecordCategory): MovementPattern | null {
  const name = normalize(wx.name);
  const target = normalize(wx.target ?? "");
  const bodyPart = normalize(wx.bodyPart ?? "");
  const force = normalize(wx.force ?? "");

  if (category === "cardio") return "locomotion";
  if (/squat|lunge|step-?up/.test(name)) return "squat";
  if (/deadlift|hinge|good morning|swing/.test(name)) return "hinge";
  if (/carry|farmer|suitcase/.test(name)) return "carry";
  if (/rotation|twist|chop|russian/.test(name)) return "rotation";
  if (bodyPart === "waist" || target === "abs" || target === "obliques") return "core";
  if (force === "push") return "push";
  if (force === "pull") return "pull";
  return null;
}

/** Converts one raw WorkoutX exercise into an IronFlow `ExerciseRecord`
 * (`source: "workoutx"`). Pure — never touches storage. */
export function mapWorkoutXToExerciseRecord(wx: WorkoutXExercise): ExerciseRecord {
  const { category, unmapped: categoryUnmapped } = mapCategory(wx.category);
  const { equipment, unmapped: equipmentUnmapped } = mapEquipment(wx.equipment);
  const primaryMuscle = mapMuscle(wx.target);
  const secondaryMuscles = Array.from(
    new Set(
      (wx.secondaryMuscles ?? [])
        .map((m) => mapMuscle(m))
        .filter((m): m is ExerciseMuscleGroup => m != null && m !== primaryMuscle),
    ),
  );

  const now = new Date().toISOString();

  return {
    id: `wx_${wx.id}`,
    source: "workoutx",
    nameFr: wx.nameFr?.trim() || wx.name,
    nameEn: wx.name,
    category,
    primaryMuscle,
    secondaryMuscles: secondaryMuscles.length > 0 ? secondaryMuscles : null,
    equipment,
    description: wx.descriptionFr?.trim() || wx.description || null,
    musclesWorkedNote: null,
    instructions: (wx.instructionsFr?.length ? wx.instructionsFr : wx.instructions) ?? null,
    tips: null,
    commonMistakes: null,
    difficulty: mapDifficulty(wx.difficulty),
    media: wx.gifUrl ? { primaryImage: { remoteUrl: wx.gifUrl } } : null,
    movementPattern: guessMovementPattern(wx, category),
    parentExerciseId: null,
    variantLabel: null,
    aliases: null,
    favoritedAt: null,
    createdAt: now,
    updatedAt: null,
    raw: {
      ...wx,
      _mappingWarnings: [
        categoryUnmapped ? `catégorie WorkoutX non reconnue: "${wx.category}"` : null,
        equipmentUnmapped ? `équipement WorkoutX non reconnu: "${wx.equipment}"` : null,
        !primaryMuscle ? `muscle cible non reconnu: "${wx.target}"` : null,
      ].filter(Boolean),
    },
  };
}
