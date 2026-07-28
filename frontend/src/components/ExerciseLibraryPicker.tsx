import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
  ScrollView,
  Image,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  EXERCISE_CATEGORY_COLOR,
  EXERCISE_CATEGORY_ICON,
  EXERCISE_CATEGORY_LABEL,
  ExerciseCategory,
  resolveCategory,
  getOverrides,
} from "@/src/utils/exercise-category";
import { EXERCISE_LIBRARY } from "@/src/data/exercise-library";
import {
  CustomExercise,
  deleteCustomExercise,
  getCustomExercises,
  getFavoriteExercises,
  getSessions,
  saveCustomExercise,
  toggleFavoriteExercise,
  uid,
} from "@/src/utils/gym-storage";
import { listAllExercises } from "@/src/utils/exercise-detail";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { LIBRARY_MUSCLE_GROUPS, MuscleGroupKey } from "@/src/utils/muscle-groups";
import { pickAndCompressImage } from "@/src/utils/image-compress";
import SwipeableRow from "@/src/components/SwipeableRow";

type Item = {
  name: string;
  category: ExerciseCategory;
  emoji?: string;
  count: number;
  favorite: boolean;
  muscleGroups?: MuscleGroupKey[];
  isCustom?: boolean;
  customId?: string;
  imageBase64?: string | null;
};

const CATEGORIES: ExerciseCategory[] = ["musculation", "cardio_machine", "mobility"];

type LibTab = "favorites" | "musculation" | "cardio_machine" | "mobility" | "all";

const TABS: { key: LibTab; label: string; emoji: string }[] = [
  { key: "favorites", label: "Favoris", emoji: "⭐" },
  { key: "musculation", label: "Musculation", emoji: "💪" },
  { key: "cardio_machine", label: "Cardio", emoji: "🏃" },
  { key: "mobility", label: "Étirements", emoji: "🧘" },
  { key: "all", label: "Tous", emoji: "📋" },
];

/**
 * Exercise picker sourced from the same data as Progression → Exercices
 * (the built-in library plus every exercise the user has actually logged),
 * with instant search, favorites, and a quick "create new" fallback.
 */
export default function ExerciseLibraryPicker({
  visible,
  onClose,
  onPick,
}: {
  visible: boolean;
  onClose: () => void;
  onPick: (name: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [favorites, setFavorites] = useState<string[]>([]);
  const [used, setUsed] = useState<{ name: string; count: number }[]>([]);
  const [tab, setTab] = useState<LibTab>("all");
  const [muscle, setMuscle] = useState<MuscleGroupKey | null>(null);
  const [customExercises, setCustomExercises] = useState<CustomExercise[]>([]);
  const [sheet, setSheet] = useState<{ mode: "create" | "edit"; draft: CustomExercise } | null>(
    null,
  );

  const reloadCustom = async () => setCustomExercises(await getCustomExercises());

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setTab("all");
    setMuscle(null);
    (async () => {
      const [favs, sessions, overrides, customs] = await Promise.all([
        getFavoriteExercises(),
        getSessions(),
        getOverrides(),
        getCustomExercises(),
      ]);
      setFavorites(favs);
      setUsed(listAllExercises(sessions));
      // stash overrides on the module-level closure via state below
      setOverridesState(overrides);
      setCustomExercises(customs);
    })();
  }, [visible]);

  const [overridesState, setOverridesState] = useState<Record<string, ExerciseCategory>>({});

  const items = useMemo<Item[]>(() => {
    const favSet = new Set(favorites.map((f) => f.toLowerCase().trim()));
    const merged: Item[] = [];
    const seen = new Set<string>();
    for (const c of customExercises) {
      const key = c.nameFr.toLowerCase().trim();
      seen.add(key);
      const done = used.find((u) => u.name.toLowerCase().trim() === key);
      merged.push({
        name: c.nameFr,
        category: c.category,
        count: done?.count ?? 0,
        favorite: favSet.has(key),
        muscleGroups: c.muscleGroups,
        isCustom: true,
        customId: c.id,
        imageBase64: c.imageBase64,
      });
    }
    for (const lib of EXERCISE_LIBRARY) {
      const key = lib.name.toLowerCase().trim();
      if (seen.has(key)) continue;
      seen.add(key);
      const done = used.find((u) => u.name.toLowerCase().trim() === key);
      merged.push({
        name: lib.name,
        category: lib.category,
        emoji: lib.emoji,
        count: done?.count ?? 0,
        favorite: favSet.has(key),
        muscleGroups: lib.muscleGroups,
      });
    }
    for (const u of used) {
      const key = u.name.toLowerCase().trim();
      if (seen.has(key)) continue;
      merged.push({
        name: u.name,
        category: resolveCategory(u.name, overridesState),
        count: u.count,
        favorite: favSet.has(key),
      });
    }
    return merged;
  }, [favorites, used, overridesState, customExercises]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (tab === "favorites") list = list.filter((i) => i.favorite);
    else if (tab !== "all") list = list.filter((i) => i.category === tab);
    if (tab === "musculation" && muscle) {
      list = list.filter((i) => i.muscleGroups?.includes(muscle));
    }
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    return list.slice().sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [items, query, tab, muscle]);

  const exactMatch = filtered.some(
    (i) => i.name.toLowerCase().trim() === query.trim().toLowerCase(),
  );

  async function onToggleFavorite(name: string) {
    const next = await toggleFavoriteExercise(name);
    setFavorites(next);
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable testID="close-ex-library" onPress={onClose} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Bibliothèque d&apos;exercices</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.searchRow}>
          <Ionicons name="search" size={16} color={colors.onSurfaceTertiary} />
          <TextInput
            testID="ex-library-search"
            style={styles.searchInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Rechercher un exercice…"
            placeholderTextColor={colors.onSurfaceTertiary}
            autoFocus
          />
          {query.length > 0 && (
            <Pressable onPress={() => setQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.onSurfaceTertiary} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ maxHeight: 42 }}
          contentContainerStyle={styles.tabRow}
        >
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <Pressable
                key={t.key}
                testID={`ex-library-tab-${t.key}`}
                style={[styles.tabChip, active && styles.tabChipActive]}
                onPress={() => setTab(t.key)}
              >
                <Text style={styles.tabEmoji}>{t.emoji}</Text>
                <Text style={[styles.tabChipText, active && { color: "#fff" }]}>
                  {t.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {tab === "musculation" && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={{ maxHeight: 38 }}
            contentContainerStyle={styles.tabRow}
          >
            <Pressable
              testID="ex-library-muscle-all"
              style={[styles.muscleChip, !muscle && styles.muscleChipActive]}
              onPress={() => setMuscle(null)}
            >
              <Text style={[styles.muscleChipText, !muscle && { color: "#fff" }]}>
                Tous
              </Text>
            </Pressable>
            {LIBRARY_MUSCLE_GROUPS.map((mg) => {
              const active = muscle === mg.key;
              return (
                <Pressable
                  key={mg.key}
                  testID={`ex-library-muscle-${mg.key}`}
                  style={[styles.muscleChip, active && styles.muscleChipActive]}
                  onPress={() => setMuscle(active ? null : mg.key)}
                >
                  <Text style={styles.tabEmoji}>{mg.emoji}</Text>
                  <Text style={[styles.muscleChipText, active && { color: "#fff" }]}>
                    {mg.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        <FlatList
          data={filtered}
          keyExtractor={(i) => i.name}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          ListHeaderComponent={
            query.trim() && !exactMatch ? (
              <Pressable
                testID="ex-library-create-new"
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
                  <Text style={styles.createRowTitle}>
                    Créer «{query.trim()}»
                  </Text>
                  <Text style={styles.createRowSub}>
                    Nouvel exercice, absent de la bibliothèque
                  </Text>
                </View>
              </Pressable>
            ) : null
          }
          ListEmptyComponent={
            !query.trim() ? (
              <Text style={styles.emptyText}>
                {tab === "favorites"
                  ? "Aucun exercice favori pour l'instant."
                  : "Aucun exercice dans cette catégorie."}
              </Text>
            ) : null
          }
          renderItem={({ item }) => {
            const color = EXERCISE_CATEGORY_COLOR[item.category];
            const row = (
              <Pressable
                testID={`ex-library-item-${item.name}`}
                style={styles.row}
                onPress={() => onPick(item.name)}
              >
                {item.imageBase64 ? (
                  <Image
                    source={{ uri: `data:image/webp;base64,${item.imageBase64}` }}
                    style={styles.rowImage}
                  />
                ) : (
                  <View style={[styles.rowIcon, { backgroundColor: color + "26" }]}>
                    {item.emoji ? (
                      <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                    ) : (
                      <Text style={{ fontSize: 16 }}>
                        {iconEmojiForExercise(item.name, null)}
                      </Text>
                    )}
                  </View>
                )}
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowTitle} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <Text style={styles.rowSub}>
                    {item.count > 0
                      ? `${item.count} séance${item.count > 1 ? "s" : ""}`
                      : "Pas encore pratiqué"}
                  </Text>
                </View>
                <Pressable
                  testID={`ex-library-fav-${item.name}`}
                  hitSlop={10}
                  onPress={(e) => {
                    e.stopPropagation?.();
                    onToggleFavorite(item.name);
                  }}
                  style={styles.favBtn}
                >
                  <Ionicons
                    name={item.favorite ? "star" : "star-outline"}
                    size={18}
                    color={item.favorite ? "#FFC107" : colors.onSurfaceTertiary}
                  />
                </Pressable>
              </Pressable>
            );

            if (!item.isCustom || !item.customId) return row;
            const customId = item.customId;
            return (
              <SwipeableRow
                testID={`ex-library-custom-${customId}`}
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
                {row}
              </SwipeableRow>
            );
          }}
        />
      </View>

      <NewExerciseSheet
        state={sheet}
        onClose={() => setSheet(null)}
        onSave={async (exercise) => {
          await saveCustomExercise(exercise);
          await reloadCustom();
          setSheet(null);
          if (sheet?.mode === "create") onPick(exercise.nameFr);
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
    </Modal>
  );
}

export function NewExerciseSheet({
  state,
  onClose,
  onSave,
  onDelete,
}: {
  state: { mode: "create" | "edit"; draft: CustomExercise } | null;
  onClose: () => void;
  onSave: (e: CustomExercise) => void;
  onDelete?: () => void;
}) {
  const [draft, setDraft] = useState<CustomExercise | null>(null);

  useEffect(() => {
    if (state) setDraft(state.draft);
  }, [state]);

  if (!state || !draft) return null;

  const set = <K extends keyof CustomExercise>(k: K, v: CustomExercise[K]) =>
    setDraft((prev) => (prev ? { ...prev, [k]: v } : prev));

  const toggleMuscle = (key: MuscleGroupKey) => {
    const cur = draft.muscleGroups ?? [];
    set("muscleGroups", cur.includes(key) ? cur.filter((m) => m !== key) : [...cur, key]);
  };

  const pickImage = async (source: "camera" | "library") => {
    const base64 = await pickAndCompressImage(source);
    if (base64) set("imageBase64", base64);
  };

  return (
    <Modal
      visible={!!state}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <ScrollView style={styles.sheet} contentContainerStyle={{ gap: spacing.sm }}>
            <View style={styles.sheetHandle} />
            <Text style={styles.sheetTitle}>
              {state.mode === "create" ? "Nouvel exercice" : "Modifier l'exercice"}
            </Text>

            <Text style={styles.miniLabel}>Nom (français)</Text>
            <TextInput
              testID="new-ex-name-fr"
              style={styles.input}
              value={draft.nameFr}
              onChangeText={(t) => set("nameFr", t)}
              placeholder="Ex: Développé incliné haltères"
              placeholderTextColor={colors.onSurfaceTertiary}
            />

            <Text style={styles.miniLabel}>Nom (anglais, optionnel)</Text>
            <TextInput
              testID="new-ex-name-en"
              style={styles.input}
              value={draft.nameEn ?? ""}
              onChangeText={(t) => set("nameEn", t || null)}
              placeholder="Ex: Incline Dumbbell Press"
              placeholderTextColor={colors.onSurfaceTertiary}
            />

            <Text style={styles.miniLabel}>Catégorie</Text>
            <View style={styles.chipWrap}>
              {CATEGORIES.map((c) => {
                const active = draft.category === c;
                return (
                  <Pressable
                    key={c}
                    testID={`new-ex-cat-${c}`}
                    style={[styles.tabChip, active && styles.tabChipActive]}
                    onPress={() => set("category", c)}
                  >
                    <Ionicons
                      name={EXERCISE_CATEGORY_ICON[c]}
                      size={12}
                      color={active ? "#fff" : EXERCISE_CATEGORY_COLOR[c]}
                    />
                    <Text style={[styles.tabChipText, active && { color: "#fff" }]}>
                      {EXERCISE_CATEGORY_LABEL[c]}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.miniLabel}>Groupes musculaires</Text>
            <View style={styles.chipWrap}>
              {LIBRARY_MUSCLE_GROUPS.map((mg) => {
                const active = (draft.muscleGroups ?? []).includes(mg.key);
                return (
                  <Pressable
                    key={mg.key}
                    testID={`new-ex-muscle-${mg.key}`}
                    style={[styles.muscleChip, active && styles.muscleChipActive]}
                    onPress={() => toggleMuscle(mg.key)}
                  >
                    <Text style={styles.tabEmoji}>{mg.emoji}</Text>
                    <Text style={[styles.muscleChipText, active && { color: "#fff" }]}>
                      {mg.label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            <Text style={styles.miniLabel}>Matériel (optionnel)</Text>
            <TextInput
              testID="new-ex-equipment"
              style={styles.input}
              value={draft.equipment ?? ""}
              onChangeText={(t) => set("equipment", t || null)}
              placeholder="Ex: Haltères, banc incliné"
              placeholderTextColor={colors.onSurfaceTertiary}
            />

            <Text style={styles.miniLabel}>Description (optionnel)</Text>
            <TextInput
              testID="new-ex-description"
              style={[styles.input, { minHeight: 70, textAlignVertical: "top" }]}
              value={draft.description ?? ""}
              onChangeText={(t) => set("description", t || null)}
              placeholder="Consignes, points de repère…"
              placeholderTextColor={colors.onSurfaceTertiary}
              multiline
            />

            <Text style={styles.miniLabel}>Photo (optionnel)</Text>
            {draft.imageBase64 ? (
              <View style={styles.imagePreviewWrap}>
                <Image
                  source={{ uri: `data:image/webp;base64,${draft.imageBase64}` }}
                  style={styles.imagePreview}
                />
                <Pressable
                  testID="new-ex-image-remove"
                  style={styles.imageRemoveBtn}
                  onPress={() => set("imageBase64", null)}
                >
                  <Ionicons name="trash" size={14} color={colors.error} />
                  <Text style={{ color: colors.error, fontWeight: "700", fontSize: 11 }}>
                    Retirer
                  </Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.photoRow}>
                <Pressable
                  testID="new-ex-photo-camera"
                  style={styles.photoBtn}
                  onPress={() => pickImage("camera")}
                >
                  <Ionicons name="camera" size={16} color={colors.brand} />
                  <Text style={styles.photoBtnText}>Caméra</Text>
                </Pressable>
                <Pressable
                  testID="new-ex-photo-library"
                  style={styles.photoBtn}
                  onPress={() => pickImage("library")}
                >
                  <Ionicons name="images" size={16} color={colors.brand} />
                  <Text style={styles.photoBtnText}>Galerie</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.sheetActions}>
              {onDelete && (
                <Pressable testID="new-ex-delete" style={styles.deleteBtn} onPress={onDelete}>
                  <Ionicons name="trash" size={16} color={colors.error} />
                  <Text style={styles.deleteBtnText}>Supprimer</Text>
                </Pressable>
              )}
              <Pressable
                testID="new-ex-save"
                style={[styles.saveBtn, { flex: onDelete ? 1 : undefined }]}
                onPress={() => draft.nameFr.trim() && onSave({ ...draft, nameFr: draft.nameFr.trim() })}
              >
                <Text style={styles.saveBtnText}>ENREGISTRER</Text>
              </Pressable>
            </View>
            <View style={{ height: 24 }} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  title: { color: colors.onSurface, fontSize: 16, fontWeight: "700" },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    margin: spacing.lg,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: spacing.md,
  },
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    color: colors.onSurface,
    fontSize: 14,
  },
  tabRow: {
    flexDirection: "row",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.sm,
  },
  tabChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tabChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  tabEmoji: { fontSize: 12 },
  tabChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  muscleChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  muscleChipText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 10,
  },
  list: { paddingHorizontal: spacing.lg, paddingBottom: 40, gap: 8 },
  createRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    marginBottom: 8,
  },
  createRowTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 14 },
  createRowSub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  rowTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 14 },
  rowSub: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 2 },
  favBtn: { padding: 4 },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: spacing.xl,
    fontStyle: "italic",
  },
  rowImage: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
  },
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "88%",
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  sheetTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "800",
  },
  miniLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "700",
    marginTop: 4,
  },
  input: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
    fontWeight: "600",
  },
  chipWrap: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  photoRow: { flexDirection: "row", gap: spacing.sm },
  photoBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1.5,
    borderColor: colors.brand,
    borderStyle: "dashed",
    backgroundColor: colors.surfaceTertiary,
  },
  photoBtnText: { color: colors.brand, fontWeight: "800", fontSize: 12 },
  imagePreviewWrap: { alignItems: "center", gap: 8 },
  imagePreview: {
    width: 140,
    height: 140,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  imageRemoveBtn: { flexDirection: "row", alignItems: "center", gap: 4 },
  sheetActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
  },
  deleteBtnText: { color: colors.error, fontWeight: "700", fontSize: 13 },
  saveBtn: {
    flex: 1,
    backgroundColor: colors.brand,
    padding: 14,
    borderRadius: radius.md,
    alignItems: "center",
  },
  saveBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
});
