import { PersonalRecord, SessionExerciseLog, WorkoutSession } from "@/src/utils/gym-storage";
import { computeExerciseDetail } from "@/src/utils/exercise-detail";

/**
 * Phase B2 — links an exercise to the user's personal history/progression.
 *
 * This deliberately does NOT introduce a new persisted "performance log"
 * store: every set/rep/weight/duration/distance already lives in
 * `WorkoutSession` (recorded by the workout logger), and every PR in
 * `PersonalRecord`. Storing it again here would duplicate data and risk
 * drift. Instead, this module aggregates the existing sources into the
 * shape the future "Votre évolution sur cet exercice" fiche section needs.
 *
 * Matching an `ExerciseRecord` to session history is name-based (case/
 * accent-insensitive on `nameFr`/`nameEn`) for now, since older sessions
 * only ever recorded a free-text exercise name — new sessions can also
 * carry `SessionExerciseLog.libraryExerciseId` once the logger starts
 * writing it, and this function prefers that link when present.
 */

export type ExercisePerformanceEntry = {
  sessionId: string;
  date: string;
  setsCompleted: number;
  reps: string | null;
  weightKg: number | null;
  volumeKg: number | null;
  /** Reserved for when the workout logger starts recording time-under-load
   * per set — not captured today, always null until that lands. */
  tensionSecondsUnderLoad: number | null;
  durationSeconds: number | null;
  distanceMeters: number | null;
  isPersonalRecord: boolean;
};

export type ExerciseProgressSummary = {
  exerciseName: string;
  totalSessions: number;
  lastUsedAt: string | null;
  bestPerformance: ExercisePerformanceEntry | null;
  personalRecord: PersonalRecord | null;
  /** Max weight lifted per session, chronological — for a "évolution du
   * poids" chart. */
  weightProgression: { date: string; value: number }[];
  /** Total volume (kg) per session, chronological — for a "évolution du
   * volume d'entraînement" chart. */
  volumeProgression: { date: string; value: number }[];
  history: ExercisePerformanceEntry[];
};

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

function matchesExercise(
  ex: SessionExerciseLog,
  key: string,
  libraryExerciseId?: string | null,
): boolean {
  if (libraryExerciseId && ex.libraryExerciseId) {
    return ex.libraryExerciseId === libraryExerciseId;
  }
  return normalize(ex.name) === key;
}

/**
 * @param exercise Either an `ExerciseRecord`-like object (`{ id, nameFr,
 *   nameEn? }`) or a plain exercise name string, for callers that only
 *   have a legacy free-text name (e.g. the current Bibliothèque tab before
 *   it's wired to `ExerciseRecord`).
 */
export function computeExerciseProgress(
  exercise: { id?: string; nameFr: string; nameEn?: string | null } | string,
  sessions: WorkoutSession[],
  prs: PersonalRecord[],
): ExerciseProgressSummary {
  const isRecord = typeof exercise !== "string";
  const displayName = isRecord ? exercise.nameFr : exercise;
  const libraryExerciseId = isRecord ? exercise.id : undefined;
  const keyFr = normalize(displayName);
  const keyEn = isRecord && exercise.nameEn ? normalize(exercise.nameEn) : null;

  const history: ExercisePerformanceEntry[] = [];

  for (const s of sessions) {
    for (const ex of s.exercises) {
      const matches =
        matchesExercise(ex, keyFr, libraryExerciseId) ||
        (keyEn ? matchesExercise(ex, keyEn, libraryExerciseId) : false);
      if (!matches) continue;

      let setsCompleted = 0;
      let volumeKg = 0;
      let maxWeight = 0;
      let lastReps = "";
      let lastWeight = "";
      for (const st of ex.sets) {
        if (!st.completed) continue;
        setsCompleted++;
        const w = parseFloat((st.weight ?? "").replace(",", ".")) || 0;
        const r = parseFloat((st.reps ?? "").replace(/[^0-9.]/g, "")) || 0;
        volumeKg += w * r;
        if (w > maxWeight) maxWeight = w;
        lastReps = st.reps;
        lastWeight = st.weight;
      }
      if (setsCompleted === 0) continue;

      history.push({
        sessionId: s.id,
        date: s.startedAt,
        setsCompleted,
        reps: lastReps || null,
        weightKg: maxWeight > 0 ? maxWeight : lastWeight ? parseFloat(lastWeight.replace(",", ".")) || null : null,
        volumeKg: volumeKg > 0 ? Math.round(volumeKg) : null,
        tensionSecondsUnderLoad: null,
        durationSeconds: ex.targetDurationSeconds ?? null,
        distanceMeters: s.cardio_metrics?.distance_m ?? null,
        isPersonalRecord: false,
      });
    }
  }

  history.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const detail = computeExerciseDetail(displayName, sessions, prs);
  const personalRecord = detail.linkedPRs.length > 0 ? detail.linkedPRs[0] : null;

  if (personalRecord) {
    const prDate = new Date(personalRecord.date).toDateString();
    for (const h of history) {
      if (new Date(h.date).toDateString() === prDate) h.isPersonalRecord = true;
    }
  }

  // "Best" depends on what kind of exercise this is: strength (volume),
  // cardio-with-distance, or time-based (duration/hold) — pick whichever
  // metric this exercise's history actually carries.
  const hasVolume = history.some((h) => (h.volumeKg ?? 0) > 0);
  const hasDistance = history.some((h) => (h.distanceMeters ?? 0) > 0);
  const hasDuration = history.some((h) => (h.durationSeconds ?? 0) > 0);
  const bestPerformance =
    history
      .slice()
      .sort((a, b) => {
        if (hasVolume) return (b.volumeKg ?? 0) - (a.volumeKg ?? 0);
        if (hasDistance) return (b.distanceMeters ?? 0) - (a.distanceMeters ?? 0);
        if (hasDuration) return (b.durationSeconds ?? 0) - (a.durationSeconds ?? 0);
        return 0;
      })[0] ?? null;

  const weightProgression = history
    .filter((h) => h.weightKg != null)
    .map((h) => ({ date: h.date.slice(0, 10), value: h.weightKg as number }));

  const volumeProgression = history
    .filter((h) => h.volumeKg != null)
    .map((h) => ({ date: h.date.slice(0, 10), value: h.volumeKg as number }));

  return {
    exerciseName: displayName,
    totalSessions: history.length,
    lastUsedAt: history.length > 0 ? history[history.length - 1].date : null,
    bestPerformance,
    personalRecord,
    weightProgression,
    volumeProgression,
    history,
  };
}
