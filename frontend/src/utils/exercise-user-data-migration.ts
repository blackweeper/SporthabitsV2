import AsyncStorage from "@react-native-async-storage/async-storage";
import { getExerciseRecords } from "./exercise-records";
import { getCustomExercises, getFavoriteExercises } from "./gym-storage";
import { setFavorite } from "./exercise-user-data";

/**
 * Étape B — migration silencieuse des favoris existants
 * (`@ironflow/favoriteExercises`, liste de noms dans gym-storage.ts) vers
 * `ExerciseUserData` (indexé par id). N'écrit rien de nouveau côté UI —
 * `ExerciseUserData.favoritedAt` est lu depuis l'Étape C. La liste legacy
 * n'est jamais supprimée ici : elle reste en place, inutilisée après la
 * bascule de l'Étape C, comme filet de sécurité jusqu'au nettoyage de
 * l'Étape I.
 *
 * Auto-réparation : les noms qui ne se résolvent pas encore (bibliothèque
 * pas à jour, exercice temporairement absent...) restent dans une liste
 * "en attente" persistée (`@ironflow/unresolvedFavorites`) au lieu d'être
 * définitivement abandonnés derrière un indicateur one-shot. Chaque appel
 * ne retraite que cette liste — jamais la liste legacy complète une
 * deuxième fois, pour ne jamais faire réapparaître un favori que
 * l'utilisateur aurait explicitement retiré depuis via le nouveau système.
 * Appeler cette fonction à chaque démarrage app (déjà fait dans
 * app/_layout.tsx) est donc à la fois l'exécution initiale ET la
 * nouvelle tentative — pas besoin d'un déclencheur séparé.
 */

const UNRESOLVED_FAVORITES_KEY = "@ironflow/unresolvedFavorites";

function normalize(s: string): string {
  return s.toLowerCase().trim();
}

export type FavoritesMigrationResult = { migrated: number; unresolved: string[] };

async function getPendingNames(): Promise<string[] | null> {
  const raw = await AsyncStorage.getItem(UNRESOLVED_FAVORITES_KEY);
  if (raw == null) return null; // jamais initialisé — distinct d'une liste vide ([])
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/** Résout les favoris legacy encore en attente vers un id
 * `ExerciseRecord`/`CustomExercise` : par `nameFr` exact, par `aliases` (un
 * ancien nom remplacé par WorkoutX garde une trace ici), ou par le nom d'un
 * exercice personnalisé. Un nom qui ne se résout toujours pas reste en
 * attente pour le prochain appel — jamais bloquant, jamais perdu. */
export async function migrateFavoritesToUserData(): Promise<FavoritesMigrationResult> {
  let pending = await getPendingNames();
  if (pending == null) {
    // Tout premier appel : on part de la liste legacy complète.
    pending = await getFavoriteExercises();
  }

  if (pending.length === 0) {
    // Persiste l'état "vide" pour ne plus jamais repartir de la liste
    // legacy (qui pourrait contenir des noms déjà retirés depuis).
    await AsyncStorage.setItem(UNRESOLVED_FAVORITES_KEY, JSON.stringify([]));
    return { migrated: 0, unresolved: [] };
  }

  const [records, customExercises] = await Promise.all([getExerciseRecords(), getCustomExercises()]);

  const idByName = new Map<string, string>();
  for (const r of records) {
    idByName.set(normalize(r.nameFr), r.id);
    for (const alias of r.aliases ?? []) idByName.set(normalize(alias), r.id);
  }
  for (const c of customExercises) {
    idByName.set(normalize(c.nameFr), c.id);
  }

  let migrated = 0;
  const stillUnresolved: string[] = [];
  for (const name of pending) {
    const id = idByName.get(normalize(name));
    if (id) {
      await setFavorite(id, true);
      migrated++;
    } else {
      stillUnresolved.push(name);
    }
  }

  await AsyncStorage.setItem(UNRESOLVED_FAVORITES_KEY, JSON.stringify(stillUnresolved));

  if (stillUnresolved.length > 0) {
    console.warn(
      `[migrateFavoritesToUserData] ${stillUnresolved.length} favori(s) toujours non résolu(s) — nouvelle tentative au prochain démarrage : ${stillUnresolved.join(", ")}`,
    );
  }

  return { migrated, unresolved: stillUnresolved };
}
