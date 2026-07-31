import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, motion, radius, spacing } from "@/src/theme";
import { useExerciseLibraryItems } from "@/src/hooks/useExerciseLibraryItems";
import ExerciseSearchBar from "@/src/components/exercise-library/ExerciseSearchBar";
import {
  CategoryTabRow,
  CollectionChipRow,
  EquipmentChipRow,
  LibTab,
  MuscleChipRow,
} from "@/src/components/exercise-library/ExerciseFilterChips";
import ExerciseCard from "@/src/components/exercise-library/ExerciseCard";
import SwipeableRow from "@/src/components/SwipeableRow";
import { MuscleGroupKey } from "@/src/utils/muscle-groups";
import { CustomExercise, deleteCustomExercise, saveCustomExercise, uid } from "@/src/utils/gym-storage";
import { NewExerciseSheet } from "@/src/components/ExerciseLibraryPicker";
import ExerciseQuickViewSheet from "@/src/components/exercise-library/ExerciseQuickViewSheet";
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
  const primaryMuscle = item.muscleGroups?.[0]
    ? MUSCLE_GROUPS.find((m) => m.key === item.muscleGroups![0])
    : undefined;
  const pack = item.collections?.[0];
  return (
    <View style={styles.discoverRow}>
      <View style={{ flex: 1 }}>
        <Text style={styles.discoverRowName} numberOfLines={1}>
          {item.name}
        </Text>
        <View style={styles.discoverRowMeta}>
          {primaryMuscle && <Text style={styles.discoverRowMetaEmoji}>{primaryMuscle.emoji}</Text>}
          {item.difficulty && (
            <Text style={styles.discoverRowMetaText}>{EXERCISE_DIFFICULTY_LABEL[item.difficulty]}</Text>
          )}
        </View>
        {pack && (
          <Text style={styles.discoverRowPack}>
            Disponible dans : {FUTURE_COLLECTION_LABEL[pack]}
          </Text>
        )}
      </View>
      <View style={styles.discoverRowActions}>
        <PressableScale
          testID={`lib-discover-add-${item.id}`}
          style={styles.discoverAddBtn}
          onPress={onAdd}
        >
          <Ionicons name="add" size={16} color={colors.onSurface} />
        </PressableScale>
        {pack && (
          <PressableScale
            testID={`lib-discover-pack-${item.id}`}
            style={styles.discoverPackBtn}
            onPress={onDownloadPack}
            disabled={downloading}
          >
            <Text style={styles.discoverPackBtnText}>
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
  const router = useRouter();
  const { create } = useLocalSearchParams<{ create?: string }>();
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<LibTab>("all");
  const [muscle, setMuscle] = useState<MuscleGroupKey | null>(null);
  const [equipment, setEquipment] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ mode: "create" | "edit"; draft: CustomExercise } | null>(
    null,
  );
  const [quickView, setQuickView] = useState<ExerciseLibraryItem | null>(null);

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
  const [scope, setScope] = useState<"library" | "catalogue" | "discover">("library");
  const [collectionFilter, setCollectionFilter] = useState<FutureCollection | null>(null);

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
    else if (scope === "discover") list = items.filter((i) => i.exerciseTier === "collection_only");
    else list = items.filter((i) => isCoreVisible(i.exerciseTier));
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
  // scope Catalogue continue aussi dans les exercices "à découvrir"
  // (collection_only), affichés à part en lignes pleine largeur plutôt que
  // mélangés à la grille officielle (une mini-carte de 164px n'a pas la
  // place pour "Disponible dans : {pack}" + 2 actions).
  const discoverMatches = useMemo(() => {
    const q = normalizeSearch(query);
    if (scope !== "catalogue" || !q) return [];
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
      : scope === "discover"
        ? items.filter((i) => i.exerciseTier === "collection_only").length
        : items.filter((i) => isCoreVisible(i.exerciseTier)).length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bibliothèque</Text>
        <Text style={styles.subtitle}>
          {scopeCount} exercice{scopeCount > 1 ? "s" : ""}
          {scope === "library"
            ? " dans ta bibliothèque"
            : scope === "discover"
              ? " à découvrir"
              : " au catalogue"}
        </Text>
      </View>

      <View style={styles.searchWrap}>
        <ExerciseSearchBar value={query} onChange={setQuery} testID="lib-search" />
      </View>

      <View style={styles.scopeRow}>
        <PressableScale
          testID="lib-scope-library"
          style={[styles.scopeChip, scope === "library" && styles.scopeChipActive]}
          onPress={() => setScope("library")}
        >
          <Text style={[styles.scopeChipText, scope === "library" && styles.scopeChipTextActive]}>
            Ma bibliothèque
          </Text>
        </PressableScale>
        <PressableScale
          testID="lib-scope-catalogue"
          style={[styles.scopeChip, scope === "catalogue" && styles.scopeChipActive]}
          onPress={() => setScope("catalogue")}
        >
          <Text
            style={[styles.scopeChipText, scope === "catalogue" && styles.scopeChipTextActive]}
          >
            Catalogue
          </Text>
        </PressableScale>
        <PressableScale
          testID="lib-scope-discover"
          style={[styles.scopeChip, scope === "discover" && styles.scopeChipActive]}
          onPress={() => setScope("discover")}
        >
          <Text style={[styles.scopeChipText, scope === "discover" && styles.scopeChipTextActive]}>
            Découvrir
          </Text>
        </PressableScale>
      </View>

      {scope === "discover" && (
        <View style={styles.discoverBanner}>
          <Text style={styles.discoverBannerText}>
            Ces exercices rejoindront bientôt les Collections téléchargeables IronFlow — tu peux
            déjà les ajouter à ta bibliothèque personnelle.
          </Text>
        </View>
      )}
      {scope === "discover" && (
        <CollectionChipRow
          collection={collectionFilter}
          onChange={setCollectionFilter}
          testIDPrefix="lib-collection"
        />
      )}

      <CategoryTabRow tab={tab} onChange={setTab} testIDPrefix="lib-tab" />
      {tab === "musculation" && (
        <MuscleChipRow muscle={muscle} onChange={setMuscle} testIDPrefix="lib-muscle" />
      )}
      <EquipmentChipRow
        equipment={equipment}
        options={equipmentOptions}
        onChange={setEquipment}
        testIDPrefix="lib-equipment"
      />

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
        ListHeaderComponent={
          query.trim() && !exactMatch ? (
            <PressableScale
              testID="lib-create-new"
              style={styles.createRow}
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
              <Ionicons name="add-circle" size={22} color={colors.brand} />
              <View style={{ flex: 1 }}>
                <Text style={styles.createRowTitle}>Créer «{query.trim()}»</Text>
                <Text style={styles.createRowSub}>Nouvel exercice, absent de la bibliothèque</Text>
              </View>
            </PressableScale>
          ) : null
        }
        ListEmptyComponent={
          !query.trim() ? (
            <View>
              <Text style={styles.emptyText}>
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
                  testID="lib-empty-see-catalogue"
                  style={styles.emptyCatalogueButton}
                  onPress={() => setScope("catalogue")}
                >
                  <Text style={styles.emptyCatalogueButtonText}>Voir le catalogue IronFlow</Text>
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
              onPress={() => setQuickView(item)}
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
              <Text style={styles.discoverSectionTitle}>À découvrir</Text>
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

      <ExerciseQuickViewSheet
        item={quickView}
        onClose={() => setQuickView(null)}
        onAddToLibrary={() => {
          if (!quickView) return;
          toggleLibrary(quickView.id);
          // Reflet optimiste local — la sheet reste ouverte et le bouton
          // devient "Ajouté ✓" sans attendre le prochain reload() de la liste
          // (quickView est un instantané de l'item au moment de l'ouverture).
          setQuickView((prev) => (prev ? { ...prev, inLibrary: true } : null));
        }}
        onViewFullDetail={() => {
          if (!quickView) return;
          const name = quickView.name;
          setQuickView(null);
          router.push(`/exercise-detail/${encodeURIComponent(name)}` as any);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
  },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  subtitle: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "600", marginTop: 2 },
  searchWrap: { paddingHorizontal: spacing.lg, marginBottom: spacing.sm },
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
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scopeChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  scopeChipText: { color: colors.onSurfaceTertiary, fontWeight: "800", fontSize: 13 },
  scopeChipTextActive: { color: "#fff" },
  discoverBanner: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  discoverBannerText: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "600", lineHeight: 17 },
  emptyCatalogueButton: {
    alignSelf: "center",
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: colors.brand,
  },
  emptyCatalogueButtonText: { color: "#fff", fontWeight: "800", fontSize: 13 },
  list: { padding: spacing.lg, paddingTop: spacing.sm },
  // `justifyContent: "space-between"` + une largeur fixe par carte (au lieu
  // de `flex: 1`) évite qu'une dernière ligne à un seul élément (liste de
  // taille impaire) ne s'étire sur toute la largeur — chaque carte garde
  // exactement la même taille quel que soit le nombre d'exercices affichés.
  row: { justifyContent: "space-between" },
  cardWrap: { width: "48%", marginBottom: spacing.sm },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    marginBottom: spacing.sm,
  },
  createRowTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  createRowSub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: spacing.xl,
    fontStyle: "italic",
  },
  discoverSection: { marginTop: spacing.md },
  discoverSectionTitle: {
    color: colors.onSurfaceTertiary,
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
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  discoverRowName: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  discoverRowMeta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 2 },
  discoverRowMetaEmoji: { fontSize: 11 },
  discoverRowMetaText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" },
  discoverRowPack: { color: colors.info, fontSize: 10, fontWeight: "700", marginTop: 3 },
  discoverRowActions: { flexDirection: "row", alignItems: "center", gap: spacing.xs },
  discoverAddBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.brand,
  },
  discoverPackBtn: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.brand,
  },
  discoverPackBtnText: { color: colors.brand, fontSize: 10, fontWeight: "800" },
});
