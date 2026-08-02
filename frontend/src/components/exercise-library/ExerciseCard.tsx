import { useState } from "react";
import { View, Text, Image, StyleSheet, ImageSourcePropType } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, shadow, withAlpha } from "@/src/theme";
import { EXERCISE_CATEGORY_COLOR } from "@/src/utils/exercise-category";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { EXERCISE_DIFFICULTY_COLOR, EXERCISE_DIFFICULTY_LABEL } from "@/src/utils/exercise-difficulty";
import { ExerciseLibraryItem } from "@/src/hooks/useExerciseLibraryItems";
import { useExerciseMediaSources } from "@/src/hooks/useExerciseMedia";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Grid tile for the Bibliothèque tab — "cover art" tile, image/emoji fills
 * a square artwork block, name stays on its own line, muscle/équipement sit
 * in small pill "meta chips" below. The artwork is a fixed square
 * (`aspectRatio: 1`) rather than a dynamic ratio — a deliberate choice for
 * this grid specifically (the fiche's `ExerciseMediaFrame` keeps its
 * adaptive ratio): a uniform grid reads as more premium than one with
 * varying tile heights, and `resizeMode="contain"` still guarantees no
 * crop/stretch for non-square media (it just letterboxes within the square
 * instead of growing/shrinking the tile).
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
  // Chaque carte résout ses deux médias en parallèle (illustration/GIF)
  // plutôt que de dépendre d'un champ précalculé — voir useExerciseMedia.ts.
  // Photo par défaut : illustration IronFlow en priorité, sinon bascule
  // AUTOMATIQUEMENT sur le GIF WorkoutX temporaire (même règle que partout
  // ailleurs dans l'app via useExerciseMedia() — ExerciseCard était la seule
  // exception où ce fallback nécessitait un tap manuel, corrigé ici). Le
  // bouton de bascule n'a de sens que s'il y a un vrai choix entre les deux
  // (les deux existent) ; si seul le GIF WorkoutX existe, il est déjà
  // affiché par défaut, rien à basculer.
  const { ironflowUri, workoutxUri } = useExerciseMediaSources(item.isCustom ? null : item.id);
  const [mediaMode, setMediaMode] = useState<"photo" | "gif">("photo");
  const photoSource: ImageSourcePropType | null = ironflowUri
    ? { uri: ironflowUri }
    : workoutxUri
      ? { uri: workoutxUri }
      : item.imageBase64
        ? { uri: `data:image/webp;base64,${item.imageBase64}` }
        : null;
  const canToggleGif = !!ironflowUri && !!workoutxUri;
  const mediaSource: ImageSourcePropType | null =
    mediaMode === "gif" && canToggleGif ? { uri: workoutxUri } : photoSource;

  return (
    <PressableScale testID={testID} style={styles.card} onPress={onPress}>
      <View
        style={[
          styles.artwork,
          { borderColor: withAlpha(color, 33), backgroundColor: withAlpha(color, 10) },
        ]}
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

        {canToggleGif && (
          <PressableScale
            testID={testID ? `${testID}-gif-toggle` : undefined}
            hitSlop={8}
            style={[styles.gifBadge, mediaMode === "gif" && { backgroundColor: colors.brand }]}
            onPress={(e) => {
              e.stopPropagation?.();
              setMediaMode((m) => (m === "gif" ? "photo" : "gif"));
            }}
          >
            <Ionicons name={mediaMode === "gif" ? "image" : "play"} size={11} color={colors.onSurface} />
          </PressableScale>
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
    aspectRatio: 1,
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
  gifBadge: {
    position: "absolute",
    bottom: 5,
    left: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#000000", 55),
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
