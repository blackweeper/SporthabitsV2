import { ScrollView, StyleSheet, Text } from "react-native";
import { colors, spacing } from "@/src/theme";
import { ProgramDay } from "@/src/data/programs";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import WeekDayCard, { WEEK_DAY_CARD_GAP, WEEK_DAY_CARD_WIDTH } from "@/src/components/WeekDayCard";

/**
 * Rangée horizontale de `WeekDayCard` avec cale-magnétisme ("snap") réglé
 * pour laisser voir ~2 cartes complètes + un aperçu de la 3e sur mobile —
 * remplace l'ancien `DayColumnsRow` (défilement libre, aucun indice visuel
 * de fin de liste) partagé maintenant par `training.tsx` (Cette semaine /
 * Semaines à venir) et `program/[id].tsx` (onglet Semaine).
 */
export default function WeekDayCardRow({
  columns,
  color,
  records,
  todayDayIndex,
  isDayDone,
  plannedDateFor,
  onPressDay,
  emptyHint = "Rien de prévu sur cette période.",
}: {
  columns: { dayIndex: number; day: ProgramDay }[];
  color: string;
  records: ExerciseRecord[];
  todayDayIndex: number | null;
  isDayDone: (dayIndex: number, day: ProgramDay) => boolean;
  plannedDateFor: (dayIndex: number) => Date | null;
  onPressDay: (dayIndex: number, day: ProgramDay) => void;
  emptyHint?: string;
}) {
  if (columns.length === 0) {
    return <Text style={styles.emptyHint}>{emptyHint}</Text>;
  }
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      snapToInterval={WEEK_DAY_CARD_WIDTH + WEEK_DAY_CARD_GAP}
      snapToAlignment="start"
      decelerationRate="fast"
      contentContainerStyle={styles.row}
    >
      {columns.map(({ dayIndex, day }) => (
        <WeekDayCard
          key={dayIndex}
          testID={`week-day-${dayIndex}`}
          dayIndex={dayIndex}
          day={day}
          color={color}
          records={records}
          plannedDate={plannedDateFor(dayIndex)}
          isToday={todayDayIndex === dayIndex}
          done={isDayDone(dayIndex, day)}
          onPress={() => onPressDay(dayIndex, day)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: { gap: WEEK_DAY_CARD_GAP, paddingRight: spacing.md },
  emptyHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: spacing.sm,
  },
});
