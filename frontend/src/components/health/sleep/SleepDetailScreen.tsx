import { useCallback, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import GlassCard from "@/src/components/ui/GlassCard";
import InteractiveHealthChart from "@/src/components/health/InteractiveHealthChart";
import SleepHero from "./SleepHero";
import SleepSummaryCards from "./SleepSummaryCards";
import SleepStagesChart from "./SleepStagesChart";
import SleepDistribution from "./SleepDistribution";
import SleepInsightCard from "./SleepInsightCard";
import SleepSpo2Section from "./SleepSpo2Section";
import {
  getLatestSleepStageDetail,
  getNocturnalSpo2Samples,
  sleepEfficiencyPercent,
  localDateYYYYMMDD,
  HealthMetricSample,
  SleepStageDetail,
} from "@/src/utils/health-data-storage";
import { getProfile, DEFAULT_SLEEP_TARGET_HOURS } from "@/src/utils/gym-storage";
import { computeYearlyDailyAverages, formatHealthMetricValue, loadHealthMetricSeries, YearlyAverage } from "@/src/utils/health-metric-config";

/**
 * Corps de la fiche détail Sommeil — remplace, pour `key==="sleep"`
 * uniquement, le corps générique de `/health-metric/[key].tsx` (header/back/
 * safe-area restent portés par l'écran parent, partagés avec les autres
 * métriques). Charge ses propres données (aucune prop requise) via les
 * lecteurs déjà existants de `health-data-storage.ts`/`health-metric-
 * config.ts` — jamais une seconde source, jamais de donnée simulée.
 */
export default function SleepDetailScreen() {
  const { theme } = useTheme();
  const [detail, setDetail] = useState<SleepStageDetail | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [targetHours, setTargetHours] = useState(DEFAULT_SLEEP_TARGET_HOURS);
  const [spo2Samples, setSpo2Samples] = useState<HealthMetricSample[]>([]);
  const [yearly, setYearly] = useState<YearlyAverage[]>([]);
  const today = localDateYYYYMMDD();

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const [latest, profile, y] = await Promise.all([
          getLatestSleepStageDetail(),
          getProfile(),
          computeYearlyDailyAverages("sleep"),
        ]);
        setDetail(latest?.detail ?? null);
        setTargetHours(profile?.sleep_target_hours || DEFAULT_SLEEP_TARGET_HOURS);
        setYearly(y);
        const nightStart = latest?.detail.sleepStart ?? latest?.detail.inBedStart ?? null;
        const nightEnd = latest?.detail.sleepEnd ?? latest?.detail.inBedEnd ?? null;
        setSpo2Samples(await getNocturnalSpo2Samples(nightStart, nightEnd));
        setLoaded(true);
      })();
    }, []),
  );

  if (!loaded) {
    return <Text style={[styles.empty, { color: theme.colors.onSurfaceTertiary }]}>Chargement…</Text>;
  }

  if (!detail || detail.totalSleepHours == null) {
    return <Text style={[styles.empty, { color: theme.colors.onSurfaceTertiary }]}>Aucune donnée de sommeil disponible.</Text>;
  }

  const nightStart = detail.sleepStart ?? detail.inBedStart;
  const nightEnd = detail.sleepEnd ?? detail.inBedEnd;
  const totalStagesHours =
    detail.deepHours != null || detail.coreHours != null || detail.remHours != null || detail.awakeHours != null
      ? (detail.deepHours ?? 0) + (detail.coreHours ?? 0) + (detail.remHours ?? 0) + (detail.awakeHours ?? 0)
      : null;

  return (
    <View style={styles.body}>
      <SleepHero totalSleepHours={detail.totalSleepHours} targetHours={targetHours} />

      <SleepSummaryCards
        totalSleepHours={detail.totalSleepHours}
        inBedHours={detail.inBedHours}
        efficiencyPct={sleepEfficiencyPercent(detail)}
        bedTimeRaw={nightStart}
      />

      <SleepStagesChart nightStart={nightStart} nightEnd={nightEnd} />

      <SleepDistribution
        deepHours={detail.deepHours}
        remHours={detail.remHours}
        lightHours={detail.coreHours}
        awakeHours={detail.awakeHours}
      />

      <SleepInsightCard
        totalSleepHours={detail.totalSleepHours}
        targetHours={targetHours}
        deepHours={detail.deepHours}
        totalStagesHours={totalStagesHours}
      />

      <SleepSpo2Section samples={spo2Samples} />

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>HISTORIQUE</Text>
        <InteractiveHealthChart
          color={theme.colors.metricColors.sleep}
          loadSeries={(days) => loadHealthMetricSeries("sleep", days, today)}
          indent={false}
          periods={["week", "30d", "6m", "1y"]}
          defaultPeriod="week"
          formatValue={(v) => formatHealthMetricValue("sleep", v)}
        />
      </View>

      {yearly.length >= 2 && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>COMPARAISON ANNUELLE</Text>
          <GlassCard level="subtle" style={styles.yearlyCard}>
            {yearly.map((y, i) => {
              const prev = yearly[i + 1];
              const diffMin = prev ? Math.round((y.dailyAverage - prev.dailyAverage) * 60) : null;
              return (
                <View
                  key={y.year}
                  style={[styles.yearlyRow, i > 0 && { borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}
                >
                  <Text style={[styles.yearlyYear, { color: theme.colors.onSurface }]}>{y.year}</Text>
                  <Text style={[styles.yearlyValue, { color: theme.colors.onSurface }]}>
                    {formatHealthMetricValue("sleep", y.dailyAverage)}/nuit
                  </Text>
                  {diffMin != null && diffMin !== 0 && (
                    <Text style={[styles.yearlyDelta, { color: diffMin >= 0 ? theme.colors.success : theme.colors.error }]}>
                      {diffMin >= 0 ? "+" : ""}
                      {diffMin} min
                    </Text>
                  )}
                </View>
              );
            })}
          </GlassCard>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  body: { gap: spacing.lg },
  empty: { fontSize: 13, fontStyle: "italic", textAlign: "center", marginTop: 40 },
  section: { gap: spacing.sm },
  sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  yearlyCard: { padding: spacing.md },
  yearlyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  yearlyYear: { flex: 1, fontSize: 14, fontWeight: "800" },
  yearlyValue: { fontSize: 13, fontWeight: "700" },
  yearlyDelta: { fontSize: 12, fontWeight: "800", minWidth: 60, textAlign: "right" },
});
