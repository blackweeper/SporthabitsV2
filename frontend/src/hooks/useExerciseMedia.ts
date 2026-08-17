import { useEffect, useState } from "react";
import { ensureMediaCached } from "@/src/utils/exercise-media-cache";
import { EXERCISE_LIBRARY_MANIFEST_URL } from "@/src/utils/exercise-library-source-config";

/**
 * Bibliothèque d'images officielle IronFlow — LE seul endroit qui décide
 * quelle image représente un exercice. Aucun autre écran ne doit construire
 * un chemin média lui-même : appelle ce hook avec l'id de l'exercice, point.
 *
 * Résolution purement basée sur l'`id` (jamais sur `ExerciseRecord.media`,
 * devenu vestigial) via une liste de **fournisseurs** ordonnée par priorité —
 * voir `MEDIA_PROVIDERS` ci-dessous. Ajouter un futur fournisseur (média
 * officiel IronFlow tourné en studio, un autre catalogue...) ou changer la
 * priorité ne touche qu'à cette liste, jamais aux appelants ni à
 * `ExerciseRecord` : c'est tout l'intérêt de ce resolver centralisé.
 */
export type ExerciseMediaSource = "ironflow" | "workoutx" | null;

const LIBRARY_ORIGIN = EXERCISE_LIBRARY_MANIFEST_URL?.replace(/manifest\.json$/, "") ?? null;

type MediaCandidate = { source: Exclude<ExerciseMediaSource, null>; url: string };

/** Extensions tolérées pour `media/ironflow/` — `.webp` reste le format
 * recommandé (voir `NEW-EXERCISE-TEMPLATE-GUIDE.md`), mais la production
 * d'illustrations est manuelle et un mauvais export (`.png`/`.jpg`) arrive
 * (déjà observé en pratique) : mieux vaut afficher l'image quand même que
 * la perdre silencieusement en attendant une re-conversion. */
const IRONFLOW_IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg"];

/**
 * Chaque fournisseur couvre un "rôle" pour un exercice :
 * `image` — une illustration/photo statique (identité visuelle), fournie par
 * `ironflow` ; `gif` — une démonstration animée de l'exécution, fournie par
 * `workoutx`.
 */
function buildCandidates(exerciseId: string, role: "image" | "gif"): MediaCandidate[] | null {
  if (!LIBRARY_ORIGIN) return null;
  if (role === "image") {
    return IRONFLOW_IMAGE_EXTENSIONS.map((ext) => ({
      source: "ironflow" as const,
      url: `${LIBRARY_ORIGIN}media/ironflow/${exerciseId}.${ext}`,
    }));
  }
  return [{ source: "workoutx", url: `${LIBRARY_ORIGIN}media/workoutx/${exerciseId}.gif` }];
}

/** Essaie chaque candidat dans l'ordre, retourne le premier qui existe
 * réellement (`ensureMediaCached` renvoie `null` en cas de 404/échec réseau,
 * jamais une exception — voir `exercise-media-cache.ts`). */
async function resolveFirst(
  candidates: MediaCandidate[],
  cancelledRef: { current: boolean },
): Promise<{ uri: string; source: Exclude<ExerciseMediaSource, null> } | null> {
  for (const c of candidates) {
    const uri = await ensureMediaCached(c.url);
    if (cancelledRef.current) return null;
    if (uri) return { uri, source: c.source };
  }
  return null;
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
    const cancelledRef = { current: false };

    if (!exerciseId) {
      setState({ uri: null, source: null });
      setLoading(false);
      return;
    }
    const imageCandidates = buildCandidates(exerciseId, "image");
    const gifCandidates = buildCandidates(exerciseId, "gif");
    if (!imageCandidates || !gifCandidates) {
      setState({ uri: null, source: null });
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      // Une seule "meilleure image possible" pour cet exercice — le rôle
      // image (ironflow) est essayé avant le rôle gif (workoutx).
      const found =
        (await resolveFirst(imageCandidates, cancelledRef)) ??
        (await resolveFirst(gifCandidates, cancelledRef));
      if (cancelledRef.current) return;
      setState(found ? { uri: found.uri, source: found.source } : { uri: null, source: null });
      setLoading(false);
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [exerciseId]);

  return { ...state, loading };
}

/**
 * V3 — résout l'illustration (rôle "image") ET le GIF (rôle "gif")
 * indépendamment (pas de priorité/fallback entre les deux), pour la fiche
 * exercice qui les affiche ensemble : l'illustration reste l'identité
 * visuelle, le GIF la démonstration d'exécution — voir le plan "Bibliothèque
 * V3". `ironflowUri` vient du fournisseur ironflow, `workoutxUri` du
 * fournisseur workoutx — noms de champs stables, ce sont des **rôles**
 * ("l'image d'identité", "le GIF d'exécution"), pas des noms de fournisseur
 * littéraux — aucun changement requis chez les appelants existants.
 */
export function useExerciseMediaSources(exerciseId: string | null | undefined): {
  ironflowUri: string | null;
  workoutxUri: string | null;
  loading: boolean;
} {
  const [ironflowUri, setIronflowUri] = useState<string | null>(null);
  const [workoutxUri, setWorkoutxUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(!!exerciseId);

  useEffect(() => {
    const cancelledRef = { current: false };

    if (!exerciseId) {
      setIronflowUri(null);
      setWorkoutxUri(null);
      setLoading(false);
      return;
    }
    const imageCandidates = buildCandidates(exerciseId, "image");
    const gifCandidates = buildCandidates(exerciseId, "gif");
    if (!imageCandidates || !gifCandidates) {
      setIronflowUri(null);
      setWorkoutxUri(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    (async () => {
      const [image, gif] = await Promise.all([
        resolveFirst(imageCandidates, cancelledRef),
        resolveFirst(gifCandidates, cancelledRef),
      ]);
      if (cancelledRef.current) return;
      setIronflowUri(image?.uri ?? null);
      setWorkoutxUri(gif?.uri ?? null);
      setLoading(false);
    })();

    return () => {
      cancelledRef.current = true;
    };
  }, [exerciseId]);

  return { ironflowUri, workoutxUri, loading };
}
