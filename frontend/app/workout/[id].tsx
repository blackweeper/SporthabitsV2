import { useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { AudioPlayer, createAudioPlayer } from "expo-audio";
import Svg, { Circle } from "react-native-svg";
import { colors, radius, spacing } from "@/src/theme";
import {
  getPlan,
  Plan,
  saveSession,
  SessionExerciseLog,
  SetLog,
  uid,
  WorkoutSession,
} from "@/src/utils/gym-storage";

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [logs, setLogs] = useState<SessionExerciseLog[]>([]);
  const [exIdx, setExIdx] = useState(0);
  const [startedAt] = useState(new Date().toISOString());
  const [totalRest, setTotalRest] = useState(0);

  // rest timer
  const [restOpen, setRestOpen] = useState(false);
  const [restRemaining, setRestRemaining] = useState(0);
  const [restTotal, setRestTotal] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // elapsed session timer
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    (async () => {
      const p = await getPlan(id!);
      if (!p) {
        Alert.alert("Plan introuvable");
        router.back();
        return;
      }
      setPlan(p);
      setLogs(
        p.exercises.map((ex) => ({
          exerciseId: ex.id,
          name: ex.name,
          targetSets: ex.sets,
          targetReps: ex.reps,
          targetWeight: ex.weight,
          targetRestSeconds: ex.rest_seconds,
          sets: Array.from({ length: ex.sets }, () => ({
            reps: ex.reps,
            weight: ex.weight ?? "",
            completed: false,
          })),
        })),
      );
    })();
  }, [id]);

  // session elapsed timer
  useEffect(() => {
    const int = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(int);
  }, [startedAt]);

  // rest timer tick
  useEffect(() => {
    if (!restOpen) return;
    timerRef.current = setInterval(() => {
      setRestRemaining((r) => {
        if (r <= 1) {
          onRestDone();
          return 0;
        }
        return r - 1;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [restOpen]);

  async function onRestDone() {
    if (timerRef.current) clearInterval(timerRef.current);
    setRestOpen(false);
    setTotalRest((t) => t + restTotal);
    // Triple haptic pulse to signal rest end
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      120,
    );
    setTimeout(
      () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy),
      260,
    );
  }

  function startRest(seconds: number) {
    setRestTotal(seconds);
    setRestRemaining(seconds);
    setRestOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function skipRest() {
    if (timerRef.current) clearInterval(timerRef.current);
    setTotalRest((t) => t + (restTotal - restRemaining));
    setRestOpen(false);
  }

  function addTime(sec: number) {
    setRestRemaining((r) => Math.max(1, r + sec));
    setRestTotal((t) => t + sec);
  }

  function toggleSet(exI: number, setI: number) {
    setLogs((prev) => {
      const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
      const s = copy[exI].sets[setI];
      copy[exI].sets[setI] = { ...s, completed: !s.completed };
      // if just completed → start rest timer
      if (!s.completed) {
        const rest = copy[exI].targetRestSeconds || 60;
        startRest(rest);
      }
      return copy;
    });
  }

  function updateSet(exI: number, setI: number, patch: Partial<SetLog>) {
    setLogs((prev) => {
      const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
      copy[exI].sets[setI] = { ...copy[exI].sets[setI], ...patch };
      return copy;
    });
  }

  async function finishWorkout() {
    if (!plan) return;
    Alert.alert("Terminer la séance ?", "Ta séance sera enregistrée.", [
      { text: "Annuler", style: "cancel" },
      {
        text: "Terminer",
        style: "destructive",
        onPress: async () => {
          const endedAt = new Date().toISOString();
          const durationSeconds = Math.floor(
            (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
          );
          const session: WorkoutSession = {
            id: uid(),
            planId: plan.id,
            planTitle: plan.title,
            startedAt,
            endedAt,
            durationSeconds,
            totalRestSeconds: totalRest + (restOpen ? restTotal - restRemaining : 0),
            exercises: logs,
          };
          await saveSession(session);
          router.replace("/(tabs)/history");
        },
      },
    ]);
  }

  const currentEx = logs[exIdx];

  if (!plan || !currentEx) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={{ color: "#fff", padding: 20 }}>Chargement…</Text>
      </SafeAreaView>
    );
  }

  const completedSets = currentEx.sets.filter((s) => s.completed).length;
  const totalCompleted = logs.reduce(
    (a, l) => a + l.sets.filter((s) => s.completed).length,
    0,
  );
  const totalSets = logs.reduce((a, l) => a + l.sets.length, 0);
  const progress = totalSets ? totalCompleted / totalSets : 0;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable
          testID="close-workout"
          onPress={() => {
            Alert.alert("Quitter la séance ?", "Progression non enregistrée.", [
              { text: "Rester", style: "cancel" },
              { text: "Quitter", style: "destructive", onPress: () => router.back() },
            ]);
          }}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <View style={{ alignItems: "center", flex: 1 }}>
          <Text style={styles.planTitle} numberOfLines={1}>
            {plan.title}
          </Text>
          <Text style={styles.elapsed}>{formatTime(elapsed)}</Text>
        </View>
        <Pressable testID="finish-workout" onPress={finishWorkout} hitSlop={12}>
          <Text style={styles.finishText}>FIN</Text>
        </Pressable>
      </View>

      {/* Progress bar */}
      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

      {/* Exercise switcher */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.chipsRow}
      >
        {logs.map((l, i) => {
          const done = l.sets.every((s) => s.completed);
          const active = i === exIdx;
          return (
            <Pressable
              key={l.exerciseId}
              testID={`ex-tab-${i}`}
              onPress={() => setExIdx(i)}
              style={[
                styles.exChip,
                active && styles.exChipActive,
                done && !active && styles.exChipDone,
              ]}
            >
              {done && (
                <Ionicons
                  name="checkmark-circle"
                  size={14}
                  color={active ? "#fff" : colors.success}
                />
              )}
              <Text
                style={[
                  styles.exChipText,
                  (active || done) && { color: "#fff" },
                ]}
                numberOfLines={1}
              >
                {i + 1}. {l.name}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.exHeaderCard}>
          <Text style={styles.exNameBig}>{currentEx.name}</Text>
          <Text style={styles.exMeta}>
            {currentEx.targetSets} séries × {currentEx.targetReps} reps · Repos{" "}
            {currentEx.targetRestSeconds}s
            {currentEx.targetWeight ? ` · ${currentEx.targetWeight}` : ""}
          </Text>
          <View style={styles.setProgressRow}>
            <Text style={styles.setProgressText}>
              {completedSets}/{currentEx.sets.length} séries
            </Text>
          </View>
        </View>

        {currentEx.sets.map((s, i) => (
          <View
            key={i}
            style={[styles.setRow, s.completed && styles.setRowDone]}
            testID={`set-row-${i}`}
          >
            <View style={styles.setBadge}>
              <Text style={styles.setBadgeText}>{i + 1}</Text>
            </View>
            <View style={styles.setInputs}>
              <View style={styles.setInputBlock}>
                <Text style={styles.setInputLabel}>REPS</Text>
                <TextInput
                  testID={`set-reps-${i}`}
                  style={styles.setInput}
                  value={s.reps}
                  onChangeText={(t) => updateSet(exIdx, i, { reps: t })}
                  placeholder="—"
                  placeholderTextColor={colors.onSurfaceTertiary}
                />
              </View>
              <View style={styles.setInputBlock}>
                <Text style={styles.setInputLabel}>POIDS</Text>
                <TextInput
                  testID={`set-weight-${i}`}
                  style={styles.setInput}
                  value={s.weight}
                  onChangeText={(t) => updateSet(exIdx, i, { weight: t })}
                  placeholder="—"
                  placeholderTextColor={colors.onSurfaceTertiary}
                />
              </View>
            </View>
            <Pressable
              testID={`toggle-set-${i}`}
              onPress={() => toggleSet(exIdx, i)}
              style={[styles.checkBtn, s.completed && styles.checkBtnDone]}
            >
              <Ionicons
                name={s.completed ? "checkmark" : "checkmark"}
                size={22}
                color={s.completed ? "#fff" : colors.onSurfaceTertiary}
              />
            </Pressable>
          </View>
        ))}

        {/* Next / Prev exercise */}
        <View style={styles.navRow}>
          <Pressable
            testID="prev-ex"
            disabled={exIdx === 0}
            style={[styles.navBtn, exIdx === 0 && { opacity: 0.4 }]}
            onPress={() => setExIdx((i) => Math.max(0, i - 1))}
          >
            <Ionicons name="chevron-back" size={18} color="#fff" />
            <Text style={styles.navText}>PRÉCÉDENT</Text>
          </Pressable>
          <Pressable
            testID="next-ex"
            disabled={exIdx === logs.length - 1}
            style={[
              styles.navBtn,
              styles.navBtnPrimary,
              exIdx === logs.length - 1 && { opacity: 0.4 },
            ]}
            onPress={() => setExIdx((i) => Math.min(logs.length - 1, i + 1))}
          >
            <Text style={styles.navText}>SUIVANT</Text>
            <Ionicons name="chevron-forward" size={18} color="#fff" />
          </Pressable>
        </View>
        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Rest timer modal */}
      <Modal visible={restOpen} animationType="slide" transparent>
        <View style={styles.restBackdrop}>
          <View style={styles.restSheet}>
            <Text style={styles.restLabel}>TEMPS DE PAUSE</Text>
            <RestCircle
              remaining={restRemaining}
              total={Math.max(1, restTotal)}
            />
            <View style={styles.restBtnsRow}>
              <Pressable
                testID="rest-minus"
                style={styles.restCtl}
                onPress={() => addTime(-15)}
              >
                <Text style={styles.restCtlText}>-15s</Text>
              </Pressable>
              <Pressable
                testID="rest-plus"
                style={styles.restCtl}
                onPress={() => addTime(15)}
              >
                <Text style={styles.restCtlText}>+15s</Text>
              </Pressable>
            </View>
            <Pressable
              testID="rest-skip"
              style={styles.skipBtn}
              onPress={skipRest}
            >
              <Ionicons name="play-skip-forward" size={18} color="#fff" />
              <Text style={styles.skipText}>PASSER LA PAUSE</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function RestCircle({
  remaining,
  total,
}: {
  remaining: number;
  total: number;
}) {
  const size = 240;
  const strokeWidth = 12;
  const radius = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * radius;
  const pct = remaining / total;
  const offset = circ * (1 - pct);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.surfaceTertiary}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={colors.brand}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ},${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={styles.restBig}>{remaining}</Text>
      <Text style={styles.restUnit}>SECONDES</Text>
    </View>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  planTitle: { color: colors.onSurface, fontSize: 14, fontWeight: "600" },
  elapsed: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 2,
  },
  finishText: {
    color: colors.error,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  progressBg: {
    height: 3,
    backgroundColor: colors.surfaceTertiary,
    marginHorizontal: spacing.lg,
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: colors.brand,
  },
  chipsRow: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  exChip: {
    flexShrink: 0,
    height: 36,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 220,
  },
  exChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  exChipDone: {
    backgroundColor: "#0F2F1A",
    borderColor: colors.success,
  },
  exChipText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  exHeaderCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.sm,
  },
  exNameBig: { color: colors.onSurface, fontSize: 24, fontWeight: "800" },
  exMeta: { color: colors.onSurfaceTertiary, fontSize: 12 },
  setProgressRow: { marginTop: 4 },
  setProgressText: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 12,
    letterSpacing: 0.5,
  },
  setRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  setRowDone: {
    backgroundColor: "#0F2F1A",
    borderColor: colors.success,
    opacity: 0.85,
  },
  setBadge: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
  },
  setBadgeText: { color: colors.onSurface, fontWeight: "800" },
  setInputs: { flex: 1, flexDirection: "row", gap: spacing.sm },
  setInputBlock: { flex: 1 },
  setInputLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    letterSpacing: 1,
    marginBottom: 2,
  },
  setInput: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    padding: 8,
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "600",
  },
  checkBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceTertiary,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
  },
  checkBtnDone: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  navRow: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  navBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  navBtnPrimary: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  navText: { color: "#fff", fontWeight: "800", fontSize: 12, letterSpacing: 0.8 },

  restBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  restSheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.lg,
    paddingBottom: 40,
  },
  restLabel: {
    color: colors.brand,
    fontWeight: "800",
    letterSpacing: 3,
    fontSize: 12,
  },
  restBig: {
    color: colors.onSurface,
    fontSize: 84,
    fontWeight: "800",
    lineHeight: 90,
  },
  restUnit: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 4,
  },
  restBtnsRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  restCtl: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  restCtlText: {
    color: colors.onSurface,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  skipBtn: {
    backgroundColor: colors.brand,
    paddingVertical: 16,
    paddingHorizontal: spacing.xl2,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  skipText: { color: "#fff", fontWeight: "800", letterSpacing: 1 },
});
