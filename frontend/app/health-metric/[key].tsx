import { useCallback, useState } from "react";
import { View, Text, Pressable, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { spacing, withAlpha } from "@/src/theme";
import { useTheme } from "@/src/themes";
import { RingColor } from "@/src/themes/types";
import ThemedBackground from "@/src/themes/ThemedBackground";
import GlassCard from "@/src/components/ui/GlassCard";
import InteractiveHealthChart from "@/src/components/health/InteractiveHealthChart";
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

// Sous 1h, "18 min" est plus lisible qu'un "0h18" pour un badge de phase de
// sommeil (Éveil est presque toujours < 1h) — au-dessus, format `XhYY` usuel.
function formatHoursMinutes(hours: number | null): string | null {
  if (hours == null) return null;
  if (hours < 1) return `${Math.round(hours * 60)} min`;
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  return `${h}h${m.toString().padStart(2, "0")}`;
}

// Format réel Health Auto Export, confirmé sur un vrai payload :
// "2026-08-29 01:37:00 +0200" — un simple replace(" ", "T") laisse un espace
// avant le fuseau ("...T01:37:00 +0200"), que `Date` ne parse pas (résultat :
// la chaîne technique brute renvoyée telle quelle, exactement le bug corrigé
// ici). On isole le "T" puis on retire l'espace restant avant le fuseau.
// Jamais de repli sur la chaîne brute — "—" plutôt qu'un timestamp technique.
function formatTimeOnly(dateStr: string): string {
  const iso = dateStr.replace(" ", "T").replace(/\s+/g, "");
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "—";
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

          {sleepStages &&
            (sleepStages.totalSleepHours != null ||
              sleepStages.deepHours != null ||
              sleepStages.coreHours != null ||
              sleepStages.remHours != null ||
              sleepStages.awakeHours != null) &&
            (() => {
              // Jamais l'horodatage brut Health Auto Export — "Coucher"/
              // "Réveil" restent l'heure de sommeil réel (`sleepStart`/
              // `sleepEnd`) en priorité, avec repli sur l'heure au lit
              // (`inBedStart`/`inBedEnd`) seulement si l'échantillon ne porte
              // pas l'heure de sommeil réel.
              const bedTime = sleepStages.sleepStart ?? sleepStages.inBedStart;
              const wakeTime = sleepStages.sleepEnd ?? sleepStages.inBedEnd;
              const rawStages: { key: keyof typeof theme.colors.sleepStages; label: string; hours: number | null; icon: keyof typeof Ionicons.glyphMap }[] = [
                { key: "deep", label: "Profond", hours: sleepStages.deepHours, icon: "moon" },
                { key: "light", label: "Léger", hours: sleepStages.coreHours, icon: "cloud-outline" },
                { key: "rem", label: "REM", hours: sleepStages.remHours, icon: "eye-outline" },
                { key: "awake", label: "Éveil", hours: sleepStages.awakeHours, icon: "sunny-outline" },
              ];
              const stages = rawStages.filter((s) => s.hours != null);

              return (
                <View style={styles.sleepSummaryWrap}>
                  <GlassCard level="card" style={styles.sleepSummaryCard}>
                    <Text style={[styles.sleepEyebrow, { color: theme.colors.onSurfaceTertiary }]}>SOMMEIL</Text>
                    <View style={styles.sleepSummaryRow}>
                      <View>
                        <Text style={[styles.sleepDurationValue, { color: theme.colors.onSurface }]}>
                          {sleepStages.totalSleepHours != null ? formatHoursMinutes(sleepStages.totalSleepHours) : "—"}
                        </Text>
                        <Text style={[styles.sleepDurationLabel, { color: theme.colors.onSurfaceTertiary }]}>Durée totale</Text>
                      </View>
                      {(bedTime || wakeTime) && (
                        <View style={styles.sleepTimesCol}>
                          {bedTime && (
                            <View style={styles.sleepTimeRow}>
                              <Ionicons name="moon-outline" size={12} color={theme.colors.onSurfaceTertiary} />
                              <Text style={[styles.sleepTimeValue, { color: theme.colors.onSurface }]}>{formatTimeOnly(bedTime)}</Text>
                              <Text style={[styles.sleepTimeLabel, { color: theme.colors.onSurfaceTertiary }]}>Coucher</Text>
                            </View>
                          )}
                          {wakeTime && (
                            <View style={styles.sleepTimeRow}>
                              <Ionicons name="sunny-outline" size={12} color={theme.colors.onSurfaceTertiary} />
                              <Text style={[styles.sleepTimeValue, { color: theme.colors.onSurface }]}>{formatTimeOnly(wakeTime)}</Text>
                              <Text style={[styles.sleepTimeLabel, { color: theme.colors.onSurfaceTertiary }]}>Réveil</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </View>
                  </GlassCard>

                  {stages.length > 0 && (
                    <View style={styles.stageBadgeGrid}>
                      {stages.map((s) => {
                        const color = theme.colors.sleepStages[s.key];
                        return (
                          <View
                            key={s.key}
                            style={[
                              styles.stageBadge,
                              { backgroundColor: withAlpha(color, 14), borderColor: withAlpha(color, 32) },
                            ]}
                          >
                            <View style={styles.stageBadgeHeader}>
                              <Ionicons name={s.icon} size={13} color={color} />
                              <Text style={[styles.stageBadgeLabel, { color }]}>{s.label}</Text>
                            </View>
                            <Text style={[styles.stageBadgeValue, { color: theme.colors.onSurface }]}>
                              {formatHoursMinutes(s.hours)}
                            </Text>
                          </View>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })()}

          <Text style={[styles.sectionTitle, { color: theme.colors.onSurface }]}>ÉVOLUTION</Text>
          <InteractiveHealthChart
            color={colorByKey[key]}
            loadSeries={(days) => loadHealthMetricSeries(key, days, today)}
            indent={false}
            periods={["week", "30d", "6m", "1y"]}
            defaultPeriod="week"
            formatValue={(v) => formatHealthMetricValue(key, v)}
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
  sleepSummaryWrap: { gap: spacing.md },
  sleepSummaryCard: { padding: spacing.lg, gap: spacing.sm },
  sleepEyebrow: { fontSize: 11, fontWeight: "800", letterSpacing: 1.2 },
  sleepSummaryRow: { flexDirection: "row", alignItems: "flex-end", justifyContent: "space-between" },
  sleepDurationValue: { fontSize: 30, fontWeight: "800" },
  sleepDurationLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  sleepTimesCol: { gap: 6, alignItems: "flex-end" },
  sleepTimeRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  sleepTimeValue: { fontSize: 14, fontWeight: "800" },
  sleepTimeLabel: { fontSize: 11, fontWeight: "600" },
  stageBadgeGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", rowGap: spacing.sm },
  stageBadge: {
    width: "48%",
    borderWidth: 1,
    borderRadius: 16,
    padding: spacing.sm,
    gap: 6,
  },
  stageBadgeHeader: { flexDirection: "row", alignItems: "center", gap: 5 },
  stageBadgeLabel: { fontSize: 10.5, fontWeight: "800", letterSpacing: 0.4, textTransform: "uppercase" },
  stageBadgeValue: { fontSize: 17, fontWeight: "800" },
  sectionTitle: { fontSize: 12, fontWeight: "800", letterSpacing: 1 },
  empty: { fontSize: 13, fontStyle: "italic" },
  yearlyCard: { padding: spacing.md },
  yearlyRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, paddingVertical: 10 },
  yearlyYear: { flex: 1, fontSize: 14, fontWeight: "800" },
  yearlyValue: { fontSize: 13, fontWeight: "700" },
  yearlyDelta: { fontSize: 12, fontWeight: "800", minWidth: 50, textAlign: "right" },
});
