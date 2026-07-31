import { View, Text, Image, StyleSheet, ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, withAlpha } from "@/src/theme";
import { EXERCISE_CATEGORY_COLOR } from "@/src/utils/exercise-category";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { EXERCISE_DIFFICULTY_COLOR, EXERCISE_DIFFICULTY_LABEL } from "@/src/utils/exercise-difficulty";
import { ExerciseLibraryItem } from "@/src/hooks/useExerciseLibraryItems";
import { useExerciseMedia } from "@/src/hooks/useExerciseMedia";
import { useDynamicMediaHeight } from "@/src/hooks/useDynamicMediaHeight";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Grid tile for the Bibliothèque tab — "cover art" tile, image/emoji fills
 * an artwork block, name stays on its own line, muscle/équipement sit in
 * small pill "meta chips" below. The artwork height is measured from the
 * media's real aspect ratio (`useDynamicMediaHeight`, shared with the
 * exercise-detail fiche's `ExerciseMediaFrame`) rather than a fixed
 * `aspectRatio`, so it never crops/stretches a non-square asset — matching
 * the fiche's premium rendering instead of diverging from it. Given nearly
 * all current media is square, most tiles land at the same height in
 * practice; only genuinely non-square media grows/shrinks a tile, by
 * design ("ne pas forcer un format unique si cela dégrade le rendu").
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
  // Chaque carte résout sa propre image en autonomie (id -> IronFlow -> WorkoutX
  // -> null) plutôt que de dépendre d'un champ précalculé — voir useExerciseMedia.ts.
  const { uri: mediaUri } = useExerciseMedia(item.isCustom ? null : item.id);
  const mediaSource: ImageSourcePropType | null = mediaUri
    ? { uri: mediaUri }
    : item.imageBase64
      ? { uri: `data:image/webp;base64,${item.imageBase64}` }
      : null;
  // Hauteur mesurée depuis le ratio réel du média (même hook que la fiche
  // exercice) — bornes resserrées pour une colonne de grille plutôt que la
  // pleine largeur de la fiche.
  const { height: artworkHeight, onLayout: onArtworkLayout } = useDynamicMediaHeight(mediaSource, {
    minHeight: 120,
    maxHeight: 220,
  });

  return (
    <PressableScale testID={testID} style={styles.card} onPress={onPress}>
      <View
        style={[
          styles.artwork,
          { height: artworkHeight, borderColor: withAlpha(color, 33), backgroundColor: withAlpha(color, 10) },
        ]}
        onLayout={onArtworkLayout}
      >
        {mediaSource ? (
          <Image source={mediaSource} style={styles.artworkImage} resizeMode="contain" />
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
            size={12}
            color={item.favorite ? "#FFC107" : colors.onSurface}
          />
        </PressableScale>

        {item.difficulty && (
          <View style={styles.diffBadge}>
            <View style={[styles.diffDot, { backgroundColor: EXERCISE_DIFFICULTY_COLOR[item.difficulty] }]} />
            <Text style={styles.diffBadgeText}>{EXERCISE_DIFFICULTY_LABEL[item.difficulty]}</Text>
          </View>
        )}

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
            <Ionicons name="add" size={12} color={colors.onSurface} />
          </PressableScale>
        )}
      </View>

      <Text style={styles.name} numberOfLines={1}>
        {item.name}
      </Text>

      <View style={styles.metaRow}>
        {primaryMuscle && (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipEmoji}>{primaryMuscle.emoji}</Text>
            <Text style={styles.metaChipText} numberOfLines={1}>
              {primaryMuscle.label}
            </Text>
          </View>
        )}
        {item.equipment && (
          <View style={styles.metaChip}>
            <Text style={styles.metaChipText} numberOfLines={1}>
              {item.equipment}
            </Text>
          </View>
        )}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  // Carte compacte façon "cover art" premium : meta en petites puces
  // plutôt qu'une ligne de texte plate, léger relief (shadow.card).
  card: { gap: 4, ...shadow.card },
  artwork: {
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artworkImage: { width: "100%", height: "100%" },
  artworkEmoji: { fontSize: 28 },
  favBadge: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: withAlpha("#000000", 45),
    alignItems: "center",
    justifyContent: "center",
  },
  diffBadge: {
    position: "absolute",
    top: 5,
    left: 5,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: withAlpha("#000000", 55),
  },
  diffDot: { width: 5, height: 5, borderRadius: 2.5 },
  diffBadgeText: { color: colors.onSurface, fontSize: 8, fontWeight: "800" },
  libBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.surface,
  },
  name: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 12,
    lineHeight: 15,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 5,
    paddingVertical: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    flexShrink: 1,
  },
  metaChipEmoji: { fontSize: 9 },
  metaChipText: {
    color: colors.onSurfaceTertiary,
    fontSize: 8.5,
    fontWeight: "700",
  },
});
