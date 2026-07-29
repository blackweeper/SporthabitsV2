import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { EXERCISE_CATEGORY_COLOR } from "@/src/utils/exercise-category";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { ExerciseLibraryItem } from "@/src/hooks/useExerciseLibraryItems";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Grid tile for the Bibliothèque tab — image/emoji fills the tile like a
 * cover art, name + meta below. Deliberately not a compact row (that's what
 * the mid-workout picker uses): browsing the library should feel like a
 * visual catalogue, not a data list.
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
    <PressableScale testID={testID} style={styles.card} onPress={onPress}>
      <View style={[styles.artwork, { borderColor: `${color}55`, backgroundColor: `${color}1A` }]}>
        {item.imageBase64 ? (
          <Image
            source={{ uri: `data:image/webp;base64,${item.imageBase64}` }}
            style={styles.artworkImage}
          />
        ) : (
          <Text style={styles.artworkEmoji}>
            {item.emoji ?? iconEmojiForExercise(item.name, null)}
          </Text>
        )}

        <PressableScale
          testID={testID ? `${testID}-fav` : undefined}
          hitSlop={8}
          style={styles.favBadge}
          onPress={(e) => {
            e.stopPropagation?.();
            onToggleFavorite();
          }}
        >
          <Ionicons
            name={item.favorite ? "star" : "star-outline"}
            size={15}
            color={item.favorite ? "#FFC107" : "#fff"}
          />
        </PressableScale>

        {onToggleLibrary && !item.inLibrary && (
          <PressableScale
            testID={testID ? `${testID}-add-library` : undefined}
            hitSlop={8}
            style={[styles.libBadge, { backgroundColor: colors.brand }]}
            onPress={(e) => {
              e.stopPropagation?.();
              onToggleLibrary();
            }}
          >
            <Ionicons name="add" size={14} color="#fff" />
          </PressableScale>
        )}
      </View>

      <Text style={styles.name} numberOfLines={2}>
        {item.name}
      </Text>

      <View style={styles.metaRow}>
        {primaryMuscle && <Text style={styles.metaEmoji}>{primaryMuscle.emoji}</Text>}
        <Text style={styles.metaText} numberOfLines={1}>
          {item.equipment ?? (item.count > 0 ? `${item.count}×` : "Nouveau")}
        </Text>
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: { gap: 6 },
  artwork: {
    aspectRatio: 1,
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artworkImage: { width: "100%", height: "100%" },
  artworkEmoji: { fontSize: 40 },
  favBadge: {
    position: "absolute",
    top: 6,
    right: 6,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "rgba(0,0,0,0.45)",
    alignItems: "center",
    justifyContent: "center",
  },
  libBadge: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
    lineHeight: 17,
    minHeight: 34,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaEmoji: { fontSize: 11 },
  metaText: {
    flex: 1,
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
  },
});
