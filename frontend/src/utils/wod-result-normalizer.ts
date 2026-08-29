import { SessionExerciseLog, WorkoutSession } from "@/src/utils/gym-storage";
import {
  cleanCompositeItemLabel,
  parseCompositeExerciseName,
  splitCompositeItemQuantity,
} from "@/src/utils/composite-exercise";

export type NormalizedExerciseContribution = {
  /** Nom réel nettoyé du mouvement ("Traction"), jamais la phrase composite. */
  name: string;
  /** Reps par round/tour — la vraie valeur "max set" (jamais confondue avec
   * le total, voir le commentaire de `expandWorkoutSessionsForExerciseStats`). */
  repsPerRound: number;
};

export type NormalizedWodResult = {
  roundsCompleted: number;
  exercises: NormalizedExerciseContribution[];
};

/**
 * Un AMRAP/For Time composite ("5 Traction → 10 Pompe → 15 Squats") encode
 * tout le circuit dans un SEUL `SessionExerciseLog` — le nombre de tours
 * réalisés vit dans `sets[0].reps` (ex. "6"), le nombre de reps par tour et
 * par mouvement vit uniquement dans le NOM composite, jamais en donnée
 * structurée. Cette fonction extrait les deux pour reconstruire, par
 * mouvement, "combien de reps par tour" — jamais un total fabriqué : un
 * segment dont la quantité ne se parse pas (ex. "Squats sans poids", pas de
 * chiffre en tête) est simplement ignoré plutôt que de produire une valeur
 * inventée.
 *
 * Ne gère PAS le cas d'un dernier tour partiel ("6 tours + 7 pompes") — le
 * logger actuel ne capture qu'un compteur de tours entier (`TOURS`), aucun
 * champ de reps partielles n'existe encore dans l'UI de séance. Tant que ce
 * champ n'existe pas, on ne modélise que des tours complets — cohérent avec
 * la règle "ne jamais fabriquer de donnée" plutôt que d'aller au-delà de ce
 * que l'utilisateur a réellement pu saisir.
 */
export function normalizeWodResult(log: SessionExerciseLog): NormalizedWodResult | null {
  if (log.mode !== "amrap" && log.mode !== "for_time") return null;
  const segments = parseCompositeExerciseName(log.name);
  if (!segments) return null;

  const completedSet = log.sets.find((s) => s.completed);
  const rounds = completedSet ? parseInt(completedSet.reps, 10) : NaN;
  if (!Number.isFinite(rounds) || rounds <= 0) return null;

  const exercises: NormalizedExerciseContribution[] = [];
  for (const seg of segments) {
    const { reps } = splitCompositeItemQuantity(seg);
    const repsPerRound = parseInt(reps, 10);
    if (!Number.isFinite(repsPerRound) || repsPerRound <= 0) continue;
    exercises.push({ name: cleanCompositeItemLabel(seg), repsPerRound });
  }
  if (exercises.length === 0) return null;
  return { roundsCompleted: rounds, exercises };
}

/**
 * Vue "aplatie" des séances pour les agrégations PAR EXERCICE
 * (`listAllExercises`/`computeExerciseDetail`/`computeExerciseProgress`/
 * `computeCategoryStats`/`buildSeries`, tous dans `exercise-detail.ts`/
 * `exercise-progress.ts`/`exercise-category.ts`) : chaque entrée composite
 * AMRAP/For Time est retirée et remplacée par une entrée par mouvement réel,
 * portant `roundsCompleted` sets synthétiques de `repsPerRound` reps chacun —
 * exactement la même forme qu'un exercice classique "N séries de X reps",
 * donc le reste du pipeline existant (volume = poids×reps, max set, total
 * reps) fonctionne SANS aucune modification et sans jamais confondre "reps
 * par tour" (max set réel, ex. 5) et "reps totales" (somme des sets, ex. 30)
 * — la distinction demandée explicitement (jamais une fausse pointe à 30).
 *
 * Ne touche jamais aux entrées non-composites : un round EMOM (round-robin)
 * est déjà stocké comme son propre `SessionExerciseLog` avec un vrai nom de
 * mouvement (voir `EmomBlock`) — déjà correctement agrégé par le système
 * existant, rien à normaliser ici pour ce cas.
 */
export function expandWorkoutSessionsForExerciseStats(
  sessions: WorkoutSession[],
): WorkoutSession[] {
  return sessions.map((s) => {
    let changed = false;
    const expanded: SessionExerciseLog[] = [];
    for (const ex of s.exercises) {
      const normalized = normalizeWodResult(ex);
      if (!normalized) {
        expanded.push(ex);
        continue;
      }
      changed = true;
      for (const contrib of normalized.exercises) {
        expanded.push({
          ...ex,
          name: contrib.name,
          exerciseId: `${ex.exerciseId}-${contrib.name}`,
          mode: "reps",
          libraryExerciseId: null,
          notes: null,
          emomBlock: null,
          roundBlock: null,
          targetRounds: null,
          targetSets: normalized.roundsCompleted,
          targetReps: String(contrib.repsPerRound),
          sets: Array.from({ length: normalized.roundsCompleted }, () => ({
            reps: String(contrib.repsPerRound),
            weight: "",
            completed: true,
          })),
        });
      }
    }
    return changed ? { ...s, exercises: expanded } : s;
  });
}
