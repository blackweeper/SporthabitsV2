import { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import { programIconFor } from "@/src/utils/program-goal-icon";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import {
  LEVEL_LABEL,
  Program,
  ProgramDay,
  ProgramSession,
} from "@/src/data/programs";
import { findProgram } from "@/src/utils/programs";
import { ensureProgramExercisesInLibrary } from "@/src/utils/program-library-sync";
import {
  ActiveProgram,
  addActiveProgram,
  currentDayIndex,
  deleteCustomProgram,
  findOrCreateProgramPlan,
  getActivePrograms,
  removeActiveProgram,
  uid,
} from "@/src/utils/gym-storage";
import {
  estimateSessionDurationSeconds,
  formatEstimatedDuration,
  formatPlannedDate,
  plannedDateForDayIndex,
} from "@/src/utils/session-estimate";
import { ExerciseRecord, getExerciseRecords } from "@/src/utils/exercise-records";
import ExerciseThumbnail from "@/src/components/ExerciseThumbnail";
import SegmentedTabRow from "@/src/components/ui/SegmentedTabRow";
import ProgramWeekTabs from "@/src/components/ProgramWeekTabs";
import ProgramDayCardFull, {
  PROGRAM_DAY_CARD_FULL_GAP,
  PROGRAM_DAY_CARD_FULL_WIDTH,
} from "@/src/components/ProgramDayCardFull";
import { nonRestDaysInRange } from "@/src/utils/program-week-grouping";
import { formatExerciseDetail } from "@/src/utils/exercise-set-format";

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [active, setActive] = useState<ActiveProgram | null>(null);
  const [otherActiveCount, setOtherActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<ExerciseRecord[]>([]);
  const [view, setView] = useState<"week" | "full">("week");
  const [weekOffset, setWeekOffset] = useState(0);
  const { confirm, ConfirmModal } = useConfirmDialog();

  const load = useCallback(async () => {
    setProgram(await findProgram(id!));
    const actives = await getActivePrograms();
    setActive(actives.find((a) => a.programId === id) ?? null);
    setOtherActiveCount(actives.filter((a) => a.programId !== id).length);
    setLoading(false);
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  useEffect(() => {
    getExerciseRecords().then(setRecords);
  }, []);

  // Ouvre la vue Semaine sur la semaine contenant "aujourd'hui" (programme
  // actif) plutôt que la première — recalculé une fois par programme chargé,
  // pas à chaque changement de weekOffset (sinon la navigation de
  // l'utilisateur serait annulée à chaque re-render).
  useEffect(() => {
    if (!program) return;
    const idx =
      active?.programId === program.id
        ? currentDayIndex(active, program.durationDays)
        : 1;
    setWeekOffset(Math.floor((idx - 1) / 7));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [program?.id]);

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Chargement…</Text>
      </SafeAreaView>
    );
  }
  if (!program) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Programme introuvable</Text>
      </SafeAreaView>
    );
  }

  const isActive = active?.programId === program.id;
  const todayIdx = isActive ? currentDayIndex(active!, program.durationDays) : 1;

  const doneCount = active?.completedSessions.length ?? 0;
  const totalSessions = program.days.reduce(
    (a, d) => a + (d.rest ? 0 : d.sessions.length),
    0,
  );
  const progress = totalSessions ? doneCount / totalSessions : 0;

  const start = async () => {
    const doStart = async () => {
      await addActiveProgram({
        programId: program.id,
        startedAt: new Date().toISOString(),
        completedSessions: [],
      });
      // Seul point d'activation commun aux programmes prédéfinis (jamais
      // sauvegardés via saveCustomProgram, donc jamais couverts par son
      // propre hook) et personnalisés — voir program-library-sync.ts.
      await ensureProgramExercisesInLibrary(program);
      load();
    };
    // We now allow up to 2 simultaneous. Warn only when already at cap.
    if (!isActive && otherActiveCount >= 2) {
      const ok = await confirm({
        title: "Remplacer un programme actif ?",
        message:
          "Tu suis déjà 2 programmes. En démarrant celui-ci, le plus ancien sera remplacé.",
        confirmLabel: "CONTINUER",
        destructive: true,
      });
      if (ok) await doStart();
      return;
    }
    await doStart();
  };

  const stop = async () => {
    const ok = await confirm({
      title: "Arrêter le programme ?",
      message:
        "Arrêter ce programme ? Tes séances déjà faites resteront dans l'historique.",
      confirmLabel: "ARRÊTER",
      destructive: true,
    });
    if (!ok) return;
    await removeActiveProgram(program.id);
    load();
  };

  const removeCustom = async () => {
    const ok = await confirm({
      title: "Supprimer ?",
      message: "Supprimer définitivement ce programme personnalisé ?",
      confirmLabel: "SUPPRIMER",
      destructive: true,
    });
    if (!ok) return;
    if (isActive) await removeActiveProgram(program.id);
    await deleteCustomProgram(program.id);
    router.back();
  };

  async function launchSession(
    dayIndex: number,
    sessionIndex: number,
    session: ProgramSession,
  ) {
    const isStretch = program!.category === "stretch";
    const plan = await findOrCreateProgramPlan(
      program!.id,
      dayIndex,
      sessionIndex,
      () => ({
        title: `${program!.title} · J${dayIndex}${session.label ? " · " + session.label : ""}`,
        type: isStretch ? "stretch" : "mixte",
        category: isStretch ? "stretch" : "workout",
        createdAt: new Date().toISOString(),
        programSource: {
          programId: program!.id,
          dayIndex,
          sessionIndex,
        },
        exercises: session.exercises.map((e) => ({ ...e, id: uid() })),
      }),
    );
    router.push(`/workout/${plan.id}`);
  }

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="back-program"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {program.title}
        </Text>
        <Pressable
          testID="edit-program"
          onPress={() => router.push(`/custom-program/${program.id}`)}
          hitSlop={12}
        >
          <Ionicons name="pencil" size={20} color={colors.brand} />
        </Pressable>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { borderLeftColor: program.color }]}>
          <View style={[styles.emojiBox, { backgroundColor: withAlpha(program.color, 19) }]}>
            <Ionicons name={programIconFor(program.coverEmoji)} size={36} color={program.color} />
          </View>
          <View style={styles.heroTags}>
            <View style={[styles.tag, { backgroundColor: program.color }]}>
              <Text style={styles.tagText}>{LEVEL_LABEL[program.level]}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{program.durationDays} JOURS</Text>
            </View>
            {program.isCustom && (
              <View style={styles.tag}>
                <Text style={styles.tagText}>PERSO</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroGoal}>{program.goal.toUpperCase()}</Text>
          <Text style={styles.heroDesc}>{program.description}</Text>
        </View>

        {isActive ? (
          <View style={styles.activeBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Programme en cours</Text>
              <Text style={styles.activeSub}>
                Jour {todayIdx}/{program.durationDays} · {doneCount}/{totalSessions}{" "}
                séances
              </Text>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progress * 100}%`, backgroundColor: program.color },
                  ]}
                />
              </View>
            </View>
            <Pressable testID="stop-program" onPress={stop} hitSlop={10}>
              <Ionicons name="stop-circle" size={22} color={colors.error} />
            </Pressable>
          </View>
        ) : (
          <Pressable
            testID="start-program"
            style={[styles.startBtn, { backgroundColor: program.color }]}
            onPress={start}
          >
            <Ionicons name="flame" size={20} color="#fff" />
            <Text style={styles.startText}>COMMENCER CE PROGRAMME</Text>
          </Pressable>
        )}

        <Text style={styles.sectionTitle}>
          Planning ({program.durationDays} jours)
        </Text>
        <SegmentedTabRow
          testIDPrefix="program-view"
          options={[
            { key: "week", label: "Semaine" },
            { key: "full", label: "Vue complète" },
          ]}
          value={view}
          onChange={setView}
        />

        {view === "full" ? (
          <View style={styles.daysList}>
            {program.days.map((day, i) => (
              <ProgramDayCard
                key={i}
                dayIndex={i + 1}
                day={day}
                active={active}
                isToday={isActive && i + 1 === todayIdx}
                color={program.color}
                records={records}
                onLaunch={launchSession}
                plannedDate={
                  active
                    ? plannedDateForDayIndex(active.startedAt, i + 1)
                    : null
                }
              />
            ))}
          </View>
        ) : (
          <ProgramWeekView
            program={program}
            active={active}
            isActive={isActive}
            todayIdx={todayIdx}
            records={records}
            weekOffset={weekOffset}
            onChangeWeekOffset={setWeekOffset}
            onLaunch={launchSession}
          />
        )}

        <Pressable style={styles.delBtn} onPress={removeCustom}>
          <Ionicons name="trash" size={16} color={colors.error} />
          <Text style={styles.delBtnText}>Supprimer ce programme</Text>
        </Pressable>
        <View style={{ height: 40 }} />
      </ScrollView>
      {ConfirmModal}
    </SafeAreaView>
  );
}

function ProgramWeekView({
  program,
  active,
  isActive,
  todayIdx,
  records,
  weekOffset,
  onChangeWeekOffset,
  onLaunch,
}: {
  program: Program;
  active: ActiveProgram | null;
  isActive: boolean;
  todayIdx: number;
  records: ExerciseRecord[];
  weekOffset: number;
  onChangeWeekOffset: (o: number) => void;
  onLaunch: (di: number, si: number, s: ProgramSession) => void;
}) {
  const router = useRouter();
  const totalWeeks = Math.ceil(program.durationDays / 7);
  const startIdx = weekOffset * 7 + 1; // 1-based day index
  const endIdx = startIdx + 6;
  // Mêmes règles que training.tsx (nonRestDaysInRange) — un jour de repos
  // n'occupe plus une carte à lui seul dans la vue Semaine, cohérence avec
  // le hub Entraînements plutôt qu'une tranche brute de 7 jours.
  const columns = nonRestDaysInRange(program, startIdx, endIdx);

  const completedWeeks = new Set<number>();
  if (active) {
    for (let w = 0; w < totalWeeks; w++) {
      const wStart = w * 7 + 1;
      const wEnd = Math.min(wStart + 6, program.durationDays);
      const wCols = nonRestDaysInRange(program, wStart, wEnd);
      if (
        wCols.length > 0 &&
        wCols.every(({ dayIndex, day }) =>
          day.sessions.every((_, si) =>
            active.completedSessions.some(
              (s) => s.dayIndex === dayIndex && s.sessionIndex === si,
            ),
          ),
        )
      ) {
        completedWeeks.add(w);
      }
    }
  }

  return (
    <View style={{ gap: spacing.md }}>
      <ProgramWeekTabs
        weeks={Array.from({ length: totalWeeks }, (_, i) => i)}
        activeWeek={weekOffset}
        onSelectWeek={onChangeWeekOffset}
        color={program.color}
        completedWeeks={completedWeeks}
      />
      {columns.length === 0 ? (
        <Text style={styles.weekEmptyHint}>Aucun jour prévu cette semaine.</Text>
      ) : (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          snapToInterval={PROGRAM_DAY_CARD_FULL_WIDTH + PROGRAM_DAY_CARD_FULL_GAP}
          snapToAlignment="start"
          decelerationRate="fast"
          contentContainerStyle={{ gap: PROGRAM_DAY_CARD_FULL_GAP, paddingRight: spacing.lg }}
        >
          {columns.map(({ dayIndex, day }) => {
            const today = isActive && dayIndex === todayIdx;
            const doneSessionIndices = new Set(
              day.sessions
                .map((_, si) => si)
                .filter((si) =>
                  active?.completedSessions.some(
                    (s) => s.dayIndex === dayIndex && s.sessionIndex === si,
                  ) ?? false,
                ),
            );
            const done = day.sessions.length > 0 && day.sessions.every((_, si) => doneSessionIndices.has(si));
            return (
              <ProgramDayCardFull
                key={dayIndex}
                dayIndex={dayIndex}
                day={day}
                color={program.color}
                records={records}
                plannedDate={active ? plannedDateForDayIndex(active.startedAt, dayIndex) : null}
                isToday={today}
                done={done}
                doneSessionIndices={doneSessionIndices}
                onLaunch={(si, s) => onLaunch(dayIndex, si, s)}
                onPressExercise={(name) =>
                  router.push(`/exercise-detail/${encodeURIComponent(name)}`)
                }
              />
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

function ProgramDayCard({
  dayIndex,
  day,
  active,
  isToday,
  color,
  records,
  onLaunch,
  plannedDate,
}: {
  dayIndex: number;
  day: ProgramDay;
  active: ActiveProgram | null;
  isToday: boolean;
  color: string;
  records: ExerciseRecord[];
  onLaunch: (di: number, si: number, s: ProgramSession) => void;
  plannedDate: Date | null;
}) {
  const doneOf = (si: number) =>
    active?.completedSessions.some(
      (s) => s.dayIndex === dayIndex && s.sessionIndex === si,
    ) ?? false;

  if (day.rest) {
    return (
      <View
        style={[styles.dayCard, styles.dayCardRest]}
        testID={`day-${dayIndex}`}
      >
        <View style={styles.dayHead}>
          <View style={[styles.dayIdx, { backgroundColor: colors.surfaceTertiary }]}>
            <Text style={{ color: colors.onSurfaceTertiary, fontWeight: "800" }}>
              {dayIndex}
            </Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.dayRestTitle}>{day.title}</Text>
            {plannedDate && (
              <Text style={styles.dayDate}>
                {formatPlannedDate(plannedDate)}
              </Text>
            )}
          </View>
          <Ionicons name="bed" size={18} color={colors.onSurfaceTertiary} />
        </View>
      </View>
    );
  }

  const allDone = day.sessions.every((_, si) => doneOf(si));

  return (
    <View
      style={[
        styles.dayCard,
        isToday && { borderColor: color, borderWidth: 2 },
      ]}
      testID={`day-${dayIndex}`}
    >
      <View style={styles.dayHead}>
        <View
          style={[
            styles.dayIdx,
            allDone && { backgroundColor: colors.success },
            isToday && !allDone && { backgroundColor: color },
          ]}
        >
          {allDone ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
          ) : (
            <Text
              style={{
                color: isToday ? "#fff" : colors.onSurface,
                fontWeight: "800",
                fontSize: 12,
              }}
            >
              {dayIndex}
            </Text>
          )}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.dayTitle} numberOfLines={1}>
            {day.title}
          </Text>
          {plannedDate && (
            <Text style={styles.dayDate}>
              {formatPlannedDate(plannedDate)}
            </Text>
          )}
        </View>
        {isToday && (
          <Text style={[styles.todayLbl, { color }]}>AUJOURD&apos;HUI</Text>
        )}
      </View>

      {day.sessions.map((s, si) => {
        const done = doneOf(si);
        const est = estimateSessionDurationSeconds(s.exercises);
        if (isToday) {
          // Today: fully expanded — details of all exercises + explicit CTA
          return (
            <View
              key={si}
              testID={`day-${dayIndex}-session-${si}`}
              style={[styles.todaySession, done && styles.sessRowDone]}
            >
              <View style={styles.todaySessHead}>
                {s.label ? (
                  <View style={styles.sessLabel}>
                    <Text style={styles.sessLabelText}>
                      {s.label.toUpperCase()}
                    </Text>
                  </View>
                ) : null}
                <Text style={styles.sessTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                {done && (
                  <Ionicons
                    name="checkmark-circle"
                    size={22}
                    color={colors.success}
                  />
                )}
              </View>
              <View style={styles.sessMetaRow}>
                <View style={styles.metaPill}>
                  <Ionicons
                    name="barbell"
                    size={10}
                    color={colors.onSurfaceTertiary}
                  />
                  <Text style={styles.metaPillText}>
                    {s.exercises.length} exercice{s.exercises.length > 1 ? "s" : ""}
                  </Text>
                </View>
                {est > 0 && (
                  <View style={styles.metaPill}>
                    <Ionicons
                      name="time"
                      size={10}
                      color={colors.onSurfaceTertiary}
                    />
                    <Text style={styles.metaPillText}>
                      {formatEstimatedDuration(est)}
                    </Text>
                  </View>
                )}
              </View>
              <View style={styles.exList}>
                {s.exercises.map((ex, ei) => (
                  <View key={ei} style={styles.exRow}>
                    <ExerciseThumbnail
                      name={ex.name}
                      records={records}
                      photoBase64={ex.photoBase64}
                      iconKey={ex.iconKey}
                      size={32}
                      square
                    />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.exName} numberOfLines={1}>
                        {ex.name}
                      </Text>
                      <Text style={styles.exDetail}>
                        {formatExerciseDetail(ex)}
                      </Text>
                    </View>
                  </View>
                ))}
              </View>
              <Pressable
                testID={`launch-today-${si}`}
                style={[styles.launchBtn, { backgroundColor: color }]}
                onPress={() => onLaunch(dayIndex, si, s)}
              >
                <Ionicons name="play" size={14} color="#fff" />
                <Text style={styles.launchBtnText}>
                  {done ? "REFAIRE LA SÉANCE" : "LANCER LA SÉANCE"}
                </Text>
              </Pressable>
            </View>
          );
        }
        // Other days: même bouton de lancement qu'aujourd'hui, dans une
        // rangée compacte (pas de liste d'exercices dépliée) — indispensable
        // pour rester lisible sur un programme de plusieurs dizaines de
        // jours, tout en gardant "toutes les séances" réellement lançables.
        return (
          <Pressable
            key={si}
            testID={`day-${dayIndex}-session-${si}`}
            style={[styles.sessRow, done && styles.sessRowDone]}
            onPress={() => onLaunch(dayIndex, si, s)}
          >
            <View style={styles.sessLeft}>
              {s.label ? (
                <View style={styles.sessLabel}>
                  <Text style={styles.sessLabelText}>
                    {s.label.toUpperCase()}
                  </Text>
                </View>
              ) : null}
              <View style={{ flex: 1 }}>
                <View style={styles.sessTitleRow}>
                  <Text style={styles.sessTitle} numberOfLines={1}>
                    {s.title}
                  </Text>
                  <View style={styles.sessLaunchTag}>
                    {done && (
                      <Ionicons
                        name="checkmark-circle"
                        size={14}
                        color={colors.success}
                      />
                    )}
                    <Ionicons name="play" size={12} color={color} />
                    <Text style={[styles.sessLaunchTagText, { color }]}>
                      {done ? "REFAIRE" : "LANCER"}
                    </Text>
                  </View>
                </View>
                <View style={styles.sessMetaRow}>
                  <View style={styles.metaPill}>
                    <Ionicons
                      name="barbell"
                      size={10}
                      color={colors.onSurfaceTertiary}
                    />
                    <Text style={styles.metaPillText}>
                      {s.exercises.length} ex.
                    </Text>
                  </View>
                  {est > 0 && (
                    <View style={styles.metaPill}>
                      <Ionicons
                        name="time"
                        size={10}
                        color={colors.onSurfaceTertiary}
                      />
                      <Text style={styles.metaPillText}>
                        {formatEstimatedDuration(est)}
                      </Text>
                    </View>
                  )}
                </View>
                {s.exercises.length > 0 && (
                  <Text style={styles.sessPreview} numberOfLines={2}>
                    {s.exercises
                      .slice(0, 4)
                      .map((e) => e.name)
                      .join(" · ")}
                    {s.exercises.length > 4
                      ? ` · +${s.exercises.length - 4}`
                      : ""}
                  </Text>
                )}
              </View>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  loading: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: 40,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
  },
  headerTitle: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textAlign: "center",
  },
  scroll: { padding: spacing.lg, gap: spacing.md },
  hero: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderTopColor: colors.border,
    borderRightColor: colors.border,
    borderBottomColor: colors.border,
    gap: spacing.sm,
  },
  emojiBox: {
    width: 68,
    height: 68,
    borderRadius: radius.md,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  tag: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceTertiary,
  },
  tagText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  heroGoal: {
    color: colors.brand,
    fontWeight: "800",
    letterSpacing: 1,
    fontSize: 12,
    marginTop: 4,
  },
  heroDesc: {
    color: colors.onSurfaceSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: withAlpha(colors.success, 12),
    borderColor: colors.success,
    borderWidth: 1,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  activeTitle: { color: colors.success, fontWeight: "700" },
  activeSub: { color: colors.onSurfaceSecondary, fontSize: 12, marginTop: 2 },
  progressTrack: {
    height: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    marginTop: 6,
    overflow: "hidden",
  },
  progressFill: { height: "100%" },
  startBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  startText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: spacing.md,
  },
  daysList: { gap: spacing.sm },
  weekEmptyHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontStyle: "italic",
    paddingVertical: spacing.md,
    textAlign: "center",
  },
  dayCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  dayCardRest: { backgroundColor: colors.surface },
  dayHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  dayIdx: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  dayTitle: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 13,
    flex: 1,
  },
  dayRestTitle: { color: colors.onSurfaceTertiary, flex: 1, fontSize: 13 },
  dayDate: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    marginTop: 2,
    textTransform: "capitalize",
  },
  sessTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sessLaunchTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sessLaunchTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
  },
  sessMetaRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 4,
    flexWrap: "wrap",
  },
  metaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: colors.surface,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  metaPillText: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
  },
  sessPreview: {
    color: colors.onSurfaceSecondary,
    fontSize: 11,
    marginTop: 6,
    lineHeight: 15,
  },
  todayLbl: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
  },
  todaySession: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 10,
    marginTop: 4,
  },
  todaySessHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  exList: { gap: 8 },
  exRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: 8,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
  },
  exIcon: {
    width: 24,
    height: 24,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  exName: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  exDetail: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  launchBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.md,
    marginTop: 4,
  },
  launchBtnText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 0.8,
    fontSize: 13,
  },
  sessRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    padding: spacing.sm,
    borderRadius: radius.sm,
    marginLeft: 42,
  },
  sessRowDone: { opacity: 0.7 },
  sessLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  sessLabel: {
    backgroundColor: colors.brand,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  sessLabelText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  sessTitle: {
    color: colors.onSurface,
    fontWeight: "600",
    fontSize: 12,
  },
  sessMeta: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    marginTop: 1,
  },
  delBtn: {
    flexDirection: "row",
    justifyContent: "center",
    gap: spacing.sm,
    padding: spacing.md,
    marginTop: spacing.lg,
  },
  delBtnText: { color: colors.error, fontWeight: "700", fontSize: 13 },
});
