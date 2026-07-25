import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Alert,
  Platform,
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
  currentDayIndex,
  deleteCustomProgram,
  findOrCreateProgramPlan,
  getActiveProgram,
  setActiveProgram,
  uid,
} from "@/src/utils/gym-storage";

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [program, setProgram] = useState<Program | null>(null);
  const [active, setActive] = useState<ActiveProgram | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setProgram(await findProgram(id!));
    setActive(await getActiveProgram());
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
      await setActiveProgram({
        programId: program.id,
        startedAt: new Date().toISOString(),
        completedSessions: [],
      });
      load();
    };
    if (active && active.programId !== program.id) {
      const msg = "Tu as déjà un programme actif. Le remplacer ?";
      if (Platform.OS === "web") {
        if (window.confirm(msg)) await doStart();
        return;
      }
      Alert.alert("Remplacer le programme actif ?", msg, [
        { text: "Annuler", style: "cancel" },
        { text: "Remplacer", style: "destructive", onPress: doStart },
      ]);
      return;
    }
    await doStart();
  };

  const stop = async () => {
    const msg =
      "Arrêter ce programme ? Tes séances déjà faites resteront dans l'historique.";
    const doStop = async () => {
      await setActiveProgram(null);
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
      if (isActive) await setActiveProgram(null);
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
    const plan = await findOrCreateProgramPlan(
      program!.id,
      dayIndex,
      sessionIndex,
      () => ({
        title: `${program!.title} · J${dayIndex}${session.label ? " · " + session.label : ""}`,
        type: "mixte",
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
    </SafeAreaView>
  );
}

function ProgramDayCard({
  dayIndex,
  day,
  active,
  isToday,
  color,
  onLaunch,
}: {
  dayIndex: number;
  day: ProgramDay;
  active: ActiveProgram | null;
  isToday: boolean;
  color: string;
  onLaunch: (di: number, si: number, s: ProgramSession) => void;
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
          <Text style={styles.dayRestTitle}>{day.title}</Text>
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
        <Text style={styles.dayTitle} numberOfLines={1}>
          {day.title}
        </Text>
        {isToday && (
          <Text style={[styles.todayLbl, { color }]}>AUJOURD&apos;HUI</Text>
        )}
      </View>

      {day.sessions.map((s, si) => {
        const done = doneOf(si);
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
                <Text style={styles.sessTitle} numberOfLines={1}>
                  {s.title}
                </Text>
                <Text style={styles.sessMeta}>
                  {s.exercises.length} exercice
                  {s.exercises.length > 1 ? "s" : ""}
                </Text>
              </View>
            </View>
            {done ? (
              <Ionicons name="checkmark-circle" size={22} color={colors.success} />
            ) : (
              <Ionicons name="play-circle" size={22} color={color} />
            )}
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
  todayLbl: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
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
