import { View, Text, Pressable, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { EXERCISE_CATEGORY_COLOR } from "@/src/utils/exercise-category";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { ExerciseLibraryItem } from "@/src/hooks/useExerciseLibraryItems";

/**
 * Premium exercise card for the Bibliothèque tab — richer and more "aéré"
 * than the compact picker row, so browsing feels like exploring a real
 * library rather than just picking an item for a session.
 */
export default function ExerciseCard({
  item,
  onPress,
  onToggleFavorite,
  onToggleLibrary,
  testID,
}: {
  item: ExerciseLibraryItem;
  onPress: () => void;
  onToggleFavorite: () => void;
  onToggleLibrary?: () => void;
  testID?: string;
}) {
  const color = EXERCISE_CATEGORY_COLOR[item.category];
  const primaryMuscle = item.muscleGroups?.[0]
    ? MUSCLE_GROUPS.find((m) => m.key === item.muscleGroups![0])
    : undefined;

  return (
    <Pressable testID={testID} style={styles.card} onPress={onPress}>
      <View style={styles.topRow}>
        {item.imageBase64 ? (
          <Image
            source={{ uri: `data:image/webp;base64,${item.imageBase64}` }}
            style={styles.thumb}
          />
        ) : (
          <View style={[styles.thumb, styles.thumbFallback, { backgroundColor: color + "26" }]}>
            <Text style={{ fontSize: 24 }}>
              {item.emoji ?? iconEmojiForExercise(item.name, null)}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.count}>
            {item.count > 0
              ? `${item.count} séance${item.count > 1 ? "s" : ""}`
              : "Pas encore pratiqué"}
          </Text>
        </View>
        {onToggleLibrary && !item.inLibrary && (
          <Pressable
            testID={testID ? `${testID}-add-library` : undefined}
            hitSlop={10}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleLibrary();
            }}
          >
            <Ionicons name="add-circle-outline" size={22} color={colors.brand} />
          </Pressable>
        )}
        <Pressable
          testID={testID ? `${testID}-fav` : undefined}
          hitSlop={10}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite();
          }}
        >
          <Ionicons
            name={item.favorite ? "star" : "star-outline"}
            size={20}
            color={item.favorite ? "#FFC107" : colors.onSurfaceTertiary}
          />
        </Pressable>
      </View>

      <View style={styles.metaRow}>
        {primaryMuscle && (
          <View style={styles.metaChip}>
            <Text style={{ fontSize: 11 }}>{primaryMuscle.emoji}</Text>
            <Text style={styles.metaChipText}>{primaryMuscle.label}</Text>
          </View>
        )}
        <View style={styles.metaChip}>
          <Ionicons name="barbell-outline" size={11} color={colors.onSurfaceTertiary} />
          <Text style={styles.metaChipText}>{item.equipment ?? "—"}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  topRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  thumb: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
  },
  thumbFallback: { alignItems: "center", justifyContent: "center" },
  name: { color: colors.onSurface, fontWeight: "800", fontSize: 15, lineHeight: 19 },
  count: { color: colors.onSurfaceTertiary, fontSize: 11, marginTop: 3 },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  metaChipText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" },
});
