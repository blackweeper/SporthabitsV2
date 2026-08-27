import { ReactNode, useMemo, useState } from "react";
import { View, Text, StyleSheet, Pressable, PanResponder } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { radius, spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { WorkoutSession } from "@/src/utils/gym-storage";
import { DayScheduleKind } from "@/src/utils/calendar-day-schedule";
import { pickColor } from "./CalendarView";
import PressableScale from "./ui/PressableScale";
import GlassCard from "./ui/GlassCard";

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
// Seuil de détection d'un geste de swipe horizontal (Sunset uniquement) —
// assez grand pour ne jamais voler un tap sur un jour, assez petit pour
// rester réactif.
const SWIPE_THRESHOLD = 40;

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
 * (comme le reste de l'app) pour tous les thèmes ; sous Sunset, un geste de
 * swipe horizontal s'ajoute (n'importe quel geste `dx` suffisant sur la
 * rangée de jours change de semaine), et le cadre/carte disparaît pour
 * laisser les jours flotter directement sur le dégradé de fond, avec la
 * météo + la légende de couleurs repositionnées en dessous — exactement la
 * disposition de la capture de référence. Sous Classique, le rendu reste
 * strictement identique à avant l'introduction du thème Sunset.
 */
export default function WeekCalendarView({
  sessions,
  selectedDate,
  onSelectDate,
  getEventsForDate,
  onAddEvent,
  headerRight,
  scheduleColorForDate,
  testIDPrefix = "week-cal",
}: {
  sessions: WorkoutSession[];
  selectedDate: string;
  onSelectDate: (dateStr: string) => void;
  getEventsForDate: (dateStr: string) => DayEntry[];
  onAddEvent: (dateStr: string) => void;
  /** Affiché à côté du libellé de semaine sous Classique ; repositionné sous
   * la rangée de jours sous Sunset (la légende, elle, est rendue par
   * l'appelant au-dessus de tout le composant — voir `index.tsx`). */
  headerRight?: ReactNode;
  /** Coloration par séance PRÉVUE — appliquée uniquement à aujourd'hui/futur
   * (les jours passés gardent `pickColor`, par séance complétée). */
  scheduleColorForDate?: (dateStr: string) => DayScheduleKind;
  testIDPrefix?: string;
}) {
  const { theme } = useTheme();
  const isSunset = theme.id === "sunset";
  const [weekOffset, setWeekOffset] = useState(0);
  const [detailExpanded, setDetailExpanded] = useState(false);

  const scheduleColor: Record<Exclude<DayScheduleKind, "none">, string> = {
    cardio: theme.colors.info,
    gym: theme.colors.brand,
    both: theme.colors.scheduleBoth,
  };

  const goToWeek = (delta: number) =>
    setWeekOffset((o) => Math.max(-Infinity, Math.min(o + delta, MAX_FORWARD_WEEKS)));

  // Swipe horizontal (Sunset uniquement) — un simple seuil de distance sur
  // relâchement, pas de suivi visuel du doigt : cohérent avec le reste de
  // l'app (aucune autre surface ne fait de drag suivi en direct), et évite
  // toute dépendance supplémentaire à react-native-gesture-handler pour un
  // geste aussi simple.
  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponder: (_, g) =>
          Math.abs(g.dx) > 12 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
        onPanResponderRelease: (_, g) => {
          if (g.dx <= -SWIPE_THRESHOLD) goToWeek(1);
          else if (g.dx >= SWIPE_THRESHOLD) goToWeek(-1);
        },
      }),
    [],
  );

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
    <View
      style={[
        isSunset ? styles.wrapSunset : styles.wrap,
        !isSunset && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
      ]}
    >
      <View style={styles.headerRow}>
        <PressableScale
          testID={`${testIDPrefix}-prev`}
          onPress={() => goToWeek(-1)}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={18} color={theme.colors.onSurface} />
        </PressableScale>
        <View style={styles.headerCenter}>
          <Text style={[styles.weekLabel, { color: theme.colors.onSurface }]}>{weekLabel}</Text>
          {!isSunset && headerRight}
        </View>
        <PressableScale
          testID={`${testIDPrefix}-next`}
          onPress={() => goToWeek(1)}
          hitSlop={12}
          disabled={weekOffset >= MAX_FORWARD_WEEKS}
        >
          <Ionicons
            name="chevron-forward"
            size={18}
            color={weekOffset >= MAX_FORWARD_WEEKS ? theme.colors.surfaceTertiary : theme.colors.onSurface}
          />
        </PressableScale>
      </View>

      <View style={styles.daysRow} {...(isSunset ? panResponder.panHandlers : {})}>
        {days.map((d, i) => {
          const isToday = d.dateStr === todayStr;
          const isSelected = d.dateStr === selectedDate;
          const isPast = d.dateStr < todayStr;
          const scheduleKind = !isPast ? scheduleColorForDate?.(d.dateStr) : undefined;
          const color =
            scheduleKind && scheduleKind !== "none"
              ? scheduleColor[scheduleKind]
              : d.sessions.length > 0
                ? pickColor(d.sessions)
                : null;
          const hasColor = !!color && color !== "transparent";
          return (
            <PressableScale
              key={d.dateStr}
              testID={`${testIDPrefix}-day-${d.dateStr}`}
              style={styles.dayCol}
              onPress={() => onSelectDate(d.dateStr)}
            >
              <Text style={[styles.dayLetter, { color: theme.colors.onSurfaceTertiary }]}>
                {WEEKDAY_LETTERS[i]}
              </Text>
              <View
                style={[
                  styles.dayCircle,
                  { borderColor: theme.colors.border },
                  hasColor && { backgroundColor: color as string, borderColor: color as string },
                  isPast && !hasColor && { borderColor: theme.colors.error, borderWidth: 1.5 },
                  isSelected && { borderColor: theme.colors.progress, borderWidth: 2 },
                  isToday && !isSelected && { borderColor: theme.colors.brand, borderWidth: 2 },
                ]}
              >
                <Text
                  style={[
                    styles.dayNum,
                    { color: theme.colors.onSurface },
                    hasColor && styles.dayNumOnColor,
                  ]}
                >
                  {d.dayNum}
                </Text>
              </View>
            </PressableScale>
          );
        })}
      </View>

      {isSunset && headerRight && (
        // Cohérence "glass" : le calendrier lui-même (jours) reste sans
        // cadre pour flotter sur le dégradé, mais ce sous-bloc météo
        // reprend le même verre que le héros/les cartes programme.
        <GlassCard style={styles.sunsetBelowCard}>
          <View style={styles.sunsetBelowRow}>{headerRight}</View>
        </GlassCard>
      )}

      <PressableScale
        testID={`${testIDPrefix}-toggle-detail`}
        style={styles.chevronRow}
        onPress={() => setDetailExpanded((v) => !v)}
        hitSlop={8}
      >
        <Ionicons
          name={detailExpanded ? "chevron-up" : "chevron-down"}
          size={16}
          color={theme.colors.onSurfaceTertiary}
        />
      </PressableScale>

      {detailExpanded && (
        <View style={[styles.detailWrap, { borderTopColor: theme.colors.border }]}>
          <View style={styles.detailHeadRow}>
            <Text style={[styles.detailTitle, { color: theme.colors.onSurface }]}>
              {formatSelectedDate(selectedDate)}
            </Text>
            <PressableScale
              testID={`${testIDPrefix}-add`}
              onPress={() => onAddEvent(selectedDate)}
              hitSlop={8}
            >
              <Ionicons name="add-circle" size={20} color={theme.colors.brand} />
            </PressableScale>
          </View>
          {entries.length === 0 ? (
            <Text style={[styles.detailEmpty, { color: theme.colors.onSurfaceTertiary }]}>
              Rien de prévu ce jour-là.
            </Text>
          ) : (
            entries.map((entry) => (
              <Pressable
                key={entry.key}
                testID={`${testIDPrefix}-entry-${entry.key}`}
                style={[
                  styles.detailRow,
                  { backgroundColor: theme.colors.surfaceTertiary, borderColor: theme.colors.border },
                ]}
                onPress={entry.onPress}
              >
                <Text style={styles.detailEmoji}>{entry.emoji}</Text>
                <Text style={[styles.detailRowTitle, { color: theme.colors.onSurface }]} numberOfLines={1}>
                  {entry.title}
                </Text>
                {entry.time && (
                  <Text style={[styles.detailRowTime, { color: theme.colors.onSurfaceTertiary }]}>
                    {entry.time}
                  </Text>
                )}
              </Pressable>
            ))
          )}
        </View>
      )}
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
    borderRadius: radius.md,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.md,
  },
  // Sunset : plus de cadre/carte — les jours flottent directement sur le
  // dégradé de fond partagé (`ThemedBackground`), juste un peu de padding
  // pour respirer.
  wrapSunset: {
    paddingHorizontal: spacing.xs,
    gap: spacing.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 4,
  },
  headerCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  weekLabel: {
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    textTransform: "capitalize",
  },
  daysRow: { flexDirection: "row" },
  sunsetBelowCard: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  sunsetBelowRow: {
    alignItems: "center",
    gap: spacing.sm,
  },
  chevronRow: { alignItems: "center", paddingTop: 2 },
  dayCol: { flex: 1, alignItems: "center", gap: 4 },
  dayLetter: {
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
  },
  dayNum: { fontSize: 13, fontWeight: "800" },
  dayNumOnColor: { color: "#000" },
  detailWrap: {
    borderTopWidth: 1,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  detailHeadRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  detailTitle: {
    fontSize: 13,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  detailEmpty: {
    fontStyle: "italic",
    fontSize: 12,
    textAlign: "center",
    paddingVertical: spacing.md,
  },
  detailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    padding: spacing.sm,
  },
  detailEmoji: { fontSize: 15 },
  detailRowTitle: { flex: 1, fontWeight: "700", fontSize: 12.5 },
  detailRowTime: { fontSize: 11, fontWeight: "700" },
});
