import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Étape A — données personnelles liées aux exercices, séparées du catalogue
 * partagé (`ExerciseRecord`, exercise-records.ts). Décision produit :
 * `ExerciseRecord` ne reçoit plus de nouveaux champs personnels — tout ce
 * qui est propre à un utilisateur (favoris, appartenance à sa bibliothèque
 * personnelle, et plus tard des statistiques d'usage) vit ici à la place,
 * indexé par `ExerciseRecord.id` (jamais par nom : les noms peuvent changer
 * d'une mise à jour de bibliothèque à l'autre — voir les collisions de
 * traduction WorkoutX rencontrées lors du passage en français, Phase 0).
 *
 * Cette séparation évite au moteur de fusion du catalogue
 * (`exercise-library-merge.ts`) d'avoir à connaître et préserver une liste
 * grandissante de champs "personnels" à chaque mise à jour de bibliothèque
 * — une mise à jour du catalogue ne touche jamais ce fichier, donc jamais
 * ces données.
 *
 * Note historique : `ExerciseRecord.favoritedAt` existe déjà dans le
 * catalogue mais n'est en réalité lu/écrit par aucun écran — les favoris
 * réels vivent aujourd'hui dans une liste séparée par nom
 * (`@ironflow/favoriteExercises`, gym-storage.ts). Cette étape ne migre pas
 * encore cette liste (voir Étape B) ; ce fichier ne fait que poser la
 * structure cible.
 */

export type LibrarySource = "starter" | "usage" | "manual" | "custom";

export type ExerciseUserData = {
  favoritedAt?: string | null;

  addedToLibraryAt?: string | null;
  /** D'où vient l'appartenance à la bibliothèque — pas exploité tout de
   * suite, gardé pour de futures suggestions personnalisées. */
  librarySource?: LibrarySource | null;

  /** Réservés pour une évolution future (statistiques d'usage) — définis
   * dès maintenant pour éviter une migration de schéma plus tard, jamais
   * renseignés par le code actuel. */
  lastUsedAt?: string | null;
  usageCount?: number | null;

  updatedAt: string;
};

const EXERCISE_USER_DATA_KEY = "@ironflow/exerciseUserData";

export async function getAllExerciseUserData(): Promise<Record<string, ExerciseUserData>> {
  const raw = await AsyncStorage.getItem(EXERCISE_USER_DATA_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function getExerciseUserDataFor(id: string): Promise<ExerciseUserData | undefined> {
  const all = await getAllExerciseUserData();
  return all[id];
}

/** Fusionne `patch` dans l'entrée existante (ou en crée une) — n'écrase
 * jamais un champ non présent dans `patch`. Pose toujours `updatedAt`. */
export async function upsertExerciseUserData(
  id: string,
  patch: Partial<ExerciseUserData>,
): Promise<Record<string, ExerciseUserData>> {
  const all = await getAllExerciseUserData();
  all[id] = {
    ...all[id],
    ...patch,
    updatedAt: new Date().toISOString(),
  };
  await AsyncStorage.setItem(EXERCISE_USER_DATA_KEY, JSON.stringify(all));
  return all;
}

/** Invariant produit : un exercice favori appartient toujours à la
 * bibliothèque personnelle. Mettre un favori l'ajoute donc aussi à la
 * bibliothèque dans le même geste s'il n'y était pas déjà (source
 * "manual" — favoriter est un geste explicite), sans jamais écraser une
 * source d'ajout déjà posée (ex. "usage") si l'exercice y était déjà. */
export async function setFavorite(id: string, favorited: boolean): Promise<void> {
  if (!favorited) {
    await upsertExerciseUserData(id, { favoritedAt: null });
    return;
  }
  const existing = await getExerciseUserDataFor(id);
  await upsertExerciseUserData(id, {
    favoritedAt: new Date().toISOString(),
    addedToLibraryAt: existing?.addedToLibraryAt ?? new Date().toISOString(),
    librarySource: existing?.librarySource ?? "manual",
  });
}

export async function addToLibrary(id: string, source: LibrarySource): Promise<void> {
  const existing = await getExerciseUserDataFor(id);
  if (existing?.addedToLibraryAt) return; // déjà dans la bibliothèque — ne pas écraser la source d'origine
  await upsertExerciseUserData(id, { addedToLibraryAt: new Date().toISOString(), librarySource: source });
}

/** Retire l'exercice de la bibliothèque personnelle (masquage, jamais de
 * suppression d'historique/PRs — non concernés par ce store). Retire aussi
 * le statut favori dans le même geste : même invariant que `setFavorite`,
 * un favori ne peut jamais survivre en dehors de la bibliothèque. */
export async function removeFromLibrary(id: string): Promise<void> {
  await upsertExerciseUserData(id, { addedToLibraryAt: null, librarySource: null, favoritedAt: null });
}
