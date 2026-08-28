import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  Platform,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "expo-haptics";
import { coloredShadow, motion, spacing, withAlpha } from "@/src/theme";
import { programIconFor } from "@/src/utils/program-goal-icon";
import {
  ActiveProgram,
  CalendarEvent,
  CALENDAR_EVENT_KIND_EMOJI,
  CALENDAR_EVENT_KIND_LABEL,
  currentDayIndex,
  DEFAULT_CALORIES_BURN_TARGET_KCAL,
  DEFAULT_CALORIES_TARGET_KCAL,
  DEFAULT_SLEEP_TARGET_HOURS,
  DEFAULT_STEPS_TARGET,
  DEFAULT_TRAINING_MINUTES_TARGET,
  DEFAULT_WATER_TARGET_ML,
  Measurement,
  setHabitValue,
  deleteHabit,
  getActivePrograms,
  getCalendarEvents,
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
import { computeAdvancedStats } from "@/src/utils/stats";
import { motivationMessage } from "@/src/data/motivation";
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
import {
  getImportedSleepHoursForDate,
  getImportedStepsForDate,
  getRecentDailyAverage,
  localDateYYYYMMDD,
  SLEEP_METRIC_NAMES,
  subscribeHealthDataChanged,
  unitsToHoursMultiplier,
} from "@/src/utils/health-data-storage";
import MultiRingGauge, { innerContentDiameter } from "@/src/components/ui/MultiRingGauge";
import HabitProgressRow from "@/src/components/dashboard/HabitProgressRow";
import WeatherChip from "@/src/components/dashboard/WeatherChip";
import { useWeather } from "@/src/hooks/useWeather";
import HealthRecommendationCard from "@/src/components/dashboard/HealthRecommendationCard";
import RandomWodWidget from "@/src/components/dashboard/RandomWodWidget";
import { scheduleKindForDate } from "@/src/utils/calendar-day-schedule";
import { launchProgramDay } from "@/src/utils/program-launch";
import { sumCaloriesBurnedForDate, sumTrainingMinutesForDate } from "@/src/utils/daily-metrics";
import { computeDailyAggregateScore } from "@/src/utils/daily-aggregate-score";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import StatBadge from "@/src/components/dashboard/StatBadge";
import ProgramActionCard from "@/src/components/dashboard/ProgramActionCard";
import { useHealthRecommendation } from "@/src/hooks/useHealthRecommendation";

type ActiveWithProgram = { active: ActiveProgram; program: Program };

const numberFmt = new Intl.NumberFormat("fr-FR");
function formatCompactNumber(n: number): string {
  return numberFmt.format(Math.round(n));
}
/** Un `RingColor` peut être un dégradé (Sunset) — les badges plats
 * (`StatBadge`) ne peuvent peindre qu'une couleur unique, on prend le
 * premier ton du dégradé (même convention que `day-detail.tsx`). */
function solidRingColor(c: string | readonly [string, string]): string {
  return Array.isArray(c) ? c[0] : (c as string);
}
/** "7h42" — même format que `HealthMetricGrid.tsx` (Santé), dupliqué ici
 * volontairement (fichier isolé, pas de dépendance croisée Dashboard→Santé). */
function formatSleepDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${String(m).padStart(2, "0")}`;
}

// These habit kinds are already covered by the built-in Eau / Calories / Pas
// / Sommeil widgets rendered directly in the "Aujourd'hui" section — showing
// a custom habit of the same kind again would just track the same daily
// metric twice.
const WELLNESS_DUPLICATE_KINDS = new Set<HabitKind>([
  "water",
  "nutrition",
  "steps",
  "sleep",
]);

export default function TodayScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  // Utilisé uniquement par le hero Sunset (texte contextuel à côté de
  // l'anneau) — appelé inconditionnellement ici (règle des hooks), consommé
  // plus bas seulement sous ce thème.
  const healthRec = useHealthRecommendation();
  const weather = useWeather();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [measurements, setMeasurements] = useState<Measurement[]>([]);
  const [name, setName] = useState<string>("");
  const [actives, setActives] = useState<ActiveWithProgram[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessLog[]>([]);
  const [importedStepsToday, setImportedStepsToday] = useState(0);
  const [importedSleepHoursToday, setImportedSleepHoursToday] = useState(0);
  const [sleepAvg7d, setSleepAvg7d] = useState<number | null>(null);
  const [motivation, setMotivation] = useState("");
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
    setImportedStepsToday(await getImportedStepsForDate(localDateYYYYMMDD()));
    setImportedSleepHoursToday(await getImportedSleepHoursForDate(localDateYYYYMMDD()));
    setSleepAvg7d(await getRecentDailyAverage(SLEEP_METRIC_NAMES, 7, localDateYYYYMMDD(), "sum", unitsToHoursMultiplier));
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

  // La synchro santé (silencieuse, voir _layout.tsx) peut se terminer
  // n'importe quand pendant que ce tableau de bord est déjà ouvert — sans ça,
  // le widget Pas resterait périmé jusqu'au prochain intervalle de 60s
  // ci-dessus. Rafraîchit uniquement les pas importés, pas tout `load()`.
  useEffect(() => {
    return subscribeHealthDataChanged(() => {
      getImportedStepsForDate(todayYYYYMMDD()).then(setImportedStepsToday);
      getImportedSleepHoursForDate(todayYYYYMMDD()).then(setImportedSleepHoursToday);
    });
  }, []);

  // Best-effort browser notification companion — only fires while this tab
  // is open; there is no native build/push server behind this app.
  useEffect(() => {
    if (Platform.OS !== "web" || typeof Notification === "undefined") return;
    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }
  }, []);

  const today = todayYYYYMMDD();
  const wellness = wellnessLogs.find((w) => w.date === today) ?? null;
  // Le Score IronFlow (calcul à 6 piliers, `scoring.ts`) a été supprimé de
  // toute l'app — cette date de séance suffit pour tout ce qui en dépendait
  // ici (statut du CTA, ton du message de motivation).
  const workoutDoneToday = sessions.some(
    (s) => new Date(s.startedAt).toISOString().slice(0, 10) === today,
  );
  const stats = computeAdvancedStats(sessions);

  // Widget héros à 4 anneaux — calories brûlées/pas/temps d'entraînement du
  // jour (calculés localement, pas via `computeAdvancedStats` qui est
  // all-time) + le Sommeil en 4e anneau (remplace l'ancien Score IronFlow :
  // donnée réelle, jamais un score). Le pourcentage central reste une
  // moyenne simple des 4 anneaux, volontairement indépendante de tout
  // concept de score (voir `daily-aggregate-score.ts`).
  const caloriesBurnedToday = sumCaloriesBurnedForDate(sessions, today);
  const trainingMinutesToday = sumTrainingMinutesForDate(sessions, today);
  const stepsToday = (wellness?.steps ?? 0) + importedStepsToday;
  const caloriesBurnTarget = profile?.calories_burn_target_kcal || DEFAULT_CALORIES_BURN_TARGET_KCAL;
  const trainingMinutesTarget = profile?.training_minutes_target || DEFAULT_TRAINING_MINUTES_TARGET;
  const stepsTargetForRing = profile?.steps_target || DEFAULT_STEPS_TARGET;
  const sleepTargetForRing = profile?.sleep_target_hours || DEFAULT_SLEEP_TARGET_HOURS;
  const heroRingPercents = [
    (caloriesBurnedToday / caloriesBurnTarget) * 100,
    (stepsToday / stepsTargetForRing) * 100,
    (trainingMinutesToday / trainingMinutesTarget) * 100,
    (importedSleepHoursToday / sleepTargetForRing) * 100,
  ];
  const heroAggregateScore = computeDailyAggregateScore(heroRingPercents);
  const sleepDeltaMinutes = sleepAvg7d != null ? Math.round((importedSleepHoursToday - sleepAvg7d) * 60) : 0;

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
  // `today` dans les deps garantit un nouveau message à chaque nouveau jour
  // (comme l'ancienne rotation par jour de l'année) ; les autres deps le
  // renouvellent aussi dès qu'un signal change réellement (séance loguée,
  // streak, sommeil) — mais pas à chaque `load()` silencieux (toutes les
  // 60s) si rien n'a changé, pour ne pas griller l'anti-répétition pour rien.
  const shortSleepToday = importedSleepHoursToday > 0 && importedSleepHoursToday < 6;
  useEffect(() => {
    motivationMessage({
      workoutDoneToday,
      streakDays: stats.currentStreakDays,
      dayCompletionPct: heroAggregateScore,
      shortSleep: shortSleepToday,
    }).then(setMotivation);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [today, workoutDoneToday, heroAggregateScore, stats.currentStreakDays, shortSleepToday]);

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

  // Eau + habitudes personnalisées — calculé une seule fois, rendu soit DANS
  // le héros (Sunset, voir point 5 du brief) soit dans son propre bloc
  // (Classique, inchangé) selon le thème actif. Le bouton "Nouvelle
  // habitude" n'est PAS inclus ici — Sunset ne l'affiche plus du tout
  // (l'ajout se fait depuis les réglages), Classique le rend séparément
  // juste après ce fragment.
  const habitRows = (
    <>
      {theme.id === "sunset" ? (
        <Animated.View entering={FadeInDown.delay(80).duration(motion.base)}>
          <HabitProgressRow
            testID="widget-calories-nutrition"
            icon="nutrition"
            color={solidRingColor(theme.colors.metricColors.caloriesBurn)}
            label="Calories ingérées"
            value={wellness?.calories_kcal ?? 0}
            target={profile?.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL}
            unit="kcal"
            onPress={() => setQuantityModal({ which: "calories", mode: "set" })}
            onQuickAdd={() => setQuantityModal({ which: "calories", mode: "add" })}
            bare={theme.id === "sunset"}
          />
        </Animated.View>
      ) : null}
      <Animated.View entering={FadeInDown.delay(90).duration(motion.base)}>
        <HabitProgressRow
          testID="widget-water"
          icon="water"
          color={theme.colors.info}
          label="Eau"
          value={wellness?.water_ml ?? 0}
          target={profile?.water_target_ml || DEFAULT_WATER_TARGET_ML}
          unit="ml"
          onPress={() => setQuantityModal({ which: "water", mode: "set" })}
          onQuickAdd={() => bumpWellness("water_ml", 250)}
          bare={theme.id === "sunset"}
        />
      </Animated.View>
      {/* Habits — excludes kinds already covered by the Calories / Pas /
          Sommeil rings above, to avoid showing the same daily metric twice. */}
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
          const step = Math.max(1, niceStep(target));
          const onOpen = () => router.push(`/habit/${h.id}` as any);
          return (
            <Animated.View
              key={h.id}
              entering={FadeInDown.delay(Math.min(4 + i, 12) * 30).duration(motion.base)}
            >
              <HabitProgressRow
                testID={`widget-${h.id}`}
                icon={iconName}
                color={color}
                label={h.title}
                value={cur}
                target={target}
                unit={h.unit ?? undefined}
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
                  isTimed
                    ? () => setTimerHabit(h)
                    : done
                      ? undefined
                      : isCheckbox
                        ? () => toggleHabit(h.id, cur, target)
                        : () => bumpHabit(h.id, cur, step, target)
                }
                quickAddIcon={isTimed ? "play" : isCheckbox ? "checkmark" : "add"}
                onLongPress={onOpen}
                bare={theme.id === "sunset"}
              />
            </Animated.View>
          );
        })}
    </>
  );

  return (
    // `ThemedBackground` est monté ICI, comme premier enfant de CET écran
    // (pas partagé au niveau du layout des onglets) — voir le commentaire de
    // ce composant pour la raison : react-navigation garde tous les écrans
    // d'onglets montés, empilés par zIndex, et suppose que l'écran actif est
    // opaque pour masquer ceux du dessous. Un fond partagé unique ne peint
    // pas CET écran lui-même, donc le rendait transparent laissait le
    // contenu de l'onglet précédent transparaître au retour sur cet écran.
    // En mode "flat" (Classique), `ThemedBackground` ne rend rien et le
    // `SafeAreaView` garde son fond opaque habituel `theme.colors.surface`.
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.background.mode === "gradient" ? "transparent" : theme.colors.surface },
        ]}
        edges={["top"]}
      >
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {theme.id === "sunset" ? (
          // Header Sunset : avatar + salutation (remplace le titre
          // "Calendrier" et le bloc IRONFLOW/salutation/date classique, qui
          // devient redondant) + icône réglages, tous deux vers l'onglet
          // Profil.
          <View style={styles.sunsetTopHeader}>
            <PressableScale
              testID="sunset-header-avatar"
              style={styles.sunsetHeaderLeft}
              onPress={() => router.push("/profile" as any)}
            >
              <View style={styles.sunsetAvatarCircle}>
                {profile?.photoBase64 ? (
                  <Image
                    source={{ uri: `data:image/jpeg;base64,${profile.photoBase64}` }}
                    style={styles.sunsetAvatarImg}
                  />
                ) : (
                  <Ionicons name="person" size={18} color={theme.colors.onSurfaceSecondary} />
                )}
              </View>
              <Text style={[styles.sunsetHeaderGreeting, { color: theme.colors.onSurface }]} numberOfLines={1}>
                {greeting}{name ? `, ${name}` : ""}
              </Text>
            </PressableScale>
            <View style={styles.sunsetHeaderActions}>
              <Pressable testID="header-radio" hitSlop={10} onPress={() => router.push("/radio" as any)}>
                <Ionicons name="radio-outline" size={22} color={theme.colors.onSurface} />
              </Pressable>
              <Pressable
                testID="sunset-header-settings"
                hitSlop={10}
                onPress={() => router.push("/profile-tab" as any)}
              >
                <Ionicons name="settings-outline" size={22} color={theme.colors.onSurface} />
              </Pressable>
            </View>
          </View>
        ) : (
          <View style={styles.calHeaderRow}>
            <Text style={styles.sectionTitle}>Calendrier</Text>
            <Pressable
              testID="cal-add-event"
              onPress={() => router.push(`/calendar-event/new?date=${today}` as any)}
              hitSlop={8}
            >
              <Ionicons name="add-circle" size={20} color={theme.colors.brand} />
            </Pressable>
          </View>
        )}

        {/* Météo + légende des couleurs du calendrier — fusionnées en une
            seule ligne compacte, sans cadre, flottant sur le fond comme le
            reste du calendrier (Sunset uniquement ; Classique n'a jamais eu
            cette ligne — sa météo reste affichée dans l'en-tête du
            calendrier, voir `headerRight` passé à `WeekCalendarView`). */}
        {theme.id === "sunset" && effectiveCalendarView === "week" && (
          <View style={styles.calendarLegendRow}>
            {weather && <WeatherChip data={weather} />}
            <View style={styles.calendarLegendGroup}>
              <View style={styles.calendarLegendItem}>
                <View style={[styles.calendarLegendDot, { backgroundColor: theme.colors.brand }]} />
                <Text style={[styles.calendarLegendLabel, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                  Musculation
                </Text>
              </View>
              <View style={styles.calendarLegendItem}>
                <View style={[styles.calendarLegendDot, { backgroundColor: theme.colors.info }]} />
                <Text style={[styles.calendarLegendLabel, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                  Cardio
                </Text>
              </View>
              <View style={styles.calendarLegendItem}>
                <View style={[styles.calendarLegendDot, { backgroundColor: theme.colors.scheduleBoth }]} />
                <Text style={[styles.calendarLegendLabel, { color: theme.colors.onSurfaceTertiary }]} numberOfLines={1}>
                  Les deux
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Calendrier — tout en haut de l'écran (au-dessus du reste), avec la
            météo du jour à côté. Coloration par séance PRÉVUE pour
            aujourd'hui/futur (`scheduleKindForDate`) ; les jours passés
            gardent la coloration existante par séance complétée. */}
        {effectiveCalendarView === "week" ? (
          <WeekCalendarView
            sessions={sessions}
            selectedDate={selectedWeekDate}
            onSelectDate={setSelectedWeekDate}
            getEventsForDate={eventsForDate}
            onAddEvent={(dateStr) => router.push(`/calendar-event/new?date=${dateStr}` as any)}
            headerRight={weather ? <WeatherChip data={weather} /> : undefined}
            scheduleColorForDate={(dateStr) => scheduleKindForDate(dateStr, { actives, calendarEvents })}
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

        {/* Header — bloc IRONFLOW/salutation/date/badge programme (Classique
            uniquement ; sous Sunset, redondant avec le nouveau header en
            tête d'écran, entièrement retiré). */}
        {theme.id !== "sunset" && (
          <View style={styles.classicHeaderActions}>
            <Pressable testID="header-radio" hitSlop={10} onPress={() => router.push("/radio" as any)}>
              <Ionicons name="radio-outline" size={20} color={theme.colors.onSurfaceSecondary} />
            </Pressable>
            <Pressable testID="header-settings" hitSlop={10} onPress={() => router.push("/profile-tab" as any)}>
              <Ionicons name="settings-outline" size={20} color={theme.colors.onSurfaceSecondary} />
            </Pressable>
          </View>
        )}
        {theme.id !== "sunset" && (
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
                    <Ionicons name="moon" size={14} color={theme.colors.progress} />
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
        )}

        {/* Reminders due now — in-app only, no OS push */}
        {dueReminders.map((d) => (
          <PressableScale key={d.key} testID={`due-reminder-${d.key}`} onPress={() => router.push(d.href as any)}>
            <GlassCard accent={theme.colors.brand} style={styles.reminderBanner}>
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
                <Ionicons name="close" size={18} color={theme.colors.onSurfaceTertiary} />
              </Pressable>
            </GlassCard>
          </PressableScale>
        ))}

        {theme.id === "sunset" ? (
          <>
            {/* Héros Sunset — 4 anneaux distincts (calories brûlées/pas/
                temps d'entraînement/score, retour sur la simplification à un
                seul anneau), message de motivation + ligne contextuelle
                santé à côté, ligne "Aujourd'hui" en badges icône+chiffre,
                PUIS les habitudes (Eau + persos) DANS la même carte — plus
                de bloc séparé, plus de bouton "Nouvelle habitude" (ajout
                déplacé dans les réglages). Plus de CTA "Démarrer une séance"
                à cet endroit (voir la grille de cartes programme/WOD). */}
            <GlassCard style={styles.sunsetHeroCard} testID="ironflow-score-card-glass">
              <PressableScale
                testID="ironflow-score-card"
                style={styles.sunsetHeroTop}
                onPress={() => router.push("/day-detail" as any)}
              >
                <MultiRingGauge
                  size={148}
                  strokeWidth={10}
                  gap={4}
                  ringFill={theme.ringFill}
                  rings={[
                    {
                      pct: heroRingPercents[0] / 100,
                      color: theme.colors.metricColors.caloriesBurn,
                      trackColor: withAlpha(solidRingColor(theme.colors.metricColors.caloriesBurn), 18),
                    },
                    {
                      pct: heroRingPercents[1] / 100,
                      color: theme.colors.metricColors.steps,
                      trackColor: withAlpha(solidRingColor(theme.colors.metricColors.steps), 18),
                    },
                    {
                      pct: heroRingPercents[2] / 100,
                      color: theme.colors.metricColors.training,
                      trackColor: withAlpha(solidRingColor(theme.colors.metricColors.training), 18),
                    },
                    {
                      pct: heroRingPercents[3] / 100,
                      color: theme.colors.metricColors.sleep,
                      trackColor: withAlpha(solidRingColor(theme.colors.metricColors.sleep), 18),
                    },
                  ]}
                >
                  <StatHero
                    value={heroAggregateScore}
                    unit="%"
                    size="lg"
                    color={theme.colors.onSurface}
                    fitDiameter={innerContentDiameter(148, 10, 4, 4)}
                  />
                </MultiRingGauge>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.sunsetMotivation, { color: theme.colors.onSurface }]} numberOfLines={2}>
                    {motivation}
                  </Text>
                  {healthRec?.message ? (
                    <Text
                      style={[styles.sunsetHealthLine, { color: theme.colors.onSurfaceSecondary }]}
                      numberOfLines={3}
                    >
                      {healthRec.message}
                    </Text>
                  ) : null}
                </View>
              </PressableScale>

              {/* Ligne unique des 4 métriques détaillées derrière les anneaux
                  (calories brûlées/pas/entraînement/score, même ordre et
                  mêmes couleurs que les 4 anneaux ci-dessus). Chaque
                  `StatBadge` garde son `flex:1` par défaut (pas de largeur en
                  pourcentage combinée à `flex:0` — ce mélange calcule un
                  `flex-basis:0%` sur web qui ignore la largeur explicite et
                  effondre chaque cellule à 0px, le bug rapporté). */}
              <View style={styles.sunsetStatsGrid}>
                <StatBadge
                  testID="widget-calories"
                  icon="flame"
                  color={solidRingColor(theme.colors.metricColors.caloriesBurn)}
                  value={formatCompactNumber(caloriesBurnedToday)}
                  label="Calories"
                  onPress={() => router.push("/day-detail" as any)}
                />
                <StatBadge
                  testID="widget-steps"
                  icon="footsteps"
                  color={solidRingColor(theme.colors.metricColors.steps)}
                  value={formatCompactNumber(stepsToday)}
                  label="Pas"
                  onPress={() => setQuantityModal({ which: "steps", mode: "set" })}
                />
                <StatBadge
                  testID="widget-training-minutes"
                  icon="barbell"
                  color={solidRingColor(theme.colors.metricColors.training)}
                  value={`${Math.round(trainingMinutesToday)} min`}
                  label="Entraînement"
                  onPress={() => router.push("/day-detail" as any)}
                />
                <StatBadge
                  testID="widget-sleep"
                  icon="moon"
                  color={solidRingColor(theme.colors.metricColors.sleep)}
                  value={formatSleepDuration(importedSleepHoursToday)}
                  label="Sommeil"
                  onPress={() => router.push("/day-detail" as any)}
                />
              </View>

              <View style={styles.sunsetHabitsInCard}>{habitRows}</View>
            </GlassCard>
          </>
        ) : (
          <>
            {/* Motivation — contextual to today's progress */}
            <View style={styles.motivationCard}>
              <Ionicons name="sparkles" size={13} color={theme.colors.brand} />
              <Text style={[styles.motivationText, { color: theme.colors.onSurfaceSecondary }]}>{motivation}</Text>
            </View>

            {/* Résumé santé + recommandation d'intensité — autonome, masqué tant
                qu'aucune donnée santé n'est importée. */}
            <HealthRecommendationCard />

            {/* Héros — module unique : Score + statut séance + CTA, plutôt que
                trois cartes séparées de poids égal. Point focal réel de l'écran
                (anneau agrandi), esprit Oura/Whoop. `GlassCard` en mode "flat"
                est un pur passe-plat — rendu inchangé. */}
            <View style={styles.heroCard}>
              <GlassCard style={[styles.heroScoreRow, theme.card.mode === "glass" && styles.heroScoreRowGlass]}>
                <PressableScale
                  testID="ironflow-score-card"
                  style={styles.heroScoreRowInner}
                  onPress={() => router.push("/day-detail" as any)}
                >
                  <MultiRingGauge
                    size={156}
                    strokeWidth={10}
                    gap={4}
                    ringFill={theme.ringFill}
                    rings={[
                      { pct: heroRingPercents[0] / 100, color: theme.colors.metricColors.caloriesBurn },
                      { pct: heroRingPercents[1] / 100, color: theme.colors.metricColors.steps },
                      { pct: heroRingPercents[2] / 100, color: theme.colors.metricColors.training },
                      { pct: heroRingPercents[3] / 100, color: theme.colors.metricColors.sleep },
                    ]}
                  >
                    <StatHero
                      value={heroAggregateScore}
                      unit="%"
                      size="lg"
                      fitDiameter={innerContentDiameter(156, 10, 4, 4)}
                    />
                  </MultiRingGauge>
                <View style={{ flex: 1 }}>
                  <Text style={styles.scoreLabel}>SOMMEIL</Text>
                  <AnimatedNumber
                    value={importedSleepHoursToday}
                    formatter={(n) => formatSleepDuration(n)}
                    style={styles.scoreValue}
                  />
                  {sleepDeltaMinutes !== 0 && (
                    <View style={styles.scoreDeltaRow}>
                      <Ionicons
                        name={sleepDeltaMinutes > 0 ? "arrow-up" : "arrow-down"}
                        size={12}
                        color={sleepDeltaMinutes > 0 ? theme.colors.success : theme.colors.error}
                      />
                      <Text
                        style={[
                          styles.scoreDeltaText,
                          { color: sleepDeltaMinutes > 0 ? theme.colors.success : theme.colors.error },
                        ]}
                      >
                        {sleepDeltaMinutes > 0 ? "+" : ""}
                        {sleepDeltaMinutes} min vs moyenne
                      </Text>
                    </View>
                  )}
                </View>
                </PressableScale>
              </GlassCard>

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
                  !workoutDoneToday &&
                    !isRestDay &&
                    (theme.card.mode === "glass"
                      ? [
                          {
                            backgroundColor: withAlpha(theme.colors.brand, 18),
                            borderWidth: 1,
                            borderColor: withAlpha(theme.colors.brand, 50),
                          },
                          coloredShadow(theme.colors.brand, { offsetY: 0, opacity: 0.3, radius: 10, elevation: 3 }),
                        ]
                      : { backgroundColor: theme.colors.brand }),
                  workoutDoneToday && styles.mainCtaDone,
                  !workoutDoneToday && isRestDay && styles.mainCtaRest,
                ]}
                onPress={() => router.push(workoutDoneToday ? "/training" : "/plans")}
              >
                <Ionicons
                  name={
                    workoutDoneToday
                      ? "checkmark-circle"
                      : isRestDay
                        ? "moon"
                        : "flame"
                  }
                  size={20}
                  color={
                    workoutDoneToday
                      ? theme.colors.success
                      : isRestDay
                        ? theme.colors.progressSecondary
                        : theme.card.mode === "glass"
                          ? theme.colors.brand
                          : "#fff"
                  }
                />
                <Text
                  style={[
                    styles.mainCtaText,
                    workoutDoneToday && styles.mainCtaTextDone,
                    !workoutDoneToday && isRestDay && styles.mainCtaTextRest,
                  ]}
                  numberOfLines={1}
                >
                  {workoutDoneToday
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
            </View>
            {/* Anneaux permanents : Calories (apport)/Pas/Sommeil — l'Eau et les
                habitudes personnalisées vivent désormais dans la liste compacte
                juste en dessous (voir `HabitProgressRow`), pas ici en anneau. */}
            <View style={styles.todayGrid}>
              <Animated.View
                style={styles.todayTile}
                entering={FadeInDown.delay(0).duration(motion.base)}
              >
                <RingChip
                  testID="widget-calories"
                  icon="nutrition"
                  color={theme.colors.metricColors.caloriesBurn}
                  ringFill={theme.ringFill}
                  label="Calories"
                  value={wellness?.calories_kcal ?? 0}
                  target={profile?.calories_target_kcal || DEFAULT_CALORIES_TARGET_KCAL}
                  onPress={() => setQuantityModal({ which: "calories", mode: "set" })}
                />
              </Animated.View>
              <Animated.View
                style={styles.todayTile}
                entering={FadeInDown.delay(30).duration(motion.base)}
              >
                <RingChip
                  testID="widget-steps"
                  icon="footsteps"
                  color={theme.colors.metricColors.steps}
                  ringFill={theme.ringFill}
                  label="Pas"
                  value={(wellness?.steps ?? 0) + importedStepsToday}
                  target={profile?.steps_target || DEFAULT_STEPS_TARGET}
                  onPress={() => setQuantityModal({ which: "steps", mode: "set" })}
                  onQuickAdd={() => bumpWellness("steps", 1000)}
                />
              </Animated.View>
              <Animated.View
                style={styles.todayTile}
                entering={FadeInDown.delay(60).duration(motion.base)}
              >
                <RingChip
                  testID="widget-sleep"
                  icon="moon"
                  color={theme.colors.metricColors.sleep}
                  ringFill={theme.ringFill}
                  label="Sommeil"
                  value={importedSleepHoursToday}
                  target={profile?.sleep_target_hours || DEFAULT_SLEEP_TARGET_HOURS}
                  onPress={() => router.push("/health-sync-settings" as any)}
                />
              </Animated.View>
            </View>
          </>
        )}

        {/* Habitudes en liste compacte — Eau (décision produit : ligne plutôt
            qu'anneau, comme toute habitude personnalisée) + les habitudes de
            l'utilisateur, sur le modèle du widget hydratation actuel (tap
            pour éditer, "+" pour un ajout rapide) mais en liste. Sous
            Sunset, ce contenu vit désormais DANS la carte héros (voir
            `{habitRows}` plus haut) — ce bloc séparé, avec son bouton
            "Nouvelle habitude", ne s'affiche donc que sous Classique. */}
        {theme.id !== "sunset" && (
          <View style={styles.habitList}>
            {habitRows}
            {/* Add habit */}
            <PressableScale
              testID="add-habit-widget"
              style={styles.addHabitRow}
              onPress={() => router.push("/habit/new" as any)}
            >
              <Ionicons name="add" size={18} color={theme.colors.brand} />
              <Text style={styles.addHabitRowLabel}>Nouvelle habitude</Text>
            </PressableScale>
          </View>
        )}

        {/* Programmes actifs — un widget par programme (jusqu'à 2 en
            parallèle), toujours affiché s'il y en a au moins un : chacun
            lance directement sa séance du jour via `launchProgramDay`, même
            mécanisme que l'onglet Entraînements (pas de réimplémentation).
            Sous Sunset : grille de cartes "Ginásio/Cardio" (icône colorée
            en haut, titre, sous-texte, flèche) regroupant programmes actifs
            ET le WOD aléatoire dans le même format visuel — remplace la
            rangée `progMini` + le widget plein-largeur séparé. */}
        {theme.id === "sunset" ? (
          <View style={styles.sunsetProgramsGrid}>
            {actives.map(({ active, program }) => {
              const di = currentDayIndex(active, program.durationDays);
              const todayDay = program.days[di - 1];
              const todaySession = todayDay && !todayDay.rest ? todayDay.sessions[0] : null;
              return (
                <ProgramActionCard
                  key={program.id}
                  testID={`active-program-${program.id}`}
                  icon={programIconFor(program.coverEmoji)}
                  iconColor={program.color}
                  title={program.title}
                  subtitle={todayDay?.rest ? "Jour de repos" : todaySession ? todaySession.title : "Voir le programme"}
                  onPress={() =>
                    todaySession
                      ? launchProgramDay(program, active, di, todayDay, 0, todaySession, router)
                      : router.push(`/program/${program.id}`)
                  }
                  style={styles.sunsetProgramCard}
                />
              );
            })}
            <RandomWodWidget style={styles.sunsetProgramCard} />
          </View>
        ) : (
          actives.length > 0 && (
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
                  const todayDay = program.days[di - 1];
                  const todaySession = todayDay && !todayDay.rest ? todayDay.sessions[0] : null;
                  return (
                    <GlassCard
                      key={program.id}
                      style={[styles.progMini, { borderLeftColor: program.color }]}
                    >
                      <PressableScale
                        testID={`active-program-${program.id}`}
                        onPress={() => router.push(`/program/${program.id}`)}
                      >
                        <View style={styles.progMiniHead}>
                          <Ionicons
                            name={programIconFor(program.coverEmoji)}
                            size={22}
                            color={program.color}
                          />
                          <View style={{ flex: 1 }}>
                            <Text
                              style={[styles.progMiniTitle, { color: theme.colors.onSurface }]}
                              numberOfLines={1}
                            >
                              {program.title}
                            </Text>
                            <Text style={[styles.progMiniMeta, { color: theme.colors.onSurfaceTertiary }]}>
                              Jour {di}/{program.durationDays} · {done}/{totalSess}{" "}
                              séances
                            </Text>
                          </View>
                        </View>
                        <View style={[styles.progMiniTrack, { backgroundColor: theme.colors.surfaceTertiary }]}>
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
                      {todaySession && (
                        <PressableScale
                          testID={`active-program-${program.id}-launch`}
                          style={[styles.progMiniLaunch, { backgroundColor: withAlpha(program.color, 18) }]}
                          onPress={() => launchProgramDay(program, active, di, todayDay, 0, todaySession, router)}
                        >
                          <Ionicons name="play" size={13} color={program.color} />
                          <Text
                            style={[styles.progMiniLaunchText, { color: program.color }]}
                            numberOfLines={1}
                          >
                            LANCER : {todaySession.title.toUpperCase()}
                          </Text>
                        </PressableScale>
                      )}
                    </GlassCard>
                  );
                })}
              </View>
            </>
          )
        )}

        {theme.id !== "sunset" && <RandomWodWidget />}
        {theme.id === "sunset" && actives.length === 0 && (
          <Text style={[styles.heroEmptyHint, { color: theme.colors.onSurfaceTertiary }]}>
            Choisis un programme pour commencer ton parcours
          </Text>
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
            ? theme.colors.info
            : quantityModal?.which === "calories"
            ? solidRingColor(theme.colors.metricColors.caloriesBurn)
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
                color={solidRingColor(theme.colors.metricColors.caloriesBurn)}
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
                <Ionicons name="close" size={22} color={theme.colors.onSurfaceTertiary} />
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
              <Ionicons name="add-circle" size={16} color={theme.card.mode === "glass" ? theme.colors.brand : "#fff"} />
              <Text style={styles.dayModalAddText}>AJOUTER UN ÉVÉNEMENT</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
      </SafeAreaView>
    </View>
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

function formatFullDate() {
  return new Date().toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  const isGlass = theme.card.mode === "glass";
  return StyleSheet.create({
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
  classicHeaderActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.md,
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
  // Style de l'enveloppe `GlassCard` — vide sous Classique (passe-plat, pas
  // de chrome ajouté, comme avant), padding ajouté seulement sous Sunset
  // (`heroScoreRowGlass`) pour que le contenu ne touche pas les bords de la
  // carte en verre. La vraie mise en page (rangée anneau+texte) vit sur
  // `heroScoreRowInner`, à l'intérieur.
  heroScoreRow: {},
  heroScoreRowGlass: { padding: spacing.lg },
  heroScoreRowInner: {
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
  mainCtaDone: isGlass
    ? { backgroundColor: withAlpha(colors.success, 12), borderWidth: 1, borderColor: withAlpha(colors.success, 45) }
    : { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.success },
  mainCtaText: {
    color: isGlass ? colors.brand : "#fff",
    fontWeight: "800",
    fontSize: 15,
    letterSpacing: 1.5,
  },
  mainCtaTextDone: { color: colors.success },
  // Jour de repos programmé : ni une action pressante (orange), ni une
  // victoire (vert) — un état calme, neutre, dans la famille violette.
  mainCtaRest: isGlass
    ? { backgroundColor: withAlpha(colors.progress, 12), borderWidth: 1, borderColor: withAlpha(colors.progress, 45) }
    : { backgroundColor: colors.surfaceTertiary, borderWidth: 1, borderColor: colors.progressTertiary },
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
  progMiniLaunch: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: spacing.sm,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  progMiniLaunchText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.3 },
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
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  todayTile: { width: "31%", alignItems: "center" },
  habitList: {
    gap: spacing.sm,
    borderBottomWidth: 1,
    borderColor: colors.divider,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
    marginBottom: spacing.sm,
  },
  addHabitRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.brand,
    borderStyle: "dashed",
  },
  addHabitRowLabel: {
    color: colors.brand,
    fontSize: 12,
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
  dayModalAddBtn: isGlass
    ? {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: withAlpha(colors.brand, 18),
        borderWidth: 1,
        borderColor: withAlpha(colors.brand, 50),
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.sm,
      }
    : {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        backgroundColor: colors.brand,
        borderRadius: radius.md,
        padding: spacing.md,
        marginTop: spacing.sm,
      },
  dayModalAddText: { color: isGlass ? colors.brand : "#fff", fontWeight: "800", letterSpacing: 0.5 },
  // --- Sunset uniquement (voir conditionnels `theme.id === "sunset"`) ---
  calendarLegendRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 4,
  },
  calendarLegendGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    flexShrink: 1,
  },
  calendarLegendItem: { flexDirection: "row", alignItems: "center", gap: 4, flexShrink: 1 },
  calendarLegendDot: { width: 7, height: 7, borderRadius: 3.5 },
  calendarLegendLabel: { fontSize: 10, fontWeight: "600" },
  sunsetTopHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sunsetHeaderLeft: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 },
  sunsetHeaderActions: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  sunsetAvatarCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  sunsetAvatarImg: { width: 34, height: 34, borderRadius: 17 },
  sunsetHeaderGreeting: { fontSize: 16, fontWeight: "800", flexShrink: 1 },
  sunsetHeroCard: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  sunsetHeroTop: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  sunsetMotivation: {
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 19,
  },
  sunsetHealthLine: {
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  sunsetStatsGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sunsetHabitsInCard: { gap: spacing.sm },
  sunsetProgramsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  // Ratio assoupli de 1 (carré) à 1.4 (un peu plus large que haut) — retour
  // utilisateur : les cartes carrées étaient trop imposantes/hautes ; garde
  // la grille 2 colonnes mais réduit nettement l'emprise verticale.
  sunsetProgramCard: { width: "48%", aspectRatio: 1.05 },
  });
}
