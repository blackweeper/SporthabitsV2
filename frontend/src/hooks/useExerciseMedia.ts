import { useEffect, useState } from "react";
import { ensureMediaCached } from "@/src/utils/exercise-media-cache";
import { EXERCISE_LIBRARY_MANIFEST_URL } from "@/src/utils/exercise-library-source-config";

/**
 * Bibliothèque d'images officielle IronFlow — LE seul endroit qui décide
 * quelle image représente un exercice. Aucun autre écran ne doit construire
 * un chemin média lui-même : appelle ce hook avec l'id de l'exercice, point.
 *
 * Résolution purement basée sur l'`id` (jamais sur `ExerciseRecord.media`,
 * devenu vestigial) : illustration IronFlow d'abord, GIF WorkoutX en repli,
 * puis `uri: null` — chaque appelant retombe alors sur son fallback emoji
 * déjà existant (pas de `placeholder.webp` dédié pour l'instant : aucun
 * asset de ce type n'existe encore dans `exercise-library/media/` ; le jour
 * où il sera fourni, il suffira d'ajouter un 3e palier ici, sans toucher aux
 * appelants).
 */
export type ExerciseMediaSource = "ironflow" | "workoutx" | null;

const LIBRARY_ORIGIN = EXERCISE_LIBRARY_MANIFEST_URL?.replace(/manifest\.json$/, "") ?? null;

function buildMediaUrls(exerciseId: string): { ironflow: string; workoutx: string } | null {
  if (!LIBRARY_ORIGIN) return null;
  return {
    ironflow: `${LIBRARY_ORIGIN}media/ironflow/${exerciseId}.webp`,
    workoutx: `${LIBRARY_ORIGIN}media/workoutx/${exerciseId}.gif`,
  };
}

export function useExerciseMedia(exerciseId: string | null | undefined): {
  uri: string | null;
  source: ExerciseMediaSource;
  loading: boolean;
} {
  const [state, setState] = useState<{ uri: string | null; source: ExerciseMediaSource }>({
    uri: null,
    source: null,
  });
  const [loading, setLoading] = useState(!!exerciseId);

  useEffect(() => {
    let cancelled = false;

    if (!exerciseId) {
      setState({ uri: null, source: null });
      setLoading(false);
      return;
    }
    const urls = buildMediaUrls(exerciseId);
    if (!urls) {
      setState({ uri: null, source: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const ironflowUri = await ensureMediaCached(urls.ironflow);
      if (cancelled) return;
      if (ironflowUri) {
        setState({ uri: ironflowUri, source: "ironflow" });
        setLoading(false);
        return;
      }
      const workoutxUri = await ensureMediaCached(urls.workoutx);
      if (cancelled) return;
      setState({ uri: workoutxUri, source: workoutxUri ? "workoutx" : null });
      setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [exerciseId]);

  return { ...state, loading };
}
