import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-gifted-charts";
import { spacing } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import MultiRingGauge from "@/src/components/ui/MultiRingGauge";
import {
  DEFAULT_CALORIES_BURN_TARGET_KCAL,
  DEFAULT_STEPS_TARGET,
  DEFAULT_TRAINING_MINUTES_TARGET,
  DailyJournalEntry,
  Habit,
  HabitLog,
  UserProfile,
  WellnessLog,
  WorkoutSession,
  getDailyJournal,
  getHabitLogs,
  getHabits,
  getProfile,
  getSessions,
  getWellnessLogs,
  todayYYYYMMDD,
} from "@/src/utils/gym-storage";
import { getImportedStepsForDates } from "@/src/utils/health-data-storage";
import { computeDailyIronflowScore } from "@/src/utils/scoring";
import {
  last7DatesEndingAt,
  sumCaloriesBurnedForDate,
  sumTrainingMinutesForDate,
  trainingsThisWeekSummary,
} from "@/src/utils/daily-metrics";
import { computeDailyAggregateScore } from "@/src/utils/daily-aggregate-score";
import { progressionHref } from "@/src/utils/progression-nav";

const WEEKDAY_LETTERS = ["L", "M", "M", "J", "V", "S", "D"];

function formatDayLabel(dateStr: string): string {
  const d = new Date(`${dateStr}T00:00:00Z`);
  return WEEKDAY_LETTERS[(d.getUTCDay() + 6) % 7];
}

export default function DayDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<HabitLog[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessLog[]>([]);
  const [dailyJournal, setDailyJournal] = useState<DailyJournalEntry[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [importedStepsByDate, setImportedStepsByDate] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [s, h, l, w, dj, p] = await Promise.all([
      getSessions(),
      getHabits(),
      getHabitLogs(),
      getWellnessLogs(),
      getDailyJournal(),
      getProfile(),
    ]);
    setSessions(s);
    setHabits(h);
    setLogs(l);
    setWellnessLogs(w);
    setDailyJournal(dj);
    setProfile(p);
    setImportedStepsByDate(await getImportedStepsForDates(last7DatesEndingAt(todayYYYYMMDD())));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = todayYYYYMMDD();
  const dates = last7DatesEndingAt(today);
  const scoreProfile = profile ?? { weight_kg: null, height_cm: null, sex: null, age: null };

  const perDateMetrics = dates.map((dateStr) => {
    const caloriesBurned = sumCaloriesBurnedForDate(sessions, dateStr);
    const steps =
      (wellnessLogs.find((w) => w.date === dateStr)?.steps ?? 0) + (importedStepsByDate[dateStr] ?? 0);
    const trainingMinutes = sumTrainingMinutesForDate(sessions, dateStr);
    const score = computeDailyIronflowScore(dateStr, sessions, habits, logs, wellnessLogs, dailyJournal, scoreProfile).score;
    return { date: dateStr, caloriesBurned, steps, trainingMinutes, score };
  });
  const todayMetrics = perDateMetrics[perDateMetrics.length - 1];

  const caloriesTarget = profile?.calories_burn_target_kcal || DEFAULT_CALORIES_BURN_TARGET_KCAL;
  const stepsTarget = profile?.steps_target || DEFAULT_STEPS_TARGET;
  const minutesTarget = profile?.training_minutes_target || DEFAULT_TRAINING_MINUTES_TARGET;

  const ringPercents = [
    (todayMetrics.caloriesBurned / caloriesTarget) * 100,
    (todayMetrics.steps / stepsTarget) * 100,
    (todayMetrics.trainingMinutes / minutesTarget) * 100,
    todayMetrics.score,
  ];
  const aggregate = computeDailyAggregateScore(ringPercents);
  const weekSummary = trainingsThisWeekSummary(sessions, today);

  // Pour l'affichage du graphique en barres (couleur plate), on prend le
  // premier ton d'un dégradé le cas échéant — `BarChart` ne sait pas peindre
  // un dégradé par barre.
  const solid = (c: string | readonly [string, string]) => (Array.isArray(c) ? c[0] : (c as string));

  const cards = [
    {
      key: "calories",
      label: "Calories brûlées",
      unit: "kcal",
      color: solid(theme.colors.metricColors.caloriesBurn),
      value: todayMetrics.caloriesBurned,
      target: caloriesTarget,
      history: perDateMetrics.map((m) => m.caloriesBurned),
    },
    {
      key: "steps",
      label: "Pas",
      unit: "",
      color: solid(theme.colors.metricColors.steps),
      value: todayMetrics.steps,
      target: stepsTarget,
      history: perDateMetrics.map((m) => m.steps),
    },
    {
      key: "minutes",
      label: "Temps d'entraînement",
      unit: "min",
      color: solid(theme.colors.metricColors.training),
      value: todayMetrics.trainingMinutes,
      target: minutesTarget,
      history: perDateMetrics.map((m) => m.trainingMinutes),
    },
    {
      key: "score",
      label: "Score IronFlow",
      unit: "",
      color: solid(theme.colors.metricColors.score),
      value: todayMetrics.score,
      target: 100,
      history: perDateMetrics.map((m) => m.score),
    },
  ];

  return (
    // `ThemedBackground` monté ici comme premier enfant de cet écran (voir
    // le commentaire du composant) — plus un wrapper partagé avec `children`.
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          { backgroundColor: theme.background.mode === "gradient" ? "transparent" : theme.colors.surface },
        ]}
        edges={["top", "bottom"]}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Pressable testID="close-day-detail" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Aujourd&apos;hui en détail</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll}>
          <View style={styles.heroWrap}>
            <MultiRingGauge
              size={220}
              strokeWidth={14}
              gap={5}
              ringFill={theme.ringFill}
              rings={[
                { pct: ringPercents[0] / 100, color: theme.colors.metricColors.caloriesBurn },
                { pct: ringPercents[1] / 100, color: theme.colors.metricColors.steps },
                { pct: ringPercents[2] / 100, color: theme.colors.metricColors.training },
                { pct: ringPercents[3] / 100, color: theme.colors.metricColors.score },
              ]}
            >
              <Text style={[styles.aggregateValue, { color: theme.colors.onSurface }]}>{aggregate}</Text>
              <Text style={[styles.aggregateLabel, { color: theme.colors.onSurfaceTertiary }]}>score du jour</Text>
            </MultiRingGauge>
          </View>

          {cards.map((c) => {
            const avg = Math.round(c.history.reduce((a, b) => a + b, 0) / c.history.length);
            return (
              <GlassCard key={c.key} style={styles.card} testID={`day-detail-card-${c.key}`}>
                <View style={styles.cardHead}>
                  <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceTertiary }]}>
                    {c.label.toUpperCase()}
                  </Text>
                  <Text style={[styles.cardValue, { color: c.color }]}>
                    {Math.round(c.value)}
                    {c.unit ? ` ${c.unit}` : ""}
                    {c.target ? ` / ${Math.round(c.target)}${c.unit ? ` ${c.unit}` : ""}` : ""}
                  </Text>
                </View>
                <Text style={[styles.cardAvg, { color: theme.colors.onSurfaceSecondary }]}>
                  Moyenne 7 jours : {avg}
                  {c.unit ? ` ${c.unit}` : ""}
                </Text>
                <BarChart
                  data={dates.map((d, i) => ({
                    value: c.history[i],
                    label: formatDayLabel(d),
                    frontColor: c.color,
                  }))}
                  height={110}
                  barWidth={18}
                  spacing={16}
                  barBorderRadius={4}
                  hideRules
                  yAxisThickness={0}
                  xAxisThickness={0}
                  yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 10 }}
                  xAxisLabelTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 9 }}
                  noOfSections={3}
                  isAnimated
                />
              </GlassCard>
            );
          })}

          <GlassCard style={styles.card} testID="day-detail-week-summary">
            <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceTertiary }]}>
              ENTRAÎNEMENTS DE LA SEMAINE
            </Text>
            <Text style={[styles.weekSummary, { color: theme.colors.onSurface }]}>
              {weekSummary.count} séance{weekSummary.count > 1 ? "s" : ""} · {weekSummary.totalMinutes} min
            </Text>
          </GlassCard>

          <Pressable
            testID="day-detail-progression-link"
            onPress={() => router.push(progressionHref("overview") as any)}
            style={styles.progressionLink}
          >
            <Text style={[styles.progressionLinkText, { color: theme.colors.onSurfaceTertiary }]}>
              Voir Mon évolution complète
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.onSurfaceTertiary} />
          </Pressable>

          <View style={{ height: 40 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  return StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
  title: { fontSize: 16, fontWeight: "700" },
  scroll: { padding: spacing.lg, gap: spacing.md },
  heroWrap: { alignItems: "center", paddingVertical: spacing.lg },
  aggregateValue: { fontSize: 40, fontWeight: "800" },
  aggregateLabel: { fontSize: 11, fontWeight: "600" },
  card: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  cardHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cardLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
  cardValue: { fontSize: 15, fontWeight: "800" },
  cardAvg: { fontSize: 11, marginBottom: 4 },
  weekSummary: { fontSize: 16, fontWeight: "800", marginTop: 4 },
  progressionLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: spacing.sm,
  },
  progressionLinkText: { fontSize: 12, fontWeight: "700" },
  });
}
