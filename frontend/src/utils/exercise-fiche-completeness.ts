import { ExerciseRecord } from "@/src/utils/exercise-records";

/**
 * How complete a fiche is AS EXPERIENCED BY A USER — spans both the raw
 * `ExerciseRecord` fields (present for most WorkoutX-imported exercises
 * even with zero enrichment) and the IronFlow `enrichment` layer. This is
 * deliberately a different, broader metric than `enrichment.qualityScore`
 * (computed in `scripts/lib/enrichment-shared.ts`), which only measures the
 * enrichment layer itself and would show ~0% for the entire catalogue today
 * since no real enrichment run has happened yet — not a useful "is this
 * fiche good" signal for someone browsing the app. Meant to help spot which
 * fiches most need attention once the official-300 curation starts.
 */
export type FicheCompletenessField =
  | "description"
  | "instructions"
  | "tips"
  | "mistakes"
  | "difficulty"
  | "primaryMuscle"
  | "equipment"
  | "movementPattern"
  | "rationale"
  | "warmupSuggestion"
  | "trainingGoals"
  | "disciplines"
  | "muscleActivation"
  | "levelGuidance"
  | "mistakeCorrections"
  | "variantsOrSimilar";

export type FicheCompleteness = {
  score: number; // 0-100
  filled: number;
  total: number;
  missing: FicheCompletenessField[];
};

function nonEmpty(v: unknown): boolean {
  if (v == null) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "string") return v.trim().length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

export function computeFicheCompleteness(record: ExerciseRecord): FicheCompleteness {
  const fr = record.enrichment?.translations?.fr;
  const e = record.enrichment;

  const checks: [FicheCompletenessField, boolean][] = [
    ["description", nonEmpty(fr?.description ?? record.description)],
    ["instructions", nonEmpty(fr?.instructions ?? record.instructions)],
    ["tips", nonEmpty(fr?.executionTips ?? record.tips)],
    ["mistakes", nonEmpty(fr?.mistakeCorrections) || nonEmpty(fr?.commonMistakes ?? record.commonMistakes)],
    ["difficulty", nonEmpty(e?.difficulty ?? record.difficulty)],
    ["primaryMuscle", nonEmpty(e?.verifiedPrimaryMuscle ?? record.primaryMuscle)],
    ["equipment", nonEmpty(record.equipment)],
    ["movementPattern", nonEmpty(record.movementPattern)],
    ["rationale", nonEmpty(fr?.rationale)],
    ["warmupSuggestion", nonEmpty(fr?.warmupSuggestion)],
    ["trainingGoals", nonEmpty(e?.trainingGoals)],
    ["disciplines", nonEmpty(e?.disciplines)],
    ["muscleActivation", nonEmpty(e?.muscleActivation?.activationScore)],
    ["levelGuidance", nonEmpty(e?.levelGuidance)],
    ["mistakeCorrections", nonEmpty(fr?.mistakeCorrections)],
    ["variantsOrSimilar", nonEmpty(e?.progressionExercises) || nonEmpty(e?.regressionExercises)],
  ];

  const filled = checks.filter(([, ok]) => ok).length;
  const total = checks.length;
  return {
    score: Math.round((filled / total) * 100),
    filled,
    total,
    missing: checks.filter(([, ok]) => !ok).map(([field]) => field),
  };
}
