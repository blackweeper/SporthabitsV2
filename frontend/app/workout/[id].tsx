import { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Alert,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import Svg, { Circle } from "react-native-svg";
import { colors, radius, spacing } from "@/src/theme";
import ExercisePicture from "@/src/components/ExercisePicture";
import {
  speak,
  speakGo,
  speakNumber,
  speakStop,
} from "@/src/utils/audio";
import {
  estimateCalories,
  getPlan,
  getProfile,
  markProgramSessionCompleted,
  Plan,
  saveSession,
  SessionExerciseLog,
  SetLog,
  uid,
  WorkoutSession,
} from "@/src/utils/gym-storage";

type OverlayMode = null | "rest" | "work" | "amrap";

export default function WorkoutScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [logs, setLogs] = useState<SessionExerciseLog[]>([]);
  const [exIdx, setExIdx] = useState(0);
  const [startedAt] = useState(new Date().toISOString());
  const [totalRest, setTotalRest] = useState(0);

  // Overlay timer (rest / work / amrap)
  const [overlay, setOverlay] = useState<OverlayMode>(null);
  const [overlayRemaining, setOverlayRemaining] = useState(0);
  const [overlayTotal, setOverlayTotal] = useState(0);
  const [overlaySetIdx, setOverlaySetIdx] = useState<number | null>(null);
  const [amrapRounds, setAmrapRounds] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
          mode: ex.mode,
          targetSets: ex.sets,
          targetReps: ex.reps,
          targetWeight: ex.weight,
          targetRestSeconds: ex.rest_seconds,
          targetDurationSeconds: ex.duration_seconds,
          sets: Array.from({ length: ex.sets }, () => ({
            reps: ex.mode === "amrap" ? "0" : ex.reps,
            weight: ex.weight ?? "",
            completed: false,
          })),
        })),
      );
    })();
  }, [id]);

  useEffect(() => {
    const int = setInterval(() => {
      setElapsed(Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000));
    }, 1000);
    return () => clearInterval(int);
  }, [startedAt]);

  useEffect(() => {
    if (!overlay) return;
    timerRef.current = setInterval(() => {
      setOverlayRemaining((r) => {
        if (r <= 1) {
          onOverlayComplete();
          return 0;
        }
        const next = r - 1;
        // Voice countdown cues
        if (next === 10) {
          if (overlay === "work") {
            speak("10 secondes");
          } else if (overlay === "rest") {
            speak("10 secondes, prochain exercice");
          } else if (overlay === "amrap") {
            speak("10 secondes");
          }
        } else if (next > 0 && next <= 3) {
          speakNumber(next);
        }
        return next;
      });
    }, 1000);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [overlay]);

  // Announce workout start once loaded
  useEffect(() => {
    if (plan && logs.length > 0 && elapsed === 0) {
      speakGo("C'est parti !");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [plan?.id]);

  function haptic() {
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

  function onOverlayComplete() {
    if (timerRef.current) clearInterval(timerRef.current);
    haptic();
    if (overlay === "rest") {
      setTotalRest((t) => t + overlayTotal);
      speak("Go");
    } else if (overlay === "work" && overlaySetIdx !== null) {
      const currentLog = logs[exIdx];
      // Mark set as completed after timed effort
      const nextSetIdx = overlaySetIdx + 1;
      setLogs((prev) => {
        const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
        copy[exIdx].sets[overlaySetIdx!] = {
          ...copy[exIdx].sets[overlaySetIdx!],
          completed: true,
        };
        return copy;
      });
      // EMOM: auto-chain to next round without rest
      if (
        currentLog?.mode === "emom" &&
        nextSetIdx < currentLog.sets.length
      ) {
        const dur = currentLog.targetDurationSeconds || 60;
        speak(`Round ${nextSetIdx + 1}`);
        setOverlaySetIdx(nextSetIdx);
        setOverlayTotal(dur);
        setOverlayRemaining(dur);
        return;
      }
      // TIME mode: chain rest if configured
      const rest = currentLog?.targetRestSeconds || 0;
      if (rest > 0 && currentLog?.mode === "time") {
        speak("Repos");
        setOverlaySetIdx(null);
        setOverlay("rest");
        setOverlayTotal(rest);
        setOverlayRemaining(rest);
        return;
      }
    } else if (overlay === "amrap" && overlaySetIdx !== null) {
      setLogs((prev) => {
        const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
        copy[exIdx].sets[overlaySetIdx!] = {
          ...copy[exIdx].sets[overlaySetIdx!],
          reps: String(amrapRounds),
          completed: true,
        };
        return copy;
      });
    }
    setOverlay(null);
    setOverlaySetIdx(null);
    setAmrapRounds(0);
  }

  function startRest(seconds: number) {
    setOverlayTotal(seconds);
    setOverlayRemaining(seconds);
    setOverlay("rest");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function startWork(setIdx: number, seconds: number) {
    setOverlaySetIdx(setIdx);
    setOverlayTotal(seconds);
    setOverlayRemaining(seconds);
    setOverlay("work");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function startAmrap(setIdx: number, seconds: number) {
    setOverlaySetIdx(setIdx);
    setOverlayTotal(seconds);
    setOverlayRemaining(seconds);
    setAmrapRounds(0);
    setOverlay("amrap");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  }

  function skipOverlay() {
    if (timerRef.current) clearInterval(timerRef.current);
    speakStop();
    if (overlay === "rest") {
      setTotalRest((t) => t + (overlayTotal - overlayRemaining));
    } else if (
      (overlay === "work" || overlay === "amrap") &&
      overlaySetIdx !== null
    ) {
      // still mark the set as completed if user skips a work timer
      setLogs((prev) => {
        const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
        copy[exIdx].sets[overlaySetIdx] = {
          ...copy[exIdx].sets[overlaySetIdx],
          reps:
            overlay === "amrap"
              ? String(amrapRounds)
              : copy[exIdx].sets[overlaySetIdx].reps,
          completed: true,
        };
        return copy;
      });
    }
    setOverlay(null);
    setOverlaySetIdx(null);
    setAmrapRounds(0);
  }

  function addTime(sec: number) {
    setOverlayRemaining((r) => Math.max(1, r + sec));
    setOverlayTotal((t) => t + sec);
  }

  function toggleSet(exI: number, setI: number) {
    const ex = logs[exI];
    if (!ex) return;
    // For time/amrap/emom, tapping the check button opens the timer instead of toggling directly
    if (
      !ex.sets[setI].completed &&
      (ex.mode === "time" || ex.mode === "amrap" || ex.mode === "emom")
    ) {
      const dur = ex.targetDurationSeconds || (ex.mode === "emom" ? 60 : 300);
      if (ex.mode === "time" || ex.mode === "emom") {
        if (ex.mode === "emom") speak(`Round ${setI + 1}`);
        startWork(setI, dur);
      } else startAmrap(setI, dur);
      return;
    }
    setLogs((prev) => {
      const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
      const s = copy[exI].sets[setI];
      copy[exI].sets[setI] = { ...s, completed: !s.completed };
      if (!s.completed && ex.mode === "reps") {
        const rest = ex.targetRestSeconds || 60;
        if (rest > 0) startRest(rest);
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
    const doFinish = async () => {
      const endedAt = new Date().toISOString();
      const durationSeconds = Math.floor(
        (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
      );
      const restTotalFinal =
        totalRest +
        (overlay === "rest" ? overlayTotal - overlayRemaining : 0);
      const profile = await getProfile();
      const bodyMass = profile.weight_kg && profile.weight_kg > 0 ? profile.weight_kg : 70;
      const session: WorkoutSession = {
        id: uid(),
        planId: plan.id,
        planTitle: plan.title,
        planType: plan.type,
        startedAt,
        endedAt,
        durationSeconds,
        totalRestSeconds: restTotalFinal,
        caloriesBurned: estimateCalories(plan.type, durationSeconds, bodyMass),
        exercises: logs,
      };
      await saveSession(session);
      // If this was a program day, mark it completed
      if (plan.programSource) {
        await markProgramSessionCompleted(
          plan.programSource.programId,
          plan.programSource.dayIndex,
          plan.programSource.sessionIndex ?? 0,
        );
      }
      router.replace(`/session/${session.id}`);
    };
    if (Platform.OS === "web") {
      if (
        typeof window !== "undefined" &&
        window.confirm("Terminer la séance ? Ta séance sera enregistrée.")
      ) {
        await doFinish();
      }
      return;
    }
    Alert.alert("Terminer la séance ?", "Ta séance sera enregistrée.", [
      { text: "Annuler", style: "cancel" },
      { text: "Terminer", style: "destructive", onPress: doFinish },
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
      <View style={styles.header}>
        <Pressable
          testID="close-workout"
          onPress={() => {
            const doQuit = () => {
              speakStop();
              router.back();
            };
            if (Platform.OS === "web") {
              if (
                typeof window !== "undefined" &&
                window.confirm("Quitter la séance ? Progression non enregistrée.")
              ) {
                doQuit();
              }
              return;
            }
            Alert.alert("Quitter la séance ?", "Progression non enregistrée.", [
              { text: "Rester", style: "cancel" },
              {
                text: "Quitter",
                style: "destructive",
                onPress: doQuit,
              },
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

      <View style={styles.progressBg}>
        <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
      </View>

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
          <View style={styles.modeBadgeRow}>
            <View style={styles.modeBadge}>
              <Text style={styles.modeBadgeText}>
                {currentEx.mode.toUpperCase()}
              </Text>
            </View>
          </View>
          <View style={styles.exTitleRow}>
            <ExercisePicture
              photoBase64={
                plan?.exercises.find((e) => e.id === currentEx.exerciseId)?.photoBase64
              }
              iconKey={
                plan?.exercises.find((e) => e.id === currentEx.exerciseId)?.iconKey
              }
              name={currentEx.name}
              size={56}
            />
            <View style={{ flex: 1 }}>
              <Text style={styles.exNameBig}>{currentEx.name}</Text>
              <Text style={styles.exMeta}>{describeTarget(currentEx)}</Text>
            </View>
          </View>
          <View style={styles.setProgressRow}>
            <Text style={styles.setProgressText}>
              {completedSets}/{currentEx.sets.length}{" "}
              {currentEx.mode === "amrap" ? "AMRAP" : "séries"}
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
              {currentEx.mode === "reps" && (
                <>
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
                </>
              )}
              {currentEx.mode === "time" && (
                <View style={styles.setInputBlock}>
                  <Text style={styles.setInputLabel}>DURÉE</Text>
                  <Text style={styles.timeDisplay}>
                    {formatDur(currentEx.targetDurationSeconds ?? 0)}
                  </Text>
                </View>
              )}
              {currentEx.mode === "emom" && (
                <>
                  <View style={styles.setInputBlock}>
                    <Text style={styles.setInputLabel}>ROUND</Text>
                    <Text style={styles.timeDisplay}>
                      {i + 1}/{currentEx.sets.length}
                    </Text>
                  </View>
                  <View style={styles.setInputBlock}>
                    <Text style={styles.setInputLabel}>REPS</Text>
                    <TextInput
                      testID={`emom-reps-${i}`}
                      style={styles.setInput}
                      value={s.reps}
                      keyboardType="number-pad"
                      onChangeText={(t) => updateSet(exIdx, i, { reps: t })}
                      placeholder={currentEx.targetReps}
                      placeholderTextColor={colors.onSurfaceTertiary}
                    />
                  </View>
                </>
              )}
              {currentEx.mode === "amrap" && (
                <>
                  <View style={styles.setInputBlock}>
                    <Text style={styles.setInputLabel}>DURÉE</Text>
                    <Text style={styles.timeDisplay}>
                      {formatDur(currentEx.targetDurationSeconds ?? 0)}
                    </Text>
                  </View>
                  <View style={styles.setInputBlock}>
                    <Text style={styles.setInputLabel}>TOURS</Text>
                    <TextInput
                      testID={`set-rounds-${i}`}
                      style={styles.setInput}
                      value={s.reps}
                      keyboardType="number-pad"
                      onChangeText={(t) => updateSet(exIdx, i, { reps: t })}
                      placeholder="0"
                      placeholderTextColor={colors.onSurfaceTertiary}
                    />
                  </View>
                </>
              )}
            </View>
            <Pressable
              testID={`toggle-set-${i}`}
              onPress={() => toggleSet(exIdx, i)}
              style={[styles.checkBtn, s.completed && styles.checkBtnDone]}
            >
              {currentEx.mode !== "reps" && !s.completed ? (
                <Ionicons name="play" size={20} color={colors.brand} />
              ) : (
                <Ionicons
                  name="checkmark"
                  size={22}
                  color={s.completed ? "#fff" : colors.onSurfaceTertiary}
                />
              )}
            </Pressable>
          </View>
        ))}

        {currentEx.notes && (
          <View style={styles.notesBox}>
            <Ionicons name="information-circle" size={14} color={colors.brand} />
            <Text style={styles.notesText}>{currentEx.notes}</Text>
          </View>
        )}

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

      {/* Timer overlay: rest / work / amrap */}
      <Modal visible={overlay !== null} animationType="slide" transparent>
        <View style={styles.restBackdrop}>
          <View style={styles.restSheet}>
            <Text
              style={[
                styles.restLabel,
                overlay === "work" &&
                  currentEx.mode === "emom" && { color: colors.warning },
                overlay === "work" &&
                  currentEx.mode !== "emom" && { color: colors.success },
                overlay === "amrap" && { color: colors.warning },
              ]}
            >
              {overlay === "rest"
                ? "TEMPS DE PAUSE"
                : overlay === "work"
                  ? currentEx.mode === "emom"
                    ? `EMOM · ROUND ${(overlaySetIdx ?? 0) + 1}/${currentEx.sets.length}`
                    : `EFFORT · ${currentEx.name.toUpperCase()}`
                  : `AMRAP · ${currentEx.name.toUpperCase()}`}
            </Text>
            <TimerCircle
              remaining={overlayRemaining}
              total={Math.max(1, overlayTotal)}
              color={
                overlay === "rest"
                  ? colors.brand
                  : overlay === "work"
                    ? currentEx.mode === "emom"
                      ? colors.warning
                      : colors.success
                    : colors.warning
              }
            />
            {overlay === "amrap" && (
              <View style={styles.amrapCounter}>
                <Pressable
                  testID="amrap-minus"
                  style={styles.roundBtn}
                  onPress={() => setAmrapRounds((r) => Math.max(0, r - 1))}
                >
                  <Ionicons name="remove" size={22} color="#fff" />
                </Pressable>
                <View style={styles.amrapRoundsBox}>
                  <Text style={styles.amrapRoundsBig}>{amrapRounds}</Text>
                  <Text style={styles.amrapRoundsLbl}>TOURS</Text>
                </View>
                <Pressable
                  testID="amrap-plus"
                  style={[styles.roundBtn, styles.roundBtnPrimary]}
                  onPress={() => {
                    setAmrapRounds((r) => r + 1);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }}
                >
                  <Ionicons name="add" size={22} color="#fff" />
                </Pressable>
              </View>
            )}
            <View style={styles.restBtnsRow}>
              <Pressable
                testID="timer-minus"
                style={styles.restCtl}
                onPress={() => addTime(-15)}
              >
                <Text style={styles.restCtlText}>-15s</Text>
              </Pressable>
              <Pressable
                testID="timer-plus"
                style={styles.restCtl}
                onPress={() => addTime(15)}
              >
                <Text style={styles.restCtlText}>+15s</Text>
              </Pressable>
            </View>
            <Pressable
              testID="timer-skip"
              style={styles.skipBtn}
              onPress={skipOverlay}
            >
              <Ionicons
                name={
                  overlay === "rest" ? "play-skip-forward" : "checkmark-done"
                }
                size={18}
                color="#fff"
              />
              <Text style={styles.skipText}>
                {overlay === "rest" ? "PASSER LA PAUSE" : "TERMINER"}
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function describeTarget(ex: SessionExerciseLog) {
  if (ex.mode === "reps") {
    return `${ex.targetSets} séries × ${ex.targetReps} reps · Repos ${ex.targetRestSeconds}s${ex.targetWeight ? ` · ${ex.targetWeight}` : ""}`;
  }
  if (ex.mode === "time") {
    return `${ex.targetSets} × ${formatDur(ex.targetDurationSeconds ?? 0)}${ex.targetRestSeconds ? ` · Repos ${ex.targetRestSeconds}s` : ""}`;
  }
  if (ex.mode === "emom") {
    return `EMOM · ${ex.targetSets} rounds × ${formatDur(ex.targetDurationSeconds ?? 60)} · ${ex.targetReps} reps`;
  }
  return `AMRAP · ${formatDur(ex.targetDurationSeconds ?? 0)}`;
}

function TimerCircle({
  remaining,
  total,
  color,
}: {
  remaining: number;
  total: number;
  color: string;
}) {
  const size = 240;
  const strokeWidth = 12;
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const pct = remaining / total;
  const offset = circ * (1 - pct);
  return (
    <View
      style={{
        width: size,
        height: size,
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Svg width={size} height={size} style={{ position: "absolute" }}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceTertiary}
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
      <Text style={styles.restBig}>
        {remaining >= 60
          ? `${Math.floor(remaining / 60)}:${String(remaining % 60).padStart(2, "0")}`
          : remaining}
      </Text>
      <Text style={styles.restUnit}>
        {remaining >= 60 ? "MIN" : "SECONDES"}
      </Text>
    </View>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function formatDur(sec: number) {
  if (sec < 60) return `${sec}s`;
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (s === 0) return `${m} min`;
  return `${m}min${s}s`;
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
  modeBadgeRow: { flexDirection: "row" },
  modeBadge: {
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  modeBadgeText: {
    color: colors.brandSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  exNameBig: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  exTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginVertical: spacing.sm,
  },
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
  timeDisplay: {
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.sm,
    padding: 8,
    color: colors.brand,
    fontSize: 15,
    fontWeight: "800",
    textAlign: "center",
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
  notesBox: {
    flexDirection: "row",
    gap: 6,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.sm,
    alignItems: "flex-start",
  },
  notesText: { color: colors.brandSecondary, flex: 1, fontSize: 12 },
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
  navText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 12,
    letterSpacing: 0.8,
  },

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
    letterSpacing: 2,
    fontSize: 12,
  },
  restBig: {
    color: colors.onSurface,
    fontSize: 72,
    fontWeight: "800",
    lineHeight: 78,
  },
  restUnit: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 3,
    marginTop: 4,
  },
  amrapCounter: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
  },
  roundBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    alignItems: "center",
    justifyContent: "center",
  },
  roundBtnPrimary: {
    backgroundColor: colors.warning,
    borderColor: colors.warning,
  },
  amrapRoundsBox: { alignItems: "center", minWidth: 90 },
  amrapRoundsBig: {
    color: colors.warning,
    fontSize: 44,
    fontWeight: "800",
  },
  amrapRoundsLbl: {
    color: colors.onSurfaceTertiary,
    letterSpacing: 2,
    fontSize: 10,
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
