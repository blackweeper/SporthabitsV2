import { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Dimensions,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { BarChart } from "react-native-gifted-charts";
import { spacing, withAlpha } from "@/src/theme";
import { Theme, useTheme } from "@/src/themes";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import SegmentedTabRow from "@/src/components/ui/SegmentedTabRow";
import {
  CARDIO_ACTIVITY_EMOJI,
  CARDIO_ACTIVITY_LABEL,
  getPlans,
  getSessions,
  Plan,
  WorkoutSession,
} from "@/src/utils/gym-storage";
import { computeAdvancedStats } from "@/src/utils/stats";
import {
  availableEvolutionMetrics,
  computeEvolutionSeries,
  computeWeekComparison,
  EVOLUTION_METRIC_LABEL,
  EVOLUTION_PERIOD_LABEL,
  EvolutionMetric,
  EvolutionPeriod,
  resolveSessionWodIdentity,
  SessionWodIdentity,
} from "@/src/utils/training-overview";

function formatDuration(sec: number) {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m === 0) return `${s}s`;
  if (s === 0) return `${m}m`;
  return `${m}m${s}s`;
}

function formatLongDuration(sec: number) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (h > 0) return `${h}h ${m}min`;
  return `${m}min`;
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDelta(pct: number | null): string {
  if (pct === null) return "Pas encore de comparaison";
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs semaine dernière`;
}

export default function HistoryScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const router = useRouter();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [wodPlansById, setWodPlansById] = useState<Map<string, Plan>>(new Map());
  const [tab, setTab] = useState<"history" | "stats">("history");
  const [period, setPeriod] = useState<EvolutionPeriod>("week");
  const [metric, setMetric] = useState<EvolutionMetric>("sessions");

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [s, plans] = await Promise.all([getSessions(), getPlans()]);
        setSessions(s);
        const map = new Map<string, Plan>();
        for (const p of plans) if (p.wodSource) map.set(p.id, p);
        setWodPlansById(map);
      })();
    }, []),
  );

  const wodIdentities = useMemo(() => {
    const map = new Map<string, SessionWodIdentity>();
    for (const s of sessions) {
      const identity = resolveSessionWodIdentity(s, wodPlansById);
      if (identity) map.set(s.id, identity);
    }
    return map;
  }, [sessions, wodPlansById]);

  const allTimeStats = useMemo(() => computeAdvancedStats(sessions), [sessions]);
  const weekComparison = useMemo(() => computeWeekComparison(sessions), [sessions]);

  const evolutionMetrics = useMemo(() => availableEvolutionMetrics(sessions), [sessions]);
  const activeMetric: EvolutionMetric = evolutionMetrics.includes(metric)
    ? metric
    : evolutionMetrics[0] ?? "sessions";
  const evolutionSeries = useMemo(
    () => computeEvolutionSeries(sessions, period, activeMetric),
    [sessions, period, activeMetric],
  );
  const maxBar = Math.max(1, ...evolutionSeries.map((d) => d.value));
  const chartWidth = Dimensions.get("window").width - spacing.lg * 2 - 32;

  return (
    <View style={{ flex: 1 }}>
      <ThemedBackground />
      <SafeAreaView
        style={[
          styles.container,
          theme.background.mode === "gradient" ? { backgroundColor: "transparent" } : { backgroundColor: theme.colors.surface },
        ]}
        edges={["top"]}
      >
      <View style={styles.header}>
        <Text style={styles.title}>Historique & Statistiques</Text>
      </View>

      <View style={styles.segmentWrap}>
        <SegmentedTabRow
          testIDPrefix="tab"
          options={[
            { key: "history", label: "SÉANCES" },
            { key: "stats", label: "STATS" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {tab === "history" ? (
          sessions.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="time-outline"
                size={40}
                color={theme.colors.onSurfaceTertiary}
              />
              <Text style={styles.emptyText}>
                Aucune séance enregistrée.{"\n"}Termine ta première séance pour
                la voir ici.
              </Text>
            </View>
          ) : (
            sessions.map((s) => {
              const wod = wodIdentities.get(s.id);
              return (
                <Pressable
                  key={s.id}
                  style={styles.sessionCard}
                  testID={`session-${s.id}`}
                  onPress={() => router.push(`/session/${s.id}`)}
                >
                  <View style={styles.sessionHeader}>
                    <View style={styles.sessionTitleRow}>
                      {s.cardio_activity ? (
                        <Text style={styles.sessionEmoji}>
                          {CARDIO_ACTIVITY_EMOJI[s.cardio_activity]}
                        </Text>
                      ) : s.planType === "stretch" ? (
                        <Text style={styles.sessionEmoji}>🧘</Text>
                      ) : wod ? (
                        <Ionicons name="flame" size={16} color={theme.colors.data.workout} />
                      ) : null}
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {wod ? wod.title : s.planTitle}
                      </Text>
                    </View>
                    <Text style={styles.sessionDate}>{formatDate(s.startedAt)}</Text>
                  </View>
                  {wod ? (
                    <View style={[styles.activityTag, { backgroundColor: withAlpha(theme.colors.data.workout, 18) }]}>
                      <Text style={[styles.activityTagText, { color: theme.colors.data.workout }]}>
                        {wod.format.toUpperCase()}
                        {wod.roundsCompleted != null ? ` · ${wod.roundsCompleted} TOURS` : ""}
                      </Text>
                    </View>
                  ) : s.cardio_activity ? (
                    <View style={styles.activityTag}>
                      <Text style={styles.activityTagText}>
                        {CARDIO_ACTIVITY_LABEL[s.cardio_activity]}
                      </Text>
                    </View>
                  ) : null}
                  <View style={styles.sessionStats}>
                    <View style={styles.sessionStat}>
                      <Ionicons name="time" size={14} color={theme.colors.brand} />
                      <Text style={styles.sessionStatVal}>
                        {formatDuration(s.durationSeconds)}
                      </Text>
                    </View>
                    <View style={styles.sessionStat}>
                      <Ionicons name="flame" size={14} color={theme.colors.brand} />
                      <Text style={styles.sessionStatVal}>
                        {s.caloriesBurned ?? 0} kcal
                      </Text>
                    </View>
                    <View style={styles.sessionStat}>
                      <Ionicons name="barbell" size={14} color={theme.colors.brand} />
                      <Text style={styles.sessionStatVal}>
                        {s.exercises.length} ex.
                      </Text>
                    </View>
                  </View>
                  <View style={styles.sessionFoot}>
                    <Text style={styles.sessionMore}>Voir le résumé →</Text>
                  </View>
                </Pressable>
              );
            })
          )
        ) : (
          <>
            {/* Cette semaine */}
            <Text style={styles.sectionTitle}>CETTE SEMAINE</Text>
            <View style={styles.weekGrid}>
              <WeekStatBox
                label="Séances"
                value={String(weekComparison.thisWeek.totalSessions)}
                delta={weekComparison.deltaSessionsPct}
              />
              <WeekStatBox
                label="Temps d'entraînement"
                value={formatLongDuration(weekComparison.thisWeek.totalDurationSec)}
                delta={weekComparison.deltaDurationPct}
              />
              <WeekStatBox
                label="Volume"
                value={`${(weekComparison.thisWeek.totalVolumeKg / 1000).toFixed(1)} t`}
                delta={weekComparison.deltaVolumePct}
              />
              <WeekStatBox
                label="Calories"
                value={`${weekComparison.thisWeek.totalCalories} kcal`}
                delta={weekComparison.deltaCaloriesPct}
              />
            </View>

            {/* Depuis le début */}
            <Text style={styles.sectionTitle}>DEPUIS LE DÉBUT</Text>
            <GlassCard style={styles.totalsCard}>
              <TotalRow icon="checkmark-done" label="Séances totales" value={String(allTimeStats.totalSessions)} />
              <TotalRow icon="barbell" label="Volume total soulevé" value={`${(allTimeStats.totalVolumeKg / 1000).toFixed(1)} t`} />
              <TotalRow icon="flame" label="Calories brûlées" value={`${allTimeStats.totalCalories} kcal`} />
              <TotalRow icon="time" label="Temps total" value={formatLongDuration(allTimeStats.totalDurationSec)} />
              <TotalRow icon="stopwatch" label="Durée moyenne" value={formatLongDuration(allTimeStats.avgDurationSec)} />
              <TotalRow icon="layers" label="Exercices pratiqués" value={String(allTimeStats.distinctExercises)} />
              {allTimeStats.cardioKmTotal > 0 && (
                <TotalRow icon="earth" label="Distance cardio cumulée" value={`${allTimeStats.cardioKmTotal.toFixed(1)} km`} last />
              )}
            </GlassCard>

            {/* Évolution */}
            <Text style={styles.sectionTitle}>ÉVOLUTION</Text>
            <GlassCard style={styles.chartCard}>
              <View style={styles.periodRow}>
                {(["week", "month", "6m", "year"] as EvolutionPeriod[]).map((p) => (
                  <Pressable
                    key={p}
                    testID={`evolution-period-${p}`}
                    style={[styles.periodChip, period === p && { backgroundColor: withAlpha(theme.colors.brand, 20) }]}
                    onPress={() => setPeriod(p)}
                  >
                    <Text style={[styles.periodChipText, period === p && { color: theme.colors.brand }]}>
                      {EVOLUTION_PERIOD_LABEL[p]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.metricRow}>
                {evolutionMetrics.map((m) => (
                  <Pressable
                    key={m}
                    testID={`evolution-metric-${m}`}
                    style={[styles.metricChip, activeMetric === m && { backgroundColor: withAlpha(theme.colors.brand, 20) }]}
                    onPress={() => setMetric(m)}
                  >
                    <Text style={[styles.metricChipText, activeMetric === m && { color: theme.colors.brand }]}>
                      {EVOLUTION_METRIC_LABEL[m]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <BarChart
                data={evolutionSeries.map((d) => ({
                  value: d.value,
                  label: d.label,
                  frontColor: theme.colors.brand,
                }))}
                barWidth={period === "week" ? 22 : period === "month" ? 40 : 18}
                spacing={period === "week" ? 14 : period === "month" ? 20 : 10}
                barBorderRadius={4}
                yAxisThickness={0}
                xAxisThickness={0}
                yAxisTextStyle={{ color: theme.colors.onSurfaceTertiary, fontSize: 10 }}
                xAxisLabelTextStyle={{
                  color: theme.colors.onSurfaceTertiary,
                  fontSize: 10,
                }}
                noOfSections={4}
                maxValue={Math.ceil(maxBar / 5) * 5 || 5}
                hideRules
                width={chartWidth}
                isAnimated
              />
            </GlassCard>
          </>
        )}
        <View style={{ height: spacing.xl2 }} />
      </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function WeekStatBox({ label, value, delta }: { label: string; value: string; delta: number | null }) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  const positive = delta !== null && delta >= 0;
  return (
    <GlassCard style={styles.weekBox}>
      <Text style={styles.weekBoxValue}>{value}</Text>
      <Text style={styles.weekBoxLabel}>{label}</Text>
      <Text
        style={[
          styles.weekBoxDelta,
          delta !== null && { color: positive ? theme.colors.success : theme.colors.error },
        ]}
      >
        {formatDelta(delta)}
      </Text>
    </GlassCard>
  );
}

function TotalRow({ icon, label, value, last }: { icon: any; label: string; value: string; last?: boolean }) {
  const { theme } = useTheme();
  const styles = useMemo(() => buildStyles(theme), [theme]);
  return (
    <View style={[styles.totalRow, !last && styles.totalRowBorder]}>
      <Ionicons name={icon} size={16} color={theme.colors.brand} />
      <Text style={styles.totalRowLabel}>{label}</Text>
      <Text style={styles.totalRowValue}>{value}</Text>
    </View>
  );
}

function buildStyles(theme: Theme) {
  const { colors, radius } = theme;
  const isGlass = theme.card.mode === "glass";
  return StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.surface },
  header: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { color: colors.onSurface, fontSize: 22, fontWeight: "800" },
  segmentWrap: {
    paddingHorizontal: spacing.lg,
  },
  scroll: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, gap: spacing.md },
  empty: {
    alignItems: "center",
    padding: spacing.xl,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  emptyText: {
    color: colors.onSurfaceTertiary,
    textAlign: "center",
    lineHeight: 20,
  },
  sessionCard: {
    backgroundColor: colors.surfaceSecondary,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
  },
  sessionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sessionTitle: { color: colors.onSurface, fontWeight: "700", fontSize: 15, flex: 1 },
  sessionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flex: 1,
  },
  sessionEmoji: { fontSize: 18 },
  activityTag: {
    alignSelf: "flex-start",
    marginTop: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4,
    backgroundColor: colors.brandTertiary,
  },
  activityTagText: {
    color: colors.brandSecondary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  sessionDate: { color: colors.onSurfaceTertiary, fontSize: 11 },
  sessionStats: { flexDirection: "row", gap: spacing.lg },
  sessionStat: { flexDirection: "row", alignItems: "center", gap: 4 },
  sessionStatVal: { color: colors.onSurfaceSecondary, fontSize: 12 },
  sessionFoot: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.sm,
    marginTop: spacing.xs,
  },
  sessionMore: {
    color: colors.brand,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },

  sectionTitle: {
    color: colors.onSurfaceTertiary,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: spacing.sm,
  },
  weekGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  weekBox: {
    width: "48%",
    padding: spacing.md,
    gap: 4,
  },
  weekBoxValue: {
    color: colors.onSurface,
    fontSize: 22,
    fontWeight: "800",
  },
  weekBoxLabel: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    letterSpacing: 0.3,
  },
  weekBoxDelta: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "700",
    marginTop: 2,
  },
  totalsCard: {
    padding: spacing.lg,
  },
  totalRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  totalRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: colors.divider,
  },
  totalRowLabel: {
    flex: 1,
    color: colors.onSurfaceSecondary,
    fontSize: 13,
  },
  totalRowValue: {
    color: colors.onSurface,
    fontWeight: "800",
    fontSize: 14,
  },
  chartCard: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  periodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  periodChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
  },
  periodChipText: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.4,
  },
  metricRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  metricChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    backgroundColor: isGlass ? undefined : colors.surfaceTertiary,
  },
  metricChipText: {
    color: colors.onSurfaceTertiary,
    fontSize: 11,
    fontWeight: "600",
  },
  });
}
