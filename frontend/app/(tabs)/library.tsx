import { useCallback, useMemo, useState } from "react";
import { View, Text, StyleSheet, FlatList } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { useExerciseLibraryItems } from "@/src/hooks/useExerciseLibraryItems";
import ExerciseSearchBar from "@/src/components/exercise-library/ExerciseSearchBar";
import {
  CategoryTabRow,
  EquipmentChipRow,
  LibTab,
  MuscleChipRow,
} from "@/src/components/exercise-library/ExerciseFilterChips";
import ExerciseCard from "@/src/components/exercise-library/ExerciseCard";
import SwipeableRow from "@/src/components/SwipeableRow";
import { MuscleGroupKey } from "@/src/utils/muscle-groups";
import { CustomExercise, deleteCustomExercise, saveCustomExercise, uid } from "@/src/utils/gym-storage";
import { NewExerciseSheet } from "@/src/components/ExerciseLibraryPicker";
import PressableScale from "@/src/components/ui/PressableScale";

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

  const { items, customExercises, reload, reloadCustom, toggleFavorite, toggleLibrary } =
    useExerciseLibraryItems(true);
  const [scope, setScope] = useState<"library" | "catalogue">("library");

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
    const q = query.trim().toLowerCase();
    let list = scope === "library" ? items.filter((i) => i.inLibrary) : items;
    if (tab === "favorites") list = list.filter((i) => i.favorite);
    else if (tab !== "all") list = list.filter((i) => i.category === tab);
    if (tab === "musculation" && muscle) {
      list = list.filter((i) => i.muscleGroups?.includes(muscle));
    }
    if (equipment) list = list.filter((i) => i.equipment === equipment);
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    return list.slice().sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [items, scope, query, tab, muscle, equipment]);

  const exactMatch = filtered.some(
    (i) => i.name.toLowerCase().trim() === query.trim().toLowerCase(),
  );

  const scopeCount = scope === "library" ? items.filter((i) => i.inLibrary).length : items.length;

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={styles.header}>
        <Text style={styles.title}>Bibliothèque</Text>
        <Text style={styles.subtitle}>
          {scopeCount} exercice{scopeCount > 1 ? "s" : ""}
          {scope === "library" ? " dans ta bibliothèque" : " au catalogue"}
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
      </View>

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
        renderItem={({ item }) => {
          const card = (
            <ExerciseCard
              testID={`lib-card-${item.name}`}
              item={item}
              onPress={() =>
                router.push(`/exercise-detail/${encodeURIComponent(item.name)}` as any)
              }
              onToggleFavorite={() => toggleFavorite(item.id)}
              onToggleLibrary={() => toggleLibrary(item.id)}
            />
          );
          if (!item.isCustom || !item.customId) return <View style={styles.cardWrap}>{card}</View>;
          const customId = item.customId;
          return (
            <View style={styles.cardWrap}>
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
            </View>
          );
        }}
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
  row: { gap: spacing.sm },
  cardWrap: { flex: 1, marginBottom: spacing.sm },
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
});
