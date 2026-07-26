import { useCallback, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LineChart } from "react-native-gifted-charts";
import { colors, radius, spacing } from "@/src/theme";
import {
  formatDurationHMS,
  formatPace,
  getPRs,
  getSessions,
  PersonalRecord,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { listAllExercises } from "@/src/utils/exercise-detail";
import {
  buildSeries,
  computeCategoryStats,
  clearOverride,
  EXERCISE_CATEGORY_COLOR,
  EXERCISE_CATEGORY_ICON,
  EXERCISE_CATEGORY_LABEL,
  ExerciseCategory,
  filterSessionsByPeriod,
  getExerciseCategory,
  METRIC_LABEL,
  METRICS_BY_CATEGORY,
  MetricKey,
  PERIOD_LABEL,
  PeriodKey,
  setOverride,
} from "@/src/utils/exercise-category";

const PERIODS: PeriodKey[] = ["7d", "30d", "6m", "1y", "all"];

export default function ExerciseDetailScreen() {
  const { name } = useLocalSearchParams<{ name: string }>();
  const router = useRouter();
  const decoded = decodeURIComponent(name ?? "");
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [prs, setPRs] = useState<PersonalRecord[]>([]);
  const [category, setCategory] = useState<ExerciseCategory>("musculation");
  const [period, setPeriod] = useState<PeriodKey>("30d");
  const [metric, setMetric] = useState<MetricKey>("volume");
  const [suggestions, setSuggestions] = useState<{ name: string; count: number }[]>([]);
  const [showCatPicker, setShowCatPicker] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const s = await getSessions();
        setSessions(s);
        setPRs(await getPRs());
        if (decoded) {
          const cat = await getExerciseCategory(decoded);
          setCategory(cat);
          const metrics = METRICS_BY_CATEGORY[cat];
          setMetric(metrics[0]);
        } else {
          setSuggestions(listAllExercises(s));
        }
      })();
    }, [decoded]),
  );

  if (!decoded) {
    return (
      <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
          </Pressable>
          <Text style={styles.title}>Choisir un exercice</Text>
          <View style={{ width: 24 }} />
        </View>
        <ScrollView contentContainerStyle={styles.scroll}>
          {suggestions.length === 0 ? (
            <Text style={styles.emptyText}>
              Fais au moins une séance pour analyser tes exercices.
            </Text>
          ) : (
            suggestions.map((s) => (
              <Pressable
                key={s.name}
                testID={`pick-${s.name}`}
                style={styles.pickRow}
                onPress={() =>
                  router.push(`/exercise/${encodeURIComponent(s.name)}`)
                }
              >
                <Ionicons name="barbell" size={16} color={colors.brand} />
                <Text style={styles.pickName}>{s.name}</Text>
                <Text style={styles.pickCount}>
                  {s.count} séance{s.count > 1 ? "s" : ""}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={colors.onSurfaceTertiary} />
              </Pressable>
            ))
          )}
        </ScrollView>
      </SafeAreaView>
    );
  }

  const catColor = EXERCISE_CATEGORY_COLOR[category];
  const filteredSessions = filterSessionsByPeriod(sessions, period);
  const catStats = computeCategoryStats(decoded, category, filteredSessions);
  const series = buildSeries(decoded, category, metric, filteredSessions);
  const linkedPRs = prs.filter(
    (p) => p.exerciseName.toLowerCase().trim() === decoded.toLowerCase().trim(),
  );
  const availableMetrics = METRICS_BY_CATEGORY[category];

  const chartW = Dimensions.get("window").width - spacing.lg * 2 - 32;
  const chartData = series.map((p) => ({
    value: Math.round(p.value),
    label: shortDate(p.date),
  }));

  return (
    <SafeAreaView style={styles.container} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <Pressable
          testID="close-detail"
          onPress={() => router.back()}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={24} color={colors.onSurface} />
        </Pressable>
        <Text style={styles.title} numberOfLines={1}>
          {decoded}
        </Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Category pill (tap to change) */}
        <Pressable
          testID="change-category"
          style={[styles.catBadge, { backgroundColor: catColor + "26", borderColor: catColor }]}
          onPress={() => setShowCatPicker(true)}
        >
          <Ionicons
            name={EXERCISE_CATEGORY_ICON[category]}
            size={14}
            color={catColor}
          />
          <Text style={[styles.catBadgeLabel, { color: catColor }]}>
            {EXERCISE_CATEGORY_LABEL[category]}
          </Text>
          <Ionicons name="chevron-down" size={12} color={catColor} />
        </Pressable>

        {/* Category-specific KPIs */}
        <CategoryKPIs
          category={category}
          catStats={catStats}
          catColor={catColor}
          prsCount={linkedPRs.length}
        />

        {/* Period + metric filters */}
        <Text style={styles.sectionTitle}>Graphique de progression</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipRow}
        >
          {PERIODS.map((p) => {
            const active = p === period;
            return (
              <Pressable
                key={p}
                testID={`period-${p}`}
                style={[styles.chip, active && { backgroundColor: catColor, borderColor: catColor }]}
                onPress={() => setPeriod(p)}
              >
                <Text
                  style={[
                    styles.chipText,
                    active && { color: "#fff" },
                  ]}
                >
                  {PERIOD_LABEL[p]}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        {availableMetrics.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.chipRow}
          >
            {availableMetrics.map((m) => {
              const active = m === metric;
              return (
                <Pressable
                  key={m}
                  testID={`metric-${m}`}
                  style={[
                    styles.chipMini,
                    active && { backgroundColor: catColor + "26", borderColor: catColor },
                  ]}
                  onPress={() => setMetric(m)}
                >
                  <Text
                    style={[
                      styles.chipMiniText,
                      active && { color: catColor },
                    ]}
                  >
                    {METRIC_LABEL[m]}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        )}

        {chartData.length >= 2 ? (
          <View style={styles.chartCard}>
            <Text style={styles.chartTitle}>{METRIC_LABEL[metric]}</Text>
            <LineChart
              data={chartData}
              color={catColor}
              thickness={3}
              areaChart
              startFillColor={catColor}
              startOpacity={0.4}
              endFillColor={catColor}
              endOpacity={0.05}
              yAxisThickness={0}
              xAxisThickness={0}
              yAxisTextStyle={{ color: colors.onSurfaceTertiary, fontSize: 10 }}
              xAxisLabelTextStyle={{
                color: colors.onSurfaceTertiary,
                fontSize: 9,
              }}
              hideRules
              width={chartW}
              isAnimated
              curved
              dataPointsColor={catColor}
              dataPointsRadius={3}
            />
          </View>
        ) : (
          <View style={styles.hintBox}>
            <Ionicons name="information-circle" size={14} color={colors.brand} />
            <Text style={styles.hintText}>
              Pas assez de données sur cette période. Élargis la période ou fais
              plus de séances.
            </Text>
          </View>
        )}

        {/* PRs enregistrés */}
        {linkedPRs.length > 0 && (
          <View>
            <Text style={styles.sectionTitle}>Records enregistrés</Text>
            {linkedPRs.map((pr) => (
              <View key={pr.id} style={styles.prCard}>
                <Ionicons name="trophy" size={14} color={colors.brand} />
                <Text style={styles.prCardText}>
                  {(pr.type ?? "weight") === "weight"
                    ? `${pr.weight_kg} kg × ${pr.reps}`
                    : pr.type === "reps"
                      ? `${pr.reps} reps`
                      : `${(pr.distance_m ?? 0) / 1000} km`}
                </Text>
                <Text style={styles.prCardDate}>{formatDateShort(pr.date)}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Category picker modal */}
      <Modal
        transparent
        animationType="fade"
        visible={showCatPicker}
        onRequestClose={() => setShowCatPicker(false)}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setShowCatPicker(false)}
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Catégorie de l&apos;exercice</Text>
            <Text style={styles.modalHelp}>
              Utilisé pour adapter les statistiques et les graphiques.
            </Text>
            {(
              ["cardio_machine", "musculation", "mobility"] as ExerciseCategory[]
            ).map((c) => {
              const active = c === category;
              const color = EXERCISE_CATEGORY_COLOR[c];
              return (
                <Pressable
                  key={c}
                  testID={`cat-opt-${c}`}
                  style={[
                    styles.catOpt,
                    active && { borderColor: color, backgroundColor: color + "26" },
                  ]}
                  onPress={async () => {
                    await setOverride(decoded, c);
                    setCategory(c);
                    setMetric(METRICS_BY_CATEGORY[c][0]);
                    setShowCatPicker(false);
                  }}
                >
                  <Ionicons
                    name={EXERCISE_CATEGORY_ICON[c]}
                    size={18}
                    color={active ? color : colors.brand}
                  />
                  <Text
                    style={[
                      styles.catOptLabel,
                      active && { color: color, fontWeight: "800" },
                    ]}
                  >
                    {EXERCISE_CATEGORY_LABEL[c]}
                  </Text>
                  {active && <Ionicons name="checkmark" size={16} color={color} />}
                </Pressable>
              );
            })}
            <Pressable
              testID="cat-auto"
              style={styles.autoBtn}
              onPress={async () => {
                await clearOverride(decoded);
                const cat = await getExerciseCategory(decoded);
                setCategory(cat);
                setMetric(METRICS_BY_CATEGORY[cat][0]);
                setShowCatPicker(false);
              }}
            >
              <Ionicons name="sparkles" size={14} color={colors.brand} />
              <Text style={styles.autoBtnText}>Réinitialiser (auto-détect)</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>
    </SafeAreaView>
  );
}

function CategoryKPIs({
  category,
  catStats,
  catColor,
  prsCount,
}: {
  category: ExerciseCategory;
  catStats: ReturnType<typeof computeCategoryStats>;
  catColor: string;
  prsCount: number;
}) {
  const kpis: { icon: any; value: string; label: string }[] = [];

  if (category === "cardio_machine" && catStats.kind === "cardio") {
    const s = catStats.stats;
    kpis.push(
      { icon: "time", value: formatDurationHMS(s.totalDurationSec), label: "Temps total" },
      { icon: "walk", value: `${(s.totalDistanceM / 1000).toFixed(1)} km`, label: "Distance" },
      { icon: "speedometer", value: s.avgPaceSecPerKm ? formatPace(s.avgPaceSecPerKm) : "—", label: "Allure" },
      { icon: "flame", value: `${s.totalCalories} kcal`, label: "Calories" },
    );
  } else if (category === "musculation" && catStats.kind === "musculation") {
    const s = catStats.stats;
    kpis.push(
      { icon: "barbell", value: `${s.maxWeightKg} kg`, label: "Charge max" },
      {
        icon: "trophy",
        value: `${(s.totalVolumeKg / 1000).toFixed(1)} t`,
        label: "Volume total",
      },
      {
        icon: "flash",
        value: s.bestSet
          ? `${s.bestSet.weight}×${s.bestSet.reps}`
          : "—",
        label: "Meilleur set",
      },
      {
        icon: "trending-up",
        value: s.progressionPct
          ? `${s.progressionPct >= 0 ? "+" : ""}${s.progressionPct}%`
          : "—",
        label: "Progression",
      },
    );
  } else if (category === "mobility" && catStats.kind === "mobility") {
    const s = catStats.stats;
    kpis.push(
      { icon: "time", value: formatDurationHMS(s.totalHoldSec), label: "Durée totale" },
      { icon: "hourglass", value: `${s.avgHoldSec} s`, label: "Durée moyenne" },
      { icon: "checkmark-done", value: String(s.sessions), label: "Séances" },
      { icon: "trophy", value: String(prsCount), label: "Records" },
    );
  }

  // For cardio & musculation include Records / sessions extras
  if (kpis.length < 4) {
    kpis.push({
      icon: "trophy",
      value: String(prsCount),
      label: "Records",
    });
  }

  return (
    <View style={styles.kpiGrid}>
      {kpis.slice(0, 4).map((k, i) => (
        <View
          key={i}
          style={[styles.kpiBox, { borderTopColor: catColor, borderTopWidth: 2 }]}
        >
          <Ionicons name={k.icon} size={14} color={catColor} />
          <Text style={styles.kpiVal}>{k.value}</Text>
          <Text style={styles.kpiLabel}>{k.label}</Text>
        </View>
      ))}
    </View>
  );
}

function shortDate(iso: string) {
  const d = new Date(iso);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}

function formatDateShort(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
  });
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomColor: colors.border,
    borderBottomWidth: 1,
    gap: spacing.md,
  },
  title: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "700",
    flex: 1,
    textTransform: "capitalize",
  },
  scroll: { padding: spacing.lg, gap: spacing.md, paddingBottom: 40 },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    marginTop: spacing.xl,
  },
  pickRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.sm,
  },
  pickName: {
    color: colors.onSurface,
    fontWeight: "700",
    fontSize: 14,
    flex: 1,
    textTransform: "capitalize",
  },
  pickCount: { color: colors.onSurfaceTertiary, fontSize: 11 },
  catBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  catBadgeLabel: {
    fontWeight: "800",
    fontSize: 11,
    letterSpacing: 0.6,
  },
  kpiGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  kpiBox: {
    width: "48%",
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.md,
    gap: 4,
  },
  kpiVal: {
    color: colors.onSurface,
    fontSize: 20,
    fontWeight: "800",
    marginTop: 4,
  },
  kpiLabel: { color: colors.onSurfaceTertiary, fontSize: 11, fontWeight: "600" },
  sectionTitle: {
    color: colors.onSurface,
    fontSize: 14,
    fontWeight: "800",
    letterSpacing: 0.5,
    marginTop: spacing.sm,
  },
  chipRow: { gap: 6, paddingVertical: 4 },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipText: {
    color: colors.onSurfaceSecondary,
    fontWeight: "700",
    fontSize: 11,
  },
  chipMini: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceSecondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  chipMiniText: {
    color: colors.onSurfaceTertiary,
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 0.4,
  },
  chartCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing.lg,
  },
  chartTitle: {
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "700",
    marginBottom: spacing.md,
    letterSpacing: 0.5,
  },
  hintBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.brandTertiary,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  hintText: {
    color: colors.brandSecondary,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  prCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 6,
  },
  prCardText: { color: colors.onSurface, fontWeight: "700", flex: 1 },
  prCardDate: { color: colors.onSurfaceTertiary, fontSize: 11 },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: spacing.lg,
  },
  modalCard: {
    backgroundColor: colors.surfaceSecondary,
    borderRadius: radius.md,
    padding: spacing.lg,
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalTitle: {
    color: colors.onSurface,
    fontSize: 16,
    fontWeight: "800",
  },
  modalHelp: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    marginBottom: spacing.sm,
  },
  catOpt: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  catOptLabel: {
    flex: 1,
    color: colors.onSurface,
    fontSize: 13,
    fontWeight: "700",
  },
  autoBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    padding: 10,
    marginTop: 4,
  },
  autoBtnText: {
    color: colors.brand,
    fontWeight: "700",
    fontSize: 12,
  },
});
