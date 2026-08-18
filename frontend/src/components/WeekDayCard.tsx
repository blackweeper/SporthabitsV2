import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import PressableScale from "@/src/components/ui/PressableScale";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import { ProgramDay } from "@/src/data/programs";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import { estimateSessionDurationSeconds, formatEstimatedDuration, formatPlannedDate } from "@/src/utils/session-estimate";

export const WEEK_DAY_CARD_WIDTH = 152;
export const WEEK_DAY_CARD_GAP = 10;

/**
 * POTENTIELLEMENT OBSOLÈTE — plus aucun appelant dans le repo depuis que
 * `ProgramDayCardFull` (src/components/ProgramDayCardFull.tsx) a remplacé
 * ce composant partout (program/[id].tsx et training.tsx). Conservé
 * intentionnellement (pas supprimé) en attendant une passe de nettoyage
 * dédiée — voir aussi `WeekDayCardRow.tsx`, son seul consommateur, qui est
 * dans le même état.
 *
 * Carte "jour de semaine" partagée — remplaçait à la fois l'ancien
 * `DayColumnsRow` (training.tsx) et le rendu par-jour de `ProgramDayCard`
 * (program/[id].tsx). Agrège TOUTES les séances du jour et affiche nom,
 * nombre d'exercices, durée estimée et jusqu'à 3 miniatures. Largeur fixe
 * pour permettre le calcul du swipe "2 cartes + aperçu de la 3e" côté
 * appelant (voir `WEEK_DAY_CARD_WIDTH`).
 */
export default function WeekDayCard({
  dayIndex,
  day,
  color,
  records,
  plannedDate,
  isToday = false,
  done = false,
  onPress,
  testID,
}: {
  dayIndex: number;
  day: ProgramDay;
  color: string;
  records: ExerciseRecord[];
  plannedDate: Date | null;
  isToday?: boolean;
  done?: boolean;
  onPress: () => void;
  testID?: string;
}) {
  if (day.rest) {
    return (
      <View style={[styles.card, styles.cardRest]} testID={testID}>
        <View style={styles.headRow}>
          <View style={[styles.idxBadge, { backgroundColor: colors.surfaceTertiary }]}>
            <Text style={styles.idxBadgeTextMuted}>{dayIndex}</Text>
          </View>
          <Ionicons name="bed" size={16} color={colors.onSurfaceTertiary} />
        </View>
        <Text style={styles.restTitle} numberOfLines={2}>
          {day.title}
        </Text>
        {plannedDate && <Text style={styles.date}>{formatPlannedDate(plannedDate)}</Text>}
      </View>
    );
  }

  const exercises = day.sessions.flatMap((s) => s.exercises);
  const totalSeconds = day.sessions.reduce(
    (acc, s) => acc + estimateSessionDurationSeconds(s.exercises),
    0,
  );

  return (
    <PressableScale
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: withAlpha(color, 8), borderColor: withAlpha(color, isToday ? 60 : 25) },
        isToday && { borderWidth: 2 },
      ]}
      onPress={onPress}
    >
      <View style={styles.headRow}>
        <View
          style={[
            styles.idxBadge,
            done && { backgroundColor: colors.success },
            isToday && !done && { backgroundColor: color },
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={13} color="#fff" />
          ) : (
            <Text style={[styles.idxBadgeText, isToday && { color: "#fff" }]}>{dayIndex}</Text>
          )}
        </View>
        {isToday && <Text style={[styles.todayTag, { color }]}>AUJOURD&apos;HUI</Text>}
      </View>

      <Text style={styles.title} numberOfLines={2}>
        {day.title}
      </Text>
      {plannedDate && <Text style={styles.date}>{formatPlannedDate(plannedDate)}</Text>}

      <View style={styles.metaRow}>
        <Text style={styles.metaText}>
          {exercises.length} exercice{exercises.length > 1 ? "s" : ""}
        </Text>
        {totalSeconds > 0 && <Text style={styles.metaText}>{formatEstimatedDuration(totalSeconds)}</Text>}
      </View>

      <View style={styles.exList}>
        {exercises.slice(0, 3).map((ex, i) => (
          <View key={i} style={styles.exRow}>
            <ExerciseThumbnail
              name={ex.name}
              records={records}
              exerciseRecordId={ex.exerciseRecordId}
              size={24}
              square
            />
            <Text style={styles.exName} numberOfLines={1}>
              {ex.name}
            </Text>
          </View>
        ))}
        {exercises.length > 3 && <Text style={styles.exMore}>+{exercises.length - 3} de plus</Text>}
      </View>
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  card: {
    width: WEEK_DAY_CARD_WIDTH,
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: 4,
  },
  cardRest: { backgroundColor: colors.surface, borderColor: colors.border },
  headRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  idxBadge: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  idxBadgeText: { color: colors.onSurface, fontWeight: "800", fontSize: 11 },
  idxBadgeTextMuted: { color: colors.onSurfaceTertiary, fontWeight: "800", fontSize: 11 },
  todayTag: { fontSize: 8.5, fontWeight: "800", letterSpacing: 0.5 },
  title: { color: colors.onSurface, fontWeight: "800", fontSize: 12, lineHeight: 16, marginTop: 4 },
  restTitle: { color: colors.onSurfaceTertiary, fontSize: 12, lineHeight: 16, marginTop: 4 },
  date: { color: colors.brand, fontSize: 9.5, fontWeight: "800", marginTop: 2, textTransform: "capitalize" },
  metaRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  metaText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "600" },
  exList: { gap: 5, marginTop: spacing.sm },
  exRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  exName: { flex: 1, color: colors.onSurfaceSecondary, fontSize: 10.5, fontWeight: "600" },
  exMore: { color: colors.onSurfaceTertiary, fontSize: 9.5, fontWeight: "700", marginTop: 2 },
});
