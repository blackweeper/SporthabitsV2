import { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import { WorkoutSession } from "@/src/utils/gym-storage";
import { pickColor } from "./CalendarView";
import PressableScale from "./ui/PressableScale";

export type DayEntry = {
  key: string;
  emoji: string;
  title: string;
  time?: string | null;
  onPress: () => void;
};

const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];
const MS_PER_DAY = 86400000;
// Permet de prévisualiser les semaines à venir (ex. un CalendarEvent déjà
// planifié) — plafonné plutôt qu'illimité pour rester un vrai raccourci de
// consultation, pas un calendrier de planification à long terme.
const MAX_FORWARD_WEEKS = 12;

/** Every date in the app is keyed as `new Date(x).toISOString().slice(0,10)`
 * (sessions, habit logs, `todayYYYYMMDD()`…) — that's the current *instant*
 * in UTC, not "local midnight". Building calendar days via local
 * `setHours(0,0,0,0)` + `toISOString()` (as one might naturally do) silently
 * shifts the date by the timezone offset once you're more than a few hours
 * from UTC midnight, which desyncs the displayed day number from the
 * dateStr used for session lookups and the "today" comparison. Working
 * entirely in UTC-anchored `Date`s here keeps the day number and the
 * dateStr always in agreement, and keeps dateStr comparable 1:1 with
 * `todayYYYYMMDD()` / session dates elsewhere. */
function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/**
 * Vue semaine — 7 jours en cercles (jour courant mis en avant, jours passés
 * colorés selon complétion via le même `pickColor` que la vue mois), avec le
 * détail du jour sélectionné juste en dessous. Navigation par chevrons
 * (comme le reste de l'app — `CalendarView` mois, `training.tsx`…) plutôt
 * qu'un swipe gestuel dédié : plus cohérent avec le langage d'interaction
 * déjà en place, et évite un carrousel à pagination custom pour un gain
 * d'usage marginal.
 */
export default function WeekCalendarView({
  sessions,
  selectedDate,
  onSelectDate,
  getEventsForDate,
  onAddEvent,
  testIDPrefix = "week-cal",
}: {
  sessions: WorkoutSession[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  getEventsForDate: (dateStr: string) => DayEntry[];
  onAddEvent: (dateStr: string) => void;
  testIDPrefix?: string;
}) {
  const [weekOffset, setWeekOffset] = useState(0);

  const byDate: Record<string, WorkoutSession[]> = {};
  for (const s of sessions) {
    const k = new Date(s.startedAt).toISOString().slice(0, 10);
    if (!byDate[k]) byDate[k] = [];
    byDate[k].push(s);
  }

  const todayStr = toDateStr(new Date());
  // Re-anchor "today" at UTC midnight so all downstream arithmetic stays in
  // whole-day UTC steps — mixing this with the wall-clock `new Date()` would
  // reintroduce the local/UTC drift described above.
  const todayUTC = new Date(`${todayStr}T00:00:00.000Z`);
  const todayWeekdayIdx = (todayUTC.getUTCDay() + 6) % 7; // 0 = Monday
  const weekStart = new Date(
    todayUTC.getTime() - todayWeekdayIdx * MS_PER_DAY + weekOffset * 7 * MS_PER_DAY,
  );
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(weekStart.getTime() + i * MS_PER_DAY);
    const dateStr = toDateStr(d);
    return { dayNum: d.getUTCDate(), dateStr, sessions: byDate[dateStr] ?? [] };
  });

  const weekLabel = formatWeekRange(days[0].dateStr, days[6].dateStr);
  const entries = getEventsForDate(selectedDate);

  return (
    <View style={styles.wrap}>
      <View style={styles.headerRow}>
        <PressableScale
          testID={`${testIDPrefix}-prev`}
          onPress={() => setWeekOffset((o) => o - 1)}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={18} color={colors.onSurface} />
        </PressableScale>
        <Text style={styles.weekLabel}>{weekLabel}</Text>
        <PressableScale
          testID={`${testIDPrefix}-next`}
          onPress={() => setWeekOffset((o) => o + 1)}
          hitSlop={12}
          disabled={weekOffset >= MAX_FORWARD_WEEKS}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={weekOffset >= MAX_FORWARD_WEEKS ? colors.surfaceTertiary : colors.onSurface}
          />
        </PressableScale>
      </View>

      <View style={styles.daysRow}>
        {days.map((d, i) => {
          const isToday = d.dateStr === todayStr;
          const isSelected = d.dateStr === selectedDate;
          const isPast = d.dateStr < todayStr;
          const color = d.sessions.length > 0 ? pickColor(d.sessions) : null;
          const hasColor = !!color && color !== "transparent";
          return (
            <PressableScale
              key={d.dateStr}
              testID={`${testIDPrefix}-day-${d.dateStr}`}
              style={styles.dayCol}
              onPress={() => onSelectDate(d.dateStr)}
            >
              <Text style={styles.dayLetter}>{WEEKDAY_LETTERS[i]}</Text>
              <View
                style={[
                  styles.dayCircle,
                  hasColor && { backgroundColor: color as string },
                  isPast && !hasColor && styles.dayCircleMissed,
                  isSelected && styles.dayCircleSelected,
                  isToday && !isSelected && styles.dayCircleToday,
                ]}
              >
                <Text style={[styles.dayNum, hasColor && styles.dayNumOnColor]}>
                  {d.dayNum}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      <View style={styles.detailWrap}>
        <View style={styles.detailHeadRow}>
          <Text style={styles.detailTitle}>{formatSelectedDate(selectedDate)}</Text>
          <PressableScale
            testID={`${testIDPrefix}-add`}
            onPress={() => onAddEvent(selectedDate)}
            hitSlop={8}
          >
            <Ionicons name="add-circle" size={20} color={colors.brand} />
          </PressableScale>
        </View>
        {entries.length === 0 ? (
          <Text style={styles.detailEmpty}>Rien de prévu ce jour-là.</Text>
        ) : (
          entries.map((entry) => (
            <Pressable
              key={entry.key}
              testID={`${testIDPrefix}-entry-${entry.key}`}
              style={styles.detailRow}
              onPress={entry.onPress}
            >
              <Text style={styles.detailEmoji}>{entry.emoji}</Text>
              <Text style={styles.detailRowTitle} numberOfLines={1}>
                {entry.title}
              </Text>
              {entry.time && <Text style={styles.detailRowTime}>{entry.time}</Text>}
            </Pressable>
          ))
        )}
      </View>
    </View>
  );
}

function formatWeekRange(startDateStr: string, endDateStr: string): string {
  // Noon anchor (not midnight) to sidestep any local-timezone rollback when
  // formatting for display — same convention as `formatDayModalDate` below.
  const start = new Date(`${startDateStr}T12:00:00`);
  const end = new Date(`${endDateStr}T12:00:00`);
  const sameMonth = start.getMonth() === end.getMonth();
  const startStr = start.toLocaleDateString("fr-FR", {
    day: "numeric",
    month: sameMonth ? undefined : "short",
  });
  const endStr = end.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
  return `${startStr} – ${endStr}`;
}

function formatSelectedDate(dateStr: string): string {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  weekLabel: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "capitalize",
  },
  daysRow: { flexDirection: "row" },
  dayCol: { flex: 1, alignItems: "center", gap: 4 },
  dayLetter: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  dayCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayCircleMissed: { borderColor: colors.error, borderWidth: 1.5 },
  dayCircleToday: { borderColor: colors.brand, borderWidth: 2 },
  dayCircleSelected: { borderColor: colors.progress, borderWidth: 2 },
  dayNum: { color: colors.onSurface, fontSize: 13, fontWeight: "800" },
  dayNumOnColor: { color: "#000" },
  detailWrap: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  detailHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  detailEmpty: {
    color: colors.onSurfaceTertiary,
    fontStyle: "italic",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  detailEmoji: { fontSize: 15 },
  detailRowTitle: { flex: 1, color: colors.onSurface, fontWeight: "700", fontSize: 12.5 },
  detailRowTime: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "700" },
});
