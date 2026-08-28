import { useEffect, useRef, useState } from "react";
import { View, Text, StyleSheet, Pressable, Modal, Animated } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import * as Haptics from "expo-haptics";
import { coloredShadow, spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import { Habit, setHabitValue, todayYYYYMMDD } from "@/src/utils/gym-storage";
import { speak } from "@/src/utils/audio";
import {
  ActiveHabitTimer,
  clearActiveHabitTimer,
  computeElapsedMs,
  getActiveHabitTimer,
  saveActiveHabitTimer,
} from "@/src/utils/habit-timer";

export default function HabitTimerModal({
  habit,
  visible,
  onClose,
  onCompleted,
}: {
  habit: Habit | null;
  visible: boolean;
  onClose: () => void;
  onCompleted: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [timer, setTimer] = useState<ActiveHabitTimer | null>(null);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [done, setDone] = useState(false);
  const successScale = useRef(new Animated.Value(0)).current;
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Load (or resume) the timer whenever the modal opens for a habit.
  useEffect(() => {
    if (!visible || !habit) return;
    setDone(false);
    successScale.setValue(0);
    (async () => {
      const target = Math.max(1, habit.target ?? 1) * 60;
      const existing = await getActiveHabitTimer();
      let t: ActiveHabitTimer;
      if (existing && existing.habitId === habit.id) {
        t = existing;
      } else {
        t = {
          habitId: habit.id,
          habitTitle: habit.title,
          color: habit.color ?? theme.colors.brand,
          targetSeconds: target,
          status: "running",
          baseMs: 0,
          runStartedAt: new Date().toISOString(),
        };
        await saveActiveHabitTimer(t);
      }
      setTimer(t);
      setElapsedMs(computeElapsedMs(t));
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, habit?.id]);

  // Tick every 250ms — always recomputed from wall-clock time, so drift or
  // background throttling (tab backgrounded, app suspended) self-corrects
  // the instant the timer becomes visible again.
  useEffect(() => {
    if (!timer || timer.status !== "running") {
      if (tickRef.current) clearInterval(tickRef.current);
      return;
    }
    tickRef.current = setInterval(() => {
      const ms = computeElapsedMs(timer);
      setElapsedMs(ms);
      if (ms >= timer.targetSeconds * 1000) complete();
    }, 250);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timer]);

  async function complete() {
    if (!habit || !timer) return;
    if (tickRef.current) clearInterval(tickRef.current);
    await setHabitValue(habit.id, todayYYYYMMDD(), Math.max(1, habit.target ?? 1));
    await clearActiveHabitTimer();
    setDone(true);
    setElapsedMs(timer.targetSeconds * 1000);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    speak(`Bravo, ${habit.title.toLowerCase()} terminé`);
    Animated.spring(successScale, {
      toValue: 1,
      useNativeDriver: true,
      friction: 5,
    }).start();
    setTimeout(() => {
      onCompleted();
    }, 1600);
  }

  async function pause() {
    if (!timer) return;
    const next: ActiveHabitTimer = {
      ...timer,
      status: "paused",
      baseMs: computeElapsedMs(timer),
      runStartedAt: null,
    };
    await saveActiveHabitTimer(next);
    setTimer(next);
    setElapsedMs(next.baseMs);
  }

  async function resume() {
    if (!timer) return;
    const next: ActiveHabitTimer = {
      ...timer,
      status: "running",
      runStartedAt: new Date().toISOString(),
    };
    await saveActiveHabitTimer(next);
    setTimer(next);
  }

  async function stop() {
    await clearActiveHabitTimer();
    setTimer(null);
    onClose();
  }

  if (!habit || !timer) return null;

  const remainingSec = Math.max(
    0,
    Math.ceil(timer.targetSeconds - elapsedMs / 1000),
  );
  const pct = Math.min(1, elapsedMs / (timer.targetSeconds * 1000));
  const color = timer.color;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <GlassCard
          level="elevated"
          style={[
            styles.sheet,
            theme.card.mode !== "glass" && { backgroundColor: theme.colors.surfaceSecondary },
            { paddingBottom: 48 + insets.bottom },
          ]}
        >
          {!done ? (
            <>
              <Text style={[styles.title, { color: theme.colors.onSurface }]}>{habit.title}</Text>
              <TimerRing pct={pct} color={color} label={formatTime(remainingSec)} trackColor={theme.colors.surfaceTertiary} labelColor={theme.colors.onSurface} unitColor={theme.colors.onSurfaceTertiary} />
              <Text style={[styles.hint, { color: theme.colors.onSurfaceTertiary }]}>
                Objectif : {Math.max(1, habit.target ?? 1)} min
              </Text>
              <View style={styles.controlsRow}>
                <Pressable
                  testID="habit-timer-stop"
                  style={[
                    styles.ctlBtn,
                    {
                      borderRadius: theme.radius.md,
                      backgroundColor: theme.colors.surfaceTertiary,
                      borderColor: theme.colors.border,
                    },
                  ]}
                  onPress={stop}
                >
                  <Ionicons name="stop" size={20} color={theme.colors.onSurface} />
                  <Text style={[styles.ctlBtnText, { color: theme.colors.onSurface }]}>ARRÊTER</Text>
                </Pressable>
                {timer.status === "running" ? (
                  <Pressable
                    testID="habit-timer-pause"
                    style={[
                      styles.ctlBtn,
                      styles.ctlBtnPrimary,
                      { borderRadius: theme.radius.md },
                      theme.card.mode === "glass"
                        ? [
                            { backgroundColor: withAlpha(color, 20), borderWidth: 1, borderColor: withAlpha(color, 50) },
                            coloredShadow(color, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                          ]
                        : { backgroundColor: color },
                    ]}
                    onPress={pause}
                  >
                    <Ionicons name="pause" size={20} color={theme.card.mode === "glass" ? color : "#fff"} />
                    <Text style={[styles.ctlBtnText, { color: theme.card.mode === "glass" ? color : "#fff" }]}>PAUSE</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    testID="habit-timer-resume"
                    style={[
                      styles.ctlBtn,
                      styles.ctlBtnPrimary,
                      { borderRadius: theme.radius.md },
                      theme.card.mode === "glass"
                        ? [
                            { backgroundColor: withAlpha(color, 20), borderWidth: 1, borderColor: withAlpha(color, 50) },
                            coloredShadow(color, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                          ]
                        : { backgroundColor: color },
                    ]}
                    onPress={resume}
                  >
                    <Ionicons name="play" size={20} color={theme.card.mode === "glass" ? color : "#fff"} />
                    <Text style={[styles.ctlBtnText, { color: theme.card.mode === "glass" ? color : "#fff" }]}>REPRENDRE</Text>
                  </Pressable>
                )}
              </View>
            </>
          ) : (
            <View style={styles.successBox}>
              <Animated.View
                style={[
                  styles.successCircle,
                  { backgroundColor: color, transform: [{ scale: successScale }] },
                ]}
              >
                <Ionicons name="checkmark" size={48} color="#fff" />
              </Animated.View>
              <Text style={[styles.successTitle, { color: theme.colors.onSurface }]}>Habitude terminée !</Text>
              <Text style={[styles.successSub, { color: theme.colors.onSurfaceTertiary }]}>{habit.title}</Text>
            </View>
          )}
        </GlassCard>
      </View>
    </Modal>
  );
}

function TimerRing({
  pct,
  color,
  label,
  trackColor,
  labelColor,
  unitColor,
}: {
  pct: number;
  color: string;
  label: string;
  trackColor: string;
  labelColor: string;
  unitColor: string;
}) {
  const size = 220;
  const strokeWidth = 14;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - pct);
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={trackColor}
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={`${circ},${circ}`}
          strokeDashoffset={offset}
          strokeLinecap="round"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <Text style={[styles.ringLabel, { color: labelColor }]}>{label}</Text>
      <Text style={[styles.ringUnit, { color: unitColor }]}>RESTANT</Text>
    </View>
  );
}

function formatTime(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "flex-end",
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: spacing.xl,
    alignItems: "center",
    gap: spacing.lg,
    paddingBottom: 48,
    minHeight: 420,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
  },
  hint: {
    fontSize: 12,
    fontWeight: "600",
  },
  ringLabel: {
    fontSize: 44,
    fontWeight: "800",
  },
  ringUnit: {
    fontSize: 11,
    letterSpacing: 2,
    marginTop: 2,
  },
  controlsRow: {
    flexDirection: "row",
    gap: spacing.md,
    width: "100%",
  },
  ctlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 16,
    borderWidth: 1,
  },
  ctlBtnPrimary: { borderWidth: 0 },
  ctlBtnText: {
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.6,
  },
  successBox: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  successCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 20,
    fontWeight: "800",
  },
  successSub: {
    fontSize: 13,
    fontWeight: "600",
  },
});
