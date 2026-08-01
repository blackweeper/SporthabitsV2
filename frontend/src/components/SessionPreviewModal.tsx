import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import { ProgramSession } from "@/src/data/programs";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import {
  estimateSessionDurationSeconds,
  formatEstimatedDuration,
  formatPlannedDate,
} from "@/src/utils/session-estimate";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";

function formatExerciseDetail(ex: any): string {
  const parts: string[] = [];
  if (ex.mode === "reps") {
    parts.push(`${ex.sets || 1} × ${ex.reps ?? "?"}`);
    if (ex.weight) parts.push(String(ex.weight));
  } else if (ex.mode === "time") {
    parts.push(`${ex.sets || 1} × ${ex.duration_seconds || 0}s`);
  } else if (ex.mode === "amrap") {
    parts.push(`AMRAP ${Math.round((ex.duration_seconds || 0) / 60)} min`);
  } else if (ex.mode === "emom") {
    parts.push(`EMOM ${ex.sets || 1} min`);
    if (ex.reps) parts.push(String(ex.reps));
  }
  if (ex.rest_seconds && ex.mode !== "amrap") parts.push(`repos ${ex.rest_seconds}s`);
  return parts.join(" · ");
}

/**
 * Aperçu lecture-seule d'une séance d'un jour de programme — extrait de
 * `program/[id].tsx` pour être partagé avec `WeekDayCard` (training.tsx et
 * la vue Semaine de program/[id].tsx pointent maintenant vers la même
 * implémentation, évitant une 2e copie).
 */
export default function SessionPreviewModal({
  visible,
  preview,
  color,
  records,
  plannedDate,
  onClose,
}: {
  visible: boolean;
  preview: {
    dayIndex: number;
    sessionIndex: number;
    session: ProgramSession;
  } | null;
  color: string;
  records: ExerciseRecord[];
  plannedDate: Date | null;
  onClose: () => void;
}) {
  if (!preview) {
    return (
      <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
        <View />
      </Modal>
    );
  }
  const { session, dayIndex } = preview;
  const est = estimateSessionDurationSeconds(session.exercises);
  return (
    <Modal transparent visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={styles.sheetBackdrop}>
        <Pressable style={{ flex: 1 }} onPress={onClose} />
        <View style={styles.sheetSurface}>
          <View style={styles.sheetHandle} />
          <View style={styles.previewHeader}>
            <View style={{ flex: 1 }}>
              <Text style={styles.previewDay}>
                Jour {dayIndex}
                {plannedDate ? ` · ${formatPlannedDate(plannedDate)}` : ""}
              </Text>
              <Text style={styles.previewTitle}>{session.title}</Text>
            </View>
            <Pressable onPress={onClose} hitSlop={12} testID="close-preview">
              <Ionicons name="close" size={22} color={colors.onSurface} />
            </Pressable>
          </View>
          <View style={styles.previewMetaRow}>
            <View style={styles.metaPill}>
              <Ionicons name="barbell" size={10} color={colors.onSurfaceTertiary} />
              <Text style={styles.metaPillText}>
                {session.exercises.length} exercice{session.exercises.length > 1 ? "s" : ""}
              </Text>
            </View>
            {est > 0 && (
              <View style={styles.metaPill}>
                <Ionicons name="time" size={10} color={colors.onSurfaceTertiary} />
                <Text style={styles.metaPillText}>{formatEstimatedDuration(est)}</Text>
              </View>
            )}
            <View style={[styles.metaPill, { backgroundColor: withAlpha(color, 15) }]}>
              <Ionicons name="eye" size={10} color={color} />
              <Text style={[styles.metaPillText, { color }]}>Aperçu</Text>
            </View>
          </View>
          <ScrollView style={{ maxHeight: 460 }} contentContainerStyle={{ paddingBottom: 12 }}>
            {session.exercises.map((ex, ei) => (
              <View key={ei} style={styles.previewExRow}>
                <ExerciseThumbnail
                  name={ex.name}
                  records={records}
                  photoBase64={ex.photoBase64}
                  iconKey={ex.iconKey}
                  size={32}
                  square
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exDetail}>{formatExerciseDetail(ex)}</Text>
                  {ex.notes ? <Text style={styles.previewNotes}>{ex.notes}</Text> : null}
                </View>
              </View>
            ))}
          </ScrollView>
          <View style={styles.previewHintRow}>
            <Ionicons name="eye-outline" size={12} color={colors.onSurfaceTertiary} />
            <Text style={styles.previewHint}>
              Ceci est un aperçu lecture seule. La séance ne peut être lancée que le jour prévu.
            </Text>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  sheetBackdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.65)", justifyContent: "flex-end" },
  sheetSurface: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingBottom: 32,
    gap: spacing.sm,
  },
  sheetHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  previewHeader: { flexDirection: "row", alignItems: "center" },
  previewDay: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  previewTitle: { color: colors.onSurface, fontSize: 17, fontWeight: "800", marginTop: 2 },
  previewMetaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginBottom: spacing.sm },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaPillText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" },
  previewExRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    marginBottom: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  exName: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  exDetail: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600", marginTop: 2 },
  previewNotes: { color: colors.onSurfaceTertiary, fontSize: 10, fontStyle: "italic", marginTop: 4 },
  previewHintRow: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 4, marginTop: 4 },
  previewHint: { color: colors.onSurfaceTertiary, fontSize: 11, fontStyle: "italic" },
});
