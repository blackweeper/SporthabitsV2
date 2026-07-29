import { ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Svg, { Circle } from "react-native-svg";
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, motion, radius, shadow, spacing } from "@/src/theme";
import {
  ActiveProgram,
  CalendarEvent,
  CALENDAR_EVENT_KIND_EMOJI,
  CALENDAR_EVENT_KIND_LABEL,
  currentDayIndex,
  DailyJournalEntry,
  DEFAULT_CALORIES_TARGET_KCAL,
  DEFAULT_STEPS_TARGET,
  DEFAULT_WATER_TARGET_ML,
  Measurement,
  setHabitValue,
  deleteHabit,
  getActivePrograms,
  getCalendarEvents,
  getDailyJournal,
  getHabits,
  getHabitLogs,
  getMealPresets,
  getMeasurements,
  getPRs,
  getProfile,
  getReminders,
  getSessions,
  getWellnessLogs,
  MealPreset,
  patchWellnessLog,
  Habit,
  HabitKind,
  HabitLog,
  HABIT_KIND_ICON,
  PersonalRecord,
  Reminder,
  todayYYYYMMDD,
  UserProfile,
  WellnessLog,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { findProgram } from "@/src/utils/programs";
import { Program } from "@/src/data/programs";
import { computeDailyIronflowScore, scoreQualitativeLabel } from "@/src/utils/scoring";
import { computeXPState } from "@/src/utils/xp";
import { computeAdvancedStats } from "@/src/utils/stats";
import { motivationMessage } from "@/src/data/motivation";
import { progressionHref } from "@/src/utils/progression-nav";
import HabitTimerModal from "@/src/components/HabitTimerModal";
import SwipeableRow from "@/src/components/SwipeableRow";
import CalendarView, { DayEventDot } from "@/src/components/CalendarView";
import HabitCard, {
  ActionChip,
  ActionsRow,
  ActionsScroll,
  MinusButton,
  QuantityModal,
  WideActionButton,
} from "@/src/components/HabitCard";
import PressableScale from "@/src/components/ui/PressableScale";
import RingChip from "@/src/components/ui/RingChip";
import { ActiveHabitTimer, getActiveHabitTimer } from "@/src/utils/habit-timer";
import {
  computeDueReminders,
  dismissReminderKey,
  getDismissedReminderKeys,
} from "@/src/utils/reminders-due";

type ActiveWithProgram = { active: ActiveProgram; program: Program };

// These habit kinds are already covered by the built-in Eau / Calories / Pas
// cards rendered directly in the "Aujourd'hui" list — showing a custom habit
// of the same kind again would just track the same daily metric twice.
const WELLNESS_DUPLICATE_KINDS = new Set<HabitKind>([
  "water",
  "nutrition",
  "steps",
]);

export default function TodayScreen() {
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [name, setName] = useState<string>("");
  const [actives, setActives] = useState<ActiveWithProgram[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessLog[]>([]);
  const [dailyJournal, setDailyJournal] = useState<DailyJournalEntry[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [timerHabit, setTimerHabit] = useState<Habit | null>(null);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [calendarMonthOffset, setCalendarMonthOffset] = useState(0);
  const [dayModalDate, setDayModalDate] = useState<string | null>(null);
  const [dismissedReminders, setDismissedReminders] = useState<string[]>([]);
  const [mealPresets, setMealPresets] = useState<MealPreset[]>([]);
  const [activeTimerRaw, setActiveTimerRaw] = useState<ActiveHabitTimer | null>(null);
  const [quantityModal, setQuantityModal] = useState<{
    which: "water" | "calories" | "steps";
    mode: "set" | "add";
  } | null>(null);
  const notifiedRef = useRef<Set<string>>(new Set());

  const load = useCallback(async () => {
    const loadedHabits = await getHabits();
    setSessions(await getSessions());
    setHabits(loadedHabits);
    setLogs(await getHabitLogs());
    setMeasurements(await getMeasurements());
    setPRs(await getPRs());
    const p = await getProfile();
    setProfile(p);
    setName((p as any).name ?? "");
    const list = await getActivePrograms();
    const resolved: ActiveWithProgram[] = [];
    for (const a of list) {
      const prog = await findProgram(a.programId);
      if (prog) resolved.push({ active: a, program: prog });
    }
    setActives(resolved);
    setWellnessLogs(await getWellnessLogs());
    setDailyJournal(await getDailyJournal());
    setCalendarEvents(await getCalendarEvents());
    setReminders(await getReminders());
    setDismissedReminders(await getDismissedReminderKeys());
    setMealPresets(await getMealPresets());

    // Restore an in-progress habit timer (e.g. the app was backgrounded or
    // reloaded mid-countdown) so it keeps running instead of silently
    // vanishing.
    const active = await getActiveHabitTimer();
    setActiveTimerRaw(active);
    if (active) {
      const match = loadedHabits.find((h) => h.id === active.habitId);
      if (match) setTimerHabit(match);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
      // Re-check every minute while the dashboard stays open, so in-app
      // reminders (no OS push available) surface without a manual refresh.
      const interval = setInterval(load, 60000);
      return () => clearInterval(interval);
    }, [load]),
  );

  // Best-effort browser notification companion — only fires while this tab
  // is open; there is no native build/push server behind this app.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const today = todayYYYYMMDD();
  const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
  const wellness = wellnessLogs.find((w) => w.date === today) ?? null;
  const scoreProfile = profile ?? {
    weight_kg: null,
    height_cm: null,
    sex: null,
    age: null,
  };
  const todayScore = computeDailyIronflowScore(
    today,
    sessions,
    habits,
    logs,
    wellnessLogs,
    dailyJournal,
    scoreProfile,
  );
  const yesterdayScore = computeDailyIronflowScore(
    yesterday,
    sessions,
    habits,
    logs,
    wellnessLogs,
    dailyJournal,
    scoreProfile,
  );
  const scoreDelta = todayScore.score - yesterdayScore.score;
  const stats = computeAdvancedStats(sessions);
  const xpState = computeXPState({ sessions, habits, habitLogs: logs, prs });

  const primary = actives[0];
  const dayIndex = primary
    ? currentDayIndex(primary.active, primary.program.durationDays)
    : null;
  const totalDays = primary?.program.durationDays ?? null;

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Bonjour" : greetingHour < 18 ? "Salut" : "Bonsoir";
  const motivation = motivationMessage({
    workoutDoneToday: todayScore.workoutDone,
    streakDays: stats.currentStreakDays,
    score: todayScore.score,
  });

  const dueReminders = useMemo(
    () => computeDueReminders(reminders, calendarEvents, dismissedReminders),
    [reminders, calendarEvents, dismissedReminders],
  );

  useEffect(() => {
    if (typeof Notification === "undefined" || Notification.permission !== "granted") return;
    for (const d of dueReminders) {
      if (!notifiedRef.current.has(d.key)) {
        notifiedRef.current.add(d.key);
        try {
          new Notification(d.title, { body: d.subtitle });
        } catch {
          // best-effort only
        }
      }
    }
  }, [dueReminders]);

  const dismissDue = async (key: string) => {
    await dismissReminderKey(key);
    setDismissedReminders((prev) => [...prev, key]);
  };

  // Merge calendar events, dated measurements, and recurring reminders into
  // per-day dot indicators for the visible month — nothing is duplicated in
  // storage, this is purely computed at render time.
  const calDayEvents = useMemo(() => {
    const now = new Date();
    const target = new Date(now.getFullYear(), now.getMonth() + calendarMonthOffset, 1);
    const year = target.getFullYear();
    const month = target.getMonth();
    const map: Record<string, DayEventDot[]> = {};
    const push = (dateStr: string, emoji: string) => {
      if (!map[dateStr]) map[dateStr] = [];
      map[dateStr].push({ emoji });
    };
    for (const ev of calendarEvents) {
      const d = new Date(ev.date + "T12:00:00");
      if (d.getFullYear() === year && d.getMonth() === month) {
        push(ev.date, CALENDAR_EVENT_KIND_EMOJI[ev.kind]);
      }
    }
    for (const m of measurements) {
      const dateStr = m.date.slice(0, 10);
      const d = new Date(dateStr + "T12:00:00");
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      if (m.weight_kg != null) push(dateStr, "⚖️");
      if (m.photoBase64) push(dateStr, "📸");
    }
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (const r of reminders) {
      if (!r.enabled) continue;
      for (let day = 1; day <= daysInMonth; day++) {
        const d = new Date(year, month, day);
        if (r.daysOfWeek.includes(d.getDay())) {
          push(d.toISOString().slice(0, 10), "🔔");
        }
      }
    }
    return map;
  }, [calendarEvents, measurements, reminders, calendarMonthOffset]);

  type DayEntry = {
    key: string;
    emoji: string;
    title: string;
    time?: string | null;
    onPress: () => void;
  };

  function eventsForDate(dateStr: string): DayEntry[] {
    const entries: DayEntry[] = [];
    for (const ev of calendarEvents.filter((e) => e.date === dateStr)) {
      entries.push({
        key: `ev-${ev.id}`,
        emoji: CALENDAR_EVENT_KIND_EMOJI[ev.kind],
        title: ev.title || CALENDAR_EVENT_KIND_LABEL[ev.kind],
        time: ev.time,
        onPress: () => {
          setDayModalDate(null);
          router.push(`/calendar-event/${ev.id}` as any);
        },
      });
    }
    for (const s of sessions.filter(
      (s) => new Date(s.startedAt).toISOString().slice(0, 10) === dateStr,
    )) {
      entries.push({
        key: `s-${s.id}`,
        emoji: "✅",
        title: s.planTitle,
        time: new Date(s.startedAt).toLocaleTimeString("fr-FR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        onPress: () => {
          setDayModalDate(null);
          router.push(`/session/${s.id}` as any);
        },
      });
    }
    for (const m of measurements.filter((m) => m.date.slice(0, 10) === dateStr)) {
      const parts: string[] = [];
      if (m.weight_kg != null) parts.push(`⚖️ ${m.weight_kg} kg`);
      if (m.photoBase64) parts.push("📸 Photo");
      if (parts.length === 0) continue;
      entries.push({
        key: `m-${m.id}`,
        emoji: "📏",
        title: parts.join(" · "),
        time: null,
        onPress: () => {
          setDayModalDate(null);
          router.push(`/measurement/${m.id}` as any);
        },
      });
    }
    for (const r of reminders) {
      if (!r.enabled) continue;
      const d = new Date(dateStr + "T12:00:00");
      if (r.daysOfWeek.includes(d.getDay())) {
        entries.push({
          key: `r-${r.id}`,
          emoji: "🔔",
          title: r.title || "Rappel",
          time: r.time,
          onPress: () => {
            setDayModalDate(null);
            router.push(`/reminder/${r.id}` as any);
          },
        });
      }
    }
    return entries.sort((a, b) => (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
  }

  const bumpWellness = async (
    field: "water_ml" | "calories_kcal" | "steps",
    delta: number,
  ) => {
    Haptics.selectionAsync().catch(() => {});
    const cur = wellness?.[field] ?? 0;
    await patchWellnessLog(today, { [field]: Math.max(0, cur + delta) });
    load();
  };

  const setWellnessValue = async (
    field: "water_ml" | "calories_kcal" | "steps",
    value: number,
  ) => {
    await patchWellnessLog(today, { [field]: Math.max(0, value) });
    load();
  };

  const wellnessField = (which: "water" | "calories" | "steps") =>
    which === "water" ? "water_ml" : which === "calories" ? "calories_kcal" : "steps";

  const submitQuantityModal = async (n: number) => {
    if (!quantityModal) return;
    const field = wellnessField(quantityModal.which);
    if (quantityModal.mode === "add") await bumpWellness(field, n);
    else await setWellnessValue(field, n);
  };

  const bumpHabit = async (habitId: string, current: number, delta: number) => {
    Haptics.selectionAsync().catch(() => {});
    await setHabitValue(habitId, today, Math.max(0, current + delta));
    load();
  };

  const toggleHabit = async (habitId: string, current: number, target: number) => {
    Haptics.selectionAsync().catch(() => {});
    await setHabitValue(habitId, today, current > 0 ? 0 : target);
    load();
  };

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={{ flex: 1 }}>
            <Text style={styles.brand}>IRONFLOW</Text>
            <Text style={styles.greeting}>
              {greeting}{name ? `, ${name}` : ""} 👋
            </Text>
            <Text style={styles.date}>{formatFullDate()}</Text>
          </View>
          {dayIndex && totalDays ? (
            <View style={styles.dayBadge}>
              <Text style={styles.dayLabel}>JOUR</Text>
              <Text style={styles.dayValue}>{dayIndex}</Text>
              <Text style={styles.daySub}>/ {totalDays}</Text>
            </View>
          ) : null}
        </View>

        {/* Reminders due now — in-app only, no OS push */}
        {dueReminders.map((d) => (
          <Pressable
            key={d.key}
            testID={`due-reminder-${d.key}`}
            style={styles.reminderBanner}
            onPress={() => router.push(d.href as any)}
          >
            <Text style={styles.reminderBannerEmoji}>{d.emoji}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.reminderBannerTitle} numberOfLines={1}>
                {d.title}
              </Text>
              <Text style={styles.reminderBannerSub}>{d.subtitle}</Text>
            </View>
            <Pressable
              testID={`due-reminder-${d.key}-dismiss`}
              hitSlop={10}
              onPress={(ev) => {
                ev.stopPropagation?.();
                dismissDue(d.key);
              }}
            >
              <Ionicons name="close" size={18} color={colors.onSurfaceTertiary} />
            </Pressable>
          </Pressable>
        ))}

        {/* Motivation — contextual to today's progress */}
        <View style={styles.motivationCard}>
          <Ionicons name="sparkles" size={13} color={colors.brand} />
          <Text style={styles.motivationText}>{motivation}</Text>
        </View>

        {/* Héros — module unique : Score + statut séance + CTA, plutôt que
            trois cartes séparées de poids égal. Point focal réel de l'écran
            (anneau agrandi), esprit Oura/Whoop. */}
        <View style={styles.heroCard}>
          <PressableScale
            testID="ironflow-score-card"
            style={styles.heroScoreRow}
            onPress={() => router.push(progressionHref("overview") as any)}
          >
            <ScoreCircle score={todayScore.score} size={156} />
            <View style={{ flex: 1 }}>
              <Text style={styles.scoreLabel}>IRONFLOW SCORE</Text>
              <Text style={styles.scoreValue}>{todayScore.score}%</Text>
              <Text style={styles.scoreHint}>{scoreQualitativeLabel(todayScore.score)}</Text>
              {scoreDelta !== 0 && (
                <View style={styles.scoreDeltaRow}>
                  <Ionicons
                    name={scoreDelta > 0 ? "arrow-up" : "arrow-down"}
                    size={12}
                    color={scoreDelta > 0 ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      styles.scoreDeltaText,
                      { color: scoreDelta > 0 ? colors.success : colors.error },
                    ]}
                  >
                    {scoreDelta > 0 ? "+" : ""}
                    {scoreDelta}% par rapport à hier
                  </Text>
                </View>
              )}
            </View>
          </PressableScale>

          {/* Le CTA porte lui-même le statut de la séance du jour — plus
              besoin d'une carte "Séance" séparée juste pour l'afficher. */}
          <PressableScale
            testID="start-session"
            style={[styles.mainCta, todayScore.workoutDone && styles.mainCtaDone]}
            onPress={() => router.push(todayScore.workoutDone ? "/training" : "/plans")}
          >
            <Ionicons
              name={todayScore.workoutDone ? "checkmark-circle" : "flame"}
              size={20}
              color={todayScore.workoutDone ? colors.success : "#fff"}
            />
            <Text
              style={[styles.mainCtaText, todayScore.workoutDone && styles.mainCtaTextDone]}
            >
              {todayScore.workoutDone ? "SÉANCE TERMINÉE" : "DÉMARRER LA SÉANCE"}
            </Text>
          </PressableScale>
        </View>

        {/* Bande de stats — Niveau + Streak côte à côte, remplace deux
            cartes pleine largeur ; le détail (barre XP, badges) reste à un
            tap de distance sur /profile, rien n'est supprimé. */}
        <View style={styles.statsStrip}>
          <PressableScale
            testID="xp-card"
            style={styles.statPill}
            onPress={() => router.push("/profile")}
          >
            <View style={styles.statPillBadge}>
              <Text style={styles.statPillBadgeNum}>{xpState.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statPillLabel}>NIVEAU {xpState.level}</Text>
              <Text style={styles.statPillValue}>
                {xpState.xpToNext} XP → N{xpState.level + 1}
              </Text>
            </View>
          </PressableScale>
          <PressableScale
            testID="streak-hero"
            style={styles.statPill}
            onPress={() => router.push("/stats")}
          >
            <View style={[styles.statPillBadge, { backgroundColor: "#FF5722" }]}>
              <Ionicons name="flame" size={18} color="#fff" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.statPillLabel}>STREAK</Text>
              <Text style={styles.statPillValue}>
                {stats.currentStreakDays} jour{stats.currentStreakDays > 1 ? "s" : ""}
              </Text>
            </View>
          </PressableScale>
        </View>

        {/* Aujourd'hui — anneaux compacts pour Eau/Calories/Pas (remplace 3
            cartes pleine largeur empilées) : plus glanceable, esprit
            Oura/Whoop. Le statut "Séance" vit désormais dans le CTA du
            héros ci-dessus, plus besoin d'une ligne dédiée ici. */}
        <View style={styles.widgetsHead}>
          <Text style={styles.sectionTitle}>Aujourd&apos;hui</Text>
          <Pressable
            testID="manage-habits"
            hitSlop={8}
            onPress={() => router.push(progressionHref("habits") as any)}
          >
            <Text style={styles.widgetsMoreLink}>Gérer</Text>
          </Pressable>
        </View>
        <EnterItem index={0}>
          <View style={styles.ringsRow}>
            <RingChip
              testID="widget-water"
              icon="water"
              color={colors.info}
              label="Eau"
              value={wellness?.water_ml ?? 0}
              target={profile?.water_target_ml || DEFAULT_WATER_TARGET_ML}
              onPress={() => setQuantityModal({ which: "water", mode: "set" })}
              onQuickAdd={() => bumpWellness("water_ml", 250)}
            />
            <RingChip
              testID="widget-calories"
              icon="nutrition"
              color="#F97316"
              label="Calories"
              value={wellness?.calories_kcal ?? 0}
              target={profile?.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL}
              onPress={() => setQuantityModal({ which: "calories", mode: "set" })}
            />
            <RingChip
              testID="widget-steps"
              icon="footsteps"
              color="#10B981"
              label="Pas"
              value={wellness?.steps ?? 0}
              target={profile?.steps_target || DEFAULT_STEPS_TARGET}
              onPress={() => setQuantityModal({ which: "steps", mode: "set" })}
              onQuickAdd={() => bumpWellness("steps", 1000)}
            />
          </View>
        </EnterItem>
        <View style={styles.listCol}>
          {/* Habits — excludes kinds already covered by the Eau / Calories /
              Pas rings above, to avoid showing the same daily metric twice. */}
          {habits
            .filter((h) => !WELLNESS_DUPLICATE_KINDS.has(h.kind))
            .map((h, i) => {
              const cur =
                logs.find((l) => l.habitId === h.id && l.date === today)?.value ?? 0;
              const target = h.target && h.target > 0 ? h.target : 1;
              return (
                <EnterItem key={h.id} index={4 + i}>
                  <CustomHabitCard
                    habit={h}
                    current={cur}
                    target={target}
                    activeTimer={activeTimerRaw}
                    onBump={(delta) => bumpHabit(h.id, cur, delta)}
                    onToggle={() => toggleHabit(h.id, cur, target)}
                    onOpen={() => router.push(`/habit/${h.id}` as any)}
                    onStartTimer={() => setTimerHabit(h)}
                    onDelete={async () => {
                      await deleteHabit(h.id);
                      load();
                    }}
                  />
                </EnterItem>
              );
            })}
          {/* Add habit */}
          <PressableScale
            testID="add-habit-widget"
            style={styles.addListItem}
            onPress={() => router.push("/habit/new" as any)}
          >
            <Ionicons name="add-circle" size={20} color={colors.brand} />
            <Text style={styles.addWidgetLabel}>Nouvelle habitude</Text>
          </PressableScale>
        </View>

        {/* Programmes actifs — jusqu'à 2 en parallèle */}
        {actives.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              {actives.length > 1 ? "Programmes actifs" : "Programme actif"}
            </Text>
            <View style={styles.programsRow}>
              {actives.map(({ active, program }) => {
                const di = currentDayIndex(active, program.durationDays);
                const totalSess = program.days.reduce(
                  (a, d) => a + (d.rest ? 0 : d.sessions.length),
                  0,
                );
                const done = active.completedSessions.length;
                const pct = totalSess ? done / totalSess : 0;
                return (
                  <PressableScale
                    key={program.id}
                    testID={`active-program-${program.id}`}
                    style={[
                      styles.progMini,
                      { borderLeftColor: program.color },
                    ]}
                    onPress={() => router.push(`/program/${program.id}`)}
                  >
                    <View style={styles.progMiniHead}>
                      <Text style={styles.progMiniEmoji}>
                        {program.coverEmoji}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={styles.progMiniTitle}
                          numberOfLines={1}
                        >
                          {program.title}
                        </Text>
                        <Text style={styles.progMiniMeta}>
                          Jour {di}/{program.durationDays} · {done}/{totalSess}{" "}
                          séances
                        </Text>
                      </View>
                    </View>
                    <View style={styles.progMiniTrack}>
                      <View
                        style={[
                          styles.progMiniFill,
                          {
                            width: `${pct * 100}%`,
                            backgroundColor: program.color,
                          },
                        ]}
                      />
                    </View>
                  </PressableScale>
                );
              })}
            </View>
          </>
        )}

        {/* Calendar — planning center */}
        <View style={styles.calHeaderRow}>
          <Text style={styles.sectionTitle}>Calendrier</Text>
          <Pressable
            testID="cal-add-event"
            onPress={() => router.push(`/calendar-event/new?date=${today}` as any)}
            hitSlop={8}
          >
            <Ionicons name="add-circle" size={20} color={colors.brand} />
          </Pressable>
        </View>
        <CalendarView
          sessions={sessions}
          monthOffset={calendarMonthOffset}
          onChangeMonth={setCalendarMonthOffset}
          events={calDayEvents}
          onDayPress={setDayModalDate}
        />

        <View style={{ height: 40 }} />
      </ScrollView>
      <HabitTimerModal
        habit={timerHabit}
        visible={timerHabit !== null}
        onClose={() => setTimerHabit(null)}
        onCompleted={() => {
          setTimerHabit(null);
          load();
        }}
      />
      <QuantityModal
        mode={quantityModal?.mode ?? null}
        label={
          quantityModal?.which === "water"
            ? "Eau"
            : quantityModal?.which === "calories"
            ? "Calories"
            : "Pas"
        }
        unit={quantityModal?.which === "water" ? "ml" : quantityModal?.which === "calories" ? "kcal" : "pas"}
        currentValue={
          quantityModal?.which === "water"
            ? wellness?.water_ml ?? 0
            : quantityModal?.which === "calories"
            ? wellness?.calories_kcal ?? 0
            : wellness?.steps ?? 0
        }
        color={
          quantityModal?.which === "water"
            ? colors.info
            : quantityModal?.which === "calories"
            ? "#F97316"
            : "#10B981"
        }
        // Les raccourcis existent toujours à l'identique (mêmes handlers) —
        // simplement déplacés depuis les anciennes cartes pleine largeur
        // vers l'intérieur de ce modal, ouvert au tap sur l'anneau.
        quickActions={
          quantityModal?.which === "water" ? (
            <ActionsScroll>
              <MinusButton testID="widget-water-minus" onPress={() => bumpWellness("water_ml", -250)} />
              <ActionChip testID="widget-water-250" label="+250 ml" onPress={() => bumpWellness("water_ml", 250)} />
              <ActionChip testID="widget-water-500" label="+500 ml" onPress={() => bumpWellness("water_ml", 500)} />
              <ActionChip testID="widget-water-750" label="+750 ml" onPress={() => bumpWellness("water_ml", 750)} />
              <ActionChip testID="widget-water-1000" label="+1 L" onPress={() => bumpWellness("water_ml", 1000)} />
            </ActionsScroll>
          ) : quantityModal?.which === "calories" ? (
            <ActionsScroll>
              {mealPresets.map((m) => (
                <ActionChip
                  key={m.id}
                  testID={`widget-calories-${m.id}`}
                  emoji={m.emoji}
                  label={`${m.label} · +${m.kcal}`}
                  onPress={() => bumpWellness("calories_kcal", m.kcal)}
                />
              ))}
              <ActionChip
                testID="widget-calories-custom"
                emoji="✏️"
                label="Personnalisé"
                color="#F97316"
                onPress={() => setQuantityModal({ which: "calories", mode: "add" })}
              />
            </ActionsScroll>
          ) : quantityModal?.which === "steps" ? (
            <ActionsScroll>
              <MinusButton testID="widget-steps-minus" onPress={() => bumpWellness("steps", -500)} />
              <ActionChip testID="widget-steps-500" label="+500" onPress={() => bumpWellness("steps", 500)} />
              <ActionChip testID="widget-steps-1000" label="+1000" onPress={() => bumpWellness("steps", 1000)} />
              <ActionChip testID="widget-steps-2000" label="+2000" onPress={() => bumpWellness("steps", 2000)} />
            </ActionsScroll>
          ) : null
        }
        onClose={() => setQuantityModal(null)}
        onSubmit={submitQuantityModal}
      />
      <Modal
        visible={dayModalDate !== null}
        // Feuille du bas (coins arrondis en haut, ancrée en bas via
        // dayModalBackdrop.justifyContent:"flex-end") — "slide" comme
        // toutes les autres feuilles du bas de l'app, pas "fade" (réservé
        // aux dialogues centrés).
        animationType="slide"
        transparent
        onRequestClose={() => setDayModalDate(null)}
      >
        <View style={styles.dayModalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setDayModalDate(null)}
          />
          <View style={styles.dayModalSheet}>
            <View style={styles.dayModalHandle} />
            <View style={styles.dayModalHeaderRow}>
              <Text style={styles.dayModalTitle}>
                {dayModalDate ? formatDayModalDate(dayModalDate) : ""}
              </Text>
              <Pressable onPress={() => setDayModalDate(null)} hitSlop={12}>
                <Ionicons name="close" size={22} color={colors.onSurfaceTertiary} />
              </Pressable>
            </View>
            <ScrollView contentContainerStyle={{ gap: 8 }}>
              {dayModalDate && eventsForDate(dayModalDate).length === 0 ? (
                <Text style={styles.dayModalEmpty}>Rien de prévu ce jour-là.</Text>
              ) : (
                dayModalDate &&
                eventsForDate(dayModalDate).map((entry) => (
                  <Pressable
                    key={entry.key}
                    testID={`day-event-${entry.key}`}
                    style={styles.dayModalRow}
                    onPress={entry.onPress}
                  >
                    <Text style={styles.dayModalEmoji}>{entry.emoji}</Text>
                    <Text style={styles.dayModalRowTitle} numberOfLines={1}>
                      {entry.title}
                    </Text>
                    {entry.time && (
                      <Text style={styles.dayModalRowTime}>{entry.time}</Text>
                    )}
                  </Pressable>
                ))
              )}
            </ScrollView>
            <Pressable
              testID="day-modal-add"
              style={styles.dayModalAddBtn}
              onPress={() => {
                const d = dayModalDate;
                setDayModalDate(null);
                router.push(`/calendar-event/new?date=${d}` as any);
              }}
            >
              <Ionicons name="add-circle" size={16} color="#fff" />
              <Text style={styles.dayModalAddText}>AJOUTER UN ÉVÉNEMENT</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function formatDayModalDate(dateStr: string) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

/** Rounds a habit's target down to a "nice" quick-add step (e.g. 8 -> 2,
 * 10000 -> 3000) for the generic quantitative-habit shortcuts. */
function niceStep(target: number): number {
  if (target <= 1) return 0;
  const raw = target / 4;
  const pow10 = Math.pow(10, Math.floor(Math.log10(raw)));
  return Math.max(1, Math.round(raw / pow10) * pow10);
}

function CustomHabitCard({
  habit,
  current,
  target,
  activeTimer,
  onBump,
  onToggle,
  onOpen,
  onStartTimer,
  onDelete,
}: {
  habit: Habit;
  current: number;
  target: number;
  activeTimer: ActiveHabitTimer | null;
  onBump: (delta: number) => void;
  onToggle: () => void;
  onOpen: () => void;
  onStartTimer: () => void;
  onDelete: () => void | Promise<void>;
}) {
  const color = habit.color ?? "#4CAF50";
  const iconName = (habit.kind ? HABIT_KIND_ICON[habit.kind] : "star") as any;
  const isTimed = habit.unit === "min";
  const isCheckbox = !isTimed && target <= 1;
  const done = current >= target;

  let actions: ReactNode;
  if (isTimed) {
    const forThis = activeTimer?.habitId === habit.id ? activeTimer : null;
    const label = !forThis ? "Commencer" : forThis.status === "running" ? "En cours" : "Reprendre";
    actions = (
      <ActionsRow>
        <WideActionButton
          testID={`widget-${habit.id}-start`}
          label={label}
          icon="play"
          color={color}
          onPress={onStartTimer}
        />
      </ActionsRow>
    );
  } else if (isCheckbox) {
    actions = (
      <ActionsRow>
        <WideActionButton
          testID={`widget-${habit.id}-toggle`}
          label={done ? "Fait aujourd'hui ✓" : "Marquer comme fait"}
          icon={done ? "checkmark-circle" : "ellipse-outline"}
          color={color}
          onPress={onToggle}
        />
      </ActionsRow>
    );
  } else {
    const step = niceStep(target);
    actions = (
      <ActionsRow>
        <ActionChip testID={`widget-${habit.id}-plus1`} label="+1" onPress={() => onBump(1)} />
        {step > 1 && (
          <ActionChip
            testID={`widget-${habit.id}-plusstep`}
            label={`+${step}`}
            onPress={() => onBump(step)}
          />
        )}
        <ActionChip
          testID={`widget-${habit.id}-modify`}
          label="Modifier"
          color={color}
          onPress={onOpen}
        />
      </ActionsRow>
    );
  }

  return (
    <SwipeableRow
      testID={`widget-${habit.id}`}
      onDelete={onDelete}
      deleteConfirm={{
        title: "Supprimer cette habitude ?",
        message: `"${habit.title}" — cette action est définitive.`,
        confirmLabel: "SUPPRIMER",
        destructive: true,
      }}
      onEdit={onOpen}
    >
      <HabitCard
        testId={`widget-${habit.id}`}
        icon={iconName}
        color={color}
        title={habit.title}
        value={current}
        target={target}
        unit={habit.unit ?? undefined}
        onPressValue={isTimed ? undefined : isCheckbox ? onToggle : () => onBump(1)}
        onLongPress={onOpen}
        actions={actions}
      />
    </SwipeableRow>
  );
}

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** Progression (score, XP) is deliberately violet, not brand orange — the
 * single orange CTA on this screen ("DÉMARRER LA SÉANCE") stays the one
 * unambiguous "action" signal instead of competing with "already achieved". */
function ScoreCircle({ score, size = 96 }: { score: number; size?: number }) {
  const strokeWidth = size >= 140 ? 12 : 9;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withTiming(Math.min(100, Math.max(0, score)) / 100, {
      duration: 500,
      easing: Easing.out(Easing.cubic),
    });
  }, [score, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: c - progress.value * c,
  }));

  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.surfaceTertiary}
          strokeWidth={strokeWidth}
          fill="transparent"
        />
        <AnimatedCircle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.progress}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={c}
          animatedProps={animatedProps}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text
          style={{
            color: colors.onSurface,
            fontSize: size >= 140 ? 36 : 22,
            fontWeight: "800",
          }}
        >
          {score}%
        </Text>
      </View>
    </View>
  );
}

/** Cascade d'entrée pour la liste "Aujourd'hui" — un fondu + léger glissement
 * décalé par carte, plafonné pour qu'une longue liste d'habitudes ne fasse
 * jamais attendre les dernières cartes plus que les premières. */
function EnterItem({ index, children }: { index: number; children: ReactNode }) {
  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 8) * 30).duration(motion.base)}>
      {children}
    </Animated.View>
  );
}

function formatFullDate() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  reminderBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    padding: spacing.md,
  },
  reminderBannerEmoji: { fontSize: 18 },
  reminderBannerTitle: { color: colors.onSurface, fontWeight: "800", fontSize: 13 },
  reminderBannerSub: { color: colors.brandSecondary, fontSize: 11, marginTop: 1 },
  motivationCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 2,
  },
  motivationText: {
    flex: 1,
    color: colors.onSurfaceSecondary,
    fontSize: 12.5,
    fontWeight: "500",
    lineHeight: 17,
    fontStyle: "italic",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  brand: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 2.5,
  },
  greeting: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 4,
  },
  date: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginTop: 2,
    textTransform: "capitalize",
  },
  // "Jour X/Y" est un indicateur de progression (dans un programme), pas une
  // action — même famille violette que le Score/XP, pas l'orange du CTA.
  dayBadge: {
    alignItems: "center",
    backgroundColor: colors.progressTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  dayLabel: {
    color: colors.progressSecondary,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
  },
  dayValue: { color: colors.progress, fontSize: 22, fontWeight: "800" },
  daySub: { color: colors.progressSecondary, fontSize: 11, fontWeight: "700" },
  // Module héros : un seul bloc élevé (Score + CTA) au lieu de trois cartes
  // de poids égal — devient le point focal réel de l'écran.
  heroCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadow.elevated,
  },
  heroScoreRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  scoreLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  scoreValue: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  // progressSecondary, pas progress : à 12px sur surfaceSecondary, progress
  // (#8B5CF6) tombe à 4.1:1 (sous le seuil AA 4.5:1 pour du petit texte) —
  // progressSecondary passe à 9.4:1, vérifié par calcul de contraste réel.
  scoreHint: { color: colors.progressSecondary, fontSize: 12, fontWeight: "700", marginTop: 2 },
  scoreDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  scoreDeltaText: { fontSize: 11, fontWeight: "700" },
  // Bande de stats — 2 pastilles compactes remplaçant les anciennes cartes
  // XP et Streak pleine largeur.
  statsStrip: { flexDirection: "row", gap: spacing.sm },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.sm,
  },
  statPillBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.progress,
    alignItems: "center",
    justifyContent: "center",
  },
  statPillBadgeNum: { color: "#fff", fontWeight: "800", fontSize: 15 },
  statPillLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  statPillValue: {
    color: colors.onSurface,
    fontSize: 12,
    fontWeight: "800",
    marginTop: 1,
  },
  mainCta: {
    backgroundColor: colors.brand,
    padding: 18,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  // Une fois la séance faite, le CTA devient une confirmation discrète
  // (contour) plutôt qu'une action pressante identique à avant.
  mainCtaDone: {
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.success,
  },
  mainCtaText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1.5,
  },
  mainCtaTextDone: { color: colors.success },
  progCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  programsRow: {
    gap: spacing.sm,
  },
  progMini: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderLeftWidth: 4,
    padding: spacing.md,
    gap: 8,
  },
  progMiniHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  progMiniEmoji: {
    fontSize: 26,
  },
  progMiniTitle: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
  },
  progMiniMeta: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
    marginTop: 2,
  },
  progMiniTrack: {
    height: 4,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 2,
    overflow: "hidden",
  },
  progMiniFill: {
    height: "100%",
    borderRadius: 2,
  },
  progLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 9,
    letterSpacing: 1.2,
    fontWeight: "800",
  },
  progName: { color: colors.onSurface, fontSize: 14, fontWeight: "700", marginTop: 2 },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  checkCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: "hidden",
  },
  checkRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
  },
  checkRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkBox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkLabel: { color: colors.onSurface, fontWeight: "600", fontSize: 14, flex: 1 },
  checkLabelDone: {
    textDecorationLine: "line-through",
    color: colors.onSurfaceTertiary,
  },
  checkWeight: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "700",
  },
  emptyHabitBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    padding: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  emptyHabitText: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  widgetsHead: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginTop: spacing.sm,
  },
  widgetsMoreLink: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "700",
  },
  listCol: {
    gap: spacing.sm,
  },
  ringsRow: {
    flexDirection: "row",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  addListItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
    padding: spacing.md,
  },
  addWidgetLabel: {
    color: colors.brand,
    fontSize: 12,
    fontWeight: "800",
    textAlign: "center",
  },
  calHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayModalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  dayModalSheet: {
    backgroundColor: colors.surfaceSecondary,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    paddingBottom: 32,
    maxHeight: "75%",
    gap: spacing.sm,
  },
  dayModalHandle: {
    width: 48,
    height: 5,
    backgroundColor: colors.border,
    borderRadius: 3,
    alignSelf: "center",
    marginBottom: spacing.sm,
  },
  dayModalHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  dayModalTitle: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
    textTransform: "capitalize",
  },
  dayModalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
  },
  dayModalEmoji: { fontSize: 18 },
  dayModalRowTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 14, flex: 1 },
  dayModalRowTime: { color: colors.onSurfaceTertiary, fontSize: 12, fontWeight: "700" },
  dayModalEmpty: {
    color: colors.onSurfaceTertiary,
    fontStyle: "italic",
    textAlign: "center",
    paddingVertical: spacing.lg,
  },
  dayModalAddBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: colors.brand,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  dayModalAddText: { color: "#fff", fontWeight: "800", letterSpacing: 0.5 },
});
