import { useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  Pressable,
  TextInput,
  FlatList,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  EXERCISE_CATEGORY_COLOR,
  EXERCISE_CATEGORY_ICON,
  ExerciseCategory,
  resolveCategory,
  getOverrides,
} from "@/src/utils/exercise-category";
import { EXERCISE_LIBRARY } from "@/src/data/exercise-library";
import {
  getFavoriteExercises,
  getSessions,
  toggleFavoriteExercise,
} from "@/src/utils/gym-storage";
import { listAllExercises } from "@/src/utils/exercise-detail";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";

type Item = {
  name: string;
  category: ExerciseCategory;
  emoji?: string;
  count: number;
  favorite: boolean;
};

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
  const [onlyFavorites, setOnlyFavorites] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setQuery("");
    setOnlyFavorites(false);
    (async () => {
      const [favs, sessions, overrides] = await Promise.all([
        getFavoriteExercises(),
        getSessions(),
        getOverrides(),
      ]);
      setFavorites(favs);
      setUsed(listAllExercises(sessions));
      // stash overrides on the module-level closure via state below
      setOverridesState(overrides);
    })();
  }, [visible]);

  const [overridesState, setOverridesState] = useState<Record<string, ExerciseCategory>>({});

  const items = useMemo<Item[]>(() => {
    const favSet = new Set(favorites.map((f) => f.toLowerCase().trim()));
    const merged: Item[] = [];
    const seen = new Set<string>();
    for (const lib of EXERCISE_LIBRARY) {
      const key = lib.name.toLowerCase().trim();
      seen.add(key);
      const done = used.find((u) => u.name.toLowerCase().trim() === key);
      merged.push({
        name: lib.name,
        category: lib.category,
        emoji: lib.emoji,
        count: done?.count ?? 0,
        favorite: favSet.has(key),
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
  }, [favorites, used, overridesState]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = items;
    if (onlyFavorites) list = list.filter((i) => i.favorite);
    if (q) list = list.filter((i) => i.name.toLowerCase().includes(q));
    return list.slice().sort((a, b) => {
      if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });
  }, [items, query, onlyFavorites]);

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

        <Pressable
          testID="ex-library-favorites-toggle"
          style={[styles.favToggle, onlyFavorites && styles.favToggleActive]}
          onPress={() => setOnlyFavorites((v) => !v)}
        >
          <Ionicons
            name={onlyFavorites ? "star" : "star-outline"}
            size={13}
            color={onlyFavorites ? "#fff" : colors.onSurfaceTertiary}
          />
          <Text style={[styles.favToggleText, onlyFavorites && { color: "#fff" }]}>
            FAVORIS
          </Text>
        </Pressable>

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
                onPress={() => onPick(query.trim())}
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
              <Text style={styles.emptyText}>Aucun exercice favori pour l&apos;instant.</Text>
            ) : null
          }
          renderItem={({ item }) => {
            const color = EXERCISE_CATEGORY_COLOR[item.category];
            return (
              <Pressable
                testID={`ex-library-item-${item.name}`}
                style={styles.row}
                onPress={() => onPick(item.name)}
              >
                <View style={[styles.rowIcon, { backgroundColor: color + "26" }]}>
                  {item.emoji ? (
                    <Text style={{ fontSize: 16 }}>{item.emoji}</Text>
                  ) : (
                    <Text style={{ fontSize: 16 }}>
                      {iconEmojiForExercise(item.name, null)}
                    </Text>
                  )}
                </View>
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
          }}
        />
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
  favToggle: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  favToggleActive: { backgroundColor: "#FFC107", borderColor: "#FFC107" },
  favToggleText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
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
});
