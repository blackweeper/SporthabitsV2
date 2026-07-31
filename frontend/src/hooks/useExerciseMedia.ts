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
export type ExerciseMediaSource = "ironflow" | "gymgifsdb" | "workoutx" | null;

const LIBRARY_ORIGIN = EXERCISE_LIBRARY_MANIFEST_URL?.replace(/manifest\.json$/, "") ?? null;

type MediaCandidate = { source: Exclude<ExerciseMediaSource, null>; url: string };

/**
 * Chaque fournisseur peut couvrir un ou deux "rôles" pour un exercice :
 * `image` — une illustration/photo statique (identité visuelle) ;
 * `gif`   — une démonstration animée de l'exécution.
 * `ironflow` ne fournit (pour l'instant) que des images dessinées en interne ;
 * `gymgifsdb` fournit les deux pour chaque exercice qu'il couvre ; `workoutx`
 * ne fournit que des GIF. La priorité **entre fournisseurs** (ironflow avant
 * gymgifsdb avant workoutx) est la même quel que soit le rôle — seul ce qui
 * est réellement disponible par fournisseur change.
 */
function buildCandidates(exerciseId: string, role: "image" | "gif"): MediaCandidate[] | null {
  if (!LIBRARY_ORIGIN) return null;
  if (role === "image") {
    return [
      { source: "ironflow", url: `${LIBRARY_ORIGIN}media/ironflow/${exerciseId}.webp` },
      { source: "gymgifsdb", url: `${LIBRARY_ORIGIN}media/gymgifsdb/${exerciseId}.webp` },
    ];
  }
  return [
    { source: "gymgifsdb", url: `${LIBRARY_ORIGIN}media/gymgifsdb/${exerciseId}.gif` },
    { source: "workoutx", url: `${LIBRARY_ORIGIN}media/workoutx/${exerciseId}.gif` },
  ];
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
      // Une seule "meilleure image possible" pour cet exercice — les rôles
      // image puis gif sont essayés dans l'ordre (ironflow > gymgifsdb en
      // statique, puis gymgifsdb > workoutx en GIF), cohérent avec la
      // priorité globale des fournisseurs.
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
 * V3". Chaque champ peut désormais venir de plusieurs fournisseurs
 * (`ironflowUri` = ironflow sinon gymgifsdb ; `workoutxUri` = gymgifsdb sinon
 * workoutx) mais les noms de champs restent stables : ce sont des **rôles**
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
