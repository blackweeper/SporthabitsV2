import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { coloredShadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import PressableScale from "@/src/components/ui/PressableScale";
import GlassCard from "@/src/components/ui/GlassCard";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import { ProgramDay, ProgramSession } from "@/src/data/programs";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import {
  estimateSessionDurationSeconds,
  formatEstimatedDuration,
  formatPlannedDate,
} from "@/src/utils/session-estimate";
import { formatExerciseDetail } from "@/src/utils/exercise-set-format";
import { groupRoundRobinExercises } from "@/src/utils/exercise-round-grouping";

export const PROGRAM_DAY_CARD_FULL_WIDTH = 300;
export const PROGRAM_DAY_CARD_FULL_GAP = 12;

/**
 * Carte "jour" pleine (image réelle par exercice, sans plafond) — pattern
 * partagé par la vue Semaine de program/[id].tsx et par les onglets "Cette
 * semaine"/"Semaines à venir" du hub training.tsx, pour une visualisation
 * cohérente partout où un jour de programme est affiché. Remplace l'ancien
 * WeekDayCard (plafonné à 3 miniatures, désormais sans appelant).
 *
 * Un jour peut contenir plusieurs séances indépendantes (ex. "Force" +
 * "WOD" pour The Comeback) — chacune reçoit son propre bouton de
 * lancement (onLaunch reçoit l'index + la séance concernée) plutôt qu'un
 * bouton unique qui ne lançait jamais que la première séance du jour,
 * empêchant les séances suivantes (ex. le WOD AMRAP) d'être jouables
 * depuis cette vue.
 *
 * Chaque jour (pas seulement "aujourd'hui") affiche le bouton de
 * lancement — un programme n'est qu'un modèle, rien n'empêche de lancer
 * la séance d'un autre jour à la demande (`findOrCreateProgramPlan` est
 * déjà agnostique du jour). Seul le style ("AUJOURD'HUI", bordure teintée)
 * distingue encore visuellement le jour courant.
 */
export default function ProgramDayCardFull({
  dayIndex,
  day,
  color,
  records,
  plannedDate,
  isToday,
  done,
  doneSessionIndices,
  onLaunch,
  onPressExercise,
}: {
  dayIndex: number;
  day: ProgramDay;
  color: string;
  records: ExerciseRecord[];
  plannedDate: Date | null;
  isToday: boolean;
  done: boolean;
  doneSessionIndices?: Set<number>;
  onLaunch: (sessionIndex: number, session: ProgramSession) => void;
  onPressExercise: (name: string) => void;
}) {
  const { theme } = useTheme();
  if (day.rest) {
    return (
      <GlassCard
        level="subtle"
        style={[
          styles.card,
          { borderRadius: theme.radius.lg },
          styles.restCard,
          theme.card.mode !== "glass" && { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
        ]}
        testID={`week-day-full-${dayIndex}`}
      >
        <View style={[styles.restBadge, { backgroundColor: theme.colors.surfaceTertiary }]}>
          <Ionicons name="bed" size={20} color={theme.colors.onSurfaceTertiary} />
        </View>
        <Text style={[styles.restTitle, { color: theme.colors.onSurfaceTertiary }]}>{day.title}</Text>
        {plannedDate && (
          <Text style={[styles.dateText, { color: theme.colors.brand }]}>{formatPlannedDate(plannedDate)}</Text>
        )}
      </GlassCard>
    );
  }

  const exercises = day.sessions.flatMap((s) => s.exercises);
  const uniqueExerciseCount = new Set(exercises.map((e) => e.name)).size;
  const est = day.sessions.reduce(
    (a, s) => a + estimateSessionDurationSeconds(s.exercises),
    0,
  );
  const multiSession = day.sessions.length > 1;
  const sessionDone = (si: number) => doneSessionIndices?.has(si) ?? done;

  const body = (
    <GlassCard
      level="card"
      accent={isToday ? color : undefined}
      style={[
        styles.card,
        { borderRadius: theme.radius.lg },
        theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary, borderColor: theme.colors.border },
        theme.card.mode !== "glass" && isToday && { borderColor: color, borderWidth: 2 },
        done && !isToday && styles.doneCard,
      ]}
      testID={`week-day-full-${dayIndex}`}
    >
      <View style={styles.head}>
        <View
          style={[
            styles.idxBadge,
            { backgroundColor: theme.colors.surfaceTertiary },
            done && { backgroundColor: theme.colors.success },
            isToday && !done && { backgroundColor: color },
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
          ) : (
            <Text style={[styles.idxText, { color: theme.colors.onSurface }, isToday && { color: "#fff" }]}>
              {dayIndex}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: theme.colors.onSurface }]} numberOfLines={1}>
            {day.title}
          </Text>
          {plannedDate && (
            <Text style={[styles.dateText, { color: theme.colors.brand }]}>{formatPlannedDate(plannedDate)}</Text>
          )}
        </View>
        {isToday && <Text style={[styles.todayTag, { color }]}>AUJOURD&apos;HUI</Text>}
      </View>

      <View style={styles.metaRow}>
        <View
          style={[
            styles.metaPill,
            { backgroundColor: theme.card.mode === "glass" ? theme.glass.subtle.tint : theme.colors.surface },
          ]}
        >
          <Ionicons name="barbell" size={10} color={theme.colors.onSurfaceTertiary} />
          <Text style={[styles.metaPillText, { color: theme.colors.onSurfaceTertiary }]}>
            {uniqueExerciseCount} exercice{uniqueExerciseCount > 1 ? "s" : ""}
          </Text>
        </View>
        {est > 0 && (
          <View
          style={[
            styles.metaPill,
            { backgroundColor: theme.card.mode === "glass" ? theme.glass.subtle.tint : theme.colors.surface },
          ]}
        >
            <Ionicons name="time" size={10} color={theme.colors.onSurfaceTertiary} />
            <Text style={[styles.metaPillText, { color: theme.colors.onSurfaceTertiary }]}>
              {formatEstimatedDuration(est)}
            </Text>
          </View>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        {day.sessions.map((s, si) => {
          const sDone = sessionDone(si);
          return (
            <View key={si} style={styles.sessionBlock}>
              {multiSession && (s.label || s.title) && (
                <View style={styles.sessLabelRow}>
                  <Text style={[styles.sessLabelText, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                    {(s.label ?? s.title ?? "").toUpperCase()}
                  </Text>
                  {sDone && (
                    <Ionicons name="checkmark-circle" size={14} color={theme.colors.success} />
                  )}
                </View>
              )}
              <View style={styles.exList}>
                {groupRoundRobinExercises(s.exercises).map(({ exercise: ex, count }, ei) => (
                  <PressableScale
                    key={ei}
                    testID={`week-day-full-${dayIndex}-s${si}-ex-${ei}`}
                    style={[
                      styles.exRow,
                      {
                        borderRadius: theme.radius.sm,
                        backgroundColor:
                          theme.card.mode === "glass" ? theme.glass.subtle.tint : theme.colors.surface,
                      },
                    ]}
                    onPress={() => onPressExercise(ex.name)}
                  >
                    <ExerciseThumbnail
                      name={ex.name}
                      records={records}
                      photoBase64={ex.photoBase64}
                      iconKey={ex.iconKey}
                      exerciseRecordId={ex.exerciseRecordId}
                      size={40}
                      square
                    />
                    <View style={{ flex: 1 }}>
                      <View style={styles.exNameRow}>
                        <Text style={[styles.exName, { color: theme.colors.onSurface }]} numberOfLines={1}>
                          {ex.name}
                        </Text>
                        {count > 1 && (
                          <View
                            style={[
                              styles.roundBadge,
                              { backgroundColor: theme.colors.surfaceTertiary, borderRadius: theme.radius.pill },
                            ]}
                          >
                            <Text style={[styles.roundBadgeText, { color: theme.colors.onSurfaceSecondary }]}>
                              × {count}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={[styles.exDetail, { color: theme.colors.onSurfaceTertiary }]}>
                        {formatExerciseDetail(ex)}
                      </Text>
                    </View>
                  </PressableScale>
                ))}
              </View>

              <PressableScale
                testID={`week-day-full-launch-${dayIndex}-${si}`}
                style={[
                  styles.launchBtn,
                  { borderRadius: theme.radius.md },
                  theme.card.mode === "glass"
                    ? [
                        { backgroundColor: withAlpha(color, 18), borderWidth: 1, borderColor: withAlpha(color, 50) },
                        coloredShadow(color, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                      ]
                    : { backgroundColor: color },
                ]}
                onPress={() => onLaunch(si, s)}
              >
                <Ionicons name="play" size={14} color={theme.card.mode === "glass" ? color : "#fff"} />
                <Text style={[styles.launchBtnText, { color: theme.card.mode === "glass" ? color : "#fff" }]}>
                  {multiSession
                    ? `${sDone ? "REFAIRE" : "LANCER"} · ${(s.label ?? s.title ?? `SÉANCE ${si + 1}`).toUpperCase()}`
                    : sDone
                      ? "REFAIRE LA SÉANCE"
                      : "LANCER LA SÉANCE"}
                </Text>
              </PressableScale>
            </View>
          );
        })}
      </View>
    </GlassCard>
  );

  return body;
}

const styles = StyleSheet.create({
  card: {
    width: PROGRAM_DAY_CARD_FULL_WIDTH,
    borderWidth: 1,
    padding: spacing.md,
    gap: spacing.sm,
  },
  doneCard: { opacity: 0.75 },
  restCard: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  restBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  restTitle: { fontWeight: "700", fontSize: 13 },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  idxBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  idxText: { fontWeight: "800", fontSize: 12 },
  title: { fontWeight: "800", fontSize: 14, flex: 1 },
  dateText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: "capitalize",
  },
  todayTag: { fontSize: 9, fontWeight: "800", letterSpacing: 0.6 },
  metaRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaPillText: { fontSize: 10, fontWeight: "700" },
  sessionBlock: { gap: 6 },
  sessLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sessLabelText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
    flex: 1,
  },
  exList: { gap: 6 },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 8,
  },
  exNameRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  exName: { fontWeight: "800", fontSize: 12, flexShrink: 1 },
  exDetail: { fontSize: 10, fontWeight: "600", marginTop: 2 },
  roundBadge: {
    paddingHorizontal: 6,
    paddingVertical: 1,
  },
  roundBadgeText: { fontSize: 9, fontWeight: "800" },
  launchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    marginTop: 2,
  },
  launchBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 0.8, fontSize: 12 },
});
