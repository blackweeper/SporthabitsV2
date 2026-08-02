/**
 * Coach IronFlow — Niveau 3 (apprentissage). Dérive des signaux depuis
 * l'historique réel déjà stocké (`WorkoutSession[]`) — aucune nouvelle
 * instrumentation, aucune IA. Pure fonction : mêmes séances en entrée,
 * mêmes signaux en sortie.
 */
import type { WorkoutSession } from "@/src/utils/gym-storage";

export type CoachLearningSignals = {
  /** `ExerciseRecord.id` -> taux de séries non complétées (0..1) sur
   * l'historique récent. N'inclut que les exercices avec assez de données
   * (`MIN_SETS_FOR_SIGNAL`) pour être un vrai signal, pas du bruit. */
  exerciseFailureRate: Record<string, number>;
  /** Séances/semaine réellement observées sur la fenêtre récente, ou `null`
   * si pas assez d'historique pour un signal fiable. */
  observedWeeklyFrequency: number | null;
  /** Durée moyenne réelle des dernières séances (minutes), ou `null`. */
  observedSessionDurationMinutes: number | null;
  /** Nombre de séances terminées prises en compte — utile pour décider si
   * les signaux ci-dessus méritent d'être montrés à l'utilisateur. */
  sessionsAnalyzed: number;
};

const RECENT_SESSIONS_LIMIT = 20;
const MIN_SETS_FOR_FAILURE_SIGNAL = 3;
const MIN_SESSIONS_FOR_SIGNAL = 3;
const FREQUENCY_WINDOW_DAYS = 28;

export function computeLearningSignals(sessions: WorkoutSession[], now: Date = new Date()): CoachLearningSignals {
  const completed = sessions.filter((s) => s.endedAt);
  const recent = [...completed]
    .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
    .slice(0, RECENT_SESSIONS_LIMIT);

  const failTotals = new Map<string, { fail: number; total: number }>();
  for (const session of recent) {
    for (const ex of session.exercises) {
      const key = ex.libraryExerciseId;
      if (!key) continue; // pas de correspondance bibliothèque, aucun signal exploitable
      const entry = failTotals.get(key) ?? { fail: 0, total: 0 };
      for (const set of ex.sets) {
        entry.total += 1;
        if (!set.completed) entry.fail += 1;
      }
      failTotals.set(key, entry);
    }
  }
  const exerciseFailureRate: Record<string, number> = {};
  for (const [key, { fail, total }] of failTotals) {
    if (total >= MIN_SETS_FOR_FAILURE_SIGNAL) exerciseFailureRate[key] = fail / total;
  }

  const cutoff = now.getTime() - FREQUENCY_WINDOW_DAYS * 24 * 3600 * 1000;
  const windowSessions = completed.filter((s) => new Date(s.startedAt).getTime() >= cutoff);
  const observedWeeklyFrequency =
    windowSessions.length >= MIN_SESSIONS_FOR_SIGNAL
      ? Math.round((windowSessions.length / (FREQUENCY_WINDOW_DAYS / 7)) * 10) / 10
      : null;

  const durations = recent.map((s) => s.durationSeconds).filter((d) => d > 0);
  const observedSessionDurationMinutes =
    durations.length >= MIN_SESSIONS_FOR_SIGNAL
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length / 60)
      : null;

  return {
    exerciseFailureRate,
    observedWeeklyFrequency,
    observedSessionDurationMinutes,
    sessionsAnalyzed: recent.length,
  };
}
