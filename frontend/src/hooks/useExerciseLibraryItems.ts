import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ExerciseCategory,
  getOverrides,
  resolveCategory,
} from "@/src/utils/exercise-category";
import { EXERCISE_LIBRARY } from "@/src/data/exercise-library";
import { CustomExercise, getCustomExercises, getSessions } from "@/src/utils/gym-storage";
import { listAllExercises } from "@/src/utils/exercise-detail";
import { MuscleGroupKey } from "@/src/utils/muscle-groups";
import { ExerciseRecord, ExerciseTier, getExerciseRecords } from "@/src/utils/exercise-records";
import type { ExerciseRecordCategory } from "@/src/utils/exercise-record-category";
import type { ExerciseMuscleGroup } from "@/src/utils/exercise-muscle-groups";
import { EXERCISE_EQUIPMENT_LABEL } from "@/src/utils/exercise-equipment";
import type { ExerciseDifficulty } from "@/src/utils/exercise-difficulty";
import type { FutureCollection } from "@/src/utils/exercise-collection";
import {
  ExerciseUserData,
  addToLibrary,
  getAllExerciseUserData,
  removeFromLibrary,
  setFavorite,
} from "@/src/utils/exercise-user-data";

/** `ExerciseRecordCategory` (6 values, Phase B taxonomy) → legacy
 * `ExerciseCategory` (3 values) — the only categorization the existing
 * stats/chart engine (`exercise-category.ts`) and UI (tab row, card colors)
 * understand. Best-effort, documented rather than adding a 4th/5th tab. */
const RECORD_CATEGORY_TO_LEGACY: Record<ExerciseRecordCategory, ExerciseCategory> = {
  musculation: "musculation",
  cardio: "cardio_machine",
  mobility: "mobility",
  stretching: "mobility",
  plyometric: "musculation",
  sport: "musculation",
};

/** `ExerciseMuscleGroup` (14 values) → legacy `MuscleGroupKey` (9 values),
 * the inverse of `LEGACY_MUSCLE_MAP` in exercise-library-merge.ts — used
 * only to drive the existing muscle filter chips/card icon. */
const RECORD_MUSCLE_TO_LEGACY: Record<ExerciseMuscleGroup, MuscleGroupKey> = {
  chest: "chest",
  back: "back",
  shoulders: "shoulders",
  biceps: "arms",
  triceps: "arms",
  forearms: "arms",
  abs: "core",
  quads: "legs",
  hamstrings: "legs",
  glutes: "glutes",
  calves: "legs",
  traps: "back",
  lower_back: "back",
  full_body: "full_body",
};

export type ExerciseLibraryItem = {
  /** Clé stable pour les données personnelles (favoris, bibliothèque —
   * exercise-user-data.ts) : `CustomExercise.id`/`ExerciseRecord.id` quand
   * disponible, sinon un id synthétique dérivé du nom normalisé (exercices
   * de la bibliothèque statique Phase A avant toute mise à jour, ou
   * exercices connus seulement via l'historique de séances — ces deux
   * niveaux n'ont jamais eu d'id stable, le nom en tenait déjà lieu). */
  id: string;
  name: string;
  category: ExerciseCategory;
  emoji?: string;
  count: number;
  favorite: boolean;
  inLibrary: boolean;
  muscleGroups?: MuscleGroupKey[];
  equipment?: string | null;
  isCustom?: boolean;
  customId?: string;
  imageBase64?: string | null;
  difficulty?: ExerciseDifficulty | null;
  /** Bibliothèque Core par défaut — voir `isCoreVisible` (exercise-records.ts).
   * `undefined` pour les customs/statiques/historique (jamais concernés par
   * la curation, toujours visibles par défaut). */
  exerciseTier?: ExerciseTier | null;
  collections?: FutureCollection[] | null;
};

function normalizeName(name: string): string {
  return name.toLowerCase().trim();
}

/**
 * Single source of truth for merging the 3 exercise data sources (user's
 * custom exercises, the built-in static library, exercises inferred from
 * session history) into one deduplicated, name-keyed list — shared by the
 * exercise-picker modal (`ExerciseLibraryPicker`) and the full-screen
 * Bibliothèque tab so both stay perfectly in sync.
 */
export function useExerciseLibraryItems(active: boolean) {
  const [userData, setUserData] = useState<Record<string, ExerciseUserData>>({});
  const [used, setUsed] = useState<{ name: string; count: number }[]>([]);
  const [overridesState, setOverridesState] = useState<Record<string, ExerciseCategory>>({});
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [libraryRecords, setLibraryRecords] = useState<ExerciseRecord[]>([]);

  const reloadCustom = useCallback(async () => {
    setCustomExercises(await getCustomExercises());
  }, []);

  const reload = useCallback(async () => {
    const [data, sessions, overrides, customs, records] = await Promise.all([
      getAllExerciseUserData(),
      getSessions(),
      getOverrides(),
      getCustomExercises(),
      getExerciseRecords(),
    ]);
    setUserData(data);
    setUsed(listAllExercises(sessions));
    setOverridesState(overrides);
    setCustomExercises(customs);
    // "custom" records inside the stored library are only refreshed each
    // time a library update runs (see exercise-library-merge.ts) and would
    // go stale between updates — `customExercises` above is always the live
    // source of truth for those, so system/workoutx records are the only
    // ones taken from here.
    setLibraryRecords(records.filter((r) => r.source !== "custom"));
  }, []);

  useEffect(() => {
    if (active) reload();
  }, [active, reload]);

  const items = useMemo<ExerciseLibraryItem[]>(() => {
    const merged: ExerciseLibraryItem[] = [];
    const seen = new Set<string>();
    for (const c of customExercises) {
      const key = normalizeName(c.nameFr);
      seen.add(key);
      const done = used.find((u) => normalizeName(u.name) === key);
      merged.push({
        id: c.id,
        name: c.nameFr,
        category: c.category,
        count: done?.count ?? 0,
        favorite: !!userData[c.id]?.favoritedAt,
        inLibrary: !!userData[c.id]?.addedToLibraryAt,
        muscleGroups: c.muscleGroups,
        equipment: c.equipment,
        isCustom: true,
        customId: c.id,
        imageBase64: c.imageBase64,
      });
    }
    // Real professional library (Phase B — system baseline + WorkoutX import),
    // once a user has run at least one library update (src/hooks/useLibraryUpdate.ts).
    // Takes priority over the static dev list below, which it fully supersedes
    // once populated (still includes any dev exercise not yet replaced, as its
    // own "system" record — see exercise-library-merge.ts).
    for (const r of libraryRecords) {
      const key = normalizeName(r.nameFr);
      if (seen.has(key)) continue;
      seen.add(key);
      const done = used.find((u) => normalizeName(u.name) === key);
      const primary = r.primaryMuscle ? RECORD_MUSCLE_TO_LEGACY[r.primaryMuscle] : undefined;
      const secondary = (r.secondaryMuscles ?? []).map((m) => RECORD_MUSCLE_TO_LEGACY[m]);
      const muscleGroups = primary
        ? Array.from(new Set([primary, ...secondary]))
        : secondary.length > 0
          ? Array.from(new Set(secondary))
          : undefined;
      merged.push({
        id: r.id,
        name: r.nameFr,
        category: RECORD_CATEGORY_TO_LEGACY[r.category],
        count: done?.count ?? 0,
        favorite: !!userData[r.id]?.favoritedAt,
        inLibrary: !!userData[r.id]?.addedToLibraryAt,
        muscleGroups,
        equipment: r.equipment ? EXERCISE_EQUIPMENT_LABEL[r.equipment] : null,
        // Pas d'imageBase64 ici : ce champ n'a jamais été peuplé pour les
        // ExerciseRecord (source workoutx/system) — la carte résout sa
        // propre image via useExerciseMedia(item.id) désormais. Le champ
        // reste utilisé plus haut pour les exercices personnalisés (photo
        // prise par l'utilisateur, un cas réel et distinct).
        difficulty: r.enrichment?.difficulty ?? r.difficulty ?? null,
        exerciseTier: r.exerciseTier ?? null,
        collections: r.collections ?? null,
      });
    }
    // Static dev library (Phase A) — fallback for exercises not yet covered
    // by a real library update (or before the user has ever run one). No
    // stable id exists for these outside of a completed library update
    // (see systemRecordFromLibraryExercise in exercise-library-merge.ts) —
    // fall back to a name-derived id, consistent with how these were always
    // identified before ExerciseUserData existed.
    for (const lib of EXERCISE_LIBRARY) {
      const key = normalizeName(lib.name);
      if (seen.has(key)) continue;
      seen.add(key);
      const done = used.find((u) => normalizeName(u.name) === key);
      const id = `name_${key}`;
      merged.push({
        id,
        name: lib.name,
        category: lib.category,
        emoji: lib.emoji,
        count: done?.count ?? 0,
        favorite: !!userData[id]?.favoritedAt,
        inLibrary: !!userData[id]?.addedToLibraryAt,
        muscleGroups: lib.muscleGroups,
      });
    }
    for (const u of used) {
      const key = normalizeName(u.name);
      if (seen.has(key)) continue;
      const id = `name_${key}`;
      merged.push({
        id,
        name: u.name,
        category: resolveCategory(u.name, overridesState),
        count: u.count,
        favorite: !!userData[id]?.favoritedAt,
        inLibrary: !!userData[id]?.addedToLibraryAt,
      });
    }
    return merged;
  }, [userData, used, overridesState, customExercises, libraryRecords]);

  const toggleFavorite = useCallback(
    async (id: string) => {
      const currentlyFavorited = !!userData[id]?.favoritedAt;
      await setFavorite(id, !currentlyFavorited);
      const now = new Date().toISOString();
      setUserData((prev) => ({
        ...prev,
        [id]: {
          ...prev[id],
          favoritedAt: !currentlyFavorited ? now : null,
          // `setFavorite(id, true)` ajoute aussi l'exercice à la bibliothèque
          // (invariant favori ⟹ bibliothèque) s'il n'y était pas déjà — sans
          // ce reflet local, la carte resterait affichée "hors bibliothèque"
          // jusqu'à un reload() complet.
          ...(!currentlyFavorited
            ? {
                addedToLibraryAt: prev[id]?.addedToLibraryAt ?? now,
                librarySource: prev[id]?.librarySource ?? "manual",
              }
            : {}),
          updatedAt: now,
        },
      }));
    },
    [userData],
  );

  const toggleLibrary = useCallback(
    async (id: string) => {
      const currentlyInLibrary = !!userData[id]?.addedToLibraryAt;
      const now = new Date().toISOString();
      if (currentlyInLibrary) {
        await removeFromLibrary(id);
        // `removeFromLibrary` efface aussi le favori (même invariant, dans
        // l'autre sens) — reflet local des trois champs pour rester en
        // phase sans attendre un reload().
        setUserData((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            addedToLibraryAt: null,
            librarySource: null,
            favoritedAt: null,
            updatedAt: now,
          },
        }));
      } else {
        await addToLibrary(id, "manual");
        setUserData((prev) => ({
          ...prev,
          [id]: {
            ...prev[id],
            addedToLibraryAt: prev[id]?.addedToLibraryAt ?? now,
            librarySource: prev[id]?.librarySource ?? "manual",
            updatedAt: now,
          },
        }));
      }
    },
    [userData],
  );

  /** Téléchargement "pack complet" (Phase 1, POLISH V2) — ajoute tous les
   * exercices d'une Collection future à la bibliothèque personnelle en un
   * geste. Rien à télécharger réellement (les 1348 exercices sont déjà en
   * local, voir exercise-user-data.ts) : c'est un `toggleLibrary` en masse,
   * réutilisant `addToLibrary` exercice par exercice pour ne jamais écraser
   * une source d'ajout déjà posée. */
  const addAllInCollection = useCallback(
    async (collection: FutureCollection) => {
      const targets = items.filter(
        (i) => !i.inLibrary && i.collections?.includes(collection),
      );
      if (targets.length === 0) return;
      const now = new Date().toISOString();
      await Promise.all(targets.map((i) => addToLibrary(i.id, "manual")));
      setUserData((prev) => {
        const next = { ...prev };
        for (const t of targets) {
          next[t.id] = {
            ...next[t.id],
            addedToLibraryAt: next[t.id]?.addedToLibraryAt ?? now,
            librarySource: next[t.id]?.librarySource ?? "manual",
            updatedAt: now,
          };
        }
        return next;
      });
    },
    [items],
  );

  return {
    items,
    customExercises,
    reload,
    reloadCustom,
    toggleFavorite,
    toggleLibrary,
    addAllInCollection,
  };
}
