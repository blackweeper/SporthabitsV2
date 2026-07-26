import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, radius, spacing } from "@/src/theme";
import {
  LEVEL_LABEL,
  Program,
  ProgramDay,
  ProgramSession,
} from "@/src/data/programs";
import { findProgram, isBundled } from "@/src/utils/programs";
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

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [active, setActive] = useState<ActiveProgram | null>(null);
  const [otherActiveCount, setOtherActiveCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [preview, setPreview] = useState<{
    dayIndex: number;
    sessionIndex: number;
    session: ProgramSession;
  } | null>(null);

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
  const editable = !isBundled(program.id);

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
      load();
    };
    // We now allow up to 2 simultaneous. Warn only when already at cap.
    if (!isActive && otherActiveCount >= 2) {
      const msg =
        "Tu suis déjà 2 programmes. En démarrant celui-ci, le plus ancien sera remplacé.";
      if (Platform.OS === "web") {
        if (window.confirm(msg)) await doStart();
        return;
      }
      Alert.alert("Remplacer un programme actif ?", msg, [
        { text: "Annuler", style: "cancel" },
        { text: "Continuer", style: "destructive", onPress: doStart },
      ]);
      return;
    }
    await doStart();
  };

  const stop = async () => {
    const msg =
      "Arrêter ce programme ? Tes séances déjà faites resteront dans l'historique.";
    const doStop = async () => {
      await removeActiveProgram(program.id);
      load();
    };
    if (Platform.OS === "web") {
      if (window.confirm(msg)) await doStop();
      return;
    }
    Alert.alert("Arrêter le programme ?", msg, [
      { text: "Annuler", style: "cancel" },
      { text: "Arrêter", style: "destructive", onPress: doStop },
    ]);
  };

  const removeCustom = async () => {
    const msg = "Supprimer définitivement ce programme personnalisé ?";
    const doDel = async () => {
      if (isActive) await removeActiveProgram(program.id);
      await deleteCustomProgram(program.id);
      router.back();
    };
    if (Platform.OS === "web") {
      if (window.confirm(msg)) await doDel();
      return;
    }
    Alert.alert("Supprimer ?", msg, [
      { text: "Annuler", style: "cancel" },
      { text: "Supprimer", style: "destructive", onPress: doDel },
    ]);
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
        {editable ? (
          <Pressable
            testID="edit-program"
            onPress={() => router.push(`/custom-program/${program.id}`)}
            hitSlop={12}
          >
            <Ionicons name="pencil" size={20} color={colors.brand} />
          </Pressable>
        ) : (
          <View style={{ width: 24 }} />
        )}
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.hero, { borderLeftColor: program.color }]}>
          <View style={[styles.emojiBox, { backgroundColor: `${program.color}30` }]}>
            <Text style={{ fontSize: 44 }}>{program.coverEmoji}</Text>
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
        <View style={styles.daysList}>
          {program.days.map((day, i) => (
            <ProgramDayCard
              key={i}
              dayIndex={i + 1}
              day={day}
              active={active}
              isToday={isActive && i + 1 === todayIdx}
              color={program.color}
              onLaunch={launchSession}
              onPreview={(di, si, s) =>
                setPreview({ dayIndex: di, sessionIndex: si, session: s })
              }
              plannedDate={
                active
                  ? plannedDateForDayIndex(active.startedAt, i + 1)
                  : null
              }
            />
          ))}
        </View>

        {editable && (
          <Pressable style={styles.delBtn} onPress={removeCustom}>
            <Ionicons name="trash" size={16} color={colors.error} />
            <Text style={styles.delBtnText}>Supprimer ce programme</Text>
          </Pressable>
        )}
        <View style={{ height: 40 }} />
      </ScrollView>

      <SessionPreviewModal
        visible={preview !== null}
        preview={preview}
        color={program.color}
        plannedDate={
          preview && active
            ? plannedDateForDayIndex(active.startedAt, preview.dayIndex)
            : null
        }
        onClose={() => setPreview(null)}
      />
    </SafeAreaView>
  );
}

function SessionPreviewModal({
  visible,
  preview,
  color,
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
    <Modal
      transparent
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
    >
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
              <Ionicons
                name="barbell"
                size={10}
                color={colors.onSurfaceTertiary}
              />
              <Text style={styles.metaPillText}>
                {session.exercises.length} exercice
                {session.exercises.length > 1 ? "s" : ""}
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
            <View style={[styles.metaPill, { backgroundColor: color + "26" }]}>
              <Ionicons name="eye" size={10} color={color} />
              <Text style={[styles.metaPillText, { color }]}>Aperçu</Text>
            </View>
          </View>
          <ScrollView
            style={{ maxHeight: 460 }}
            contentContainerStyle={{ paddingBottom: 12 }}
          >
            {session.exercises.map((ex, ei) => (
              <View key={ei} style={styles.previewExRow}>
                <View
                  style={[styles.exIcon, { backgroundColor: color + "26" }]}
                >
                  <Ionicons
                    name={
                      ex.mode === "time" ||
                      ex.mode === "emom" ||
                      ex.mode === "amrap"
                        ? "time"
                        : "barbell"
                    }
                    size={12}
                    color={color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.exName}>{ex.name}</Text>
                  <Text style={styles.exDetail}>{formatExerciseDetail(ex)}</Text>
                  {ex.notes ? (
                    <Text style={styles.previewNotes}>{ex.notes}</Text>
                  ) : null}
                </View>
              </View>
            ))}
          </ScrollView>
          <Text style={styles.previewHint}>
            👁️ Ceci est un aperçu lecture seule. La séance ne peut être lancée que le jour prévu.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

function ProgramDayCard({
  dayIndex,
  day,
  active,
  isToday,
  color,
  onLaunch,
  onPreview,
  plannedDate,
}: {
  dayIndex: number;
  day: ProgramDay;
  active: ActiveProgram | null;
  isToday: boolean;
  color: string;
  onLaunch: (di: number, si: number, s: ProgramSession) => void;
  onPreview: (di: number, si: number, s: ProgramSession) => void;
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
                    <View style={[styles.exIcon, { backgroundColor: color + "26" }]}>
                      <Ionicons
                        name={
                          ex.mode === "time" || ex.mode === "emom" || ex.mode === "amrap"
                            ? "time"
                            : "barbell"
                        }
                        size={11}
                        color={color}
                      />
                    </View>
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
        // Other days: preview only, tap opens read-only preview (no launch)
        return (
          <Pressable
            key={si}
            testID={`day-${dayIndex}-session-${si}`}
            style={[styles.sessRow, done && styles.sessRowDone]}
            onPress={() => onPreview(dayIndex, si, s)}
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
                  {done ? (
                    <Ionicons
                      name="checkmark-circle"
                      size={20}
                      color={colors.success}
                    />
                  ) : (
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={colors.onSurfaceTertiary}
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
  if (ex.rest_seconds && ex.mode !== "amrap")
    parts.push(`repos ${ex.rest_seconds}s`);
  return parts.join(" · ");
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
    backgroundColor: "#0F2F1A",
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
  sheetBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  sheetSurface: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
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
  previewTitle: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  previewMetaRow: {
    flexDirection: "row",
    gap: 6,
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
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
  previewNotes: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontStyle: "italic",
    marginTop: 4,
  },
  previewHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
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
