import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import HealthTrendChart from "@/src/components/health/HealthTrendChart";
import { HealthMetricSample, localDateYYYYMMDD, sleepStageDetailFromRaw } from "@/src/utils/health-data-storage";
import {
  computeMetricKpis,
  computeYearlyDailyAverages,
  formatHealthMetricValue,
  isHealthMetricKey,
  loadHealthMetricRawSamples,
  loadHealthMetricSeries,
  valueOfSample,
  HEALTH_METRIC_LABEL,
  HealthMetricKey,
  MetricKpis,
  YearlyAverage,
} from "@/src/utils/health-metric-config";

const SUM_METRIC_KEYS: HealthMetricKey[] = ["steps", "walkingDistance", "activeCalories", "sleep"];

function formatHoursMinutes(hours: number | null): string | null {
  if (hours == null) return null;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

function formatTimeOnly(dateStr: string): string {
  const d = new Date(dateStr.replace(" ", "T"));
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * Vue détaillée d'un indicateur Santé — accessible depuis la liste
 * "Récupération" (`HealthMetricGrid`) et les tuiles Pas/Distance/Calories
 * actives du Dashboard/Santé. Fiche premium (KPI + graphique + comparaison
 * annuelle si pertinente) plutôt qu'un listing technique des échantillons
 * importés — ce listing brut reste accessible via Réglages → Santé →
 * Diagnostic santé, jamais dans l'expérience normale. Jamais de donnée
 * inventée : un KPI sans donnée réelle affiche "—", pas un 0.
 */
export default function HealthMetricDetailScreen() {
  const { theme } = useTheme();
  const router = useRouter();
  const { key: rawKey } = useLocalSearchParams<{ key: string }>();
  const key: HealthMetricKey | null = isHealthMetricKey(rawKey) ? rawKey : null;
  const [latest, setLatest] = useState<HealthMetricSample | null>(null);
  const [kpis, setKpis] = useState<MetricKpis | null>(null);
  const [yearly, setYearly] = useState<YearlyAverage[]>([]);

  const reload = useCallback(async () => {
    if (!key) return;
    const today = localDateYYYYMMDD();
    const [samples, k, y] = await Promise.all([
      loadHealthMetricRawSamples(key),
      computeMetricKpis(key, 7, today),
      SUM_METRIC_KEYS.includes(key) ? computeYearlyDailyAverages(key) : Promise.resolve([]),
    ]);
    setLatest(samples[0] ?? null);
    setKpis(k);
    setYearly(y);
  }, [key]);

  useFocusEffect(
    useCallback(() => {
      reload();
    }, [reload]),
  );

  if (!key) {
    return (
      <View style={{ flex: 1 }}>
        <ThemedBackground />
        <SafeAreaView style={[styles.container, theme.background.mode === "gradient" && { backgroundColor: "transparent" }]}>
          <Text style={[styles.loading, { color: theme.colors.onSurfaceTertiary }]}>Indicateur inconnu.</Text>
        </SafeAreaView>
      </View>
    );
  }

  const colorByKey: Record<HealthMetricKey, RingColor> = {
    steps: theme.colors.metricColors.steps,
    walkingDistance: theme.colors.info,
    activeCalories: theme.colors.metricColors.caloriesBurn,
    sleep: theme.colors.metricColors.sleep,
    hrv: theme.colors.brand,
    restingHr: theme.colors.info,
    respiratoryRate: theme.colors.progress,
    spo2: theme.colors.info,
  };
  const sleepStages = key === "sleep" && latest ? sleepStageDetailFromRaw(latest.raw) : null;
  const today = localDateYYYYMMDD();

  // Trois KPI par fiche, choisis selon ce qui est réellement lisible pour
  // cette métrique — jamais les mêmes 3 partout : un total hebdomadaire a du
  // sens pour Pas/Distance/Calories, pas pour le Sommeil (moyenne + meilleure
  // nuit) ni pour les vitaux ponctuels (VFC/FC repos/Respiration/SpO2).
  const kpiCards: { label: string; value: number | null }[] = kpis
    ? key === "sleep"
      ? [
          { label: "Aujourd'hui", value: kpis.today },
          { label: "Moyenne (7j)", value: kpis.average },
          { label: "Meilleure nuit", value: kpis.best },
        ]
      : SUM_METRIC_KEYS.includes(key)
        ? [
            { label: "Aujourd'hui", value: kpis.today },
            { label: "Cette semaine", value: kpis.total },
            { label: "Moyenne / jour", value: kpis.average },
          ]
        : [
            { label: "Aujourd'hui", value: kpis.today },
            { label: "Moyenne (7j)", value: kpis.average },
            { label: "Meilleure", value: kpis.best },
          ]
    : [];

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
          <Pressable testID="health-metric-back" onPress={() => router.back()} hitSlop={12}>
            <Ionicons name="chevron-back" size={24} color={theme.colors.onSurface} />
          </Pressable>
          <Text style={[styles.title, { color: theme.colors.onSurface }]}>{HEALTH_METRIC_LABEL[key]}</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {kpis === null ? (
            <Text style={[styles.empty, { color: theme.colors.onSurfaceTertiary }]}>Chargement…</Text>
          ) : kpiCards.every((c) => c.value == null) ? (
            <Text style={[styles.empty, { color: theme.colors.onSurfaceTertiary }]}>
              Aucune donnée disponible pour l&apos;instant.
            </Text>
          ) : (
            <View style={styles.kpiRow}>
              {kpiCards.map((c) => (
                <GlassCard key={c.label} level="subtle" style={styles.kpiCard}>
                  <Text style={[styles.kpiValue, { color: theme.colors.onSurface }]}>
                    {c.value != null ? formatHealthMetricValue(key, c.value) : "—"}
                  </Text>
                  <Text style={[styles.kpiLabel, { color: theme.colors.onSurfaceTertiary }]}>{c.label}</Text>
                </GlassCard>
              ))}
            </View>
          )}

          {sleepStages && (sleepStages.deepHours != null || sleepStages.remHours != null || sleepStages.coreHours != null) && (
            <View style={[styles.stagesCard, { borderColor: theme.colors.divider }]}>
              {sleepStages.inBedStart && sleepStages.sleepEnd && (
                <View style={styles.stagesTimesRow}>
                  <View>
                    <Text style={[styles.stagesTimeLabel, { color: theme.colors.onSurfaceTertiary }]}>Coucher</Text>
                    <Text style={[styles.stagesTimeValue, { color: theme.colors.onSurface }]}>
                      {formatTimeOnly(sleepStages.inBedStart)}
                    </Text>
                  </View>
                  <Ionicons name="arrow-forward" size={14} color={theme.colors.onSurfaceTertiary} />
                  <View>
                    <Text style={[styles.stagesTimeLabel, { color: theme.colors.onSurfaceTertiary }]}>Réveil</Text>
                    <Text style={[styles.stagesTimeValue, { color: theme.colors.onSurface }]}>
                      {formatTimeOnly(sleepStages.sleepEnd)}
                    </Text>
                  </View>
                </View>
              )}
              <View style={styles.stagesGrid}>
                {sleepStages.deepHours != null && (
                  <View style={styles.stageItem}>
                    <Text style={[styles.stageValue, { color: theme.colors.progress }]}>{formatHoursMinutes(sleepStages.deepHours)}</Text>
                    <Text style={[styles.stageLabel, { color: theme.colors.onSurfaceTertiary }]}>Profond</Text>
                  </View>
                )}
                {sleepStages.coreHours != null && (
                  <View style={styles.stageItem}>
                    <Text style={[styles.stageValue, { color: theme.colors.brand }]}>{formatHoursMinutes(sleepStages.coreHours)}</Text>
                    <Text style={[styles.stageLabel, { color: theme.colors.onSurfaceTertiary }]}>Léger</Text>
                  </View>
                )}
                {sleepStages.remHours != null && (
                  <View style={styles.stageItem}>
                    <Text style={[styles.stageValue, { color: theme.colors.info }]}>{formatHoursMinutes(sleepStages.remHours)}</Text>
                    <Text style={[styles.stageLabel, { color: theme.colors.onSurfaceTertiary }]}>REM</Text>
                  </View>
                )}
                {sleepStages.awakeHours != null && (
                  <View style={styles.stageItem}>
                    <Text style={[styles.stageValue, { color: theme.colors.onSurfaceSecondary }]}>{formatHoursMinutes(sleepStages.awakeHours)}</Text>
                    <Text style={[styles.stageLabel, { color: theme.colors.onSurfaceTertiary }]}>Éveil</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>ÉVOLUTION</Text>
          <HealthTrendChart
            color={colorByKey[key]}
            loadSeries={(days) => loadHealthMetricSeries(key, days, today)}
            indent={false}
            periods={["week", "30d", "6m", "1y"]}
            defaultPeriod="week"
          />

          {yearly.length >= 2 && (
            <>
              <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>COMPARAISON ANNUELLE</Text>
              <GlassCard level="subtle" style={styles.yearlyCard}>
                {yearly.map((y, i) => {
                  const prev = yearly[i + 1];
                  const pct = prev ? Math.round(((y.dailyAverage - prev.dailyAverage) / prev.dailyAverage) * 100) : null;
                  return (
                    <View
                      key={y.year}
                      style={[styles.yearlyRow, i > 0 && { borderTopColor: theme.colors.divider, borderTopWidth: StyleSheet.hairlineWidth }]}
                    >
                      <Text style={[styles.yearlyYear, { color: theme.colors.onSurface }]}>{y.year}</Text>
                      <Text style={[styles.yearlyValue, { color: theme.colors.onSurface }]}>
                        {formatHealthMetricValue(key, y.dailyAverage)}/j
                      </Text>
                      {pct != null && (
                        <Text
                          style={[
                            styles.yearlyDelta,
                            { color: pct >= 0 ? theme.colors.success : theme.colors.error },
                          ]}
                        >
                          {pct >= 0 ? "+" : ""}
                          {pct}%
                        </Text>
                      )}
                    </View>
                  );
                })}
              </GlassCard>
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  loading: { textAlign: "center", marginTop: 40 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  title: { fontSize: 16, fontWeight: "800" },
  scroll: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xl3, gap: spacing.lg },
  kpiRow: { flexDirection: "row", gap: spacing.sm },
  kpiCard: { flex: 1, padding: spacing.md, alignItems: "flex-start", gap: 2 },
  kpiValue: { fontSize: 20, fontWeight: "800" },
  kpiLabel: { fontSize: 11, letterSpacing: 0.2 },
  stagesCard: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 16,
    padding: spacing.md,
    gap: spacing.md,
  },
  stagesTimesRow: { flexDirection: "row", alignItems: "center", gap: spacing.md },
  stagesTimeLabel: { fontSize: 10.5, fontWeight: "700", letterSpacing: 0.3 },
  stagesTimeValue: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  stagesGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.md },
  stageItem: { minWidth: 64 },
  stageValue: { fontSize: 15, fontWeight: "800" },
  stageLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.3, marginTop: 1 },
  sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  empty: { fontSize: 13, fontStyle: "italic" },
  yearlyCard: { padding: spacing.md },
  yearlyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  yearlyYear: { flex: 1, fontSize: 14, fontWeight: "800" },
  yearlyValue: { fontSize: 13, fontWeight: "700" },
  yearlyDelta: { fontSize: 12, fontWeight: "800", minWidth: 50, textAlign: "right" },
});
