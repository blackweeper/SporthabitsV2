import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import * as Haptics from "expo-haptics";
import { colors, radius, spacing } from "@/src/theme";
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
  getMeasurements,
  getPRs,
  getProfile,
  getReminders,
  getSessions,
  getWellnessLogs,
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
import { WellnessCard } from "@/src/components/WellnessWidgets";
import { progressionHref } from "@/src/utils/progression-nav";
import HabitTimerModal from "@/src/components/HabitTimerModal";
import SwipeableRow from "@/src/components/SwipeableRow";
import CalendarView, { DayEventDot } from "@/src/components/CalendarView";
import { getActiveHabitTimer } from "@/src/utils/habit-timer";
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

    // Restore an in-progress habit timer (e.g. the app was backgrounded or
    // reloaded mid-countdown) so it keeps running instead of silently
    // vanishing.
    const active = await getActiveHabitTimer();
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

        {/* IronFlow Score — real-time, transparent daily score */}
        <Pressable
          testID="ironflow-score-card"
          style={styles.scoreCard}
          onPress={() => router.push(progressionHref("overview") as any)}
        >
          <ScoreCircle score={todayScore.score} />
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
          <Ionicons name="chevron-forward" size={18} color={colors.onSurfaceTertiary} />
        </Pressable>

        {/* XP + Level card */}
        <Pressable
          style={styles.xpCard}
          testID="xp-card"
          onPress={() => router.push("/profile")}
        >
          <View style={styles.xpHeadRow}>
            <View style={styles.xpBadge}>
              <Text style={styles.xpLevelNum}>{xpState.level}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.xpLabel}>NIVEAU {xpState.level}</Text>
              <Text style={styles.xpValue}>{xpState.xp} XP</Text>
              <Text style={styles.xpHint}>
                {xpState.nextBadge
                  ? `${xpState.xpToNext} XP → niveau ${xpState.level + 1} · badge ${xpState.nextBadge.emoji} ${xpState.nextBadge.title} au N${xpState.nextBadge.level}`
                  : `${xpState.xpToNext} XP → niveau ${xpState.level + 1}`}
              </Text>
            </View>
          </View>
          <View style={styles.xpBar}>
            <View
              style={[
                styles.xpFill,
                { width: `${xpState.progress * 100}%` },
              ]}
            />
          </View>
          {xpState.unlockedBadges.length > 0 && (
            <View style={styles.badgeRow}>
              {xpState.unlockedBadges.slice(-6).map((b) => (
                <View
                  key={b.level}
                  style={[styles.badge, { backgroundColor: b.color + "30", borderColor: b.color }]}
                >
                  <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                </View>
              ))}
            </View>
          )}
        </Pressable>

        {/* CTA principal */}
        <Pressable
          testID="start-session"
          style={styles.mainCta}
          onPress={() => router.push("/plans")}
        >
          <Ionicons name="flame" size={22} color="#fff" />
          <Text style={styles.mainCtaText}>DÉMARRER LA SÉANCE</Text>
        </Pressable>

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
                  <Pressable
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
                  </Pressable>
                );
              })}
            </View>
          </>
        )}

        {/* Unified daily list: séance, wellness quick-taps, and habits */}
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
        <View style={styles.listCol}>
          {/* Séance (workout) */}
          <SessionListItem
            done={todayScore.workoutDone}
            onPress={() => router.push("/training")}
          />
          {/* Wellness quick-taps: Eau / Calories / Pas */}
          <WellnessCard
            icon="water"
            color="#3B82F6"
            label="Eau"
            value={wellness?.water_ml ?? 0}
            target={profile?.water_target_ml || DEFAULT_WATER_TARGET_ML}
            unit="ml"
            shortcuts={[
              { label: "+250", delta: 250 },
              { label: "+500", delta: 500 },
            ]}
            onBump={(d) => bumpWellness("water_ml", d)}
            onSet={(v) => setWellnessValue("water_ml", v)}
            testId="widget-water"
          />
          <WellnessCard
            icon="nutrition"
            color="#F97316"
            label="Calories"
            value={wellness?.calories_kcal ?? 0}
            target={profile?.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL}
            unit="kcal"
            shortcuts={[
              { label: "+200", delta: 200 },
              { label: "+500", delta: 500 },
            ]}
            onBump={(d) => bumpWellness("calories_kcal", d)}
            onSet={(v) => setWellnessValue("calories_kcal", v)}
            testId="widget-calories"
          />
          <WellnessCard
            icon="footsteps"
            color="#10B981"
            label="Pas"
            value={wellness?.steps ?? 0}
            target={profile?.steps_target || DEFAULT_STEPS_TARGET}
            unit="pas"
            shortcuts={[
              { label: "+1000", delta: 1000 },
              { label: "+2500", delta: 2500 },
            ]}
            onBump={(d) => bumpWellness("steps", d)}
            onSet={(v) => setWellnessValue("steps", v)}
            testId="widget-steps"
          />
          {/* Habits — excludes kinds already covered by the Eau / Calories /
              Pas cards above, to avoid showing the same daily metric twice. */}
          {habits
            .filter((h) => !WELLNESS_DUPLICATE_KINDS.has(h.kind))
            .map((h) => {
              const cur =
                logs.find((l) => l.habitId === h.id && l.date === today)?.value ?? 0;
              const target = h.target && h.target > 0 ? h.target : 1;
              return (
                <HabitListItem
                  key={h.id}
                  habit={h}
                  current={cur}
                  target={target}
                  onIncrement={async () => {
                    const next = cur >= target ? 0 : cur + 1;
                    await setHabitValue(h.id, today, next);
                    load();
                  }}
                  onReset={async () => {
                    await setHabitValue(h.id, today, 0);
                    load();
                  }}
                  onOpen={() => router.push(`/habit/${h.id}` as any)}
                  onStartTimer={() => setTimerHabit(h)}
                  onDelete={async () => {
                    await deleteHabit(h.id);
                    load();
                  }}
                />
              );
            })}
          {/* Add habit */}
          <Pressable
            testID="add-habit-widget"
            style={styles.addListItem}
            onPress={() => router.push("/habit/new" as any)}
          >
            <Ionicons name="add-circle" size={20} color={colors.brand} />
            <Text style={styles.addWidgetLabel}>Nouvelle habitude</Text>
          </Pressable>
        </View>

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

        {/* Streak — hero metric */}
        <Pressable
          testID="streak-hero"
          style={styles.streakHero}
          onPress={() => router.push("/stats")}
        >
          <View style={styles.streakLeft}>
            <Ionicons name="flame" size={30} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.streakLabel}>STREAK ACTUEL</Text>
            <Text style={styles.streakBig}>
              {stats.currentStreakDays}
              <Text style={styles.streakUnit}> jours</Text>
            </Text>
            <Text style={styles.streakSub}>
              {stats.currentStreakDays === 0
                ? "Fais une séance aujourd'hui pour lancer ta série 🔥"
                : stats.currentStreakDays >= stats.bestStreakDays
                ? "Tu es sur ton record ! Continue ↗"
                : `Record : ${stats.bestStreakDays} jours`}
            </Text>
          </View>
        </Pressable>

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
      <Modal
        visible={dayModalDate !== null}
        animationType="fade"
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

function SessionListItem({
  done,
  onPress,
}: {
  done: boolean;
  onPress: () => void;
}) {
  const color = "#FF5722";
  return (
    <Pressable
      testID="widget-session"
      style={[styles.listItem, done && { borderColor: color }]}
      onPress={onPress}
    >
      <View style={styles.listItemHead}>
        <View
          style={[
            styles.listItemIcon,
            { backgroundColor: done ? color : colors.surfaceTertiary },
          ]}
        >
          <Ionicons
            name="barbell"
            size={16}
            color={done ? "#fff" : colors.onSurfaceTertiary}
          />
        </View>
        <Text style={styles.listItemTitle}>Séance</Text>
        <Text style={[styles.listItemPct, done && { color }]}>
          {done ? "100%" : "0%"}
        </Text>
        {done && <Ionicons name="checkmark-circle" size={14} color={color} />}
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: done ? "100%" : "0%", backgroundColor: color },
          ]}
        />
      </View>
    </Pressable>
  );
}

function HabitListItem({
  habit,
  current,
  target,
  onIncrement,
  onReset,
  onOpen,
  onStartTimer,
  onDelete,
}: {
  habit: Habit;
  current: number;
  target: number;
  onIncrement: () => void;
  onReset: () => void;
  onOpen: () => void;
  onStartTimer: () => void;
  onDelete: () => void | Promise<void>;
}) {
  const done = current >= target;
  const color = habit.color ?? "#4CAF50";
  const iconName = (habit.kind ? HABIT_KIND_ICON[habit.kind] : "star") as any;
  const pct = target > 0 ? Math.min(1, current / target) : 0;
  const pctLabel = `${Math.round(pct * 100)}%`;
  // Habits tracked in minutes get a real countdown timer instead of a plain
  // tap-to-increment counter.
  const isTimed = habit.unit === "min";
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
    <Pressable
      testID={`widget-${habit.id}`}
      style={[styles.listItem, done && { borderColor: color }]}
      onPress={isTimed ? undefined : onIncrement}
      onLongPress={onOpen}
      delayLongPress={450}
    >
      <View style={styles.listItemHead}>
        <View
          style={[
            styles.listItemIcon,
            { backgroundColor: done ? color : colors.surfaceTertiary },
          ]}
        >
          <Ionicons
            name={iconName}
            size={16}
            color={done ? "#fff" : colors.onSurfaceTertiary}
          />
        </View>
        <Text style={styles.listItemTitle} numberOfLines={1}>
          {habit.title}
        </Text>
        {target > 1 && !done && (
          <Text style={styles.listItemValue}>
            {isTimed ? `${target} min` : `${current}/${target}${habit.unit ? ` ${habit.unit}` : ""}`}
          </Text>
        )}
        <Text style={[styles.listItemPct, done && { color }]}>{pctLabel}</Text>
        {done ? (
          <Ionicons name="checkmark-circle" size={14} color={color} />
        ) : isTimed ? null : target > 1 ? (
          <Pressable
            testID={`widget-${habit.id}-reset`}
            hitSlop={8}
            onPress={onReset}
            style={styles.listItemResetBtn}
          >
            <Ionicons name="refresh" size={12} color={colors.onSurfaceTertiary} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.progressTrack}>
        <View
          style={[
            styles.progressFill,
            { width: `${Math.round(pct * 100)}%`, backgroundColor: color },
          ]}
        />
      </View>
      {isTimed && !done && (
        <Pressable
          testID={`widget-${habit.id}-start`}
          style={[styles.startTimerBtn, { backgroundColor: color }]}
          onPress={onStartTimer}
        >
          <Ionicons name="play" size={13} color="#fff" />
          <Text style={styles.startTimerBtnText}>COMMENCER</Text>
        </Pressable>
      )}
    </Pressable>
    </SwipeableRow>
  );
}

function ScoreCircle({ score }: { score: number }) {
  const size = 84;
  const strokeWidth = 8;
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const dashOffset = c - (Math.min(100, Math.max(0, score)) / 100) * c;
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
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={colors.brand}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={c}
          strokeDashoffset={dashOffset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={{ position: "absolute", alignItems: "center" }}>
        <Text style={{ color: colors.onSurface, fontSize: 20, fontWeight: "800" }}>
          {score}%
        </Text>
      </View>
    </View>
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
  streakHero: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: "#FF5722",
    padding: spacing.lg,
    borderRadius: radius.md,
    shadowColor: "#FF5722",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  streakLeft: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  streakLabel: {
    color: "#fff",
    fontSize: 10,
    letterSpacing: 2,
    fontWeight: "800",
    opacity: 0.9,
  },
  streakBig: {
    color: "#fff",
    fontSize: 42,
    fontWeight: "800",
    marginTop: 2,
  },
  streakUnit: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    opacity: 0.9,
  },
  streakSub: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "600",
    opacity: 0.9,
    marginTop: 2,
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
  dayBadge: {
    alignItems: "center",
    backgroundColor: colors.brandTertiary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.md,
  },
  dayLabel: {
    color: colors.brandSecondary,
    fontSize: 9,
    letterSpacing: 1,
    fontWeight: "800",
  },
  dayValue: { color: colors.brand, fontSize: 22, fontWeight: "800" },
  daySub: { color: colors.brandSecondary, fontSize: 11, fontWeight: "700" },
  scoreCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  scoreLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    letterSpacing: 1.4,
    fontWeight: "800",
  },
  scoreValue: { color: colors.onSurface, fontSize: 26, fontWeight: "800" },
  scoreHint: { color: colors.brand, fontSize: 12, fontWeight: "700", marginTop: 2 },
  scoreDeltaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  scoreDeltaText: { fontSize: 11, fontWeight: "700" },
  xpCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  xpHeadRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  xpBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.brand,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#fff",
  },
  xpLevelNum: { color: "#fff", fontWeight: "800", fontSize: 20 },
  xpLabel: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  xpValue: {
    color: colors.onSurface,
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  xpHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 10,
    fontWeight: "600",
    marginTop: 2,
  },
  xpBar: {
    height: 6,
    backgroundColor: colors.surfaceTertiary,
    borderRadius: 3,
    overflow: "hidden",
  },
  xpFill: { height: "100%", borderRadius: 3, backgroundColor: colors.brand },
  badgeRow: { flexDirection: "row", gap: 6, marginTop: 2 },
  badge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  badgeEmoji: { fontSize: 15 },
  mainCta: {
    backgroundColor: colors.brand,
    padding: 18,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
  },
  mainCtaText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1.5,
  },
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
  listItem: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 8,
  },
  listItemHead: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  listItemIcon: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  listItemTitle: {
    flex: 1,
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 13,
  },
  listItemValue: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontWeight: "600",
  },
  listItemPct: {
    color: colors.onSurfaceTertiary,
    fontWeight: "800",
    fontSize: 13,
    minWidth: 34,
    textAlign: "right",
  },
  listItemResetBtn: {
    padding: 4,
    borderRadius: 6,
  },
  progressTrack: {
    height: 5,
    borderRadius: 3,
    backgroundColor: colors.surfaceTertiary,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 3 },
  startTimerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    marginTop: 4,
  },
  startTimerBtnText: {
    color: "#fff",
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
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
