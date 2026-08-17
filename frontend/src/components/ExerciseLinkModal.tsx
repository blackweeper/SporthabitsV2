import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import { normalize, similarity } from "@/src/utils/exercise-library-merge";
import { matchScoreBand } from "@/src/utils/exercise-matching";
import { guessCategory, guessEquipment } from "@/src/utils/exercise-guess";
import { EXERCISE_RECORD_CATEGORY_LABEL, ExerciseRecordCategory } from "@/src/utils/exercise-record-category";
import { EXERCISE_EQUIPMENT_LABEL, ExerciseEquipment } from "@/src/utils/exercise-equipment";

const CATEGORY_OPTIONS = Object.keys(EXERCISE_RECORD_CATEGORY_LABEL) as ExerciseRecordCategory[];

function bandColor(band: ReturnType<typeof matchScoreBand>): string {
  if (band.color === "success") return colors.success;
  if (band.color === "warning") return colors.warning;
  if (band.color === "info") return colors.info;
  return colors.onSurfaceTertiary;
}

/**
 * Recherche/création d'un `ExerciseRecord` pour lier un exercice en texte
 * libre (n'importe quel écran qui n'a qu'un nom, pas d'id) à la bibliothèque
 * — extrait de `import-review/[id].tsx` (seul appelant avant cette
 * extraction) pour être réutilisé par `plan/[id].tsx` (lier un exercice de
 * séance/WOD qui n'a pas encore d'illustration/description). Comportement
 * inchangé, uniquement déplacé dans son propre fichier.
 */
export default function ExerciseLinkModal({
  rawName,
  records,
  onClose,
  onPickRecord,
  onCreateRecord,
}: {
  rawName: string;
  records: ExerciseRecord[];
  onClose: () => void;
  onPickRecord: (record: ExerciseRecord) => void;
  onCreateRecord: (nameFr: string, category: ExerciseRecordCategory, equipment: ExerciseEquipment | null) => void;
}) {
  const [query, setQuery] = useState(rawName);
  const [category, setCategory] = useState<ExerciseRecordCategory>(() => guessCategory(rawName));
  const [equipment, setEquipment] = useState<ExerciseEquipment | null>(() => guessEquipment(rawName));

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    return records
      .map((r) => ({ record: r, score: similarity(q, r.nameFr) }))
      .filter((s) => s.score > 0.3 || normalize(s.record.nameFr).includes(normalize(q)))
      .sort((a, b) => b.score - a.score)
      .slice(0, 8);
  }, [query, records]);

  return (
    <Modal visible animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView style={styles.modalBackdrop} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        <View style={styles.modalSheet}>
          <View style={styles.modalHandle} />
          <Text style={styles.modalTitle}>Lier «{rawName}»</Text>
          <TextInput
            testID="exercise-link-search-input"
            style={styles.modalInput}
            value={query}
            onChangeText={setQuery}
            placeholder="Nom de l'exercice"
            placeholderTextColor={colors.onSurfaceTertiary}
            autoFocus
          />
          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {results.map(({ record, score }) => {
              const band = matchScoreBand(score);
              const color = bandColor(band);
              return (
                <Pressable
                  key={record.id}
                  testID={`exercise-link-pick-${record.id}`}
                  style={styles.modalRow}
                  onPress={() => onPickRecord(record)}
                >
                  <Text style={styles.modalRowName} numberOfLines={1}>
                    {record.nameFr}
                  </Text>
                  <View style={[styles.scoreBadge, { backgroundColor: withAlpha(color, 18) }]}>
                    <Text style={[styles.scoreBadgeText, { color }]}>{Math.round(score * 100)}%</Text>
                  </View>
                </Pressable>
              );
            })}
            {results.length === 0 && (
              <Text style={styles.modalEmpty}>Aucun résultat — crée-le directement.</Text>
            )}
          </ScrollView>

          <Text style={styles.modalSectionLabel}>Nouvel exercice — catégorie</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((c) => (
              <Pressable
                key={c}
                testID={`exercise-link-category-${c}`}
                style={[styles.categoryChip, c === category && styles.categoryChipActive]}
                onPress={() => setCategory(c)}
              >
                <Text style={[styles.categoryChipText, c === category && styles.categoryChipTextActive]}>
                  {EXERCISE_RECORD_CATEGORY_LABEL[c]}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {equipment && (
            <View style={styles.equipmentHint}>
              <Ionicons name="construct-outline" size={12} color={colors.onSurfaceSecondary} />
              <Text style={styles.equipmentHintText}>
                Équipement détecté : {EXERCISE_EQUIPMENT_LABEL[equipment]}
              </Text>
              <Pressable testID="exercise-link-equipment-clear" onPress={() => setEquipment(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color={colors.onSurfaceTertiary} />
              </Pressable>
            </View>
          )}

          <Pressable
            testID="exercise-link-create"
            style={[styles.modalCreateBtn, !query.trim() && { opacity: 0.5 }]}
            disabled={!query.trim()}
            onPress={() => onCreateRecord(query.trim(), category, equipment)}
          >
            <Ionicons name="add-circle" size={16} color="#fff" />
            <Text style={styles.modalCreateBtnText}>Créer «{query.trim()}»</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: colors.overlay },
  modalSheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.border,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 15 },
  modalInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.onSurface,
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 14,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalRowName: { flex: 1, color: colors.onSurface, fontSize: 13, fontWeight: "600" },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill },
  scoreBadgeText: { fontSize: 10, fontWeight: "800" },
  modalEmpty: { color: colors.onSurfaceTertiary, fontSize: 12, textAlign: "center", padding: spacing.md },
  modalSectionLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  categoryRow: { gap: 6, paddingVertical: 4 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryChipActive: { backgroundColor: colors.brand, borderColor: colors.brand },
  categoryChipText: { color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "700" },
  categoryChipTextActive: { color: "#fff" },
  equipmentHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  equipmentHintText: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 11, fontWeight: "600" },
  modalCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  modalCreateBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
