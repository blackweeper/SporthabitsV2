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
import Animated, {
  Easing,
  FadeInDown,
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { colors, motion, radius, spacing } from "@/src/theme";
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
import { computeAdvancedStats } from "@/src/utils/stats";
import { motivationMessage } from "@/src/data/motivation";
import { progressionHref } from "@/src/utils/progression-nav";
import HabitTimerModal from "@/src/components/HabitTimerModal";
import CalendarView, { DayEventDot } from "@/src/components/CalendarView";
import WeekCalendarView from "@/src/components/WeekCalendarView";
import { AppSettings, CalendarViewMode, getAppSettings } from "@/src/utils/app-settings";
import { ActionChip, ActionsScroll, MinusButton, PresetCard, QuantityModal } from "@/src/components/HabitCard";
import PressableScale from "@/src/components/ui/PressableScale";
import RingChip from "@/src/components/ui/RingChip";
import StatHero from "@/src/components/ui/StatHero";
import AnimatedNumber from "@/src/components/ui/AnimatedNumber";
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
  const [appSettings, setAppSettings] = useState<AppSettings | null>(null);
  const [selectedWeekDate, setSelectedWeekDate] = useState(todayYYYYMMDD());
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
    setAppSettings(await getAppSettings());

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

  const primary = actives[0];
  const dayIndex = primary
    ? currentDayIndex(primary.active, primary.program.durationDays)
    : null;
  const totalDays = primary?.program.durationDays ?? null;
  // "Mon prochain entraînement" doit être nommé, pas juste "démarrer la
  // séance" générique — on sait déjà quel jour du programme actif on est.
  const todayProgramDay =
    primary && dayIndex ? primary.program.days[dayIndex - 1] : null;
  const isRestDay = todayProgramDay?.rest ?? false;
  const nextSessionTitle =
    todayProgramDay && !isRestDay ? todayProgramDay.sessions[0]?.title : null;

  const greetingHour = new Date().getHours();
  const greeting =
    greetingHour < 12 ? "Bonjour" : greetingHour < 18 ? "Salut" : "Bonsoir";
  const motivation = motivationMessage({
    workoutDoneToday: todayScore.workoutDone,
    streakDays: stats.currentStreakDays,
    score: todayScore.score,
  });

  // Semaine par défaut (préférence explicite) — la vue mois reste un choix
  // manuel via les réglages, plus de bascule automatique selon la largeur
  // d'écran (contredisait la préférence "semaine par défaut" sur tablette/web).
  const effectiveCalendarView: Exclude<CalendarViewMode, "auto"> =
    appSettings?.calendarView === "month" ? "month" : "week";

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
    // Habitudes du jour — les logs sont déjà indexés par date, donc ça
    // fonctionne aussi bien pour un jour passé de la semaine que pour
    // aujourd'hui (contrairement au calendrier mois, qui ne montrait que
    // des points colorés, jamais le détail des habitudes).
    for (const h of habits) {
      if (WELLNESS_DUPLICATE_KINDS.has(h.kind)) continue;
      const log = logs.find((l) => l.habitId === h.id && l.date === dateStr);
      const cur = log?.value ?? 0;
      const target = h.target && h.target > 0 ? h.target : 1;
      const done = cur >= target;
      entries.push({
        key: `h-${h.id}`,
        emoji: done ? "✅" : "⬜",
        title: h.unit ? `${h.title} — ${cur}/${target} ${h.unit}` : h.title,
        time: null,
        onPress: () => {
          setDayModalDate(null);
          router.push(`/habit/${h.id}` as any);
        },
      });
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

  // Préréglage dans la modale Eau/Calories/Pas : applique la valeur ET ferme
  // la modale dans le même geste, pour un retour immédiat au dashboard
  // (voir `bumpWellness`, qui elle reste utilisée telle quelle par le
  // "+" à tap unique directement sur l'anneau).
  const quickAdd = (field: "water_ml" | "calories_kcal" | "steps", delta: number) => {
    bumpWellness(field, delta);
    setQuantityModal(null);
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

  // Plafonné à `target` — contrairement à l'Eau/Calories/Pas (bumpWellness,
  // un modèle de données totalement séparé), un dépassement n'a pas de sens
  // pour une habitude à compter ("Brosser les dents" 2x) : une fois
  // l'objectif atteint, on bloque l'ajout plutôt que de laisser grimper.
  const bumpHabit = async (habitId: string, current: number, delta: number, target: number) => {
    if (current >= target) return;
    Haptics.selectionAsync().catch(() => {});
    await setHabitValue(habitId, today, Math.min(target, Math.max(0, current + delta)));
    load();
  };

  const toggleHabit = async (habitId: string, current: number, target: number) => {
    // Marquer comme fait est une "victoire" (notification Success) ;
    // annuler reste un simple selectionAsync, pas une célébration.
    const willBeDone = current <= 0;
    if (willBeDone) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    } else {
      Haptics.selectionAsync().catch(() => {});
    }
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
          {dayIndex && totalDays && primary ? (
            <PressableScale
              testID="dashboard-program-badge"
              style={styles.dayBadge}
              onPress={() => router.push(`/program/${primary.program.id}`)}
            >
              {isRestDay ? (
                <View style={styles.dayRestRow}>
                  <Ionicons name="moon" size={14} color={colors.progress} />
                  <Text style={styles.dayRestLabel}>REPOS</Text>
                </View>
              ) : (
                <>
                  <Text style={styles.dayLabel}>JOUR</Text>
                  <AnimatedNumber value={dayIndex} style={styles.dayValue} />
                  <Text style={styles.daySub}>/ {totalDays}</Text>
                </>
              )}
            </PressableScale>
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
              <AnimatedNumber
                value={todayScore.score}
                formatter={(n) => `${Math.round(n)}%`}
                style={styles.scoreValue}
              />
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
              besoin d'une carte "Séance" séparée juste pour l'afficher.
              Quand un programme actif existe, il nomme la séance du jour
              (« mon prochain entraînement ») plutôt qu'un libellé générique ;
              un jour de repos programmé se présente différemment d'une
              action à faire. */}
          <PressableScale
            testID="start-session"
            style={[
              styles.mainCta,
              todayScore.workoutDone && styles.mainCtaDone,
              !todayScore.workoutDone && isRestDay && styles.mainCtaRest,
            ]}
            onPress={() => router.push(todayScore.workoutDone ? "/training" : "/plans")}
          >
            <Ionicons
              name={
                todayScore.workoutDone
                  ? "checkmark-circle"
                  : isRestDay
                    ? "moon"
                    : "flame"
              }
              size={20}
              color={
                todayScore.workoutDone
                  ? colors.success
                  : isRestDay
                    ? colors.progressSecondary
                    : "#fff"
              }
            />
            <Text
              style={[
                styles.mainCtaText,
                todayScore.workoutDone && styles.mainCtaTextDone,
                !todayScore.workoutDone && isRestDay && styles.mainCtaTextRest,
              ]}
              numberOfLines={1}
            >
              {todayScore.workoutDone
                ? "SÉANCE TERMINÉE"
                : isRestDay
                  ? "JOUR DE REPOS"
                  : nextSessionTitle
                    ? `DÉMARRER : ${nextSessionTitle.toUpperCase()}`
                    : "DÉMARRER LA SÉANCE"}
            </Text>
          </PressableScale>
          {actives.length === 0 && (
            <Text style={styles.heroEmptyHint}>
              Choisis un programme pour commencer ton parcours
            </Text>
          )}
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
        {/* Grille unique Eau/Calories/Pas + habitudes — même langage visuel
            partout (tuile + anneau de progression), contrairement à l'ancien
            découpage rangée-de-3-anneaux + liste verticale de grosses lignes
            d'habitudes. `flexWrap` + cellules à largeur fixe ("31%", même
            idiome que `cardWrap:{width:"48%"}` de la Bibliothèque) plutôt que
            `flex:1` sur RingChip, qui ne se comporte correctement que pour
            exactement 3 enfants par ligne. */}
        <View style={styles.todayGrid}>
          <Animated.View
            style={styles.todayTile}
            entering={FadeInDown.delay(0).duration(motion.base)}
          >
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
          </Animated.View>
          <Animated.View
            style={styles.todayTile}
            entering={FadeInDown.delay(30).duration(motion.base)}
          >
            <RingChip
              testID="widget-calories"
              icon="nutrition"
              color="#F97316"
              label="Calories"
              value={wellness?.calories_kcal ?? 0}
              target={profile?.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL}
              onPress={() => setQuantityModal({ which: "calories", mode: "set" })}
            />
          </Animated.View>
          <Animated.View
            style={styles.todayTile}
            entering={FadeInDown.delay(60).duration(motion.base)}
          >
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
          </Animated.View>
          {/* Habits — excludes kinds already covered by the Eau / Calories /
              Pas rings above, to avoid showing the same daily metric twice. */}
          {habits
            .filter((h) => !WELLNESS_DUPLICATE_KINDS.has(h.kind))
            .map((h, i) => {
              const cur =
                logs.find((l) => l.habitId === h.id && l.date === today)?.value ?? 0;
              const target = h.target && h.target > 0 ? h.target : 1;
              const color = h.color ?? "#4CAF50";
              const iconName = (h.kind ? HABIT_KIND_ICON[h.kind] : "star") as any;
              const isTimed = h.unit === "min";
              const isCheckbox = !isTimed && target <= 1;
              const done = cur >= target;
              const step = niceStep(target);
              const onOpen = () => router.push(`/habit/${h.id}` as any);
              return (
                <Animated.View
                  key={h.id}
                  style={styles.todayTile}
                  entering={FadeInDown.delay(Math.min(3 + i, 10) * 30).duration(motion.base)}
                >
                  <RingChip
                    testID={`widget-${h.id}`}
                    icon={iconName}
                    color={color}
                    label={h.title}
                    value={cur}
                    target={target}
                    done={!isTimed && !isCheckbox && done}
                    onPress={
                      isTimed
                        ? () => setTimerHabit(h)
                        : isCheckbox
                          ? () => toggleHabit(h.id, cur, target)
                          : done
                            ? onOpen
                            : () => bumpHabit(h.id, cur, 1, target)
                    }
                    onQuickAdd={
                      !isTimed && !isCheckbox && !done && step > 1
                        ? () => bumpHabit(h.id, cur, step, target)
                        : undefined
                    }
                    onLongPress={onOpen}
                  />
                </Animated.View>
              );
            })}
          {/* Add habit */}
          <PressableScale
            testID="add-habit-widget"
            style={styles.todayTileAdd}
            onPress={() => router.push("/habit/new" as any)}
          >
            <Ionicons name="add" size={22} color={colors.brand} />
            <Text style={styles.todayTileAddLabel}>Nouvelle</Text>
          </PressableScale>
        </View>

        {/* Programmes actifs — jusqu'à 2 en parallèle. Le badge "Jour X/Y" du
            header ne reflète que le programme principal (actives[0]) ; cette
            rangée ne reste donc utile (et visible) que s'il y a un 2e
            programme actif en parallèle — sinon elle ne ferait que dupliquer
            le badge header, d'où sa suppression pour le cas courant à un
            seul programme actif. */}
        {actives.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>Programmes actifs</Text>
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
        {effectiveCalendarView === "week" ? (
          <WeekCalendarView
            sessions={sessions}
            selectedDate={selectedWeekDate}
            onSelectDate={setSelectedWeekDate}
            getEventsForDate={eventsForDate}
            onAddEvent={(dateStr) => router.push(`/calendar-event/new?date=${dateStr}` as any)}
          />
        ) : (
          <CalendarView
            sessions={sessions}
            monthOffset={calendarMonthOffset}
            onChangeMonth={setCalendarMonthOffset}
            events={calDayEvents}
            onDayPress={setDayModalDate}
          />
        )}

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
        // déplacés depuis les anciennes cartes pleine largeur vers l'intérieur
        // de ce modal, ouvert au tap sur l'anneau. Chaque préréglage applique
        // ET ferme la modale immédiatement (`quickAdd`) — avant, seul le bouton
        // "Valider" fermait, laissant la modale ouverte après un tap sur un
        // préréglage (3+ taps pour logger "500 ml" au lieu d'1-2).
        quickActions={
          quantityModal?.which === "water" ? (
            <ActionsScroll>
              <MinusButton testID="widget-water-minus" onPress={() => quickAdd("water_ml", -250)} />
              <ActionChip testID="widget-water-250" label="+250 ml" onPress={() => quickAdd("water_ml", 250)} />
              <ActionChip testID="widget-water-500" label="+500 ml" onPress={() => quickAdd("water_ml", 500)} />
              <ActionChip testID="widget-water-750" label="+750 ml" onPress={() => quickAdd("water_ml", 750)} />
              <ActionChip testID="widget-water-1000" label="+1 L" onPress={() => quickAdd("water_ml", 1000)} />
            </ActionsScroll>
          ) : quantityModal?.which === "calories" ? (
            <ActionsScroll>
              {mealPresets.map((m) => (
                <PresetCard
                  key={m.id}
                  testID={`widget-calories-${m.id}`}
                  emoji={m.emoji}
                  value={`+${m.kcal}`}
                  label={m.label}
                  onPress={() => quickAdd("calories_kcal", m.kcal)}
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
              <MinusButton testID="widget-steps-minus" onPress={() => quickAdd("steps", -500)} />
              <ActionChip testID="widget-steps-500" label="+500" onPress={() => quickAdd("steps", 500)} />
              <ActionChip testID="widget-steps-1000" label="+1000" onPress={() => quickAdd("steps", 1000)} />
              <ActionChip testID="widget-steps-2000" label="+2000" onPress={() => quickAdd("steps", 2000)} />
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
      <View style={{ position: "absolute" }}>
        <StatHero value={score} unit="%" size={size >= 140 ? "lg" : "sm"} />
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
  dayRestRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  dayRestLabel: {
    color: colors.progressSecondary,
    fontSize: 11,
    letterSpacing: 1,
    fontWeight: "800",
  },
  // Module héros : un seul bloc élevé (Score + CTA) au lieu de trois cartes
  // de poids égal — devient le point focal réel de l'écran.
  // Plus de carte bordée autour du score — l'anneau doit être l'ancre
  // visuelle autonome de l'écran, pas un élément de plus imbriqué dans un
  // rectangle parmi d'autres (retour utilisateur "trop de rectangles").
  heroCard: {
    gap: spacing.md,
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
  // Jour de repos programmé : ni une action pressante (orange), ni une
  // victoire (vert) — un état calme, neutre, dans la famille violette.
  mainCtaRest: {
    backgroundColor: colors.surfaceTertiary,
    borderWidth: 1,
    borderColor: colors.progressTertiary,
  },
  mainCtaTextRest: { color: colors.progressSecondary },
  heroEmptyHint: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    textAlign: "center",
    marginTop: -spacing.xs,
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
  // Grille unique Eau/Calories/Pas + habitudes (POLISH V2) — remplace
  // l'ancienne rangée fixe de 3 anneaux + liste verticale de grosses lignes
  // d'habitudes : même langage visuel partout (tuile + anneau), densité
  // homogène quel que soit le nombre d'habitudes.
  todayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    rowGap: spacing.lg,
    columnGap: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    marginBottom: spacing.sm,
  },
  todayTile: { width: "31%", alignItems: "center" },
  todayTileAdd: {
    width: "31%",
    height: 76,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
  },
  todayTileAddLabel: {
    color: colors.brand,
    fontSize: 10,
    fontWeight: "800",
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
