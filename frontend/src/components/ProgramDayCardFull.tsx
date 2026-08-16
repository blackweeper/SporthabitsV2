import { StyleSheet, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import PressableScale from "@/src/components/ui/PressableScale";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import { ProgramDay, ProgramSession } from "@/src/data/programs";
import { ExerciseRecord } from "@/src/utils/exercise-records";
import {
  estimateSessionDurationSeconds,
  formatEstimatedDuration,
  formatPlannedDate,
} from "@/src/utils/session-estimate";
import { formatExerciseDetail } from "@/src/utils/exercise-set-format";

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
  if (day.rest) {
    return (
      <View style={[styles.card, styles.restCard]} testID={`week-day-full-${dayIndex}`}>
        <View style={styles.restBadge}>
          <Ionicons name="bed" size={20} color={colors.onSurfaceTertiary} />
        </View>
        <Text style={styles.restTitle}>{day.title}</Text>
        {plannedDate && (
          <Text style={styles.dateText}>{formatPlannedDate(plannedDate)}</Text>
        )}
      </View>
    );
  }

  const exercises = day.sessions.flatMap((s) => s.exercises);
  const est = day.sessions.reduce(
    (a, s) => a + estimateSessionDurationSeconds(s.exercises),
    0,
  );
  const multiSession = day.sessions.length > 1;
  const sessionDone = (si: number) => doneSessionIndices?.has(si) ?? done;

  const body = (
    <View
      style={[
        styles.card,
        isToday && { borderColor: color, borderWidth: 2 },
        done && !isToday && styles.doneCard,
      ]}
      testID={`week-day-full-${dayIndex}`}
    >
      <View style={styles.head}>
        <View
          style={[
            styles.idxBadge,
            done && { backgroundColor: colors.success },
            isToday && !done && { backgroundColor: color },
          ]}
        >
          {done ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
          ) : (
            <Text style={[styles.idxText, isToday && { color: "#fff" }]}>{dayIndex}</Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {day.title}
          </Text>
          {plannedDate && (
            <Text style={styles.dateText}>{formatPlannedDate(plannedDate)}</Text>
          )}
        </View>
        {isToday && <Text style={[styles.todayTag, { color }]}>AUJOURD&apos;HUI</Text>}
      </View>

      <View style={styles.metaRow}>
        <View style={styles.metaPill}>
          <Ionicons name="barbell" size={10} color={colors.onSurfaceTertiary} />
          <Text style={styles.metaPillText}>
            {exercises.length} exercice{exercises.length > 1 ? "s" : ""}
          </Text>
        </View>
        {est > 0 && (
          <View style={styles.metaPill}>
            <Ionicons name="time" size={10} color={colors.onSurfaceTertiary} />
            <Text style={styles.metaPillText}>{formatEstimatedDuration(est)}</Text>
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
                  <Text style={styles.sessLabelText} numberOfLines={1}>
                    {(s.label ?? s.title ?? "").toUpperCase()}
                  </Text>
                  {sDone && (
                    <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                  )}
                </View>
              )}
              <View style={styles.exList}>
                {s.exercises.map((ex, ei) => (
                  <PressableScale
                    key={ei}
                    testID={`week-day-full-${dayIndex}-s${si}-ex-${ei}`}
                    style={styles.exRow}
                    onPress={() => onPressExercise(ex.name)}
                  >
                    <ExerciseThumbnail
                      name={ex.name}
                      records={records}
                      photoBase64={ex.photoBase64}
                      iconKey={ex.iconKey}
                      size={40}
                      square
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text style={styles.exDetail}>{formatExerciseDetail(ex)}</Text>
                    </View>
                  </PressableScale>
                ))}
              </View>

              <PressableScale
                testID={`week-day-full-launch-${dayIndex}-${si}`}
                style={[styles.launchBtn, { backgroundColor: color }]}
                onPress={() => onLaunch(si, s)}
              >
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.launchBtnText}>
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
    </View>
  );

  return body;
}

const styles = StyleSheet.create({
  card: {
    width: PROGRAM_DAY_CARD_FULL_WIDTH,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: spacing.sm,
  },
  doneCard: { opacity: 0.75 },
  restCard: {
    minHeight: 120,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface,
    gap: 6,
  },
  restBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  restTitle: { color: colors.onSurfaceTertiary, fontWeight: "700", fontSize: 13 },
  head: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  idxBadge: {
    width: 30,
    height: 30,
    borderRadius: 9,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  idxText: { color: colors.onSurface, fontWeight: "800", fontSize: 12 },
  title: { color: colors.onSurface, fontWeight: "800", fontSize: 14, flex: 1 },
  dateText: {
    color: colors.brand,
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
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaPillText: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "700" },
  sessionBlock: { gap: 6 },
  sessLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 2,
  },
  sessLabelText: {
    color: colors.onSurfaceTertiary,
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
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
  },
  exName: { color: colors.onSurface, fontWeight: "800", fontSize: 12 },
  exDetail: { color: colors.onSurfaceTertiary, fontSize: 10, fontWeight: "600", marginTop: 2 },
  launchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 2,
  },
  launchBtnText: { color: "#fff", fontWeight: "800", letterSpacing: 0.8, fontSize: 12 },
});
