import { useCallback, useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { solidColor, spacing } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import MultiRingGauge, { innerContentDiameter } from "@/src/components/ui/MultiRingGauge";
import StatHero from "@/src/components/ui/StatHero";
import MetricGoalCard from "@/src/components/health/detail/MetricGoalCard";
import { formatHealthMetricValue } from "@/src/utils/health-metric-config";
import {
  DEFAULT_CALORIES_BURN_TARGET_KCAL,
  DEFAULT_SLEEP_TARGET_HOURS,
  DEFAULT_STEPS_TARGET,
  DEFAULT_TRAINING_MINUTES_TARGET,
  UserProfile,
  WellnessLog,
  WorkoutSession,
  getProfile,
  getSessions,
  getWellnessLogs,
  todayYYYYMMDD,
} from "@/src/utils/gym-storage";
import {
  getImportedSleepHoursForDate,
  getImportedStepsForDates,
} from "@/src/utils/health-data-storage";
import {
  formatTrainingDuration,
  last7DatesEndingAt,
  sumCaloriesBurnedForDate,
  sumTrainingMinutesForDate,
  trainingsThisWeekSummary,
} from "@/src/utils/daily-metrics";
import { computeDailyAggregateScore } from "@/src/utils/daily-aggregate-score";
import { progressionHref } from "@/src/utils/progression-nav";

function formatCalories(v: number): string {
  return `${Math.round(v)} kcal`;
}
function formatStepsMain(v: number): string {
  return Math.round(v).toLocaleString("fr-FR");
}
function formatStepsFull(v: number): string {
  return formatStepsMain(v);
}
// Même formateur "7h42" que la fiche Santé Sommeil dédiée
// (`formatHealthMetricValue`) — jamais une seconde logique de formatage de
// durée de sommeil.
function formatSleepDuration(v: number): string {
  return formatHealthMetricValue("sleep", v);
}

/**
 * Page « Aujourd'hui » — ouverte en tapant le grand rectangle des anneaux du
 * Dashboard, PAS une page intermédiaire par métrique. Les 4 grandes cartes
 * (Calories brûlées/Pas/Temps d'entraînement/Sommeil) sont affichées
 * directement les unes sous les autres, graphique inclus — aucun clic
 * supplémentaire nécessaire pour voir un historique. Réutilise
 * `MetricGoalCard` (déjà construit pour les fiches Santé, structure
 * objectif+barres identique à ce que demande cette page pour les 3
 * premières métriques) et les composants Sommeil déjà existants
 * (`SleepHero`/`SleepDistribution`/`SleepStagesChart`) plutôt que de
 * réinventer un second système de cartes.
 */
export default function DayDetailScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [wellnessLogs, setWellnessLogs] = useState<WellnessLog[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [importedStepsByDate, setImportedStepsByDate] = useState<Record<string, number>>({});
  const [importedSleepByDate, setImportedSleepByDate] = useState<Record<string, number>>({});

  const load = useCallback(async () => {
    const [s, w, p] = await Promise.all([getSessions(), getWellnessLogs(), getProfile()]);
    setSessions(s);
    setWellnessLogs(w);
    setProfile(p);
    const dates = last7DatesEndingAt(todayYYYYMMDD());
    setImportedStepsByDate(await getImportedStepsForDates(dates));
    const sleepEntries = await Promise.all(dates.map((d) => getImportedSleepHoursForDate(d)));
    setImportedSleepByDate(Object.fromEntries(dates.map((d, i) => [d, sleepEntries[i]])));
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load]),
  );

  const today = todayYYYYMMDD();
  const dates = last7DatesEndingAt(today);

  const perDateMetrics = dates.map((dateStr) => {
    const caloriesBurned = sumCaloriesBurnedForDate(sessions, dateStr);
    const steps =
      (wellnessLogs.find((w) => w.date === dateStr)?.steps ?? 0) + (importedStepsByDate[dateStr] ?? 0);
    const trainingMinutes = sumTrainingMinutesForDate(sessions, dateStr);
    const sleepHours = importedSleepByDate[dateStr] ?? 0;
    return { date: dateStr, caloriesBurned, steps, trainingMinutes, sleepHours };
  });
  const todayMetrics = perDateMetrics[perDateMetrics.length - 1];

  const caloriesTarget = profile?.calories_burn_target_kcal || DEFAULT_CALORIES_BURN_TARGET_KCAL;
  const stepsTarget = profile?.steps_target || DEFAULT_STEPS_TARGET;
  const minutesTarget = profile?.training_minutes_target || DEFAULT_TRAINING_MINUTES_TARGET;
  const sleepTarget = profile?.sleep_target_hours || DEFAULT_SLEEP_TARGET_HOURS;

  const ringPercents = [
    (todayMetrics.caloriesBurned / caloriesTarget) * 100,
    (todayMetrics.steps / stepsTarget) * 100,
    (todayMetrics.trainingMinutes / minutesTarget) * 100,
    (todayMetrics.sleepHours / sleepTarget) * 100,
  ];
  const aggregate = computeDailyAggregateScore(ringPercents);
  const weekSummary = trainingsThisWeekSummary(sessions, today);

  const avgOf = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / arr.length;
  const bestOf = (arr: number[]) => Math.max(...arr);

  const caloriesHistory = perDateMetrics.map((m) => ({ date: m.date, value: m.caloriesBurned }));
  const stepsHistory = perDateMetrics.map((m) => ({ date: m.date, value: m.steps }));
  const minutesHistory = perDateMetrics.map((m) => ({ date: m.date, value: m.trainingMinutes }));
  const sleepHistory = perDateMetrics.map((m) => ({ date: m.date, value: m.sleepHours }));

  const caloriesColor = solidColor(theme.colors.metricColors.caloriesBurn);
  const stepsColor = solidColor(theme.colors.metricColors.steps);
  const trainingColor = solidColor(theme.colors.metricColors.training);
  const sleepColor = solidColor(theme.colors.metricColors.sleep);

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
        edges={["top"]}
      >
        <View style={[styles.header, { borderBottomColor: theme.colors.border }]}>
          <Pressable testID="close-day-detail" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>Aujourd&apos;hui</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingBottom: spacing.xl3 + insets.bottom }]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.heroWrap}>
            <MultiRingGauge
              size={188}
              strokeWidth={13}
              gap={5}
              ringFill={theme.ringFill}
              rings={[
                { pct: ringPercents[0] / 100, color: theme.colors.metricColors.caloriesBurn },
                { pct: ringPercents[1] / 100, color: theme.colors.metricColors.steps },
                { pct: ringPercents[2] / 100, color: theme.colors.metricColors.training },
                { pct: ringPercents[3] / 100, color: theme.colors.metricColors.sleep },
              ]}
            >
              {/* Seul élément textuel central (voir la correction du bug de
                  débordement) — l'ancien libellé "activité du jour" superposé
                  au pourcentage est retiré, jamais réintroduit sur l'anneau
                  lui-même. `StatHero`+`fitDiameter` dimensionne le texte à
                  partir du diamètre réel plutôt qu'une taille fixe, seule
                  garantie de non-débordement quel que soit le nombre de
                  chiffres (0/5/9/10/68/99/100). */}
              <StatHero
                value={aggregate}
                formatter={(v) => `${Math.round(v)}%`}
                color={theme.colors.onSurface}
                fitDiameter={innerContentDiameter(188, 13, 5, 4)}
              />
            </MultiRingGauge>
          </View>

          <MetricGoalCard
            icon="flame"
            label="Calories brûlées"
            color={caloriesColor}
            todayValue={todayMetrics.caloriesBurned}
            target={caloriesTarget}
            unit="kcal"
            formatValue={formatCalories}
            formatMainValue={(v) => String(Math.round(v))}
            average={avgOf(caloriesHistory.map((h) => h.value))}
            best={bestOf(caloriesHistory.map((h) => h.value))}
            history={caloriesHistory}
          />

          <MetricGoalCard
            icon="footsteps"
            label="Pas"
            color={stepsColor}
            todayValue={todayMetrics.steps}
            target={stepsTarget}
            unit="pas"
            formatValue={formatStepsFull}
            formatMainValue={formatStepsMain}
            average={avgOf(stepsHistory.map((h) => h.value))}
            best={bestOf(stepsHistory.map((h) => h.value))}
            history={stepsHistory}
          />

          <MetricGoalCard
            icon="barbell"
            label="Temps d'entraînement"
            color={trainingColor}
            todayValue={todayMetrics.trainingMinutes}
            target={minutesTarget}
            unit=""
            formatValue={formatTrainingDuration}
            formatMainValue={formatTrainingDuration}
            average={avgOf(minutesHistory.map((h) => h.value))}
            best={bestOf(minutesHistory.map((h) => h.value))}
            history={minutesHistory}
          />

          <MetricGoalCard
            icon="moon"
            label="Sommeil"
            color={sleepColor}
            todayValue={todayMetrics.sleepHours}
            target={sleepTarget}
            unit=""
            formatValue={formatSleepDuration}
            formatMainValue={formatSleepDuration}
            average={avgOf(sleepHistory.map((h) => h.value))}
            best={bestOf(sleepHistory.map((h) => h.value))}
            history={sleepHistory}
          />

          <GlassCard style={styles.weekCard} testID="day-detail-week-summary">
            <Text style={[styles.cardLabel, { color: theme.colors.onSurfaceTertiary }]}>
              ENTRAÎNEMENTS DE LA SEMAINE
            </Text>
            <Text style={[styles.weekSummary, { color: theme.colors.onSurface }]}>
              {weekSummary.count} séance{weekSummary.count > 1 ? "s" : ""} · {weekSummary.totalMinutes} min
            </Text>
          </GlassCard>

          <Pressable
            testID="day-detail-progression-link"
            onPress={() => router.push(progressionHref("exercises") as any)}
            style={styles.progressionLink}
          >
            <Text style={[styles.progressionLinkText, { color: theme.colors.onSurfaceTertiary }]}>
              Voir Performance
            </Text>
            <Ionicons name="chevron-forward" size={14} color={theme.colors.onSurfaceTertiary} />
          </Pressable>
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
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    title: { fontSize: 16, fontWeight: "800" },
    scroll: { padding: spacing.lg, gap: spacing.lg },
    heroWrap: { alignItems: "center", paddingVertical: spacing.sm },
    weekCard: {
      backgroundColor: colors.surfaceSecondary,
      borderRadius: radius.md,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing.md,
      gap: 4,
    },
    cardLabel: { fontSize: 10, fontWeight: "800", letterSpacing: 1 },
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
