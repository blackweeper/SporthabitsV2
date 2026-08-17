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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import { colors, radius, spacing, withAlpha } from "@/src/theme";
import TimerCircle from "@/src/components/TimerCircle";
import EmomLiveOverlay from "@/src/components/EmomLiveOverlay";
import ExerciseMediaFrame from "@/src/components/exercise-library/ExerciseMediaFrame";
import { useExerciseMediaSources } from "@/src/hooks/useExerciseMedia";
import { CORE_LIBRARY_ASSETS } from "@/src/data/core-library-assets.generated";
import { ExerciseRecord, getExerciseRecords } from "@/src/utils/exercise-records";
import { matchExerciseRecord } from "@/src/utils/exercise-record-match";
import { parseCompositeExerciseName, parseCompositePrefix } from "@/src/utils/composite-exercise";
import CompositeExerciseImage from "@/src/components/CompositeExerciseImage";
import { iconEmojiForExercise } from "@/src/data/exercise-icons";
import { useConfirmDialog } from "@/src/hooks/use-confirm-dialog";
import {
  speak,
  speakGo,
  speakNumber,
  speakStop,
} from "@/src/utils/audio";
import { playCountdownTick, playRoundChime } from "@/src/utils/timer-sound";
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
  const [allRecords, setAllRecords] = useState<ExerciseRecord[]>([]);
  // "photo" | "gif" — which media the hero frame shows; always resets to the
  // illustration when the user switches exercise (never carries a GIF view
  // over to an unrelated exercise).
  const [mediaMode, setMediaMode] = useState<"photo" | "gif">("photo");

  // Overlay timer (rest / work / amrap)
  const [overlay, setOverlay] = useState<OverlayMode>(null);
  const [overlayRemaining, setOverlayRemaining] = useState(0);
  const [overlayTotal, setOverlayTotal] = useState(0);
  const [overlaySetIdx, setOverlaySetIdx] = useState<number | null>(null);
  const [amrapRounds, setAmrapRounds] = useState(0);
  // What to auto-start (no interaction needed) once the current rest ends —
  // only set for timed exercises (time/amrap/emom); reps stay fully manual.
  const [pendingResume, setPendingResume] = useState<{
    exI: number;
    setIdx: number;
  } | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const [elapsed, setElapsed] = useState(0);

  const { confirm, ConfirmModal } = useConfirmDialog();

  useEffect(() => {
    (async () => {
      const p = await getPlan(id!);
      if (!p) {
        Alert.alert("Plan introuvable");
        router.back();
        return;
      }
      setPlan(p);
      setAllRecords(await getExerciseRecords());
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
          notes: ex.notes,
          emomBlock: ex.emomBlock ?? null,
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
    setMediaMode("photo");
  }, [exIdx]);

  useEffect(() => {
    if (!overlay) return;
    // L'exercice qui "gouverne" le décompte courant : pour un repos, c'est
    // celui vers lequel on reprend (pendingResume), pas celui qui vient de
    // se terminer — un repos avant un round EMOM "nouvelle génération" doit
    // déjà sonner avec les nouveaux bips, pas la voix.
    const governingEx =
      overlay === "rest" ? logs[pendingResume?.exI ?? exIdx] : logs[exIdx];
    const useTones = governingEx?.mode === "emom" && !!governingEx.emomBlock;
    timerRef.current = setInterval(() => {
      setOverlayRemaining((r) => {
        if (r <= 1) {
          onOverlayComplete();
          return 0;
        }
        const next = r - 1;
        if (useTones) {
          // Nouveau moteur EMOM : vrais bips, pas de voix — aucun signal à
          // 10s, seulement le décompte final (comportement d'un interval timer).
          if (next > 0 && next <= 3) playCountdownTick();
          return next;
        }
        // Voice countdown cues (chemin historique, inchangé)
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

  /** Start the work/amrap timer for a given exercise+set, whatever the
   *  current exIdx is — used both for manual taps and auto-advance. */
  function startSetTimer(exI: number, setIdx: number) {
    const ex = logs[exI];
    if (!ex) return;
    const dur = ex.targetDurationSeconds || (ex.mode === "emom" ? 60 : 300);
    if (ex.mode === "emom") {
      if (ex.emomBlock) playRoundChime();
      else speak(`Round ${setIdx + 1}`);
    }
    if (ex.mode === "time" || ex.mode === "emom") {
      startWork(setIdx, dur);
    } else if (ex.mode === "amrap") {
      startAmrap(setIdx, dur);
    }
  }

  /**
   * After a timed set/round completes: if the same exercise has more sets,
   * queue them; otherwise, if the next exercise is also timed, queue that.
   * Reps exercises are never auto-started — the user stays in control there.
   * Returns true if a rest or next timer was queued (caller should stop).
   */
  function chainRestAndAdvance(
    exI: number,
    currentLog: SessionExerciseLog | undefined,
    nextSetIdx: number,
  ): boolean {
    if (!currentLog) return false;
    if (nextSetIdx < currentLog.sets.length) {
      const rest = currentLog.targetRestSeconds || 0;
      if (rest > 0) {
        speak("Repos");
        setPendingResume({ exI, setIdx: nextSetIdx });
        setOverlaySetIdx(null);
        setOverlay("rest");
        setOverlayTotal(rest);
        setOverlayRemaining(rest);
      } else {
        startSetTimer(exI, nextSetIdx);
      }
      return true;
    }
    const nextExI = exI + 1;
    const nextEx = logs[nextExI];
    if (
      nextEx &&
      (nextEx.mode === "time" || nextEx.mode === "amrap" || nextEx.mode === "emom")
    ) {
      const rest = currentLog.targetRestSeconds || 0;
      if (rest > 0) {
        speak("Repos, exercice suivant");
        setPendingResume({ exI: nextExI, setIdx: 0 });
        setOverlaySetIdx(null);
        setOverlay("rest");
        setOverlayTotal(rest);
        setOverlayRemaining(rest);
      } else {
        setExIdx(nextExI);
        startSetTimer(nextExI, 0);
      }
      return true;
    }
    // Next exercise is reps-based (or there isn't one) — hand control back
    // to the user, who finishes it manually.
    if (nextEx) setExIdx(nextExI);
    return false;
  }

  function onOverlayComplete() {
    if (timerRef.current) clearInterval(timerRef.current);
    haptic();
    if (overlay === "rest") {
      setTotalRest((t) => t + overlayTotal);
      const resume = pendingResume;
      setPendingResume(null);
      if (resume) {
        speakGo("C'est parti");
        setExIdx(resume.exI);
        setOverlaySetIdx(null);
        startSetTimer(resume.exI, resume.setIdx);
        return;
      }
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
        if (currentLog.emomBlock) playRoundChime();
        else speak(`Round ${nextSetIdx + 1}`);
        setOverlaySetIdx(nextSetIdx);
        setOverlayTotal(dur);
        setOverlayRemaining(dur);
        return;
      }
      // Timed exercise: automatically chain into rest, then the next
      // set/exercise, with no interaction required.
      if (chainRestAndAdvance(exIdx, currentLog, nextSetIdx)) return;
    } else if (overlay === "amrap" && overlaySetIdx !== null) {
      const currentLog = logs[exIdx];
      setLogs((prev) => {
        const copy = prev.map((l) => ({ ...l, sets: [...l.sets] }));
        copy[exIdx].sets[overlaySetIdx!] = {
          ...copy[exIdx].sets[overlaySetIdx!],
          reps: String(amrapRounds),
          completed: true,
        };
        return copy;
      });
      if (chainRestAndAdvance(exIdx, currentLog, overlaySetIdx + 1)) return;
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
      const resume = pendingResume;
      setPendingResume(null);
      if (resume) {
        setExIdx(resume.exI);
        setOverlaySetIdx(null);
        startSetTimer(resume.exI, resume.setIdx);
        return;
      }
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
      startSetTimer(exI, setI);
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
    const ok = await confirm({
      title: "Terminer la séance ?",
      message: "Ta séance sera enregistrée.",
      confirmLabel: "TERMINER",
    });
    if (!ok) return;
    const endedAt = new Date().toISOString();
    const durationSeconds = Math.floor(
      (new Date(endedAt).getTime() - new Date(startedAt).getTime()) / 1000,
    );
    const restTotalFinal =
      totalRest + (overlay === "rest" ? overlayTotal - overlayRemaining : 0);
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
  }

  const currentEx = logs[exIdx];
  // Media resolution — must run unconditionally (before the loading early
  // return below) since `useExerciseMediaSources` is a hook. Same
  // priority pattern as the fiche: bundled illustration (zero network) >
  // network-cached illustration > null; GIF resolved independently so both
  // can be shown/toggled without one displacing the other.
  const planEx = plan?.exercises.find((e) => e.id === currentEx?.exerciseId);
  const libraryRecord = currentEx ? matchExerciseRecord(currentEx.name, allRecords) : undefined;
  const { ironflowUri, workoutxUri } = useExerciseMediaSources(libraryRecord?.id ?? null);
  const bundledIllustration = libraryRecord?.id ? CORE_LIBRARY_ASSETS[libraryRecord.id] : undefined;
  const illustrationSource =
    planEx?.photoBase64
      ? { uri: `data:image/jpeg;base64,${planEx.photoBase64}` }
      : bundledIllustration ?? (ironflowUri ? { uri: ironflowUri } : null);
  const gifSource = workoutxUri ? { uri: workoutxUri } : null;

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
  const currentSetIdx = currentEx.sets.findIndex((s) => !s.completed);
  const statChips = buildStatChips(currentEx, completedSets);
  const compositeItems = parseCompositeExerciseName(currentEx.name);
  const compositePrefix = compositeItems ? parseCompositePrefix(currentEx.name) : null;

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-workout"
          onPress={async () => {
            const ok = await confirm({
              title: "Quitter la séance ?",
              message: "Progression non enregistrée.",
              confirmLabel: "QUITTER",
              cancelLabel: "RESTER",
              destructive: true,
            });
            if (!ok) return;
            speakStop();
            router.back();
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
                  size={12}
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
        {compositeItems ? (
          <View style={styles.mediaWrap}>
            <CompositeExerciseImage
              items={compositeItems}
              records={allRecords}
              height={300}
              showLabel={false}
            />
            <View style={styles.compositeBadgeWrap} pointerEvents="none">
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>{compositePrefix ?? currentEx.mode.toUpperCase()}</Text>
              </View>
            </View>
            <View style={styles.mediaControls}>
              <Pressable
                testID="media-open-fiche"
                hitSlop={4}
                style={styles.mediaBtn}
                onPress={() => router.push(`/exercise-detail/${encodeURIComponent(currentEx.name)}` as any)}
              >
                <Ionicons name="information-circle" size={16} color="#fff" />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.mediaWrap}>
            <ExerciseMediaFrame
              testID="workout-media-frame"
              source={mediaMode === "gif" ? (gifSource ?? illustrationSource) : illustrationSource}
              fallbackEmoji={iconEmojiForExercise(currentEx.name, planEx?.iconKey)}
              fallbackTint={colors.brand}
              minHeight={200}
              maxHeight={280}
            />
            <LinearGradient
              colors={["transparent", withAlpha("#000000", 88)]}
              style={styles.mediaGradient}
              pointerEvents="none"
            />
            <View style={styles.mediaControls}>
              {gifSource && (
                <Pressable
                  testID="media-toggle-gif"
                  hitSlop={4}
                  style={[styles.mediaBtn, mediaMode === "gif" && styles.mediaBtnActive]}
                  onPress={() => setMediaMode((m) => (m === "gif" ? "photo" : "gif"))}
                >
                  <Ionicons name={mediaMode === "gif" ? "image" : "film"} size={16} color="#fff" />
                </Pressable>
              )}
              <Pressable
                testID="media-open-fiche"
                hitSlop={4}
                style={styles.mediaBtn}
                onPress={() => router.push(`/exercise-detail/${encodeURIComponent(currentEx.name)}` as any)}
              >
                <Ionicons name="information-circle" size={16} color="#fff" />
              </Pressable>
            </View>
            <View style={styles.mediaOverlayInfo} pointerEvents="none">
              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>
                  {currentEx.mode.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.exNameBig} numberOfLines={2}>
                {currentEx.name}
              </Text>
            </View>
          </View>
        )}

        <View style={styles.statChipsRow}>
          {statChips.map((c, i) => (
            <View key={i} style={styles.statChip}>
              <Ionicons name={c.icon} size={14} color={colors.brand} />
              <View>
                <Text style={styles.statChipValue}>{c.value}</Text>
                <Text style={styles.statChipLabel}>{c.label}</Text>
              </View>
            </View>
          ))}
        </View>

        {currentEx.sets.map((s, i) => (
          <View
            key={i}
            style={[
              styles.setRow,
              s.completed && styles.setRowDone,
              !s.completed && i === currentSetIdx && styles.setRowCurrent,
            ]}
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
            {overlay === "work" && currentEx.mode === "emom" && currentEx.emomBlock ? (
              <EmomLiveOverlay
                exerciseName={currentEx.name}
                targetReps={currentEx.targetReps}
                notes={currentEx.notes}
                roundIndex={currentEx.emomBlock.roundIndex}
                totalRounds={currentEx.emomBlock.totalRounds}
                blockTitle={currentEx.emomBlock.title}
                remaining={overlayRemaining}
                total={overlayTotal}
                thumbnailSource={illustrationSource}
                onAddTime={addTime}
                onSkip={skipOverlay}
              />
            ) : (
            <>
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
            {overlay === "rest" && pendingResume && (
              <View style={styles.nextUpBox} testID="rest-next-up">
                <Ionicons name="play-forward" size={14} color={colors.onSurfaceTertiary} />
                <Text style={styles.nextUpText}>
                  Suivant ·{" "}
                  {pendingResume.exI === exIdx
                    ? `${currentEx.name} — série ${pendingResume.setIdx + 1}/${currentEx.sets.length}`
                    : logs[pendingResume.exI]?.name}
                </Text>
              </View>
            )}
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
            </>
            )}
          </View>
        </View>
      </Modal>

      {ConfirmModal}
    </SafeAreaView>
  );
}

/** Compact icon+value chips replacing the old single-line verbose meta text. */
function buildStatChips(
  ex: SessionExerciseLog,
  completedSets: number,
): { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }[] {
  const chips: { icon: keyof typeof Ionicons.glyphMap; value: string; label: string }[] = [];
  if (ex.mode === "reps") {
    chips.push({ icon: "layers-outline", value: `${completedSets}/${ex.targetSets}`, label: "Séries" });
    chips.push({ icon: "barbell-outline", value: ex.targetWeight || "—", label: "Poids" });
    if (ex.targetRestSeconds) {
      chips.push({ icon: "time-outline", value: `${ex.targetRestSeconds}s`, label: "Repos" });
    }
  } else if (ex.mode === "time") {
    chips.push({ icon: "layers-outline", value: `${completedSets}/${ex.targetSets}`, label: "Séries" });
    chips.push({ icon: "stopwatch-outline", value: formatDur(ex.targetDurationSeconds ?? 0), label: "Durée" });
    if (ex.targetRestSeconds) {
      chips.push({ icon: "time-outline", value: `${ex.targetRestSeconds}s`, label: "Repos" });
    }
  } else if (ex.mode === "emom") {
    chips.push({ icon: "repeat-outline", value: `${completedSets}/${ex.targetSets}`, label: "Rounds" });
    chips.push({ icon: "stopwatch-outline", value: formatDur(ex.targetDurationSeconds ?? 60), label: "Round" });
    chips.push({ icon: "flag-outline", value: ex.targetReps, label: "Cible" });
  } else {
    chips.push({ icon: "stopwatch-outline", value: formatDur(ex.targetDurationSeconds ?? 0), label: "AMRAP" });
    chips.push({ icon: "layers-outline", value: `${completedSets}/${ex.targetSets}`, label: "Séries" });
  }
  return chips;
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
    height: 2,
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
    paddingVertical: spacing.sm,
    gap: 6,
  },
  exChip: {
    flexShrink: 0,
    height: 30,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.pill,
    backgroundColor: withAlpha(colors.surfaceSecondary, 70),
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    maxWidth: 200,
  },
  exChipActive: {
    backgroundColor: colors.brand,
    borderColor: colors.brand,
  },
  exChipDone: {
    backgroundColor: withAlpha(colors.success, 12),
    borderColor: colors.success,
  },
  exChipText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 12,
  },
  content: { padding: spacing.lg, gap: spacing.md },
  mediaWrap: { position: "relative", borderRadius: radius.lg, overflow: "hidden" },
  mediaGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 110,
  },
  mediaControls: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    gap: 8,
  },
  compositeBadgeWrap: {
    position: "absolute",
    top: 10,
    left: 10,
  },
  mediaBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: withAlpha("#000000", 55),
  },
  mediaBtnActive: { backgroundColor: colors.brand },
  mediaOverlayInfo: {
    position: "absolute",
    left: spacing.md,
    right: spacing.md,
    bottom: spacing.md,
    gap: 4,
  },
  modeBadge: {
    alignSelf: "flex-start",
    backgroundColor: withAlpha(colors.brand, 85),
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
  },
  modeBadgeText: {
    color: "#fff",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 1,
  },
  exNameBig: { color: "#fff", fontSize: 20, fontWeight: "800" },
  statChipsRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  statChip: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 8,
  },
  statChipValue: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  statChipLabel: { color: colors.onSurfaceTertiary, fontSize: 9, letterSpacing: 0.4 },
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
  setRowCurrent: {
    borderColor: colors.brand,
    borderWidth: 1.5,
    backgroundColor: withAlpha(colors.brand, 10),
  },
  setRowDone: {
    backgroundColor: withAlpha(colors.success, 12),
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
  nextUpBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: colors.surfaceTertiary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.pill,
    marginTop: -spacing.sm,
  },
  nextUpText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 12,
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
