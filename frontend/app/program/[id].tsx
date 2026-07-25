import { useCallback, useEffect, useState } from "react";
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
  getProgram,
  LEVEL_LABEL,
  ProgramDay,
} from "@/src/data/programs";
import {
  ActiveProgram,
  currentDayIndex,
  findOrCreateProgramPlan,
  getActiveProgram,
  setActiveProgram,
  uid,
} from "@/src/utils/gym-storage";

export default function ProgramDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const program = getProgram(id!);
  const [active, setActive] = useState<ActiveProgram | null>(null);

  const load = useCallback(async () => {
    setActive(await getActiveProgram());
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  if (!program) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.loading}>Programme introuvable</Text>
      </SafeAreaView>
    );
  }

  const isActive = active?.programId === program.id;
  const todayIdx = isActive ? currentDayIndex(active!, program.durationDays) : 1;

  const start = async () => {
    const doStart = async () => {
      await setActiveProgram({
        programId: program.id,
        startedAt: new Date().toISOString(),
        completedDayIndexes: [],
      });
      load();
    };
    if (active && active.programId !== program.id) {
      const msg =
        "Tu as déjà un programme actif. Le remplacer par celui-ci ?";
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
    const msg = "Arrêter ce programme ? Tes séances déjà faites resteront dans l'historique.";
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

  async function launchDay(dayIndex: number) {
    const day = program.days[dayIndex - 1];
    if (day.rest) return;
    const plan = await findOrCreateProgramPlan(
      program.id,
      dayIndex,
      () => ({
        title: `${program.title} · J${dayIndex} — ${day.title}`,
        type: 'mixte',
        createdAt: new Date().toISOString(),
        programSource: { programId: program.id, dayIndex },
        exercises: day.exercises.map((e) => ({ ...e, id: uid() })),
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
        <View style={{ width: 24 }} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Program hero */}
        <View style={[styles.hero, { borderColor: program.color }]}>
          <View
            style={[styles.emojiBox, { backgroundColor: `${program.color}30` }]}
          >
            <Text style={{ fontSize: 44 }}>{program.coverEmoji}</Text>
          </View>
          <View style={styles.heroTags}>
            <View style={[styles.tag, { backgroundColor: program.color }]}>
              <Text style={styles.tagText}>{LEVEL_LABEL[program.level]}</Text>
            </View>
            <View style={styles.tag}>
              <Text style={styles.tagText}>{program.durationDays} JOURS</Text>
            </View>
          </View>
          <Text style={styles.heroGoal}>{program.goal.toUpperCase()}</Text>
          <Text style={styles.heroDesc}>{program.description}</Text>
        </View>

        {/* Active state banner */}
        {isActive ? (
          <View style={styles.activeBanner}>
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
            <View style={{ flex: 1 }}>
              <Text style={styles.activeTitle}>Programme en cours</Text>
              <Text style={styles.activeSub}>
                Jour {todayIdx}/{program.durationDays} · {active!.completedDayIndexes.length} séances terminées
              </Text>
            </View>
            <Pressable testID="stop-program" onPress={stop} hitSlop={10}>
              <Ionicons
                name="stop-circle"
                size={22}
                color={colors.error}
              />
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

        {/* Day list */}
        <Text style={styles.sectionTitle}>Planning ({program.durationDays} jours)</Text>
        <View style={styles.daysList}>
          {program.days.map((day, i) => {
            const dayIndex = i + 1;
            const done = active?.completedDayIndexes.includes(dayIndex);
            const isToday = isActive && dayIndex === todayIdx;
            return (
              <ProgramDayRow
                key={dayIndex}
                dayIndex={dayIndex}
                day={day}
                done={!!done}
                isToday={!!isToday}
                onPress={() => launchDay(dayIndex)}
                color={program.color}
              />
            );
          })}
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgramDayRow({
  dayIndex,
  day,
  done,
  isToday,
  onPress,
  color,
}: {
  dayIndex: number;
  day: ProgramDay;
  done: boolean;
  isToday: boolean;
  onPress: () => void;
  color: string;
}) {
  return (
    <Pressable
      testID={`day-${dayIndex}`}
      style={[
        styles.dayRow,
        isToday && { borderColor: color, borderWidth: 2 },
        day.rest && styles.dayRowRest,
      ]}
      onPress={day.rest ? undefined : onPress}
      disabled={day.rest}
    >
      <View
        style={[
          styles.dayIndex,
          done && { backgroundColor: colors.success },
          isToday && !done && { backgroundColor: color },
          day.rest && { backgroundColor: colors.surfaceTertiary },
        ]}
      >
        {done ? (
          <Ionicons name="checkmark" size={16} color="#fff" />
        ) : (
          <Text
            style={[
              styles.dayIndexText,
              isToday && { color: "#fff" },
              day.rest && { color: colors.onSurfaceTertiary },
            ]}
          >
            {dayIndex}
          </Text>
        )}
      </View>
      <View style={{ flex: 1 }}>
        <Text
          style={[
            styles.dayTitle,
            day.rest && { color: colors.onSurfaceTertiary },
          ]}
          numberOfLines={1}
        >
          {day.title}
        </Text>
        {!day.rest && (
          <Text style={styles.daySub}>
            {day.exercises.length} exercice
            {day.exercises.length > 1 ? "s" : ""}
          </Text>
        )}
        {isToday && !done && (
          <Text style={[styles.todayLbl, { color }]}>AUJOURD&apos;HUI</Text>
        )}
      </View>
      {!day.rest && (
        <Ionicons name="play-circle" size={22} color={color} />
      )}
      {day.rest && (
        <Ionicons name="bed" size={18} color={colors.onSurfaceTertiary} />
      )}
    </Pressable>
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
  heroTags: { flexDirection: "row", gap: 6 },
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
  heroDesc: { color: colors.onSurfaceSecondary, fontSize: 13, lineHeight: 18 },
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
  startBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: 18,
    borderRadius: radius.md,
    gap: spacing.sm,
  },
  startText: {
    color: "#fff",
    fontWeight: "800",
    letterSpacing: 1,
  },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.6,
    marginTop: spacing.md,
  },
  daysList: { gap: spacing.sm },
  dayRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dayRowRest: {
    backgroundColor: colors.surface,
  },
  dayIndex: {
    width: 34,
    height: 34,
    borderRadius: 10,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  dayIndexText: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  dayTitle: { color: colors.onSurface, fontWeight: "600", fontSize: 13 },
  daySub: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    marginTop: 2,
  },
  todayLbl: {
    fontSize: 10,
    letterSpacing: 1,
    fontWeight: "800",
    marginTop: 3,
  },
});
