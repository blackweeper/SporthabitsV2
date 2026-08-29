import { useMemo, useState } from "react";
import { View, Text, StyleSheet, Modal, Pressable, TextInput, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { Theme } from "@/src/themes/types";
import GlassCard from "@/src/components/ui/GlassCard";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import { normalize, similarity } from "@/src/utils/exercise-library-merge";
import { matchScoreBand } from "@/src/utils/exercise-matching";
import { guessCategory, guessEquipment } from "@/src/utils/exercise-guess";
import { EXERCISE_RECORD_CATEGORY_LABEL, ExerciseRecordCategory } from "@/src/utils/exercise-record-category";
import { EXERCISE_EQUIPMENT_LABEL, ExerciseEquipment } from "@/src/utils/exercise-equipment";

const CATEGORY_OPTIONS = Object.keys(EXERCISE_RECORD_CATEGORY_LABEL) as ExerciseRecordCategory[];

function bandColor(theme: Theme, band: ReturnType<typeof matchScoreBand>): string {
  if (band.color === "success") return theme.colors.success;
  if (band.color === "warning") return theme.colors.warning;
  if (band.color === "info") return theme.colors.info;
  return theme.colors.onSurfaceTertiary;
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
  const { theme } = useTheme();
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
      <KeyboardAvoidingView
        style={[styles.modalBackdrop, { backgroundColor: theme.colors.overlay }]}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />
        {/* `blur={false}` — cause racine confirmée : le `Modal
            animationType="slide"` de React Native Web garde une animation
            CSS active (transform en matrice identité, mais bien présente et
            `animationPlayState:"running"` en continu) sur son conteneur
            pendant toute la durée d'ouverture de la feuille — exactement la
            même famille de bug que `Swipeable` (un ancêtre transformé en
            continu casse la composition de `backdrop-filter` sur WebKit),
            juste une source différente. Confirmé en inspectant le DOM en
            direct : le vrai flou en temps réel rendait le contenu de cette
            feuille illisible tant que la modale restait ouverte. */}
        <GlassCard
          level="elevated"
          blur={false}
          style={[
            styles.modalSheet,
            { borderTopLeftRadius: theme.radius.lg, borderTopRightRadius: theme.radius.lg },
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary },
          ]}
        >
          <View style={[styles.modalHandle, { backgroundColor: theme.colors.border }]} />
          <Text style={[styles.modalTitle, { color: theme.colors.onSurface }]}>Lier «{rawName}»</Text>
          <TextInput
            testID="exercise-link-search-input"
            style={[
              styles.modalInput,
              {
                backgroundColor: theme.colors.surfaceTertiary,
                borderRadius: theme.radius.md,
                color: theme.colors.onSurface,
                borderColor: theme.colors.border,
              },
            ]}
            value={query}
            onChangeText={setQuery}
            placeholder="Nom de l'exercice"
            placeholderTextColor={theme.colors.onSurfaceTertiary}
            autoFocus
          />
          <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
            {results.map(({ record, score }) => {
              const band = matchScoreBand(score);
              const color = bandColor(theme, band);
              return (
                <Pressable
                  key={record.id}
                  testID={`exercise-link-pick-${record.id}`}
                  style={[styles.modalRow, { borderBottomColor: theme.colors.border }]}
                  onPress={() => onPickRecord(record)}
                >
                  <Text style={[styles.modalRowName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                    {record.nameFr}
                  </Text>
                  <View
                    style={[
                      styles.scoreBadge,
                      { borderRadius: theme.radius.pill, backgroundColor: withAlpha(color, 18) },
                    ]}
                  >
                    <Text style={[styles.scoreBadgeText, { color }]}>{Math.round(score * 100)}%</Text>
                  </View>
                </Pressable>
              );
            })}
            {results.length === 0 && (
              <Text style={[styles.modalEmpty, { color: theme.colors.onSurfaceTertiary }]}>
                Aucun résultat — crée-le directement.
              </Text>
            )}
          </ScrollView>

          <Text style={[styles.modalSectionLabel, { color: theme.colors.onSurfaceTertiary }]}>
            Nouvel exercice — catégorie
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryRow}>
            {CATEGORY_OPTIONS.map((c) => {
              const active = c === category;
              return (
                <Pressable
                  key={c}
                  testID={`exercise-link-category-${c}`}
                  style={[
                    styles.categoryChip,
                    {
                      borderRadius: theme.radius.pill,
                      backgroundColor: active ? theme.colors.brand : theme.colors.surfaceTertiary,
                      borderColor: active ? theme.colors.brand : theme.colors.border,
                    },
                  ]}
                  onPress={() => setCategory(c)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      { color: active ? "#fff" : theme.colors.onSurfaceSecondary },
                    ]}
                  >
                    {EXERCISE_RECORD_CATEGORY_LABEL[c]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {equipment && (
            <View style={[styles.equipmentHint, { backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.md }]}>
              <Ionicons name="construct-outline" size={12} color={theme.colors.onSurfaceSecondary} />
              <Text style={[styles.equipmentHintText, { color: theme.colors.onSurfaceSecondary }]}>
                Équipement détecté : {EXERCISE_EQUIPMENT_LABEL[equipment]}
              </Text>
              <Pressable testID="exercise-link-equipment-clear" onPress={() => setEquipment(null)} hitSlop={8}>
                <Ionicons name="close-circle" size={14} color={theme.colors.onSurfaceTertiary} />
              </Pressable>
            </View>
          )}

          <Pressable
            testID="exercise-link-create"
            style={[
              styles.modalCreateBtn,
              { borderRadius: theme.radius.md },
              theme.card.mode === "glass"
                ? [
                    { backgroundColor: withAlpha(theme.colors.brand, 18), borderWidth: 1, borderColor: withAlpha(theme.colors.brand, 50) },
                    coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                  ]
                : { backgroundColor: theme.colors.brand },
              !query.trim() && { opacity: 0.5 },
            ]}
            disabled={!query.trim()}
            onPress={() => onCreateRecord(query.trim(), category, equipment)}
          >
            <Ionicons name="add-circle" size={16} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
            <Text
              style={[
                styles.modalCreateBtnText,
                theme.card.mode === "glass" && { color: theme.colors.brand },
              ]}
            >
              Créer «{query.trim()}»
            </Text>
          </Pressable>
        </GlassCard>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: { flex: 1, justifyContent: "flex-end" },
  modalSheet: {
    padding: spacing.lg,
    gap: spacing.sm,
  },
  modalHandle: {
    width: 48,
    height: 5,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  modalTitle: { fontWeight: "800", fontSize: 15 },
  modalInput: {
    padding: spacing.md,
    borderWidth: 1,
    fontSize: 14,
  },
  modalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  modalRowName: { flex: 1, fontSize: 13, fontWeight: "600" },
  scoreBadge: { paddingHorizontal: 8, paddingVertical: 3 },
  scoreBadgeText: { fontSize: 10, fontWeight: "800" },
  modalEmpty: { fontSize: 12, textAlign: "center", padding: spacing.md },
  modalSectionLabel: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    marginTop: spacing.xs,
  },
  categoryRow: { gap: 6, paddingVertical: 4 },
  categoryChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderWidth: 1,
  },
  categoryChipText: { fontSize: 11, fontWeight: "700" },
  equipmentHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  equipmentHintText: { flex: 1, fontSize: 11, fontWeight: "600" },
  modalCreateBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  modalCreateBtnText: { color: "#fff", fontWeight: "800", fontSize: 13 },
});
