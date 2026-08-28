import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, motion, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import { useExerciseLibraryItems } from "@/src/hooks/useExerciseLibraryItems";
import { useLibraryUpdate } from "@/src/hooks/useLibraryUpdate";
import ExerciseSearchBar from "@/src/components/exercise-library/ExerciseSearchBar";
import {
  CategoryTabRow,
  CollectionChipRow,
  EquipmentChipRow,
  LibTab,
  MuscleChipRow,
} from "@/src/components/exercise-library/ExerciseFilterChips";
import ExerciseCard from "@/src/components/exercise-library/ExerciseCard";
import FilterSheet, { FilterCountBadge } from "@/src/components/ui/FilterSheet";
import SegmentedTabRow from "@/src/components/ui/SegmentedTabRow";
import GlassCard from "@/src/components/ui/GlassCard";
import SwipeableRow from "@/src/components/SwipeableRow";
import { MuscleGroupKey } from "@/src/utils/muscle-groups";
import { CustomExercise, deleteCustomExercise, saveCustomExercise, uid } from "@/src/utils/gym-storage";
import { NewExerciseSheet } from "@/src/components/ExerciseLibraryPicker";
import PressableScale from "@/src/components/ui/PressableScale";
import { isCoreVisible } from "@/src/utils/exercise-records";
import { FUTURE_COLLECTION_LABEL, type FutureCollection } from "@/src/utils/exercise-collection";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { EXERCISE_DIFFICULTY_LABEL } from "@/src/utils/exercise-difficulty";
import type { ExerciseLibraryItem } from "@/src/hooks/useExerciseLibraryItems";

function normalizeSearch(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();
}

/** Ligne pleine largeur pour un résultat de recherche "à découvrir"
 * (collection_only) — une mini-carte de grille (~164px) n'a pas la place
 * pour "Disponible dans : {pack}" + 2 actions, d'où un rendu en ligne plutôt
 * que la grille utilisée pour le Catalogue officiel. */
function DiscoverRow({
  item,
  downloading,
  onAdd,
  onDownloadPack,
}: {
  item: ExerciseLibraryItem;
  downloading: boolean;
  onAdd: () => void;
  onDownloadPack: () => void;
}) {
  const { theme } = useTheme();
  const primaryMuscle = item.muscleGroups?.[0]
    ? MUSCLE_GROUPS.find((m) => m.key === item.muscleGroups![0])
    : undefined;
  const pack = item.collections?.[0];
  return (
    <View
      style={[
        styles.discoverRow,
        {
          backgroundColor: theme.colors.surfaceSecondary,
          borderRadius: theme.radius.md,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <View style={{ flex: 1 }}>
        <Text style={[styles.discoverRowName, { color: theme.colors.onSurface }]} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.discoverRowMeta}>
          {primaryMuscle && <Text style={styles.discoverRowMetaEmoji}>{primaryMuscle.emoji}</Text>}
          {item.difficulty && (
            <Text style={[styles.discoverRowMetaText, { color: theme.colors.onSurfaceTertiary }]}>
              {EXERCISE_DIFFICULTY_LABEL[item.difficulty]}
            </Text>
          )}
        </View>
        {pack && (
          <Text style={[styles.discoverRowPack, { color: theme.colors.info }]}>
            Disponible dans : {FUTURE_COLLECTION_LABEL[pack]}
          </Text>
        )}
      </View>
      <View style={styles.discoverRowActions}>
        <PressableScale
          testID={`lib-discover-add-${item.id}`}
          style={[
            styles.discoverAddBtn,
            theme.card.mode === "glass"
              ? [
                  { backgroundColor: withAlpha(theme.colors.brand, 20), borderWidth: 1, borderColor: withAlpha(theme.colors.brand, 50) },
                  coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.28, radius: 6, elevation: 2 }),
                ]
              : { backgroundColor: theme.colors.brand },
          ]}
          onPress={onAdd}
        >
          <Ionicons name="add" size={16} color={theme.colors.onSurface} />
        </PressableScale>
        {pack && (
          <PressableScale
            testID={`lib-discover-pack-${item.id}`}
            style={[styles.discoverPackBtn, { borderRadius: theme.radius.pill, borderColor: theme.colors.brand }]}
            onPress={onDownloadPack}
            disabled={downloading}
          >
            <Text style={[styles.discoverPackBtnText, { color: theme.colors.brand }]}>
              {downloading ? "…" : "Tout le pack"}
            </Text>
          </PressableScale>
        )}
      </View>
    </View>
  );
}

/**
 * 📚 Bibliothèque — full-screen exercise library tab. Not a copy of the
 * mid-workout picker modal: richer cards, a dedicated detail fiche per
 * exercise, and combinable catégorie/muscle/équipement filters. Backed by
 * the same shared data as the picker (useExerciseLibraryItems) so favorites,
 * custom exercises and usage stats stay perfectly in sync everywhere.
 */
export default function LibraryScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { create } = useLocalSearchParams<{ create?: string }>();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<LibTab>("all");
  const [muscle, setMuscle] = useState<MuscleGroupKey | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ mode: "create" | "edit"; draft: CustomExercise } | null>(
    null,
  );

  const {
    items,
    customExercises,
    reload,
    reloadCustom,
    toggleFavorite,
    toggleLibrary,
    addAllInCollection,
  } = useExerciseLibraryItems(true);
  const [downloadingCollection, setDownloadingCollection] = useState<FutureCollection | null>(
    null,
  );
  // V3 — 2 scopes seulement : "Ma bibliothèque" contient nativement les 300
  // exercices officiels (inLibrary dérivé du tier, voir
  // useExerciseLibraryItems.ts) + tout ajout explicite depuis Découvrir ;
  // l'ancien scope "Catalogue" (qui n'affichait que ces mêmes 300) est
  // supprimé, son contenu vit désormais en permanence dans "library".
  const [scope, setScope] = useState<"library" | "discover">("library");
  const [collectionFilter, setCollectionFilter] = useState<FutureCollection | null>(null);
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const activeFilterCount =
    (tab !== "all" ? 1 : 0) +
    (muscle ? 1 : 0) +
    (equipment ? 1 : 0) +
    (collectionFilter ? 1 : 0);

  // Découvrir (1348 - 300) — les exercices `collection_only` ne sont jamais
  // embarqués dans l'app (seuls les 300 officiels le sont, via
  // exercise-library-bootstrap.ts, volontairement inchangé). Ils n'existent
  // en local qu'après un vrai téléchargement réseau du catalogue complet —
  // déclenché ici silencieusement, une seule fois, à la première ouverture
  // de l'onglet "Découvrir" tant qu'aucun `collection_only` n'est déjà
  // présent (jamais au démarrage de l'app, jamais si déjà téléchargé).
  const libraryUpdate = useLibraryUpdate();
  const discoverFetchTriggered = useRef(false);
  const [discoverFetchError, setDiscoverFetchError] = useState<string | null>(null);
  const hasDiscoverData = items.some((i) => i.exerciseTier === "collection_only");
  const discoverFetchBusy =
    libraryUpdate.phase !== "idle" && libraryUpdate.phase !== "done" && libraryUpdate.phase !== "error";

  const triggerDiscoverFetch = useCallback(async () => {
    setDiscoverFetchError(null);
    const check = await libraryUpdate.checkForUpdate();
    if ("error" in check) {
      setDiscoverFetchError(check.error);
      return;
    }
    if (!check.available) return;
    await libraryUpdate.runUpdate();
  }, [libraryUpdate]);

  useEffect(() => {
    if (scope !== "discover" || hasDiscoverData || discoverFetchTriggered.current) return;
    discoverFetchTriggered.current = true;
    triggerDiscoverFetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, hasDiscoverData]);

  useEffect(() => {
    if (libraryUpdate.phase === "done") {
      reload();
      libraryUpdate.reset();
    } else if (libraryUpdate.phase === "error") {
      setDiscoverFetchError(libraryUpdate.error ?? "Erreur inconnue.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [libraryUpdate.phase]);

  const retryDiscoverFetch = () => {
    discoverFetchTriggered.current = true;
    libraryUpdate.reset();
    triggerDiscoverFetch();
  };

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  useFocusEffect(
    useCallback(() => {
      if (create === "1") {
        setSheet({
          mode: "create",
          draft: {
            id: uid(),
            nameFr: "",
            nameEn: null,
            category: "musculation",
            muscleGroups: [],
            equipment: null,
            description: null,
            imageBase64: null,
            createdAt: new Date().toISOString(),
          },
        });
        router.setParams({ create: undefined } as any);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [create]),
  );

  const equipmentOptions = useMemo(() => {
    const set = new Set<string>();
    for (const c of customExercises) {
      if (c.equipment && c.equipment.trim()) set.add(c.equipment.trim());
    }
    for (const i of items) {
      if (i.equipment && i.equipment.trim()) set.add(i.equipment.trim());
    }
    return Array.from(set).sort();
  }, [customExercises, items]);

  const filtered = useMemo(() => {
    const q = normalizeSearch(query);
    let list: typeof items;
    if (scope === "library") list = items.filter((i) => i.inLibrary);
    else list = items.filter((i) => i.exerciseTier === "collection_only");
    if (scope === "discover" && collectionFilter) {
      list = list.filter((i) => i.collections?.includes(collectionFilter));
    }
    if (tab === "favorites") list = list.filter((i) => i.favorite);
    else if (tab !== "all") list = list.filter((i) => i.category === tab);
    if (tab === "musculation" && muscle) {
      list = list.filter((i) => i.muscleGroups?.includes(muscle));
    }
    if (equipment) list = list.filter((i) => i.equipment === equipment);
    // Insensible aux accents/casse ("developpe" retrouve "Développé") — pas
    // de dépendance nouvelle, même normalisation NFD déjà utilisée ailleurs
    // dans le code (exercise-category.ts, exercise-progress.ts).
    if (q) list = list.filter((i) => normalizeSearch(i.name).includes(q));
    return list.slice().sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [items, scope, collectionFilter, query, tab, muscle, equipment]);

  const exactMatch = filtered.some(
    (i) => normalizeSearch(i.name) === normalizeSearch(query),
  );

  // Catalogue intelligent (Phase 1, POLISH V2) — une recherche non vide en
  // scope "Ma bibliothèque" continue aussi dans les exercices "à découvrir"
  // (collection_only), affichés à part en lignes pleine largeur plutôt que
  // mélangés à la grille officielle (une mini-carte de 164px n'a pas la
  // place pour "Disponible dans : {pack}" + 2 actions).
  const discoverMatches = useMemo(() => {
    const q = normalizeSearch(query);
    if (scope !== "library" || !q) return [];
    let list = items.filter((i) => !isCoreVisible(i.exerciseTier) && !i.inLibrary);
    if (tab === "favorites") list = list.filter((i) => i.favorite);
    else if (tab !== "all") list = list.filter((i) => i.category === tab);
    if (tab === "musculation" && muscle) list = list.filter((i) => i.muscleGroups?.includes(muscle));
    if (equipment) list = list.filter((i) => i.equipment === equipment);
    list = list.filter((i) => normalizeSearch(i.name).includes(q));
    return list.slice(0, 20);
  }, [items, scope, query, tab, muscle, equipment]);

  const scopeCount =
    scope === "library"
      ? items.filter((i) => i.inLibrary).length
      : items.filter((i) => i.exerciseTier === "collection_only").length;

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top"]}
      >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>Bibliothèque</Text>
        <Text style={[styles.subtitle, { color: theme.colors.onSurfaceTertiary }]}>
          {scopeCount} exercice{scopeCount > 1 ? "s" : ""}
          {scope === "library" ? " dans ta bibliothèque" : " à découvrir"}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <View style={{ flex: 1 }}>
          <ExerciseSearchBar value={query} onChange={setQuery} testID="lib-search" />
        </View>
        <PressableScale testID="lib-open-filters" onPress={() => setFilterSheetOpen(true)}>
          <GlassCard
            level="subtle"
            style={[
              styles.filterBtn,
              { borderRadius: theme.radius.md },
              theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
            ]}
          >
            <Ionicons name="options-outline" size={18} color={theme.colors.onSurface} />
            <FilterCountBadge count={activeFilterCount} />
          </GlassCard>
        </PressableScale>
      </View>

      <View style={styles.scopeRow}>
        <View style={{ flex: 1 }}>
          <SegmentedTabRow
            testIDPrefix="lib-scope"
            options={[
              { key: "library", label: "Ma bibliothèque" },
              { key: "discover", label: "Découvrir" },
            ]}
            value={scope}
            onChange={setScope}
          />
        </View>
      </View>

      {scope === "discover" && (
        <GlassCard
          level="subtle"
          style={[
            styles.discoverBanner,
            { borderRadius: theme.radius.md },
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
          ]}
        >
          <Text style={[styles.discoverBannerText, { color: theme.colors.onSurfaceTertiary }]}>
            Ces exercices rejoindront bientôt les Collections téléchargeables IronFlow — tu peux
            déjà les ajouter à ta bibliothèque personnelle.
          </Text>
        </GlassCard>
      )}

      {scope === "discover" && discoverFetchBusy && (
        <View testID="discover-loading" style={styles.discoverStatusRow}>
          <ActivityIndicator size="small" color={theme.colors.brand} />
          <Text style={[styles.discoverStatusText, { color: theme.colors.onSurfaceTertiary }]}>
            Chargement du catalogue complet…
          </Text>
        </View>
      )}
      {scope === "discover" && !discoverFetchBusy && discoverFetchError && (
        <View testID="discover-error" style={styles.discoverStatusRow}>
          <Ionicons name="cloud-offline-outline" size={16} color={theme.colors.onSurfaceTertiary} />
          <Text style={[styles.discoverStatusText, { color: theme.colors.onSurfaceTertiary }]}>
            {discoverFetchError}
          </Text>
          <PressableScale
            testID="discover-retry"
            style={[
              styles.discoverRetryBtn,
              { borderRadius: theme.radius.pill, backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.border },
            ]}
            onPress={retryDiscoverFetch}
          >
            <Text style={[styles.discoverRetryBtnText, { color: theme.colors.brand }]}>Réessayer</Text>
          </PressableScale>
        </View>
      )}

      <FlatList
        // Rejoue la cascade d'apparition à chaque changement de filtre —
        // remount léger (liste déjà virtualisée, peu d'éléments visibles à
        // la fois) plutôt qu'une vraie librairie de transition de liste.
        key={`${scope}-${tab}-${muscle ?? ""}-${equipment ?? ""}-${query}`}
        data={filtered}
        keyExtractor={(i) => i.id}
        numColumns={2}
        columnWrapperStyle={styles.row}
        contentContainerStyle={styles.list}
        initialNumToRender={8}
        maxToRenderPerBatch={8}
        windowSize={7}
        ListHeaderComponent={
          query.trim() && !exactMatch ? (
            <PressableScale
              testID="lib-create-new"
              style={[styles.createRow, { borderRadius: theme.radius.md, borderColor: theme.colors.brand }]}
              onPress={() =>
                setSheet({
                  mode: "create",
                  draft: {
                    id: uid(),
                    nameFr: query.trim(),
                    nameEn: null,
                    category: "musculation",
                    muscleGroups: [],
                    equipment: null,
                    description: null,
                    imageBase64: null,
                    createdAt: new Date().toISOString(),
                  },
                })
              }
            >
              <Ionicons name="add-circle" size={22} color={theme.colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.createRowTitle, { color: theme.colors.onSurface }]}>
                  Créer «{query.trim()}»
                </Text>
                <Text style={[styles.createRowSub, { color: theme.colors.onSurfaceTertiary }]}>
                  Nouvel exercice, absent de la bibliothèque
                </Text>
              </View>
            </PressableScale>
          ) : null
        }
        ListEmptyComponent={
          !query.trim() ? (
            <View>
              <Text style={[styles.emptyText, { color: theme.colors.onSurfaceTertiary }]}>
                {scope === "library"
                  ? tab === "favorites"
                    ? "Aucun exercice favori pour l'instant."
                    : "Ta bibliothèque est encore vide dans cette catégorie."
                  : tab === "favorites"
                    ? "Aucun exercice favori pour l'instant."
                    : "Aucun exercice dans cette catégorie."}
              </Text>
              {scope === "library" && (
                <PressableScale
                  testID="lib-empty-see-discover"
                  style={[
                    styles.emptyCatalogueButton,
                    { borderRadius: theme.radius.pill },
                    theme.card.mode === "glass"
                      ? [
                          { backgroundColor: withAlpha(theme.colors.brand, 18), borderWidth: 1, borderColor: withAlpha(theme.colors.brand, 50) },
                          coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                        ]
                      : { backgroundColor: theme.colors.brand },
                  ]}
                  onPress={() => setScope("discover")}
                >
                  <Text
                    style={[
                      styles.emptyCatalogueButtonText,
                      theme.card.mode === "glass" && { color: theme.colors.brand },
                    ]}
                  >
                    Voir les exercices à découvrir
                  </Text>
                </PressableScale>
              )}
            </View>
          ) : null
        }
        renderItem={({ item, index }) => {
          const card = (
            <ExerciseCard
              testID={`lib-card-${item.name}`}
              item={item}
              onPress={() => router.push(`/exercise-detail/${encodeURIComponent(item.name)}` as any)}
              onToggleFavorite={() => toggleFavorite(item.id)}
              onToggleLibrary={() => toggleLibrary(item.id)}
            />
          );
          const entering = FadeInDown.delay(Math.min(index, 8) * 30).duration(motion.base);
          if (!item.isCustom || !item.customId)
            return (
              <Animated.View entering={entering} style={styles.cardWrap}>
                {card}
              </Animated.View>
            );
          const customId = item.customId;
          return (
            <Animated.View entering={entering} style={styles.cardWrap}>
              <SwipeableRow
                testID={`lib-custom-${customId}`}
                onDelete={async () => {
                  await deleteCustomExercise(customId);
                  reloadCustom();
                }}
                deleteConfirm={{
                  title: "Supprimer cet exercice ?",
                  message: `"${item.name}" sera retiré de ta bibliothèque personnalisée.`,
                  confirmLabel: "SUPPRIMER",
                  destructive: true,
                }}
                onEdit={() => {
                  const full = customExercises.find((c) => c.id === customId);
                  if (full) setSheet({ mode: "edit", draft: full });
                }}
              >
                {card}
              </SwipeableRow>
            </Animated.View>
          );
        }}
        ListFooterComponent={
          discoverMatches.length > 0 ? (
            <View style={styles.discoverSection}>
              <Text style={[styles.discoverSectionTitle, { color: theme.colors.onSurfaceTertiary }]}>
                À découvrir
              </Text>
              {discoverMatches.map((item) => (
                <DiscoverRow
                  key={item.id}
                  item={item}
                  downloading={
                    !!item.collections?.[0] && downloadingCollection === item.collections[0]
                  }
                  onAdd={() => toggleLibrary(item.id)}
                  onDownloadPack={async () => {
                    const pack = item.collections?.[0];
                    if (!pack) return;
                    setDownloadingCollection(pack);
                    await addAllInCollection(pack);
                    setDownloadingCollection(null);
                  }}
                />
              ))}
            </View>
          ) : null
        }
      />

      <FilterSheet visible={filterSheetOpen} onClose={() => setFilterSheetOpen(false)}>
        {scope === "discover" && (
          <>
            <Text style={[styles.filterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Collection</Text>
            <CollectionChipRow
              collection={collectionFilter}
              onChange={setCollectionFilter}
              testIDPrefix="lib-collection"
            />
          </>
        )}
        <Text style={[styles.filterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Catégorie</Text>
        <CategoryTabRow tab={tab} onChange={setTab} testIDPrefix="lib-tab" />
        {tab === "musculation" && (
          <>
            <Text style={[styles.filterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Muscle</Text>
            <MuscleChipRow muscle={muscle} onChange={setMuscle} testIDPrefix="lib-muscle" />
          </>
        )}
        {equipmentOptions.length > 0 && (
          <>
            <Text style={[styles.filterSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>Équipement</Text>
            <EquipmentChipRow
              equipment={equipment}
              options={equipmentOptions}
              onChange={setEquipment}
              testIDPrefix="lib-equipment"
            />
          </>
        )}
      </FilterSheet>

      <NewExerciseSheet
        state={sheet}
        onClose={() => setSheet(null)}
        onSave={async (exercise) => {
          await saveCustomExercise(exercise);
          await reloadCustom();
          setSheet(null);
        }}
        onDelete={
          sheet?.mode === "edit"
            ? async () => {
                await deleteCustomExercise(sheet.draft.id);
                await reloadCustom();
                setSheet(null);
              }
            : undefined
        }
      />
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { fontSize: 22, fontWeight: "800" },
  subtitle: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.sm,
  },
  filterBtn: {
    position: "relative",
    width: 40,
    height: 40,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterSectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginTop: spacing.sm,
    marginBottom: 2,
  },
  scopeRow: {
    flexDirection: "row",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  scopeChip: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 8,
    borderWidth: 1,
  },
  scopeChipText: { fontWeight: "800", fontSize: 13 },
  discoverBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
  },
  discoverBannerText: { fontSize: 12, fontWeight: "600", lineHeight: 17 },
  discoverStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.sm,
  },
  discoverStatusText: { flex: 1, fontSize: 12, fontWeight: "600" },
  discoverRetryBtn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  discoverRetryBtnText: { fontSize: 11, fontWeight: "800" },
  emptyCatalogueButton: {
    alignSelf: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  emptyCatalogueButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  // `justifyContent: "space-between"` + une largeur fixe par carte (au lieu
  // de `flex: 1`) évite qu'une dernière ligne à un seul élément (liste de
  // taille impaire) ne s'étire sur toute la largeur — chaque carte garde
  // exactement la même taille quel que soit le nombre d'exercices affichés.
  // `alignItems:"flex-start"` : les cartes ont désormais une hauteur
  // dynamique (ratio réel du média) — sans ça, Flexbox étire par défaut la
  // carte la plus courte d'une ligne pour égaler la plus haute.
  row: { justifyContent: "space-between", alignItems: "flex-start" },
  cardWrap: { width: "48%", marginBottom: spacing.sm },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: spacing.sm,
  },
  createRowTitle: { fontWeight: "800", fontSize: 14 },
  createRowSub: { fontSize: 11, marginTop: 2 },
  emptyText: {
    textAlign: "center",
    marginTop: spacing.xl,
    fontStyle: "italic",
  },
  discoverSection: { marginTop: spacing.md },
  discoverSectionTitle: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "uppercase",
    marginBottom: spacing.sm,
  },
  discoverRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderWidth: 1,
    borderStyle: "dashed",
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  discoverRowName: { fontWeight: "800", fontSize: 13 },
  discoverRowMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  discoverRowMetaEmoji: { fontSize: 11 },
  discoverRowMetaText: { fontSize: 10, fontWeight: "700" },
  discoverRowPack: { fontSize: 10, fontWeight: "700", marginTop: 3 },
  discoverRowActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  discoverAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  discoverPackBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderWidth: 1,
  },
  discoverPackBtnText: { fontSize: 10, fontWeight: "800" },
});
