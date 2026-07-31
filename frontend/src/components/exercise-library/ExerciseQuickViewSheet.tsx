import { useEffect, useState } from "react";
import { View, Text, Image, Modal, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { ExerciseLibraryItem } from "@/src/hooks/useExerciseLibraryItems";
import { useExerciseMedia } from "@/src/hooks/useExerciseMedia";
import { MUSCLE_GROUPS } from "@/src/utils/muscle-groups";
import { EXERCISE_DIFFICULTY_COLOR, EXERCISE_DIFFICULTY_LABEL } from "@/src/utils/exercise-difficulty";
import { getExerciseRecords } from "@/src/utils/exercise-records";
import { getCustomExercises } from "@/src/utils/gym-storage";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import PressableScale from "@/src/components/ui/PressableScale";

/**
 * Aperçu rapide (POLISH V2, Phase 9) — tapoter une carte de la Bibliothèque
 * ouvre cette feuille au lieu de naviguer directement vers la fiche
 * complète ; réutilise le patron de feuille coulissante déjà établi dans
 * l'app (`NewExerciseSheet`/`QuickAddModal` : Modal transparent
 * animationType="slide", fond assombri, coins arrondis 24px + poignée) —
 * aucune dépendance de bottom-sheet n'a été ajoutée pour ça.
 */
export default function ExerciseQuickViewSheet({
  item,
  onClose,
  onAddToLibrary,
  onViewFullDetail,
}: {
  item: ExerciseLibraryItem | null;
  onClose: () => void;
  onAddToLibrary: () => void;
  onViewFullDetail: () => void;
}) {
  const [description, setDescription] = useState<string | null>(null);
  const { uri: mediaUri } = useExerciseMedia(item && !item.isCustom ? item.id : null);

  useEffect(() => {
    let cancelled = false;
    setDescription(null);
    if (!item) return;
    (async () => {
      if (item.isCustom && item.customId) {
        const customs = await getCustomExercises();
        const custom = customs.find((c) => c.id === item.customId);
        if (!cancelled) setDescription(custom?.description ?? null);
        return;
      }
      const records = await getExerciseRecords();
      const record = records.find((r) => r.id === item.id);
      const fr = record?.enrichment?.translations?.fr;
      if (!cancelled) setDescription(fr?.description ?? record?.description ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [item]);

  if (!item) return null;
  const primaryMuscle = item.muscleGroups?.[0]
    ? MUSCLE_GROUPS.find((m) => m.key === item.muscleGroups![0])
    : undefined;

  return (
    <Modal visible={!!item} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose}>
        <Pressable style={styles.sheet} onPress={(e) => e.stopPropagation?.()}>
          <View style={styles.handle} />
          <View style={styles.artwork}>
            {mediaUri ? (
              <Image source={{ uri: mediaUri }} style={styles.artworkImage} />
            ) : item.imageBase64 ? (
              <Image
                source={{ uri: `data:image/webp;base64,${item.imageBase64}` }}
                style={styles.artworkImage}
              />
            ) : (
              <Text style={styles.artworkEmoji}>
                {item.emoji ?? iconEmojiForExercise(item.name, null)}
              </Text>
            )}
          </View>

          <Text style={styles.name} numberOfLines={2}>
            {item.name}
          </Text>

          <View style={styles.metaRow}>
            {primaryMuscle && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipEmoji}>{primaryMuscle.emoji}</Text>
                <Text style={styles.metaChipText}>{primaryMuscle.label}</Text>
              </View>
            )}
            {item.equipment && (
              <View style={styles.metaChip}>
                <Text style={styles.metaChipText}>{item.equipment}</Text>
              </View>
            )}
            {item.difficulty && (
              <View style={styles.metaChip}>
                <View
                  style={[styles.diffDot, { backgroundColor: EXERCISE_DIFFICULTY_COLOR[item.difficulty] }]}
                />
                <Text style={styles.metaChipText}>{EXERCISE_DIFFICULTY_LABEL[item.difficulty]}</Text>
              </View>
            )}
          </View>

          {description ? (
            <Text style={styles.description} numberOfLines={3}>
              {description}
            </Text>
          ) : null}

          <View style={styles.actions}>
            {!item.inLibrary && (
              <PressableScale testID="quickview-add-library" style={styles.addBtn} onPress={onAddToLibrary}>
                <Ionicons name="add-circle-outline" size={16} color={colors.onSurface} />
                <Text style={styles.addBtnText}>Ajouter à ma bibliothèque</Text>
              </PressableScale>
            )}
            {item.inLibrary && (
              <View style={[styles.addBtn, styles.addBtnDone]}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={[styles.addBtnText, { color: colors.success }]}>Dans ta bibliothèque</Text>
              </View>
            )}
            <PressableScale testID="quickview-full-detail" style={styles.detailBtn} onPress={onViewFullDetail}>
              <Text style={styles.detailBtnText}>Voir la fiche complète</Text>
            </PressableScale>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  handle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  artwork: {
    aspectRatio: 1.8,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  artworkImage: { width: "100%", height: "100%" },
  artworkEmoji: { fontSize: 40 },
  name: { color: colors.onSurface, fontWeight: "800", fontSize: 17, marginTop: spacing.xs },
  metaRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  metaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
  },
  metaChipEmoji: { fontSize: 11 },
  metaChipText: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700" },
  diffDot: { width: 6, height: 6, borderRadius: 3 },
  description: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    lineHeight: 18,
    marginTop: 2,
  },
  actions: { gap: spacing.sm, marginTop: spacing.sm },
  addBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: radius.md,
    backgroundColor: colors.brand,
  },
  addBtnDone: {
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  addBtnText: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  detailBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  detailBtnText: { color: colors.onSurface, fontWeight: "700", fontSize: 13 },
});
